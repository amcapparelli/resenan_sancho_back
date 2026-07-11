const express = require('express');
const router = express.Router();
const Book = require('../models/book');
const { verifyToken } = require('../lib/auth');
// Pin the API version the installed SDK (v22) targets, so upgrading the SDK
// never silently changes behavior via the account's default API version.
const stripe = require('stripe')(process.env.STRIPE_SECRET, { apiVersion: '2026-06-24.dahlia' });
const promotions = require('../utils/constants/promotions');
const {
  transporter,
  emailPromoTemplate
} = require('../lib/email');

router.post('/', verifyToken(), async function (req, res) {
  const { author, id, chosenPromo, bookId } = req.body;
  const amount = promotions.find(p => p.id === chosenPromo).price;
  const copies = promotions.find(p => p.id === chosenPromo).copies;

  if (author !== req.authData.user._id) {
    res.json({ message: 'no tienes autorización para ver este contenido ' });
    return;
  }
  const book = await Book.findOne({ _id: bookId });
  if (!book) {
    res.json({ message: 'no hemos encontrado el libro que intentas promocionar.' });
    return;
  }
  try {
    await stripe.paymentIntents.create({
      amount,
      currency: 'EUR',
      description: 'Reseñan Sancho',
      payment_method: id,
      confirm: true,
      // Server-side card charge with no redirect flow: opt out of redirect-based
      // methods so Stripe doesn't require a return_url (required since the API
      // versions the v22 SDK targets).
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
    });
    const promoInfo = {};
    promoInfo.copies = book.copies + copies;
    await Book.updateOne({ _id: bookId }, { ...promoInfo });
    const bookUpdated = await Book.findOne({ _id: bookId });
    //If email promotion, send email to author
    if (chosenPromo === 3) {
      const emailTemplate = emailPromoTemplate(req.authData.user.email);
      const sendMail = () => {
        transporter.sendMail(emailTemplate, (err) => {
          if (err) {
            console.log('err', err);
          }
        });
      };
      sendMail();
    }
    const message = `¡Copias añadidas!. Se están ofreciendo ${bookUpdated.copies} de tu libro ${bookUpdated.title}.
    ${chosenPromo === 3 ? 'Te hemos enviado un email con los datos para el envío de tu novela.' : ''}`;
    res.json({
      success: true, message,
    });
  } catch (error) {
    res.json({
      success: false, message: error.message
    });
  }
});


module.exports = router;