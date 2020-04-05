const express = require('express');
const router = express.Router();
const Book = require('../models/book');

router.get('/:id', async function (req, res) {
  try {
    const { id } = req.params;
    const book = await Book.findOne({ _id: id }).populate('author', 'name lastName');
    res.json({
      book
    });
  } catch (error) {
    res.json(error);
  }
});


module.exports = router;