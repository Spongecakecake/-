const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helper');

test('举证水印、点验抽检、私有访问、信任处罚与申诉', async (t) => {
  await h.start();
  t.after(() => h.stop());
  const owner = await h.login('zhangsan');
  const witness = await h.login('lisi');
  const outsider = await h.login('wangwu');
  const admin = await h.login('admin');
  const goal = await h.createGoal(owner.token, { title: '举证测试旗' });
  const flag = await h.plant(owner.token, goal.id, { proofLevel: 'L2', pullEnabled: false });

  const rawGoal = h.ctx.goals.find(g => g.id === goal.id);
  rawGoal.witnessId = witness.user.id;
  h.ctx.saveAll();

  const submitted = await h.call('/api/proofs/submit', {
    method: 'POST', token: owner.token,
    body: { flagId: flag.id, dataUrl: 'data:image/png;base64,aGVsbG8=', source: 'checkin' },
  });
  assert.equal(submitted.status, 200);
  const status = await h.call(`/api/proofs/status?flagId=${flag.id}`, { token: outsider.token });
  assert.equal(status.data.proof.hasProof, true);
  assert.equal(status.data.proof.level, 'witness');

  const req = await h.call('/api/proofs/request', { method: 'POST', token: witness.token, body: { flagId: flag.id } });
  assert.equal(req.status, 200);
  const witnessProof = await h.call('/api/proofs/submit', {
    method: 'POST', token: owner.token,
    body: { flagId: flag.id, requestId: req.data.request.id, source: 'witness', dataUrl: 'data:image/png;base64,d2l0bmVzcw==' },
  });
  assert.equal(witnessProof.status, 200);
  const trustAfter = await h.call('/api/trust/me', { token: owner.token });
  assert.ok(trustAfter.data.trust.score >= 101);

  const randomReq = await h.call('/api/admin/proof-request', {
    method: 'POST', token: admin.token, body: { flagId: flag.id, type: 'random' },
  });
  assert.equal(randomReq.status, 200);
  const autoProof = await h.call('/api/proofs/submit', {
    method: 'POST', token: owner.token,
    body: { flagId: flag.id, requestId: randomReq.data.request.id, source: 'random', dataUrl: 'data:image/png;base64,cmFuZG9t' },
  });
  assert.equal(autoProof.status, 200);
  assert.equal(h.ctx.services.flags.find(flag.id).color, 'auto');
  assert.equal(h.ctx.services.flags.find(flag.id).multiplier, 1.2);

  const denied = await h.call(`/api/proofs/${autoProof.data.proof.id}/file`, { token: outsider.token });
  assert.equal(denied.status, 403);
  const allowed = await h.call(`/api/proofs/${autoProof.data.proof.id}/file`, { token: witness.token });
  assert.equal(allowed.status, 200);

  h.ctx.services.trust.punish(owner.user.id, '证据矛盾', flag.id);
  assert.equal(h.ctx.services.flags.find(flag.id).state, 'void');
  assert.equal(h.ctx.services.points.get(owner.user.id).balance, 0);

  const appeal = await h.call('/api/trust/appeal', { method: 'POST', token: owner.token, body: { reason: '证据被误判' } });
  assert.equal(appeal.status, 200);
  const reviewed = await h.call(`/api/admin/appeals/${appeal.data.appeal.id}`, {
    method: 'POST', token: admin.token, body: { approve: true, reason: '复核通过' },
  });
  assert.equal(reviewed.data.appeal.status, 'approved');
});
