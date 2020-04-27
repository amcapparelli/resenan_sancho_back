const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const Book = require('../models/book');

router.post('/', async function (req, res) {
  try {
    const { title, author, editorial, synopsis, cover, pages, genre, datePublished, formats } = req.body;
    const book = await Book.findOne({ $and: [{ title }, { author }] });
    if (book) {
      res.json({ success: false, message: 'book already exists' });
      return;
    }
    const newBook = new Book({ title, author, editorial, synopsis, cover, pages, genre, datePublished, formats });
    await newBook.save();
    res.json({ success: true, message: 'book registred successfully' });
  } catch (error) {
    res.json({ error });
  }
});

router.put('/:id', verifyToken(), async function (req, res) {
  try {
    const { id } = req.params;
    const { title, author, editorial, synopsis, cover, pages, genre, datePublished, formats } = req.body;
    if (author !== req.authData.user._id) {
      res.json({ message: 'no tienes autorización para ver este contenido ' });
      return;
    }
    await Book.updateOne({ _id: id }, {
      title,
      editorial,
      synopsis,
      cover,
      pages,
      genre,
      datePublished,
      formats,
    });
    res.json({ success: true, message: 'book updated successfully' });
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;