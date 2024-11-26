const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;

beforeEach(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const user = {
    name: testUser.name,
    email: testUser.email,
    roles: [{ role: 'diner' }],
  };
  expect(loginRes.body.user).toMatchObject(user);
});

test('logout', async () => {
  const logoutRes = await request(app)
    .delete('/api/auth')
    .auth(testUserAuthToken, { type: 'bearer' });
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('update user', async () => {
  const testEmail = Math.random().toString(36).substring(2, 12) + '@test.com';

  const updateUserRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .auth(testUserAuthToken, { type: 'bearer' })
    .send({
      email: testEmail,
      password: 'b',
    });

  expect(updateUserRes.status).toBe(200);
  expect(updateUserRes.body.email).toBe(testEmail);
});

test('register error', async () => {
  const registerRes = await request(app).post('/api/auth').send({});
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});
