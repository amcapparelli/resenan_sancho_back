/* eslint-disable no-console */
var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
const User = require('../models/user');
const {
  transporter,
  getPasswordResetURL,
  resetPasswordTemplate
} = require('../lib/email');

const usePasswordHashToMakeToken = ({
  password: passwordHash,
  _id: userId,
  created_at
}) => {
  const secret = passwordHash + '-' + created_at;
  const token = jwt.sign({ userId }, secret, {
    expiresIn: 3600 // 1 hour
  });
  return token;
};

router.post('/forgot', async function (req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.json({ success: false, message: 'no user with that email' });
    }

    const resetPasswordToken = usePasswordHashToMakeToken(user);
    const url = getPasswordResetURL(user, resetPasswordToken);
    const emailTemplate = resetPasswordTemplate(user, url);
    const sendEmail = () => {
      transporter.sendMail(emailTemplate, (err) => {
        if (err) {
          console.log('err', err);
          res.status(500).json('Error sending email');
        }
        res.json({ success: true, message: 'Te hemos enviado un email' });
      });
    };
    sendEmail();
  } catch (err) {
    next(err);
    return;
  }
});

router.post('/reset/:token/:userId', async function (req, res) {
  try {
    const { token, userId } = req.params;
    const { password } = req.body;
    const user = await User.findOne({ _id: userId });
    const secret = user.password + '-' + user.created_at;
    let userRequesting;
    jwt.verify(token, secret, (err, authData) => {
      if (err) {
        res.json({ message: 'token expired' });
      } else {
        userRequesting = authData.userId;
      }
    });
    if (userRequesting === user.id) {
      try {
        const newPassword = await User.hashPassword(password);
        await User.updateOne({ _id: userId }, {
          password: newPassword,
        });
        res.json({ success: true, message: 'Contraseña cambiada' });
      } catch (error) {
        res.json(error);
      }
    } else {
      res.json({ success: false, message: 'no tienes permisos para realizar esta acción.' });
    }
  } catch (error) {
    res.json({ success: false, message: 'Lo sentimos, hubo un error. Vuelve a intentarlo.' });
  }
});

module.exports = router;
