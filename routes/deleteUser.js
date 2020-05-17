const express = require('express');
const router = express.Router();
var request = require('superagent');
const User = require('../models/user');
const { verifyToken } = require('../lib/auth');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;

router.delete('/', verifyToken(), async (req, res, next) => {
  try {
    const { user } = req.authData;
    await User.findOne({ _id: user._id }, function (err, userDoc) {
      if (err) {
        res.json({ success: false, message: 'hubo un error al borrar la cuenta del usuario' });
        return;
      }
      if (user._id != userDoc._id) {
        res.json({ success: false, message: 'no tienes permisos para ejecutar esta acción' });
        return;
      } else {
        userDoc.remove();
        request
          .put(`${url}${user.email.toLowerCase()}`)
          .set('Content-Type', 'application/json;charset=utf-8')
          .set('Authorization', 'Basic ' + new Buffer('anystring:' + mailchimpApiKey).toString('base64'))
          .send({
            'email_address': user.email,
            'status': 'unsubscribed',
          })
          .end(function (err, response) {
            if (response.status < 300 || (response.status === 400)) {
              res.json({ success: true, message: 'usuario borrado' });
            } else {
              res.json({ success: false, message: 'usuario borrado, pero no se pudo eliminar de la lista de correos.' });
            }
          });
      }
    });
  } catch (err) {
    res.json({ success: false, message: 'Hubo un error al intentar borrar el usuario' });
    next(err);
  }
});

module.exports = router;