const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const Book = require('../models/book');

router.put('/:id', verifyToken(), async function (req, res) {
  try {
    const { id } = req.params;
    const { copies, author } = req.body;

    if (author !== req.authData.user._id) {
      res.json({ message: 'no tienes autorización para ver este contenido ' });
      return;
    }
    await Book.updateOne({ _id: id }, {
      copies
    });
    res.json({ success: true, message: 'Promotion added successfully' });
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;