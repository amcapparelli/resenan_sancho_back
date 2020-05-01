const express = require('express');
const router = express.Router();
const genres = require('../utils/constants/genres');
const Reviewer = require('../models/reviewer');

router.get('/', async function (req, res) {
  const { genre, format } = req.query;
  const genreName = genre && genres.find(g => g.code === genre).name;
  const queryParams = {
    genres: genreName,
    formats: format
  };
  const filters = Object.entries(queryParams).reduce(
    (acum, [key, value]) => [null, undefined, ''].includes(value) ? acum : { ...acum, [key]: value }, {}
  );

  try {
    const reviewers = await Reviewer
      .find(filters)
      .limit(20).populate('author', 'name lastName avatar country');
    res.json({
      reviewers
    });
  } catch (error) {
    res.json(error);
  }
});


module.exports = router;