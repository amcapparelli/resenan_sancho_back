const express = require('express');
const router = express.Router();
const { verifyToken } = require('../lib/auth');
const User = require('../models/user');
const Reviewer = require('../models/reviewer');
const { toIsoCode } = require('../utils/constants/legacyCountryMap');

router.post('/', verifyToken(), async function (req, res) {
  try {
    const { _id, avatar, country, email, name, lastName } = req.body;
    if (_id !== req.authData.user._id) {
      res.json({ message: 'noPermissions' });
      return;
    }
    // Capa de compatibilidad temporal (docs/country-iso-migration-spec.md, punto 4):
    // durante el deploy no atómico el frontend puede enviar todavía un nombre
    // legacy ("Spain") en vez del código ISO. Normalizamos a ISO alpha-2 antes de
    // guardar; un valor no resoluble (vacío/desconocido) queda como null.
    const countryIso = toIsoCode(country);
    await User.updateOne({ _id }, {
      avatar,
      country: countryIso,
      email,
      lastName,
      name,
    });
    const userUpdated = {
      _id,
      avatar,
      country: countryIso,
      email,
      name,
      lastName
    };
    const reviewer = await Reviewer.findOne({ author: _id });
    res.json({
      success: true,
      message: 'userUpdatedSuccessfully',
      user: { ...userUpdated, reviewerInfo: reviewer }
    });
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;