const express = require('express');
const router = express.Router();
const genres = require('../utils/constants/genres');
const Reviewer = require('../models/reviewer');

router.get('/', async function (req, res) {
  const { genre, format, page, searchText } = req.query;
  const genreName = genre && genres.find(g => g.code === genre).name;
  const queryParams = {
    genres: genreName,
    formats: format,
  };
  let filters = Object.entries(queryParams).reduce(
    (acum, [key, value]) => [null, undefined, ''].includes(value) ? acum : { ...acum, [key]: value }, {}
  );
  searchText ? filters = { ...filters, $text: { $search: searchText } } : filters;
  try {
    const resultsPerPage = 20;
    const totalElements = await Reviewer.find(filters).count();
    const totalPages = Math.ceil(totalElements / resultsPerPage);
    const reviewers = await Reviewer
      .find(filters)
      .sort({ create_at: -1 })
      .limit(resultsPerPage)
      .skip((page - 1) * resultsPerPage)
      .populate('author', 'name lastName avatar country');
    res.json({
      reviewers,
      totalElements,
      totalPages,
    });
  } catch (error) {
    res.json(error);
  }
});


module.exports = router;