const fs = require('fs');
const os = require('os');
const path = require('path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zuodao-test-'));
process.env.ZUODAO_DATA_DIR = dataDir;
process.env.ZUODAO_PROOF_DIR = path.join(dataDir, 'proofs');
process.env.NODE_ENV = 'test';

const { app, ctx } = require('../server');
app.use((err, _req, res, _next) => {
  console.error('[test-server-error]', err);
  if (!res.headersSent) res.status(500).json({ error: err.message });
});

let server;
let base;

function start() {
  return new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

function stop() {
  return new Promise(resolve => {
    if (!server) return resolve();
    server.close(() => {
      fs.rmSync(dataDir, { recursive: true, force: true });
      resolve();
    });
  });
}

async function call(pathname, { method = 'GET', token, body } = {}) {
  const res = await fetch(base + pathname, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function login(username, password = '123') {
  const r = await call('/api/auth/login', { method: 'POST', body: { username, password } });
  if (r.status !== 200) throw new Error(`login failed: ${username} ${r.status} ${JSON.stringify(r.data)}`);
  const raw = ctx.users.find(u => u.id === r.data.user.id);
  if (raw) { raw.createdAt = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(); ctx.saveAll(); }
  return { token: r.data.token, user: r.data.user };
}

async function createGoal(token, overrides = {}) {
  const r = await call('/api/goals', {
    method: 'POST',
    token,
    body: {
      title: '测试目标', template: 'habit', goalType: 'habit', checkinType: 'text',
      description: '测试规则', rule: '每天完成', privacy: 'public',
      startDate: new Date().toISOString().slice(0, 10), endDate: '',
      ...overrides,
    },
  });
  if (r.status !== 200) throw new Error(`create goal failed: ${JSON.stringify(r.data)}`);
  const goal = ctx.goals.find(g => g.id === r.data.goal.id);
  if (goal) { goal.status = 'active'; ctx.saveAll(); }
  return r.data.goal;
}

async function plant(token, goalId, overrides = {}) {
  const r = await call('/api/flags/plant', {
    method: 'POST', token,
    body: { goalId, privacy: 'public', proofLevel: 'L2', pullEnabled: true, ...overrides },
  });
  if (r.status !== 200) throw new Error(`plant failed: ${JSON.stringify(r.data)}`);
  return r.data.flag;
}

module.exports = { app, start, stop, call, login, createGoal, plant, ctx, dataDir };
