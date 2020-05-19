const express = require('express');
const router = express.Router();
var request = require('superagent');
const { verifyToken } = require('../lib/auth');
const User = require('../models/user');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.WRITERS_LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;

router.post('/', verifyToken(), async function (req, res) {
  try {
    const { status, _id } = req.body;
    const { user } = req.authData;
    if (_id !== user._id) {
      res.json({ message: 'no tienes autorización para hacer este cambio' });
      return;
    }
    const userToSuscribe = await User.findOne({ _id });
    if (!userToSuscribe.emailAuthorListStatus) {
      request
        .post(url)
        .set('Content-Type', 'application/json;charset=utf-8')
        .set('Authorization', 'Basic ' + new Buffer('anystring:' + mailchimpApiKey).toString('base64'))
        .send({
          'email_address': user.email,
          'status': status,
          'merge_fields': {
            'FNAME': user.name,
          }
        })
        .end(async function (err, response) {
          if (response.status < 300 || (response.status === 400)) {
            await User.updateOne({ _id }, {
              emailAuthorListStatus: status
            });
            const message = status === 'subscribed'
              ? '¡Genial, ya estás en la lista para recibir consejos!'
              : 'Ya no te enviaremos más consejos por email :(';
            res.json({ success: true, message });
          } else {
            res.json({ success: false, message: 'Hubo un error y no se pudo guardar los cambios.' });
          }
        });
    } else {
      request
        .patch(`${url}${user.email.toLowerCase()}`)
        .set('Content-Type', 'application/json;charset=utf-8')
        .set('Authorization', 'Basic ' + new Buffer('anystring:' + mailchimpApiKey).toString('base64'))
        .send({
          'status': status,
        })
        .end(async function (err, response) {
          if (response.status < 300 || (response.status === 400)) {
            await User.updateOne({ _id }, {
              emailAuthorListStatus: status
            });
            const message = status === 'subscribed'
              ? '¡Genial, ya estás en la lista para recibir consejos!'
              : 'Ya no te enviaremos más consejos por email :(';
            res.json({ success: true, message });
          } else {
            res.json({ success: false, message: 'Hubo un error y no se pudo actualizar los cambios.' });
          }
        });
    }
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;