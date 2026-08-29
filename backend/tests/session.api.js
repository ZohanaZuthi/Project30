process.env.LMS_TEST_REFRESH = 'true';

const assert = require('node:assert/strict');
const request = require('supertest');
const { setupStrapi, cleanupStrapi } = require('./strapi');

async function run() {
  const instance = await setupStrapi();
  const app = instance.server.httpServer;
  const studentRole = await instance.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'student' } });
  const user = await instance.plugin('users-permissions').service('user').add({
    username: 'session_student',
    email: 'session_student@example.test',
    password: 'Pass1234!',
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: studentRole.id,
  });

  const login = await request(app).post('/api/auth/local').send({
    identifier: 'session_student@example.test',
    password: 'Pass1234!',
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  assert.ok(login.body.jwt);
  assert.ok(login.body.refreshToken);

  await instance.db.query('plugin::users-permissions.user').update({
    where: { id: user.id },
    data: { role: null },
  });
  const identity = await request(app)
    .get('/api/lms/me')
    .set({ Authorization: `Bearer ${login.body.jwt}` });
  assert.equal(identity.status, 200, JSON.stringify(identity.body));
  assert.equal(identity.body.data.role, null);

  const logout = await request(app)
    .post('/api/lms/logout')
    .send({ refreshToken: login.body.refreshToken });
  assert.equal(logout.status, 200, JSON.stringify(logout.body));

  const malformedLogout = await request(app)
    .post('/api/lms/logout')
    .send({ refreshToken: 'not-a-refresh-token' });
  assert.equal(malformedLogout.status, 200, JSON.stringify(malformedLogout.body));
  assert.deepEqual(malformedLogout.body, logout.body);

  const refresh = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken: login.body.refreshToken });
  assert.equal(refresh.status, 401, JSON.stringify(refresh.body));
  console.log('Refresh-session API test passed.');
}

run()
  .finally(cleanupStrapi)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
