/* eslint-disable no-console */
var express = require('express');
var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var app = express();
require('./lib/connectMongoose');

app.use(cors({
  credentials: true,
  origin: process.env.FRONTEND_URL
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser('token'));
app.use(express.static(path.join(__dirname, 'public')));

// Import router
require('./routes/router')(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler (JSON API: respond with JSON, not a rendered view).
// Must declare all 4 args so Express registers it as an error handler.
// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;
