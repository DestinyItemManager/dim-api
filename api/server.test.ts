import { app } from './server';
import supertest from 'supertest';

const request = supertest(app);

it('returns basic info from GET /', async (done) => {
  // Sends GET Request to / endpoint
  const response = await request.get('/');

  expect(response.status).toBe(200);
  done();
});

it('create new apps through /new_app', async (done) => {
  const response = await request
    .post('/new_app')
    .send({
      id: 'test-app',
      bungieApiKey: 'test-api-key',
      origin: 'https://localhost:8080'
    })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.app.dimApiKey).toBeDefined();

  // Test that creating an app is idempotent
  const response2 = await request
    .post('/new_app')
    .send({
      id: 'test-app',
      bungieApiKey: 'test-api-key',
      origin: 'https://localhost:8080'
    })
    .expect('Content-Type', /json/)
    .expect(200);

  // Same API Key
  expect(response2.body.app.dimApiKey).toEqual(response.body.app.dimApiKey);
  done();
});
