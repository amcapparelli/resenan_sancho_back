var jwt = require('jsonwebtoken');

module.exports.verifyToken = () => (req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, authData) => {
      if (err) {
        res.json({ message: 'something went wrong' });
      } else {
        req.authData = authData;
        next();
      }
    });
  } else {
    res.json({ message: 'no tienes autorización para realizar esta operación' });
  }
};