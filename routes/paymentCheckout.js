const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET);

router.post('/', async function (req, res) {
  const { id, amount } = req.body;
  try {
    await stripe.paymentIntents.create({
      amount,
      currency: 'EUR',
      description: 'Reseñan Sancho',
      payment_method: id,
      confirm: true
    });
    res.json({
      success: true, message: 'El pago ha sido aceptado'
    });
  } catch (error) {
    res.json({
      success: false, message: error.message
    });
  }
});


module.exports = router;