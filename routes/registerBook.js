const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const Book = require('../models/book');
const User = require('../models/user');
const {
  transporter,
  newBookTemplate
} = require('../lib/email');

router.post('/', async function (req, res) {
  try {
    const { title, author, editorial, synopsis, cover, pages, genre, datePublished, formats } = req.body;
    const book = await Book.findOne({ $and: [{ title }, { author }] });
    if (book) {
      res.json({ success: false, message: 'Este libro ya existe. Para actualizarlo ve a la sección "Mis Libros"' });
      return;
    }
    const newBook = new Book({ title, author, editorial, synopsis, cover, pages, genre, datePublished, formats });
    await newBook.save();
    //Send email to author
    const user = await User.findOne({ _id: author });
    const emailTemplate = newBookTemplate(user.email, user.name, title);
    const sendMail = () => {
      transporter.sendMail(emailTemplate, (err) => {
        if (err) {
          res.status(500).json('Error sending email');
        }
      });
    };
    sendMail();
    res.json({
      success: true,
      message: '¡Libro registrado! Puedes editarlo desde la sección "Mis Libros". ¡No te olvides de agregar ejemplares con la opción PROMOCIONAR!'
    });
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
    const book = await Book.findOne({ _id: id });

    if (!book.author.equals(req.authData.user._id)) {
      res.json({ message: 'noPermissions' });
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
    res.json({ success: true, message: '¡Libro actualizado correctamente!' });
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;