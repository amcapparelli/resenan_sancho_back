const express = require('express');
var jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');

router.post('/', async function (req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && user.password == password) {
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

module.exports = router;