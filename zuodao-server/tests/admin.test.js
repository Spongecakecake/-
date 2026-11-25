const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helper');

test('运营开关、精选、官方号、审核举报与指标看板', async (t) => {
  await h.start();
  t.after(() => h.stop());
  const owner = await h.login('zhangsan');
  const defender = await h.login('lisi');
  const reporter = await h.login('wangwu');
  const admin = await h.login('admin');
  const goal = await h.createGoal(owner.token, { title: '运营测试旗' });
  const flag = await h.plant(owner.token, goal.id, { proofLevel: 'L2', pullEnabled: true });
  const standing = await h.call('/api/standings', { method: 'POST', token: defender.token, body: { flagId: flag.id, side: 'defend', content: '我陪你一起' } });

  const off = await h.call('/api/admin/feature-flags', { method: 'POST', token: admin.token, body: { pull: false } });
  assert.equal(off.data.config.pull, false);
  const tempt = await h.call('/api/standings', { method: 'POST', token: reporter.token, body: { flagId: flag.id, side: 'tempt', contentType: 'template', templateId: 'T01' } });
  assert.equal(tempt.status, 400);
  await h.call('/api/admin/feature-flags', { method: 'POST', token: admin.token, body: { pull: true } });

  const featured = await h.call('/api/admin/featured', { method: 'POST', token: admin.token, body: { flagIds: [flag.id] } });
  assert.deepEqual(featured.data.featured, [flag.id]);
  const field = await h.call('/api/flags/field?tab=latest', { token: owner.token });
  assert.equal(field.data.flags.find(f => f.id === flag.id).featured, true);

  const official = await h.call('/api/admin/official', {
    method: 'POST', token: admin.token,
    body: { flagId: flag.id, side: 'defend', contentType: 'custom', content: '官方护旗队来啦' },
  });
  assert.equal(official.status, 200);
  assert.equal(official.data.standing.official, true);
  assert.equal(official.data.standing.countable, false);

  for (let i = 0; i < 3; i++) {
    const r = await h.call(`/api/standings/${standing.data.standing.id}/report`, {
      method: 'POST', token: reporter.token, body: { reason: `测试举报 ${i + 1}` },
    });
    assert.equal(r.status, 200);
    const queue = await h.call('/api/admin/moderation', { token: admin.token });
    const item = queue.data.reports.find(x => x.id === r.data.report.id);
    await h.call(`/api/admin/reports/${item.id}`, { method: 'POST', token: admin.token, body: { uphold: false, reason: '证据不足' } });
  }
  const blocked = await h.call(`/api/standings/${standing.data.standing.id}/report`, {
    method: 'POST', token: reporter.token, body: { reason: '再来一次' },
  });
  assert.equal(blocked.status, 400);
  assert.match(blocked.data.error, /举报权限暂停/);

  const metrics = await h.call('/api/admin/metrics', { token: admin.token });
  assert.equal(metrics.status, 200);
  assert.ok('penetration' in metrics.data.metrics);
  assert.ok('optoutRate' in metrics.data.metrics);
  assert.ok(Array.isArray(metrics.data.metrics.alerts));
});
