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
  const from = 'resenansancho-no-reply@resenansancho.com';
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

const bookCopyRequestTemplate = (message, authorEmail, reviewerEmail, bookTitle) => {
  const from = 'resenansancho-no-reply@resenansancho.com';
  const to = authorEmail;
  const subject = '¡Enhorabuena, un reseñador está interesado en tu libro!';
  const html = `;
  <p>Hola,</p>
  <p>¡Tenemos una buena noticia, un reseñador literario quiere un ejemplar de tu libro ${bookTitle}!</p>
  <p>Este es su mensaje: </p>
  <p>${message}</p>
  <p>Te puedes poner en contacto a través de su email: ${reviewerEmail}</p>
  <p>RESEÑAN SANCHO</p>
  `;

  return { from, to, subject, html };
};

const emailPromoTemplate = (authorEmail) => {
  const from = 'resenansancho-no-reply@resenansancho.com';
  const to = authorEmail;
  const subject = '¡Enhorabuena, la promoción de tu libro está en marcha!';
  const html = `;
  <p>Hola,</p>
  <p>¡La promoción de tu libro está en marcha!</p>
  <p>Para avanzar, necesitamos leer tu novela para recomendarla vía email a los reseñadores literarios.</p>
  <p>Para ello puedes enviar un ejemplar digital a alejandro@resenansancho.com</p>
  <p>Si prefieres enviar un ejemplar impreso, puedes escribir a esa misma dirección solicitando instrucciones para ello.</p>
  <p>¡Estamos deseando ponernos con ello y ayudarte a conseguir más reseñas.</p>
  <p>RESEÑAN SANCHO</p>
  `;

  return { from, to, subject, html };
};

const newBookTemplate = (authorEmail, authorName, bookTitle) => {
  const from = 'resenansancho-no-reply@resenansancho.com';
  const to = authorEmail;
  const subject = `¡No te olvides de agregar ejemplares de ${bookTitle}!`;
  const html = `;
  <p>Hola ${authorName},</p>
  <p>¡Enhorabuena, ya has dado el primer paso para promocionar tu libro <b>${bookTitle}</b>!</p>
  <p>Esto es lo que puedes hacer ahora para <b>acelerar la promoción de tu libro</b>: </p>
  <p>Desde tu área privada, en la sección <b>MIS LIBROS</b>, podrás añadir ejemplares que aparecerán como
  disponibles para que los reseñadores literarios te los soliciten.</p>
  <p>Empieza utilizando la opción PROMOCIONAR y selecciona <b>la oferta para añadir 2 ejemplares gratuitos</b> para probar el servicio.</p>
  <p>Si quieres añadir más ejemplares podrás hacerlo todas las veces que quieras con las opciones de pago.</p>
  <p>Si algún reseñador literario solicita un ejemplar te lo notificaremos por email. </p>
  <p>¡Mucha suerte con la promoción de tu libro!</p>
  <p>RESEÑAN SANCHO</p>
  `;

  return { from, to, subject, html };
};

module.exports = {
  transporter,
  getPasswordResetURL,
  resetPasswordTemplate,
  bookCopyRequestTemplate,
  emailPromoTemplate,
  newBookTemplate
};