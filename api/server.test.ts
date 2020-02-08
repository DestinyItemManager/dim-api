import { app } from './server';
import supertest from 'supertest';

const request = supertest(app);

it('returns basic info from GET /', async (done) => {
  // Sends GET Request to / endpoint
  const response = await request.get('/');

  expect(response.status).toBe(200);
  done();
});
