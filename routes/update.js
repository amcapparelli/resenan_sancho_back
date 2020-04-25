const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const User = require('../models/user');

router.post('/', verifyToken(), async function (req, res) {
  try {
    const { _id, avatar, country, email, name, lastName } = req.body;
    if (_id !== req.authData.user._id) {
      res.json({ message: 'no tienes autorización para ver este contenido ' });
      return;
    }
    await User.updateOne({ _id }, {
      avatar,
      country,
      email,
      lastName,
      name,
    });
    const userUpdated = {
      _id,
      avatar,
      country,
      email,
      name,
      lastName
    };
    res.json({ success: true, message: 'user updated successfully', user: userUpdated });
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;