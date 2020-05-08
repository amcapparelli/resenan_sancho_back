'use strict';

const express = require('express');
const router = express.Router();
var request = require('superagent');
const Reviewer = require('../models/reviewer');
const User = require('../models/user');
const { verifyToken } = require('../lib/auth');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;

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
  { name: 'ePUB', code: 'F_EPUB' },
  { name: 'mobi', code: 'F_MOBI' },
  { name: 'PDF', code: 'F_PDF' },
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
    });
    await newReviewer.save();
    const genresForMailchimp = genresMapper.reduce((acum, curr) => (
      genres.includes(curr.name) ? { ...acum, [curr.code]: 'true' } : { ...acum, [curr.code]: 'false' }), {});
    const formatsForMailchimp = formatsMapper.reduce((acum, curr) => (
      formats.includes(curr.name) ? { ...acum, [curr.code]: 'true' } : { ...acum, [curr.code]: 'false' }), {});
    const userCountry = user.country ? user.country : 'N/A';
    request
      .post(url)
      .set('Content-Type', 'application/json;charset=utf-8')
      .set('Authorization', 'Basic ' + new Buffer('anystring:' + mailchimpApiKey).toString('base64'))
      .send({
        'email_address': user.email,
        'status': 'subscribed',
        'merge_fields': {
          'FNAME': user.name,
          'PAIS': userCountry,
          ...genresForMailchimp,
          ...formatsForMailchimp
        }
      })
      .end(function (err, response) {
        if (response.status < 300 || (response.status === 400)) {
          res.json({ success: true, message: 'cambios guardados' });
        } else {
          res.json({ success: false, message: 'no se pudo guardar los cambios' });
        }
      });
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
    request
      .put(`${url}${user.email.toLowerCase()}`)
      .set('Content-Type', 'application/json;charset=utf-8')
      .set('Authorization', 'Basic ' + new Buffer('anystring:' + mailchimpApiKey).toString('base64'))
      .send({
        'email_address': user.email,
        'status': 'subscribed',
        'merge_fields': {
          'FNAME': user.name,
          'PAIS': userCountry,
          ...genresForMailchimp,
          ...formatsForMailchimp,
        }
      })
      .end(function (err, response) {
        if (response.status < 300 || (response.status === 400)) {
          res.json({ success: true, message: 'reviewer updated successfully', reviewer: reviewerUpdated });
        } else {
          res.json({ success: false, message: 'no se pudo guardar los cambios' });
        }
      });
  } catch (error) {
    res.json(error);
  }
});
module.exports = router;