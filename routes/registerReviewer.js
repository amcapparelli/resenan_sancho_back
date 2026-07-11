'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Reviewer = require('../models/reviewer');
const User = require('../models/user');
const { verifyToken } = require('../lib/auth');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;
const mailchimpHeaders = {
  'Content-Type': 'application/json;charset=utf-8',
  'Authorization': 'Basic ' + Buffer.from('anystring:' + mailchimpApiKey).toString('base64')
};

const genresMapper = [
  { name: 'adventure', code: 'ADV' },
  { name: 'biography', code: 'BIO' },
  { name: 'cienceFiction', code: 'CIF' },
  { name: 'crime', code: 'CRI' },
  { name: 'erotica', code: 'ERO' },
  { name: 'fantasy', code: 'FAN' },
  { name: 'forChildren', code: 'FCH' },
  { name: 'juvenile', code: 'JUV' },
  { name: 'historicalFiction', code: 'HIF' },
  { name: 'humor', code: 'HUM' },
  { name: 'poetry', code: 'POE' },
  { name: 'policial', code: 'POL' },
  { name: 'psychologicalDrama', code: 'PSD' },
  { name: 'romantic', code: 'ROM' },
  { name: 'suspense', code: 'SUS' },
  { name: 'terror', code: 'TER' },
  { name: 'thriller', code: 'THR' },
];

const formatsMapper = [
  { name: 'papel', code: 'F_PAPEL' },
  { name: 'epub', code: 'F_EPUB' },
  { name: 'mobi', code: 'F_MOBI' },
  { name: 'pdf', code: 'F_PDF' },
  { name: 'audiolibro', code: 'F_AUDIO' },
];

router.post('/', async function (req, res) {
  try {
    const {
      genres,
      author,
      blog,
      booktube,
      bookstagram,
      goodreads,
      amazon,
      description,
      formats,
    } = req.body;

    const user = await User.findOne({ _id: author });
    const reviewer = await Reviewer.findOne({ author });
    if (reviewer) {
      res.json({ success: false, message: 'Hubo un error, ya existe un perfil de reseñador para este usuario.' });
      return;
    }
    const newReviewer = new Reviewer({
      genres,
      author,
      blog,
      booktube,
      bookstagram,
      goodreads,
      amazon,
      description,
      formats,
      updated_at: Date.now(),
    });
    await newReviewer.save();
    const genresForMailchimp = genresMapper.reduce((acum, curr) => (
      genres.includes(curr.name) ? { ...acum, [curr.code]: 'true' } : { ...acum, [curr.code]: 'false' }), {});
    const formatsForMailchimp = formatsMapper.reduce((acum, curr) => (
      formats.includes(curr.name) ? { ...acum, [curr.code]: 'true' } : { ...acum, [curr.code]: 'false' }), {});
    const userCountry = user.country ? user.country : 'N/A';
    const response = await fetch(url, {
      method: 'POST',
      headers: mailchimpHeaders,
      body: JSON.stringify({
        'email_address': user.email,
        'status': 'subscribed',
        'merge_fields': {
          'FNAME': user.name,
          'PAIS': userCountry,
          ...genresForMailchimp,
          ...formatsForMailchimp
        }
      })
    });
    if (response.status >= 200 && response.status < 300) {
      res.json({
        success: true,
        message: '¡Enhorabuena! Tu perfil de reseñadora literaria fue dado de alta.',
        reviewer: newReviewer
      });
    } else {
      res.json({ success: false, message: 'no se pudo guardar algunos cambios.' });
    }
  } catch (error) {
    res.json(error);
  }
});

router.put('/', verifyToken(), async (req, res) => {
  try {
    const {
      genres,
      author,
      blog,
      booktube,
      bookstagram,
      goodreads,
      amazon,
      description,
      formats,
    } = req.body;
    if (author !== req.authData.user._id) {
      res.json({ message: 'no tienes autorización para ver este contenido ' });
      return;
    }
    const user = await User.findOne({ _id: author });
    await Reviewer.updateOne({ author }, {
      genres,
      blog,
      booktube,
      bookstagram,
      goodreads,
      amazon,
      description,
      formats,
      updated_at: Date.now(),
    });
    const reviewerUpdated = {
      genres,
      blog,
      booktube,
      bookstagram,
      goodreads,
      amazon,
      description,
      formats,
    };
    const genresForMailchimp = genresMapper.reduce((acum, curr) => (
      genres.includes(curr.name) ? { ...acum, [curr.code]: 'true' } : { ...acum, [curr.code]: 'false' }), {});
    const formatsForMailchimp = formatsMapper.reduce((acum, curr) => (
      formats.includes(curr.name) ? { ...acum, [curr.code]: 'true' } : { ...acum, [curr.code]: 'false' }), {});
    const userCountry = user.country ? user.country : 'N/A';
    const subscriberHash = crypto.createHash('md5').update(user.email.toLowerCase()).digest('hex');
    // Read the member's current subscription status so the PUT (an upsert)
    // preserves it while updating the merge fields.
    const getResponse = await fetch(`${url}${subscriberHash}`, { headers: mailchimpHeaders });
    const member = await getResponse.json();

    const putResponse = await fetch(`${url}${subscriberHash}`, {
      method: 'PUT',
      headers: mailchimpHeaders,
      body: JSON.stringify({
        'email_address': user.email,
        'status': member.status,
        'merge_fields': {
          'FNAME': user.name,
          'PAIS': userCountry,
          ...genresForMailchimp,
          ...formatsForMailchimp,
        }
      })
    });
    if (putResponse.status >= 200 && putResponse.status < 300) {
      res.json({ success: true, message: '¡Has actualizado tu perfil de reseñadora literaria correctamente!', reviewer: reviewerUpdated });
    } else {
      res.json({ success: false, message: 'no se pudo guardar los cambios' });
    }
  } catch (error) {
    res.json(error);
  }
});
module.exports = router;