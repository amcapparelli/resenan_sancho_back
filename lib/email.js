const nodemailer = require('nodemailer'),
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    },
  });

const getPasswordResetURL = (user, token) =>
  `${process.env.FRONTEND_URL}/reset?resetToken=${token}&user=${user._id}`;

const resetPasswordTemplate = (user, url) => {
  const from = 'no-reply@resenansancho.com';
  const to = user.email;
  const subject = 'Reseñan Sancho Password Reset';
  const html = `;
  <p>Hey ${user.name || user.email},</p>
  <a href=${url}>Haz click aquí para resetear la contraseña.</a>
  <p>Si no usas este enlace en una hora, caduca.</p>
  <p>RESEÑAN SANCHO</p>
  `;

  return { from, to, subject, html };
};

const bookCopyRequestTemplate = (message, authorEmail, reviewerEmail) => {
  const from = 'no-reply@resenansancho.com';
  const to = authorEmail;
  const subject = '¡Enhorabuena, un reseñador está interesado en tu libro!';
  const html = `;
  <p>Hola,</p>
  <p>¡Tenemos una buena noticia, un reseñador literario quiere un ejemplar de tu libro!</p>
  <p>Este es su mensaje: </p>
  <p>${message}</p>
  <p>Te puedes poner en contacto a través de su email: ${reviewerEmail}</p>
  <p>RESEÑAN SANCHO</p>
  `;

  return { from, to, subject, html };
};

module.exports = {
  transporter,
  getPasswordResetURL,
  resetPasswordTemplate,
  bookCopyRequestTemplate
};