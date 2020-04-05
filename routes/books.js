const express = require('express');
const router = express.Router();
const Book = require('../models/book');

router.get('/', async function (req, res) {
  try {
    const books = await Book.find().limit(20).populate('author', 'name lastName');
    res.json({
      books
    });
  } catch (error) {
    res.json(error);
  }
});


module.exports = router;