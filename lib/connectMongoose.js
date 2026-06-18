/* eslint-disable no-console */
'use strict';

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const conn = mongoose.connection;

conn.on('error', err => {
  console.error('Error de conexión', err);
  process.exit(1);
});

conn.once('open', () => {
  console.log('Conectado a MongoDB en', conn.name);
});

mongoose.connect(process.env.MONGOOSE_CONNECTION_STRING,
  { useNewUrlParser: true, useCreateIndex: true, autoIndex: false /*set to false on production*/ }
);

module.exports = conn;