const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helper');

test('行为分、结算乘数、T+7、商店限购与榜单排除 L1', async (t) => {
  await h.start();
  t.after(() => h.stop());
  const owner = await h.login('zhangsan');
  const defender = await h.login('lisi');
  const goal = await h.createGoal(owner.token, { title: '积分测试旗' });
  const flag = await h.plant(owner.token, goal.id, { proofLevel: 'L2', pullEnabled: false });
  await h.call('/api/standings', { method: 'POST', token: defender.token, body: { flagId: flag.id, side: 'defend', content: '稳住，加油' } });
  await h.call(`/api/goals/${goal.id}/result`, { method: 'POST', token: owner.token, body: { result: 'achieved' } });

  const ledger = await h.call('/api/points/ledger', { token: defender.token });
  const settlement = ledger.data.ledger.find(x => x.kind === 'settlement');
  assert.ok(settlement);
  assert.equal(settlement.amount, 16); // 20 × 0.8
  assert.equal(settlement.status, 'pending');

  const store = h.ctx.services.points.store();
  for (const item of store[defender.user.id].ledger) {
    item.grantAt = new Date(Date.now() - 1000).toISOString();
  }
  h.ctx.services.points.save(store);
  h.ctx.services.points.processDue();
  const summary = await h.call('/api/points/summary', { token: defender.token });
  assert.ok(summary.data.points.balance >= 18); // 行为分 2 + 结算分 16

  h.ctx.services.points.addLedger(defender.user.id, { amount: 400, status: 'granted', kind: 'behavior', reason: '测试注资' });
  const buy1 = await h.call('/api/points/shop/buy', { method: 'POST', token: defender.token, body: { sku: 'delay_card' } });
  assert.equal(buy1.status, 200);
  const buy2 = await h.call('/api/points/shop/buy', { method: 'POST', token: defender.token, body: { sku: 'delay_card' } });
  assert.equal(buy2.status, 400);
  assert.match(buy2.data.error, /本季度/);

  const board = await h.call('/api/points/leaderboard?side=defend', { token: owner.token });
  assert.ok(board.data.rows.some(r => r.userId === defender.user.id));

  const goalL1 = await h.createGoal(owner.token, { title: '自证旗' });
  const flagL1 = await h.plant(owner.token, goalL1.id, { proofLevel: 'L1', pullEnabled: false });
  const low = await h.login('sunqi');
  await h.call('/api/standings', { method: 'POST', token: low.token, body: { flagId: flagL1.id, side: 'defend', content: '自证旗留言' } });
  await h.call(`/api/goals/${goalL1.id}/result`, { method: 'POST', token: owner.token, body: { result: 'achieved' } });
  const board2 = await h.call('/api/points/leaderboard?side=defend', { token: owner.token });
  assert.ok(!board2.data.rows.some(r => r.userId === low.user.id));
});
