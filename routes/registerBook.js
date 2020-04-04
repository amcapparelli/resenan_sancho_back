const express = require('express');
const router = express.Router();
const Book = require('../models/book');

router.post('/', async function (req, res) {
  try {
    const { title, author, editorial, sinopsis, cover, pages, genre, datePublished, formats } = req.body;
    const book = await Book.findOne({ $and: [{ title }, { author }] });
    if (book) {
      res.json({ success: false, message: 'book already exists' });
      return;
    }
    const newBook = new Book({ title, author, editorial, sinopsis, cover, pages, genre, datePublished, formats });
    await newBook.save();
    res.json({ success: true, message: 'book registred successfully' });
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;