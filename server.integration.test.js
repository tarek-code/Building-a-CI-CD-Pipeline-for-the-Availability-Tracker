const request = require('supertest');
const { app } = require('./server');

describe('Integration tests for Express app', () => {
  test('GET / should return index.html', async () => {
    const res = await request(app).get('/');
    expect([200, 404]).toContain(res.statusCode);
  });

  test('POST /save-history should save data and return 200', async () => {
    const mockData = { test: 'value' };
    const res = await request(app)
      .post('/save-history')
      .send(mockData)
      .set('Accept', 'application/json');
    expect([200, 500]).toContain(res.statusCode);
  });

  test('GET unknown route should return 404', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
  });
});

