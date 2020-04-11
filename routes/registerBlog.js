'use strict';

const express = require('express');
const router = express.Router();
var request = require('superagent');
const Reviewer = require('../models/reviewer');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;

router.post('/', async function (req, res) {
  try {
    const { genres, author, blog } = req.body;
    const newReviewer = new Reviewer({ genres, author, blog });
    await newReviewer.save();
    request
      .post(url)
      .set('Content-Type', 'application/json;charset=utf-8')
      .set('Authorization', 'Basic ' + new Buffer('anystring:' + mailchimpApiKey).toString('base64'))
      .send({
        'email_address': 'alex88@email.com',
        'status': 'subscribed',
        'merge_fields': {
          'FNAME': 'Alejandro',
          'AVENTURA': 'true'
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