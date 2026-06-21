var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
  res.json({ name: 'Reseñan Sancho API', status: 'ok' });
});

module.exports = router;
