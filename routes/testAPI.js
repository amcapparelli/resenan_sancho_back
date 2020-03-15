const express = require('express');
var jwt = require('jsonwebtoken');
const router = express.Router();

router.get('/', function(req, res) {
  // Mock User
  const user = {
    id: 1, 
    username: 'Alex',
  };
  jwt.sign(
    { user },
    process.env.JWT_SECRET,
    { expiresIn: '1d' },
    (err, token) => {
      res.json({ token });
    });
});

module.exports = router;