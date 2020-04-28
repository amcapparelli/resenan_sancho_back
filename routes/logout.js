var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
  res.clearCookie('token');
  res.json({ success: true, message: 'logged out successfully' });
});

module.exports = router;
