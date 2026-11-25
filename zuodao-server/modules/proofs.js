// 举证验证 MVP：L1 自证 / L2 上传图片+水印模拟 / 点验 / 抽检 / 私有存储。
const fs = require('fs');
const path = require('path');
const { Router } = require('express');

const DAY = 24 * 3600 * 1000;
const PROOF_DIR = process.env.ZUODAO_PROOF_DIR || path.join(__dirname, '..', 'storage', 'proofs');

module.exports = function createProofs(ctx) {
  const { db, auth, uid, nowISO } = ctx;
  fs.mkdirSync(PROOF_DIR, { recursive: true });

  function all() {
    const v = db.col('proofs');
    return Array.isArray(v) ? v : [];
  }
  function save(list) { db.save('proofs', list); }
  function find(id) { return all().find(p => p.id === id) || null; }
  function hasProof(flagId) { return all().some(p => p.flagId === flagId && p.status === 'submitted'); }
  function fileOf(id) { return path.join(PROOF_DIR, `${id}.txt`); }

  function canView(userId, proof) {
    if (!proof) return false;
    if (ctx.services?.admin?.isAdmin?.(userId)) return true;
    const flag = ctx.services?.flags?.find?.(proof.flagId);
    if (!flag) return false;
    if (flag.ownerId === userId) return true;
    const goal = ctx.services?.flags?.goalFor?.(flag);
    if (!goal) return false;
    return goal.supervisorId === userId || goal.witnessId === userId;
  }

  function cleanup() {
    const list = all();
    const edge = Date.now() - 90 * DAY;
    let changed = false;
    for (const p of list) {
      if (!p.finalizedAt) {
        const flag = ctx.services?.flags?.find?.(p.flagId);
        if (flag && flag.finalizedAt) p.finalizedAt = flag.finalizedAt;
      }
      if (p.finalizedAt && new Date(p.finalizedAt).getTime() < edge) {
        try { fs.unlinkSync(fileOf(p.id)); } catch {}
      }
    }
    const kept = list.filter(p => !p.finalizedAt || new Date(p.finalizedAt).getTime() >= edge);
    if (kept.length !== list.length) { save(kept); changed = true; }
    return changed;
  }

  function processDue() {
    const list = all();
    const now = Date.now();
    let changed = false;
    for (const r of list) {
      if (r.kind !== 'request' || r.status !== 'pending') continue;
      if (new Date(r.dueAt).getTime() > now) continue;
      r.status = 'absent';
      ctx.services?.trust?.change?.(r.targetUserId, -5, '点验/抽检缺席', { flagId: r.flagId, requestId: r.id });
      ctx.services?.events?.record?.('proof_request', { type: r.type, pass: false, absent: true, flagId: r.flagId, userId: r.targetUserId });
      changed = true;
    }
    if (changed) save(list);
    const cleaned = cleanup();
    return changed || cleaned;
  }

  function createRequest({ flagId, type, targetUserId, fromUserId }) {
    const flag = ctx.services?.flags?.find?.(flagId);
    if (!flag) throw new Error('旗不存在');
    const hours = type === 'witness' ? 2 : 24;
    const item = {
      id: uid(),
      kind: 'request',
      flagId,
      userId: fromUserId || 'system',
      fromUserId: fromUserId || 'system',
      targetUserId: targetUserId || flag.ownerId,
      type: type === 'random' ? 'random' : 'witness',
      status: 'pending',
      dueAt: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      createdAt: nowISO(),
    };
    const list = all();
    list.push(item);
    save(list);
    ctx.services?.events?.record?.('proof_request', { type: item.type, flagId, userId: item.targetUserId });
    return item;
  }

  function submit(userId, body = {}) {
    const flag = ctx.services?.flags?.find?.(body.flagId);
    if (!flag) throw new Error('旗不存在');
    if (flag.ownerId !== userId) throw new Error('只有主角可以提交举证');
    let dataUrl = String(body.dataUrl || '');
    if (!dataUrl && body.checkinId) {
      const c = ctx.checkins().find(x => x.id === body.checkinId && x.goalId === flag.goalId && x.userId === userId);
      dataUrl = c && typeof c.photo === 'string' ? c.photo : '';
    }
    if (!dataUrl.startsWith('data:image/')) throw new Error('请上传图片并完成水印');
    const id = uid();
    fs.writeFileSync(fileOf(id), dataUrl.slice(0, 10 * 1024 * 1024), 'utf8');
    const item = {
      id,
      kind: 'proof',
      flagId: flag.id,
      goalId: flag.goalId,
      userId,
      day: /^\d{4}-\d{2}-\d{2}$/.test(body.day || '') ? body.day : ctx.today(),
      source: body.source === 'witness' || body.source === 'random' ? body.source : 'checkin',
      requestId: body.requestId || '',
      watermark: { text: String(ctx.users.find(u => u.id === userId)?.nickname || '做到'), at: nowISO() },
      status: 'submitted',
      createdAt: nowISO(),
    };
    const list = all();
    list.push(item);
    if (item.requestId) {
      const req = list.find(r => r.id === item.requestId);
      if (req) { req.status = 'submitted'; req.submittedAt = nowISO(); }
      ctx.services?.trust?.change?.(userId, 1, item.source === 'random' ? '抽检通过' : '点验通过', { flagId: flag.id });
      if (item.source === 'random') ctx.services?.flags?.markProof?.(flag.id, 'random');
      ctx.services?.events?.record?.('proof_submit', { type: item.source, flagId: flag.id, userId, pass: true, latency_min: 0 });
    }
    save(list);
    return item;
  }

  const router = Router();
  router.use((_req, _res, next) => { processDue(); next(); });

  router.get('/status', auth, (req, res) => {
    const flagId = String(req.query.flagId || '');
    const list = all().filter(p => p.flagId === flagId && p.kind === 'proof');
    res.json({
      proof: {
        hasProof: list.length > 0,
        lastDay: list.length ? list[list.length - 1].day : '',
        level: ctx.services?.flags?.find?.(flagId)?.color || 'self',
      },
    });
  });

  router.get('/requests', auth, (req, res) => {
    const flagId = String(req.query.flagId || '');
    const list = all().filter(p => p.kind === 'request' && p.flagId === flagId && (p.targetUserId === req.user.id || p.fromUserId === req.user.id || ctx.services?.admin?.isAdmin?.(req.user.id)));
    res.json({ requests: list });
  });

  router.post('/submit', auth, (req, res) => {
    try { res.json({ proof: submit(req.user.id, req.body || {}) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.post('/request', auth, (req, res) => {
    try {
      const b = req.body || {};
      const flag = ctx.services?.flags?.find?.(b.flagId);
      if (!flag) throw new Error('旗不存在');
      const goal = ctx.services?.flags?.goalFor?.(flag);
      if (!goal || (goal.supervisorId !== req.user.id && goal.witnessId !== req.user.id)) throw new Error('只有见证人可发起点验');
      const week = Date.now() - 7 * DAY;
      const used = all().some(r => r.kind === 'request' && r.type === 'witness' && r.fromUserId === req.user.id && r.flagId === flag.id && new Date(r.createdAt).getTime() >= week);
      if (used) throw new Error('本周已发起过点验');
      res.json({ request: createRequest({ flagId: flag.id, type: 'witness', targetUserId: flag.ownerId, fromUserId: req.user.id }) });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.get('/:id/file', auth, (req, res) => {
    const p = find(req.params.id);
    if (!p || p.kind !== 'proof') return res.status(404).json({ error: '证据不存在' });
    if (!canView(req.user.id, p)) return res.status(403).json({ error: '无权查看举证材料' });
    try {
      res.type('text/plain').send(fs.readFileSync(fileOf(p.id), 'utf8'));
    } catch {
      res.status(404).json({ error: '证据文件已清理' });
    }
  });

  return { router, all, save, find, hasProof, createRequest, submit, processDue, cleanup, canView };
};
