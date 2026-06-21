const express = require('express');
const router = express.Router();
var request = require('superagent');
const User = require('../models/user');
const Reviewer = require('../models/reviewer');
const { verifyToken } = require('../lib/auth');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;

router.delete('/', verifyToken(), async (req, res) => {
  try {
    const { user } = req.authData;
    const userDoc = await User.findOne({ _id: user._id });
    if (!userDoc) {
      res.json({ success: false, message: 'hubo un error al borrar la cuenta del usuario' });
      return;
    }
    if (user._id != userDoc._id) {
      res.json({ success: false, message: 'no tienes permisos para ejecutar esta acción' });
      return;
    }
    const reviewer = await Reviewer.findOne({ author: userDoc._id });
    if (reviewer) {
      request
        .put(`${url}${user.email.toLowerCase()}`)
        .set('Content-Type', 'application/json;charset=utf-8')
        .set('Authorization', 'Basic ' + Buffer.from('anystring:' + mailchimpApiKey).toString('base64'))
        .send({
          'email_address': user.email,
          'status': 'unsubscribed',
        })
        .end(async function (err, response) {
          // This callback is detached from the outer try/catch, so handle its
          // own failures: a transport error leaves `response` undefined.
          try {
            if (response && (response.status < 300 || response.status === 400)) {
              await userDoc.deleteOne();
              res.json({ success: true, message: 'usuario borrado' });
            } else {
              res.json({ success: false, message: 'usuario borrado, pero no se pudo eliminar de la lista de correos.' });
            }
          } catch (deleteErr) {
            res.json({ success: false, message: 'Hubo un error al intentar borrar el usuario' });
          }
        });
    } else {
      await userDoc.deleteOne();
      res.json({ success: true, message: 'usuario borrado' });
    }
  } catch (err) {
    res.json({ success: false, message: 'Hubo un error al intentar borrar el usuario' });
  }
});

module.exports = router;