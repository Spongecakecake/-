// 运营后台：精选、审核、举报、官方号、申诉、开关与八指标看板。
const { Router } = require('express');

const DAY = 24 * 3600 * 1000;

module.exports = function createAdmin(ctx) {
  const { db, auth, uid, nowISO } = ctx;

  function modStore() {
    const m = db.col('moderation');
    if (!m || Array.isArray(m)) return { queue: [], reports: [], logs: [] };
    if (!Array.isArray(m.queue)) m.queue = [];
    if (!Array.isArray(m.reports)) m.reports = [];
    if (!Array.isArray(m.logs)) m.logs = [];
    return m;
  }
  function saveMod(m) { db.save('moderation', m); }
  function flagsConfig() {
    const f = db.col('featureFlags');
    if (!f || Array.isArray(f)) return { flagsField: true, pull: true, pointsShop: true, shareCard: true, featured: [], gray: {} };
    return f;
  }
  function saveFlags(f) { db.save('featureFlags', f); }

  function isAdmin(userId) {
    const user = ctx.users.find(u => u.id === userId);
    if (!user) return false;
    if (user.isAdmin) return true;
    const allow = String(process.env.ZUODAO_ADMINS || 'admin,运营,risk').split(',').map(s => s.trim()).filter(Boolean);
    return allow.includes(user.username) || allow.includes(user.nickname);
  }
  function requireAdmin(req, res, next) {
    if (!isAdmin(req.user.id)) return res.status(403).json({ error: '需要运营权限' });
    next();
  }
  function log(operatorId, action, targetId, before, after) {
    const m = modStore();
    m.logs.unshift({ id: uid(), operatorId, action, targetId, before, after, at: nowISO() });
    m.logs = m.logs.slice(0, 500);
    saveMod(m);
  }

  function addReport({ targetId, flagId, reporterId, reason }) {
    const m = modStore();
    const monthAgo = Date.now() - 30 * DAY;
    const unfounded = m.reports.filter(r => r.reporterId === reporterId && r.status === 'dismissed' && new Date(r.at).getTime() >= monthAgo).length;
    if (unfounded >= 3) throw new Error('本月不成立举报已达 3 次，举报权限暂停 30 天');
    const item = {
      id: uid(),
      targetId,
      flagId,
      reporterId,
      reason: String(reason || '').slice(0, 200),
      status: 'pending',
      at: nowISO(),
      slaAt: new Date(Date.now() + DAY).toISOString(),
    };
    m.reports.unshift(item);
    saveMod(m);
    return item;
  }
  function reports() { return modStore().reports; }

  function settedFeature(name, value) {
    const f = flagsConfig();
    f[name] = !!value;
    saveFlags(f);
    return f;
  }

  function metrics() {
    const summary = ctx.services?.events?.summary?.() || {};
    const flags = ctx.services?.flags?.all?.() || [];
    const fallen = flags.filter(f => f.state === 'fallen' || f.state === 'closed').length;
    const week = Date.now() - 7 * DAY;
    const returned = (ctx.services?.events?.allEvents?.() || []).filter(e => e.type === 'user_return' && new Date(e.at).getTime() >= week).length;
    const rate = fallen ? returned / fallen : 0;
    const alerts = Array.isArray(summary.alerts) ? summary.alerts.slice() : [];
    if (rate < 0.2 && fallen > 0) alerts.push('失败用户 7 日回访低于基线（示例阈值 20%）');
    return {
      ...summary,
      failureReturnRate: Math.round(rate * 1000) / 1000,
      alerts,
      generatedAt: nowISO(),
    };
  }

  const router = Router();
  router.use(auth, requireAdmin);

  router.get('/overview', (_req, res) => {
    res.json({
      config: flagsConfig(),
      pendingModeration: modStore().queue.length + (ctx.services?.standings?.all?.() || []).filter(s => s.status === 'pending').length,
      pendingReports: reports().filter(r => r.status === 'pending').length,
      flags: (ctx.services?.flags?.all?.() || []).length,
    });
  });

  router.get('/feature-flags', (_req, res) => res.json({ config: flagsConfig() }));
  router.post('/feature-flags', (req, res) => {
    const b = req.body || {};
    const f = flagsConfig();
    for (const key of ['flagsField', 'pull', 'pointsShop', 'shareCard']) {
      if (key in b) f[key] = !!b[key];
    }
    saveFlags(f);
    log(req.user.id, 'feature_flags', 'global', null, f);
    res.json({ config: f });
  });

  router.post('/featured', (req, res) => {
    const ids = Array.isArray(req.body?.flagIds) ? req.body.flagIds.slice(0, 20).map(String) : [];
    const f = flagsConfig();
    const before = f.featured || [];
    f.featured = ids;
    saveFlags(f);
    log(req.user.id, 'featured', 'global', before, ids);
    res.json({ featured: ids });
  });

  router.get('/moderation', (_req, res) => {
    const pendingStandings = (ctx.services?.standings?.all?.() || []).filter(s => s.status === 'pending');
    res.json({
      standings: pendingStandings,
      reports: reports().filter(r => r.status === 'pending'),
      appeals: (db.col('trust') || {}),
    });
  });

  router.post('/moderation/:id', (req, res) => {
    const b = req.body || {};
    const item = ctx.services?.standings?.find?.(req.params.id);
    if (!item) return res.status(404).json({ error: '审核对象不存在' });
    const after = ctx.services?.standings?.approve?.(item.id, !!b.approved, b.reason);
    log(req.user.id, 'moderation', item.id, item, after);
    res.json({ standing: after, sla: '10m' });
  });

  router.post('/reports/:id', (req, res) => {
    const m = modStore();
    const item = m.reports.find(r => r.id === req.params.id);
    if (!item) return res.status(404).json({ error: '举报不存在' });
    const uphold = !!(req.body || {}).uphold;
    item.status = uphold ? 'upheld' : 'dismissed';
    item.reviewedBy = req.user.id;
    item.reviewedAt = nowISO();
    item.reviewReason = String((req.body || {}).reason || '').slice(0, 200);
    saveMod(m);
    if (uphold) {
      const list = ctx.services?.standings?.all?.() || [];
      const target = list.find(s => s.id === item.targetId);
      if (target) {
        target.status = 'rejected';
        target.reason = '举报成立';
        ctx.services?.standings?.save?.(list);
        ctx.services?.trust?.change?.(target.userId, -5, '举报成立', { flagId: target.flagId });
      }
    }
    log(req.user.id, 'report_review', item.id, 'pending', item.status);
    res.json({ report: item });
  });

  router.post('/appeals/:id', (req, res) => {
    const b = req.body || {};
    const before = ctx.services?.trust?.reviewAppeal?.(req.params.id, !!b.approve, b.reason);
    log(req.user.id, 'appeal_review', req.params.id, 'pending', before?.status || 'unknown');
    res.json({ appeal: before });
  });

  router.post('/official', (req, res) => {
    const b = req.body || {};
    const item = ctx.services?.standings?.create?.(req.user.id, b, { official: true });
    log(req.user.id, 'official_standing', item.id, null, item);
    res.json({ standing: item });
  });

  router.post('/proof-request', (req, res) => {
    const b = req.body || {};
    const item = ctx.services?.proofs?.createRequest?.({ flagId: b.flagId, type: b.type === 'witness' ? 'witness' : 'random', targetUserId: b.targetUserId });
    log(req.user.id, 'proof_request', item.id, null, item);
    res.json({ request: item });
  });

  router.get('/metrics', (_req, res) => res.json({ metrics: metrics() }));

  return { router, isAdmin, addReport, reports, metrics, log, flagsConfig };
};
