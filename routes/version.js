const express = require('express');
const router = express.Router();
const { version } = require('../package.json');

/* GET deployed backend version. */
router.get('/', function (req, res) {
  res.json({ version });
});

module.exports = router;
