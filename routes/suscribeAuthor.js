const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const User = require('../models/user');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.WRITERS_LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;
const authHeader = 'Basic ' + Buffer.from('anystring:' + mailchimpApiKey).toString('base64');
const mailchimpHeaders = {
  'Content-Type': 'application/json;charset=utf-8',
  'Authorization': authHeader
};

router.post('/', verifyToken(), async function (req, res) {
  try {
    const { status, _id } = req.body;
    const { user } = req.authData;
    if (_id !== user._id) {
      res.json({ message: 'no tienes autorización para hacer este cambio' });
      return;
    }
    const userToSuscribe = await User.findOne({ _id });
    // Mailchimp returns 400 when the member already exists; the previous code
    // treated that as success too (the local status is still updated).
    let response, failMessage;
    if (!userToSuscribe.emailAuthorListStatus) {
      response = await fetch(url, {
        method: 'POST',
        headers: mailchimpHeaders,
        body: JSON.stringify({
          'email_address': user.email,
          'status': status,
          'merge_fields': {
            'FNAME': user.name,
          }
        })
      });
      failMessage = 'Hubo un error y no se pudo guardar los cambios.';
    } else {
      response = await fetch(`${url}${user.email.toLowerCase()}`, {
        method: 'PATCH',
        headers: mailchimpHeaders,
        body: JSON.stringify({ 'status': status })
      });
      failMessage = 'Hubo un error y no se pudo actualizar los cambios.';
    }
    if (response.status < 300 || response.status === 400) {
      await User.updateOne({ _id }, { emailAuthorListStatus: status });
      const message = status === 'subscribed'
        ? '¡Genial, ya estás en la lista para recibir consejos!'
        : 'Ya no te enviaremos más consejos por email :(';
      res.json({ success: true, message });
    } else {
      res.json({ success: false, message: failMessage });
    }
  } catch (error) {
    res.json({ error });
  }
});

module.exports = router;