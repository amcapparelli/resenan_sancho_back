const express = require('express');
const router = express.Router();
const Reviewer = require('../models/reviewer');

router.get('/:id', async function (req, res) {
  const { id } = req.params;
  try {
    const reviewer = await Reviewer.findOne({ author: id });
    res.json({
      reviewer,
    });
  } catch (error) {
    res.json(error);
  }
});


module.exports = router;