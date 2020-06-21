var jwt = require('jsonwebtoken');

module.exports.verifyToken = () => (req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, authData) => {
      if (err) {
        res.json({ message: 'unexpectedTokenFailure' });
      } else {
        req.authData = authData;
        next();
      }
    });
  } else {
    res.json({ message: 'authorizationFailed' });
  }
};