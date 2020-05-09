const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const Book = require('../models/book');
const User = require('../models/user');

router.get('/', async function (req, res) {
  const { genre, format, page } = req.query;
  const queryParams = {
    genre,
    formats: format
  };
  const filters = Object.entries(queryParams).reduce(
    (acum, [key, value]) => [null, undefined, ''].includes(value) ? acum : { ...acum, [key]: value }, {}
  );
  try {
    const resultsPerPage = 20;
    const totalElements = await Book.find(filters).count();
    const totalPages = Math.ceil(totalElements / resultsPerPage);
    const books = await Book
      .find(filters)
      .sort({ create_at: -1 })
      .limit(resultsPerPage)
      .skip((page - 1) * resultsPerPage)
      .populate('author', 'name lastName');
    res.json({
      books,
      totalElements,
      totalPages,
    });
  } catch (error) {
    res.json(error);
  }
});

router.get('/private/:id', verifyToken(), async function (req, res) {
  try {
    const { id } = req.params;
    if (id !== req.authData.user._id) {
      res.json({ message: 'no tienes autorización para ver este contenido ' });
      return;
    }
    const user = await User.findOne({ _id: id });
    // if no user, then return 404
    if (!user) {
      res.json({ success: false, message: 'no user found' });
      return;
    }
    const books = await Book.find({ author: user._id }).populate('author', 'name lastName');
    res.json({
      books
    });
  } catch (error) {
    res.json(error);
  }
});



module.exports = router;