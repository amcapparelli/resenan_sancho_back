const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { verifyToken } = require('../lib/auth');

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
        res.json({ success: true, message: 'usuario borrado' });
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Hubo un error al intentar borrar el usuario' });
    next(err);
  }
});

module.exports = router;