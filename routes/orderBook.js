const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const Book = require('../models/book');
const User = require('../models/user');
const {
  transporter,
  bookCopyRequestTemplate
} = require('../lib/email');

router.post('/', verifyToken(), async function (req, res) {
  try {
    const { reviewer, book: _id, message } = req.body;
    const { user } = req.authData;

    // Verify that user requesting book is user authenticated
    if (user._id !== reviewer) {
      res.json({ success: false, message: 'No tienes permisos para hacer esta solicitud' });
      return;
    }
    const book = await Book.findOne({ _id });

    // Verify there are available copies
    if (book.copies && !book.copies > 0) {
      res.json({ success: false, message: 'Ya no quedan copias disponibles de este libro' });
      return;
    }

    // Verify that user hasn´t already order this book
    if (book.reviewersOrders && book.reviewersOrders.includes(reviewer)) {
      res.json({ success: false, message: 'Ya has solicitado una copia de este libro' });
      return;
    }

    // Verify reviewer and author are not the same user
    if (book.author.equals(reviewer)) {
      res.json({ success: false, message: 'No puedes pedir una copia de un libro propio.' });
      return;
    }

    //Send email to author
    const author = await User.findOne({ _id: book.author });
    const emailTemplate = bookCopyRequestTemplate(message, author.email, user.email, book.title, book.copies - 1);
    const sendMail = () => {
      transporter.sendMail(emailTemplate, (err) => {
        if (err) {
          console.log('err', err);
          res.status(500).json('Error sending email');
        }
      });
    };
    sendMail();

    // Save the reviewer that ordered the copy & discount one copy from availables
    await Book.updateOne(
      { _id },
      { $addToSet: { reviewersOrders: reviewer }, $inc: { copies: -1 } }
    );

    res.json({ success: true, message: 'Enhorabuena, el ejemplar ha sido solicitado a su autor.' });
  } catch (error) {
    res.json(error);
  }
});


module.exports = router;