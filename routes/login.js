const express = require('express');
var jwt = require('jsonwebtoken');
const router = express.Router();
var request = require('superagent');
const User = require('../models/user');
const Reviewer = require('../models/reviewer');
const bcrypt = require('bcrypt');
const { removeKeys } = require('../utils/removeKeys');

const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listUniqueId = process.env.WRITERS_LIST_UNIQUE_ID;
const url = `https://${mailchimpInstance}.api.mailchimp.com/3.0/lists/${listUniqueId}/members/`;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;

router.post('/', async function (req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.json({ success: false, message: 'No existe un usuario con ese email' });
    }
    let userLogged = removeKeys(user._doc, 'password');
    if (user && await bcrypt.compare(password, user.password)) {
      jwt.sign(
        { user: userLogged },
        process.env.JWT_SECRET,
        { expiresIn: '1d' },
        (err, token) => {
          if (err) {
            res.json({ message: 'something went wrong' });
            return;
          }
          userLogged.token = token;
          res.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
            sameSite: 'none',
            secure: true, //Todo change this according to prod/dev
            path: '/'
          });
        });
      const reviewer = await Reviewer.findOne({ author: user._id });
      if (user.emailAuthorListStatus) {
        const response = await request
          .get(`${url}${user.email.toLowerCase()}`)
          .set('Content-Type', 'application/json;charset=utf-8')
          .set('Authorization', 'Basic ' + new Buffer('anystring:' + mailchimpApiKey).toString('base64'));
        if (response.body.status !== user.emailAuthorListStatus) {
          await User.updateOne({ _id: user._id }, { emailAuthorListStatus: response.body.status });
          userLogged.emailAuthorListStatus = response.body.status;
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
    jwt.verify(token, process.env.JWT_SECRET, async function (err, tokenDecoded) {
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