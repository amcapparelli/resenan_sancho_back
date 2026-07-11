const express = require('express');
var jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');
const Reviewer = require('../models/reviewer');
const bcrypt = require('bcrypt');
const { removeKeys } = require('../utils/removeKeys');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.WRITERS_LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;
const authHeader = 'Basic ' + Buffer.from('anystring:' + mailchimpApiKey).toString('base64');

router.post('/', async function (req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.json({ success: false, message: 'No existe un usuario con ese email' });
      return;
    }
    let userLogged = removeKeys(user._doc, 'password');
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { user: userLogged },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: true,
        path: '/'
      });
      userLogged.token = token;
      const reviewer = await Reviewer.findOne({ author: user._id });
      if (user.emailAuthorListStatus) {
        // Sync the author's Mailchimp subscription status. A failed lookup must
        // never block login, so guard on response.ok and swallow errors: on a
        // non-2xx Mailchimp response the body's `status` is a numeric HTTP code,
        // not a subscription string, and must not be persisted.
        try {
          const response = await fetch(`${url}${user.email.toLowerCase()}`, {
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              'Authorization': authHeader
            }
          });
          if (response.ok) {
            const body = await response.json();
            if (body.status !== user.emailAuthorListStatus) {
              await User.updateOne({ _id: user._id }, { emailAuthorListStatus: body.status });
              userLogged.emailAuthorListStatus = body.status;
            }
          }
        } catch (mcErr) {
          // Mailchimp unreachable — skip the status sync, still log the user in.
        }
      }
      res.json({
        message: 'usuario logueado correctamente',
        success: true,
        user: { ...userLogged, reviewerInfo: reviewer },
      });
      return;
    }
    res.json({ message: 'credenciales incorrectas' });
  } catch (error) {
    res.json(error);
  }
});

router.get('/session', function (req, res) {
  try {
    const { token } = req.cookies;
    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, async function (err, tokenDecoded) {
      if (err) {
        res.json({ userSession: {} });
        return;
      }
      const user = await User.findOne({ email: tokenDecoded.user.email });
      const reviewer = await Reviewer.findOne({ author: user._id });
      res.json({ userSession: { ...removeKeys(user._doc, 'password'), reviewerInfo: reviewer, token } });
    });
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;