const express = require('express');
const router = express.Router();
var validator = require('email-validator');
const User = require('../models/user');

router.post('/', async function (req, res) {
  try {
    const { email, name, lastName } = req.body;
    const validEmail = validator.validate(email);
    if (!validEmail) {
      res.json({ success: false, message: 'tu email no es válido' });
    }
    User.findOne({ email })
      .then(user => {
        if (user) {
          res.json({ message: 'email already exists' });
          return;
        }
      });
    const password = await User.hashPassword(req.body.password);
    const newUser = new User({ email, name, lastName, password });
    await newUser.save();
    res.json({ success: true, message: 'user registred successfully' });
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;