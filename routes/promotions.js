const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const Book = require('../models/book');
const promotions = require('../utils/constants/promotions');

router.put('/:id', verifyToken(), async function (req, res) {
  try {
    const { id } = req.params;
    const { author, chosenPromo } = req.body;
    const copies = promotions.find(p => p.id === chosenPromo).copies;

    if (author !== req.authData.user._id) {
      res.json({ message: 'no tienes autorización para ver este contenido ' });
      return;
    }
    const book = await Book.findOne({ _id: id });
    const promoInfo = {};
    if (book.freePromoAvailable && copies === 2 || copies === 5) {
      promoInfo.freePromoAvailable = false;
      promoInfo.copies = book.copies + copies;
    } else {
      res.json({
        success: false,
        message: 'No puedes añadir más ejemplares con esta opción.',
      });
      return;
    }
    await Book.updateOne({ _id: id }, { ...promoInfo });
    const bookUpdated = await Book.findOne({ _id: id });
    res.json({
      success: true,
      message: `¡Copias añadidas!. Se están ofreciendo ${bookUpdated.copies} de tu libro ${bookUpdated.title}`,
    });
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;