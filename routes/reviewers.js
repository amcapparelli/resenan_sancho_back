const express = require('express');
const router = express.Router();
const Reviewer = require('../models/reviewer');

router.get('/', async function (req, res) {
  try {
    const reviewers = await Reviewer.find().limit(20).populate('author', 'name lastName avatar country');
    res.json({
      reviewers
    });
  } catch (error) {
    res.json(error);
  }
});


module.exports = router;