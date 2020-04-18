const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

class Car {
  constructor(model, cv) {
    this._model = model;
    this._cv = cv;
  }
}

app.get('/test', (req, res) => {
  res.status(200).json({ name: 'Test' });
});

app.post('/car', (req, res) => {
  const car = new Car(req.body.model, req.body.cv);
  res.status(200).json({ car });
});

module.exports = app;