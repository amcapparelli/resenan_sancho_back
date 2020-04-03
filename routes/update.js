const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/', async function (req, res) {
  try {
    const { email, name, lastName, _id } = req.body;
    await User.updateOne({ _id }, {
      email,
      name,
      lastName,
    });
    res.json({ success: true, message: 'user updated successfully' });
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;