const express = require('express');
const router = express.Router();
const { getHomeHighlights } = require('../lib/homeHighlights');

/* GET the home content blocks: featured books + most active genres. Public. */
router.get('/', async function (req, res) {
  try {
    const highlights = await getHomeHighlights();
    res.json(highlights);
  } catch (error) {
    console.log('error', error);
    res.status(500).json({ message: 'No se han podido cargar los destacados de la home' });
  }
});

module.exports = router;
