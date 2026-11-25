// 统一埋点事件与八项指标聚合口径。
const { Router } = require('express');

const WINDOW_MS = 7 * 24 * 3600 * 1000;

function median(nums) {
  if (!nums.length) return null;
  const a = nums.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

function at(obj, key) {
  const v = obj && obj[key];
  return v == null ? '' : String(v);
}

module.exports = function createEvents(ctx) {
  const { db, auth, uid, nowISO } = ctx;

  function store() {
    const raw = db.col('metrics');
    if (!raw || Array.isArray(raw)) return { events: [], aggregates: {} };
    if (!Array.isArray(raw.events)) raw.events = [];
    if (!raw.aggregates || typeof raw.aggregates !== 'object') raw.aggregates = {};
    return raw;
  }

  function record(type, props = {}) {
    const m = store();
    m.events.push({ id: uid(), type, at: nowISO(), ...props });
    if (m.events.length > 10000) m.events = m.events.slice(-10000);
    db.save('metrics', m);
    return m.events[m.events.length - 1];
  }

  function allEvents() {
    return store().events;
  }

  function since(ms) {
    const edge = Date.now() - ms;
    return allEvents().filter((e) => new Date(e.at).getTime() >= edge);
  }

  function summary() {
    const week = since(WINDOW_MS);
    const users = new Set(week.map((e) => at(e, 'userId')).filter(Boolean));
    const fieldVisitors = new Set(
      week.filter((e) => e.type === 'flag_view').map((e) => at(e, 'userId') || at(e, 'visitorId')).filter(Boolean)
    );
    const plants = week.filter((e) => e.type === 'flag_plant');
    const responses = week.filter((e) => e.type === 'defend_send' || e.type === 'tempt_send');
    const firstResponse = [];
    for (const p of plants) {
      const first = responses.find((r) => r.flagId === p.flagId && new Date(r.at).getTime() >= new Date(p.at).getTime());
      if (first) firstResponse.push((new Date(first.at).getTime() - new Date(p.at).getTime()) / 60000);
    }
    const guestViews = new Set(week.filter((e) => e.type === 'flag_view' && e.is_guest).map((e) => at(e, 'visitorId')).filter(Boolean));
    const registered = new Set(week.filter((e) => e.type === 'flag_view' && e.visitor_register).map((e) => at(e, 'visitorId')).filter(Boolean));
    const optouts = new Set(week.filter((e) => e.type === 'flag_optout_pull').map((e) => at(e, 'userId')).filter(Boolean));
    const tempted = new Set(week.filter((e) => e.type === 'tempt_send').map((e) => at(e, 'userId')).filter(Boolean));
    const fallen = week.filter((e) => e.type === 'flag_result' && e.result === 'fallen');
    const revived = week.filter((e) => e.type === 'flag_revive');
    const proofRequests = week.filter((e) => e.type === 'proof_request');
    const proofSubmitted = week.filter((e) => e.type === 'proof_submit');
    const standingsTotal = (ctx.services?.standings?.all?.() || []).length;
    const reports = (ctx.services?.admin?.reports?.() || []).length;
    const alerts = [];

    const penetration = users.size ? fieldVisitors.size / users.size : 0;
    const optoutRate = tempted.size ? optouts.size / tempted.size : 0;
    const registrationRate = guestViews.size ? registered.size / guestViews.size : 0;
    const reviveRate = fallen.length ? revived.length / fallen.length : 0;
    const reportRate = standingsTotal ? reports / standingsTotal : 0;
    const friction = proofRequests.length ? Math.max(0, proofRequests.length - proofSubmitted.length) / proofRequests.length : 0;

    if (optoutRate > 0.08) alerts.push('免战/关闭率超过 8%');
    if (friction > 0.10) alerts.push('举证摩擦流失超过 10%');
    if (reportRate > 0.005) alerts.push('站队举报率超过 0.5%');

    return {
      window: '7d',
      weeklyActiveUsers: users.size,
      flagFieldUsers: fieldVisitors.size,
      penetration: Math.round(penetration * 1000) / 1000,
      firstResponseMinutes: median(firstResponse),
      defendToRegister: Math.round(registrationRate * 1000) / 1000,
      reviveRate: Math.round(reviveRate * 1000) / 1000,
      optoutRate: Math.round(optoutRate * 1000) / 1000,
      failureReturnRate: null,
      reportRate: Math.round(reportRate * 1000) / 1000,
      proofFriction: Math.round(friction * 1000) / 1000,
      alerts,
      counts: { plants: plants.length, responses: responses.length, fallen: fallen.length, revived: revived.length },
    };
  }

  function failureReturn(userId) {
    record('user_return', { userId, reason: 'after_flag_fall' });
  }

  const router = Router();
  router.post('/collect', auth, (req, res) => {
    const b = req.body || {};
    const type = String(b.type || '').slice(0, 60);
    if (!type) return res.status(400).json({ error: '事件名不可为空' });
    const e = record(type, {
      userId: req.user.id,
      flagId: b.flagId || '',
      goalId: b.goalId || '',
      from: b.from || '',
      is_guest: !!b.is_guest,
    });
    res.json({ ok: true, event: { id: e.id, type: e.type, at: e.at } });
  });
  router.get('/summary', auth, (_req, res) => res.json({ summary: summary() }));

  return { router, record, summary, allEvents, failureReturn };
};
