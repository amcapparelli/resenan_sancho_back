'use strict';

const express = require('express');
const router = express.Router();
var request = require('superagent');
const Reviewer = require('../models/reviewer');
const User = require('../models/user');

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

router.post('/', async function (req, res) {
  try {
    const { genres, author, blog, booktube, bookstagram, goodreads, amazon } = req.body;
    const user = await User.findOne({ _id: author });
    const newReviewer = new Reviewer({ genres, author, blog, booktube, bookstagram, goodreads, amazon });
    await newReviewer.save();
    const genresForMailchimp = genresMapper.reduce((acum, curr) => (
      genres.includes(curr.name) ? { ...acum, [curr.code]: 'true' } : { ...acum, [curr.code]: 'false' }), {});
    request
      .post(url)
      .set('Content-Type', 'application/json;charset=utf-8')
      .set('Authorization', 'Basic ' + new Buffer('anystring:' + mailchimpApiKey).toString('base64'))
      .send({
        'email_address': user.email,
        'status': 'subscribed',
        'merge_fields': {
          'FNAME': user.name,
          ...genresForMailchimp,
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
    res.json({ error });
  }
});

module.exports = router;