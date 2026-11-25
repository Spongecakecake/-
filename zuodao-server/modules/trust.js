// 信任分、实锤处罚、申诉复核与连败保护。
const { Router } = require('express');

const DAY = 24 * 3600 * 1000;

function blank() {
  return { score: 100, history: [], bans: [], appeals: [], fallHistory: [], noPullUntil: null };
}

module.exports = function createTrust(ctx) {
  const { db, auth, uid, nowISO } = ctx;

  function store() {
    const raw = db.col('trust');
    if (!raw || Array.isArray(raw)) return {};
    return raw;
  }
  function save(s) { db.save('trust', s); }
  function get(userId, s = store()) {
    if (!s[userId]) s[userId] = blank();
    const u = s[userId];
    if (!Array.isArray(u.history)) u.history = [];
    if (!Array.isArray(u.bans)) u.bans = [];
    if (!Array.isArray(u.appeals)) u.appeals = [];
    if (!Array.isArray(u.fallHistory)) u.fallHistory = [];
    return u;
  }

  function change(userId, delta, reason, meta = {}) {
    const s = store();
    const u = get(userId, s);
    const before = u.score;
    u.score = Math.max(0, u.score + Number(delta || 0));
    u.history.unshift({ id: uid(), delta: Number(delta || 0), before, after: u.score, reason, at: nowISO(), ...meta });
    u.history = u.history.slice(0, 300);
    save(s);
    ctx.services?.events?.record?.('trust_change', { userId, delta, reason });
    return u.score;
  }

  function canPlant(userId) {
    const u = get(userId);
    const ban = u.bans.find((b) => b.type === 'plant' && new Date(b.until).getTime() > Date.now());
    return !ban;
  }

  function plantBanLeft(userId) {
    const u = get(userId);
    const ban = u.bans.find((b) => b.type === 'plant' && new Date(b.until).getTime() > Date.now());
    return ban ? ban.until : null;
  }

  function recordFall(userId, flagId) {
    const s = store();
    const u = get(userId, s);
    u.fallHistory.push({ flagId, at: nowISO() });
    u.fallHistory = u.fallHistory.filter((x) => Date.now() - new Date(x.at).getTime() < 60 * DAY);
    const recent = u.fallHistory.filter((x) => Date.now() - new Date(x.at).getTime() < 30 * DAY);
    if (recent.length >= 2) {
      u.noPullUntil = new Date(Date.now() + 30 * DAY).toISOString();
    }
    save(s);
  }

  function noPullLocked(userId) {
    const u = get(userId);
    return !!u.noPullUntil && new Date(u.noPullUntil).getTime() > Date.now();
  }

  function loseStreak(userId) {
    const u = get(userId);
    if (!noPullLocked(userId)) return null;
    return u.noPullUntil;
  }

  function punish(userId, reason, flagId = '') {
    const s = store();
    const u = get(userId, s);
    u.score = 0;
    u.history.unshift({ id: uid(), delta: -100, before: 100, after: 0, reason: `实锤造假：${reason}`, at: nowISO(), flagId });
    u.bans.push({ type: 'plant', reason, until: new Date(Date.now() + 90 * DAY).toISOString(), at: nowISO() });
    s[userId] = u;
    save(s);

    if (flagId) {
      ctx.services?.flags?.voidFlag?.(flagId, reason);
      ctx.services?.points?.voidFlag?.(flagId);
    }
    ctx.services?.points?.clearUser?.(userId);
    ctx.services?.events?.record?.('trust_change', { userId, delta: -100, reason: 'cheat' });
    return u;
  }

  function appeal(userId, reason) {
    const s = store();
    const u = get(userId, s);
    const item = { id: uid(), userId, reason: String(reason || '').slice(0, 300), status: 'pending', at: nowISO(), reviewedAt: null };
    u.appeals.unshift(item);
    save(s);
    return item;
  }

  function reviewAppeal(appealId, approve, reason) {
    const s = store();
    for (const u of Object.values(s)) {
      const a = (u.appeals || []).find((x) => x.id === appealId);
      if (!a) continue;
      a.status = approve ? 'approved' : 'rejected';
      a.reviewedAt = nowISO();
      a.reviewReason = String(reason || '').slice(0, 200);
      if (approve) {
        u.score = Math.max(0, u.score + 10);
        u.bans = (u.bans || []).filter((b) => new Date(b.until).getTime() <= Date.now());
        u.history.unshift({ id: uid(), delta: 10, reason: '申诉误判补偿', at: nowISO() });
      }
      save(s);
      return a;
    }
    return null;
  }

  const router = Router();
  router.get('/me', auth, (req, res) => {
    const u = get(req.user.id);
    res.json({
      trust: {
        score: u.score,
        history: u.history.slice(0, 100),
        canPlant: canPlant(req.user.id),
        plantBanUntil: plantBanLeft(req.user.id),
        noPullUntil: u.noPullUntil,
        appeals: u.appeals.slice(0, 20),
      },
    });
  });
  router.post('/appeal', auth, (req, res) => {
    const reason = String((req.body || {}).reason || '').trim();
    if (!reason) return res.status(400).json({ error: '请填写申诉理由' });
    res.json({ appeal: appeal(req.user.id, reason), sla: '48h' });
  });

  return { router, get, change, canPlant, plantBanLeft, recordFall, noPullLocked, loseStreak, punish, appeal, reviewAppeal };
};
