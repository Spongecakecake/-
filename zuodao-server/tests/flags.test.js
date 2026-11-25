const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helper');

test('插旗、旗场、隐私切换、结局与复活窗', async (t) => {
  await h.start();
  t.after(() => h.stop());
  const a = await h.login('zhangsan');
  const b = await h.login('lisi');
  const goal = await h.createGoal(a.token, { title: '晨跑 21 天' });
  const flag = await h.plant(a.token, goal.id);

  assert.equal(flag.state, 'active');
  assert.equal(flag.proofLevel, 'L2');
  assert.equal(flag.multiplier, 0.8);

  const latest = await h.call('/api/flags/field?tab=latest', { token: b.token });
  assert.equal(latest.status, 200);
  assert.ok(latest.data.flags.some(f => f.id === flag.id));

  const pulled = await h.call(`/api/flags/${flag.id}/pull`, { method: 'POST', token: a.token, body: { enabled: false } });
  assert.equal(pulled.data.flag.pullEnabled, false);
  const pushed = await h.call(`/api/flags/${flag.id}/pull`, { method: 'POST', token: a.token, body: { enabled: true } });
  assert.equal(pushed.data.flag.pullEnabled, true);

  const priv = await h.call(`/api/flags/${flag.id}/privacy`, { method: 'POST', token: a.token, body: { privacy: 'private' } });
  assert.equal(priv.data.flag.privacy, 'private');
  const hidden = await h.call(`/api/flags/${flag.id}`, { token: b.token });
  assert.equal(hidden.status, 403);
  await h.call(`/api/flags/${flag.id}/privacy`, { method: 'POST', token: a.token, body: { privacy: 'public' } });

  const result = await h.call(`/api/goals/${goal.id}/result`, { method: 'POST', token: a.token, body: { result: 'achieved' } });
  assert.equal(result.status, 200);
  assert.equal(h.ctx.services.flags.find(flag.id).state, 'achieved');

  const goal2 = await h.createGoal(a.token, { title: '读书 7 天' });
  const flag2 = await h.plant(a.token, goal2.id);
  await h.call(`/api/goals/${goal2.id}/result`, { method: 'POST', token: a.token, body: { result: 'failed' } });
  assert.equal(h.ctx.services.flags.find(flag2.id).state, 'fallen');
  h.ctx.services.points.grantItem(a.user.id, 'revive_ticket', 1);
  const revived = await h.call(`/api/flags/${flag2.id}/revive`, { method: 'POST', token: a.token, body: {} });
  assert.equal(revived.status, 200);
  assert.ok(revived.data.flag.id);
  assert.notEqual(revived.data.flag.id, flag2.id);

  const late = await h.call(`/api/flags/${flag.id}`, { token: b.token });
  assert.equal(late.data.flag.state, 'achieved');
});
