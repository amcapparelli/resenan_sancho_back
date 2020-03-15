const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/', async function (req, res) {
  try {
    const { email, name, lastName, password } = req.body;
    User.findOne({ email })
      .then(user => {
        if (user) {
          res.json({ message: 'email already exists' });
          return;
        }
      });
    const newUser = new User({ email, name, lastName, password });
    await newUser.save();
    res.json({ message: 'user registred successfully' });
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;