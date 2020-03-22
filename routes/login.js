const express = require('express');
var jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

router.post('/', async function (req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      jwt.sign(
        { user },
        process.env.JWT_SECRET,
        { expiresIn: '1d' },
        (err, token) => {
          if (err) res.json({ message: 'something went wrong' });
          res.json({ message: 'user logged successfully', success: true, user, token });
        });
      return;
    }
    res.json({ message: 'wrong credentials' });
  } catch (error) {
    res.json(error);
  }
});

router.get('/:token', function (req, res, next) {
  try {
    const { token } = req.params;
    jwt.verify(token, process.env.JWT_SECRET, function (err, tokenDecoded) {
      if (err) {
        next(err);
        return;
      }
      res.json({ userSession: { ...tokenDecoded.user, token } });
    });
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;