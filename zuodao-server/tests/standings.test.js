const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helper');

test('站队频率、模板、金额拦截、审核、精选与戳到我', async (t) => {
  await h.start();
  t.after(() => h.stop());
  const owner = await h.login('zhangsan');
  const defender = await h.login('lisi');
  const templater = await h.login('wangwu');
  const customUser = await h.login('zhaoliu');
  const admin = await h.login('admin');
  const goal = await h.createGoal(owner.token, { title: '站队测试旗' });
  const flag = await h.plant(owner.token, goal.id, { proofLevel: 'L2', pullEnabled: true });

  const d1 = await h.call('/api/standings', { method: 'POST', token: defender.token, body: { flagId: flag.id, side: 'defend', content: '加油，我陪你' } });
  assert.equal(d1.status, 200);
  const d2 = await h.call('/api/standings', { method: 'POST', token: defender.token, body: { flagId: flag.id, side: 'defend', content: '再来一条' } });
  assert.equal(d2.status, 400);
  assert.match(d2.data.error, /每日只能站队一次/);

  const tpls = await h.call('/api/standings/templates', { token: templater.token });
  assert.ok(tpls.data.templates.length >= 30);
  const t1 = await h.call('/api/standings', { method: 'POST', token: templater.token, body: {
    flagId: flag.id, side: 'tempt', contentType: 'template', templateId: tpls.data.templates[0].id,
  } });
  assert.equal(t1.status, 200);

  const money = await h.call('/api/standings', { method: 'POST', token: customUser.token, body: {
    flagId: flag.id, side: 'tempt', contentType: 'custom', content: '放弃给你转 500 元',
  } });
  assert.equal(money.status, 400);
  assert.match(money.data.error, /金额/);

  const custom = await h.call('/api/standings', { method: 'POST', token: customUser.token, body: {
    flagId: flag.id, side: 'tempt', contentType: 'custom', content: '今天别偷懒呀',
  } });
  assert.equal(custom.status, 200);
  assert.equal(custom.data.standing.status, 'pending');

  const queue = await h.call('/api/admin/moderation', { token: admin.token });
  assert.ok(queue.data.standings.some(s => s.id === custom.data.standing.id));

  const approved = await h.call(`/api/admin/moderation/${custom.data.standing.id}`, {
    method: 'POST', token: admin.token, body: { approved: true, reason: '内容合规' },
  });
  assert.equal(approved.data.standing.status, 'published');

  const featured = await h.call(`/api/standings/${d1.data.standing.id}/feature`, { method: 'POST', token: owner.token, body: {} });
  assert.equal(featured.data.standing.featured, true);
  const poked = await h.call(`/api/standings/${d1.data.standing.id}/poke`, { method: 'POST', token: owner.token, body: {} });
  assert.equal(poked.data.standing.pokedCount, 1);

  const ledger = await h.call('/api/points/ledger', { token: defender.token });
  assert.ok(ledger.data.ledger.some(x => x.source === '留言上墙'));
  assert.ok(ledger.data.ledger.some(x => x.source === '收进旗帜'));
  assert.ok(ledger.data.ledger.some(x => x.source === '戳到我'));
});
