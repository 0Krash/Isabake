const app = require('../app');
const request = require('supertest');

describe('GET /transactions', () => {
  test('should respond with 200 status code', async () => {
    const response = await request(app).get('/api/v1/transactions').send();
    expect(response);
  });
});
