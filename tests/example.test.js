/* eslint-disable no-undef */
const request = require('supertest');
const app = require('./app');

describe('Testing backend', () => {
  test('[NO AUTH] GET /test should return a test object', async () => {
    const resp = await request(app).get('/test').expect(200);
    expect(resp.body.name).toBe('Test');
  });

  test('[NO AUTH] POST /car should return a car object', async () => {
    const resp = await request(app)
      .post('/car')
      .send({
        model: 'tesla',
        cv: 450,
      })
      .expect(200);
    expect(resp.body.car).toBeDefined();
    expect(resp.body.car._model).toBe('tesla');
    expect(resp.body.car._cv).toBe(450);
  });
});