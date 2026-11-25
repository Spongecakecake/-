// 积分经济：行为分、结算分、成色乘数、T+7 发放、账本、商店与排行榜。
const { Router } = require('express');

const DAY = 24 * 3600 * 1000;
const SHOP = {
  delay_card: { name: '延期卡', price: 300, period: 'quarter', limit: 1 },
  revive_ticket: { name: '重启券', price: 200, period: 'year', limit: 3 },
  no_pull_shield: { name: '免战盾', price: 150, period: 'none', limit: 99 },
  flag_skin_ink: { name: '旗面皮肤·墨绿', price: 100, period: 'none', limit: 1 },
  flag_skin_gold: { name: '旗面皮肤·鎏金', price: 500, period: 'none', limit: 1 },
  lottery: { name: '周边抽奖', price: 50, period: 'none', limit: 99 },
};

const periodKey = (period, d = new Date()) => {
  if (period === 'year') return String(d.getFullYear());
  if (period === 'quarter') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return 'all';
};

function blank() {
  return { balance: 0, pending: 0, deducted: 0, ledger: [], inventory: {}, purchases: {}, shields: {} };
}

module.exports = function createPoints(ctx) {
  const { db, auth, uid, nowISO } = ctx;

  function store() {
    const raw = db.col('points');
    if (!raw || Array.isArray(raw)) return {};
    return raw;
  }
  function save(s) { db.save('points', s); }
  function get(userId, s = store()) {
    if (!s[userId]) s[userId] = blank();
    const u = s[userId];
    if (!Array.isArray(u.ledger)) u.ledger = [];
    if (!u.inventory || typeof u.inventory !== 'object') u.inventory = {};
    if (!u.purchases || typeof u.purchases !== 'object') u.purchases = {};
    if (!u.shields || typeof u.shields !== 'object') u.shields = {};
    return u;
  }

  function addLedger(userId, entry) {
    const s = store();
    const u = get(userId, s);
    const status = entry.status || 'pending';
    const amount = Math.round(Number(entry.amount) || 0);
    const item = {
      id: uid(),
      kind: entry.kind || 'behavior',
      source: entry.source || '',
      reason: entry.reason || '',
      flagId: entry.flagId || '',
      goalId: entry.goalId || '',
      side: entry.side || '',
      amount,
      baseAmount: entry.baseAmount == null ? amount : entry.baseAmount,
      status,
      official: !!entry.official,
      at: nowISO(),
      grantAt: status === 'pending' ? new Date(Date.now() + 7 * DAY).toISOString() : null,
    };
    u.ledger.push(item);
    if (status === 'pending') u.pending += amount;
    else if (status === 'granted') u.balance += amount;
    else if (status === 'deducted') {
      u.deducted += Math.abs(amount);
      u.balance -= Math.abs(amount);
    }
    save(s);
    return item;
  }

  function processDue() {
    const s = store();
    let changed = false;
    const now = Date.now();
    for (const u of Object.values(s)) {
      for (const item of u.ledger || []) {
        if (item.status === 'pending' && item.grantAt && new Date(item.grantAt).getTime() <= now) {
          u.pending -= item.amount;
          u.balance += item.amount;
          item.status = 'granted';
          item.grantedAt = nowISO();
          changed = true;
        }
      }
    }
    if (changed) save(s);
    return changed;
  }

  function behavior(userId, amount, meta = {}) {
    const n = Math.round(Number(amount) || 0);
    if (!n) return null;
    return addLedger(userId, { ...meta, amount: n, kind: meta.kind || 'behavior', status: 'pending' });
  }

  function settleFlag(flag, result, opts = {}) {
    const standings = ctx.services?.standings?.forFlag?.(flag.id) || [];
    const multiplier = Number(flag.multiplier) || 0.5;
    let count = 0;
    for (const s of standings) {
      if (s.status !== 'published' || !s.countable) continue;
      let amount = 0;
      if (result === 'achieved') {
        if (s.side === 'defend') amount = 20 * multiplier;
      } else if (result === 'fallen') {
        if (s.side === 'tempt') amount = 15 * multiplier * (opts.revive ? 0.5 : 1);
        else amount = 5 * (opts.revive ? 2 : 1);
      }
      amount = Math.round(amount);
      if (amount <= 0) continue;
      addLedger(s.userId, {
        kind: 'settlement',
        amount,
        flagId: flag.id,
        source: flag.title || '',
        reason: result === 'achieved' ? '旗成结算' : '旗落结算',
        side: s.side,
        official: !!s.official,
      });
      count += 1;
    }
    return count;
  }

  function reverseSettlement(flagId) {
    const s = store();
    let changed = false;
    for (const u of Object.values(s)) {
      for (const item of u.ledger || []) {
        if (item.flagId !== flagId || item.kind !== 'settlement' || item.status === 'deducted') continue;
        if (item.status === 'pending') u.pending -= item.amount;
        if (item.status === 'granted') u.balance -= item.amount;
        item.status = 'deducted';
        item.deductedAt = nowISO();
        item.reason = `${item.reason || ''}（复活重算作废）`;
        changed = true;
      }
    }
    if (changed) save(s);
    return changed;
  }

  function clearUser(userId) {
    const s = store();
    const u = get(userId, s);
    for (const item of u.ledger) {
      if (item.status !== 'deducted') {
        item.status = 'deducted';
        item.deductedAt = nowISO();
        item.reason = `${item.reason || ''}（实锤清零）`;
      }
    }
    u.deducted += Math.abs(u.balance) + Math.abs(u.pending);
    u.balance = 0;
    u.pending = 0;
    save(s);
  }

  function voidFlag(flagId) {
    const s = store();
    const amountByUser = {};
    let changed = false;
    for (const u of Object.values(s)) {
      for (const item of u.ledger || []) {
        if (item.flagId !== flagId || ['behavior', 'settlement'].indexOf(item.kind) < 0) continue;
        amountByUser[item.userId || item._userId] = (amountByUser[item.userId || item._userId] || 0) + item.amount;
      }
    }
    for (const [userId] of Object.entries(amountByUser)) {
      const u = s[userId];
      if (!u) continue;
      for (const item of u.ledger) {
        if (item.flagId === flagId && ['behavior', 'settlement'].includes(item.kind) && item.status !== 'deducted') {
          if (item.status === 'pending') u.pending -= item.amount;
          if (item.status === 'granted') u.balance -= item.amount;
          item.status = 'deducted';
          item.deductedAt = nowISO();
          item.reason = `${item.reason || ''}（实锤作废）`;
          changed = true;
        }
      }
      u.deducted += Math.abs(amountByUser[userId]);
    }
    if (changed) save(s);
    return changed;
  }

  function grantItem(userId, sku, count = 1) {
    const s = store();
    const u = get(userId, s);
    u.inventory[sku] = (u.inventory[sku] || 0) + count;
    save(s);
  }

  function consumeItem(userId, sku) {
    const s = store();
    const u = get(userId, s);
    if (!u.inventory[sku] || u.inventory[sku] <= 0) return false;
    u.inventory[sku] -= 1;
    save(s);
    return true;
  }

  function activateShield(userId, flagId) {
    const s = store();
    const u = get(userId, s);
    if (!u.inventory.no_pull_shield || u.inventory.no_pull_shield <= 0) return null;
    u.inventory.no_pull_shield -= 1;
    const until = new Date(Date.now() + 30 * DAY).toISOString();
    u.shields[flagId] = until;
    save(s);
    return until;
  }

  function shieldActive(userId, flagId) {
    const u = get(userId);
    const until = u.shields[flagId];
    return !!until && new Date(until).getTime() > Date.now();
  }

  function buy(userId, sku) {
    const item = SHOP[sku];
    if (!item) throw new Error('商品不存在');
    const s = store();
    const u = get(userId, s);
    if (item.period !== 'none') {
      const key = `${sku}:${periodKey(item.period)}`;
      const used = u.purchases[key] || 0;
      if (used >= item.limit) throw new Error(item.period === 'quarter' ? '本季度已购，请下季度再来' : '本年度已达购买上限');
    }
    if (u.balance < item.price) throw new Error('积分不足');
    if (item.period !== 'none') {
      const key = `${sku}:${periodKey(item.period)}`;
      u.purchases[key] = (u.purchases[key] || 0) + 1;
    }
    u.balance -= item.price;
    if (sku === 'revive_ticket') u.inventory.revive_ticket = (u.inventory.revive_ticket || 0) + 1;
    if (sku === 'no_pull_shield') u.inventory.no_pull_shield = (u.inventory.no_pull_shield || 0) + 1;
    if (sku === 'delay_card') u.inventory.delay_card = (u.inventory.delay_card || 0) + 1;
    if (sku.startsWith('flag_skin')) u.inventory[sku] = (u.inventory[sku] || 0) + 1;
    addLedger(userId, { kind: 'spend', amount: -item.price, status: 'granted', reason: `兑换 ${item.name}`, source: 'shop' });
    save(s);
    return { sku, name: item.name, balance: u.balance };
  }

  function leaderboard(side) {
    const s = store();
    const rows = [];
    for (const [userId, u] of Object.entries(s)) {
      let score = 0;
      for (const item of u.ledger || []) {
        if (item.kind !== 'settlement' || item.side !== side || item.official) continue;
        const flag = ctx.services?.flags?.find?.(item.flagId);
        if (!flag || Number(flag.multiplier) < 0.8) continue;
        if (item.status === 'deducted') continue;
        score += item.amount;
      }
      if (score > 0) {
        const user = ctx.users.find((x) => x.id === userId);
        rows.push({ userId, nickname: user?.nickname || '用户', score });
      }
    }
    return rows.sort((a, b) => b.score - a.score).slice(0, 50);
  }

  const router = Router();
  router.use((_req, _res, next) => { processDue(); next(); });

  router.get('/summary', auth, (req, res) => {
    const u = get(req.user.id);
    res.json({
      points: {
        balance: u.balance,
        pending: u.pending,
        deducted: u.deducted,
        inventory: u.inventory,
        shields: u.shields,
        grantRule: '结算后 T+7 发放',
      },
    });
  });

  router.get('/ledger', auth, (req, res) => {
    const u = get(req.user.id);
    const list = u.ledger.slice().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 200);
    res.json({ ledger: list });
  });

  router.get('/shop', auth, (_req, res) => res.json({ items: Object.entries(SHOP).map(([id, v]) => ({ id, ...v })) }));
  router.post('/shop/buy', auth, (req, res) => {
    try {
      res.json({ result: buy(req.user.id, String((req.body || {}).sku || '')) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  router.post('/shop/use-shield', auth, (req, res) => {
    const until = activateShield(req.user.id, String((req.body || {}).flagId || ''));
    if (!until) return res.status(400).json({ error: '没有可用的免战盾' });
    ctx.services?.events?.record?.('flag_optout_pull', { userId: req.user.id, flagId: (req.body || {}).flagId, trigger: 'shield' });
    res.json({ ok: true, until });
  });

  router.get('/leaderboard', auth, (req, res) => {
    const side = String(req.query.side || 'defend');
    res.json({ rows: leaderboard(side), season: periodKey('quarter'), rule: '仅统计点验中/自动核验旗，仅自证旗不贡献榜单分' });
  });

  return {
    router,
    store,
    save,
    get,
    addLedger,
    behavior,
    settleFlag,
    reverseSettlement,
    voidFlag,
    clearUser,
    grantItem,
    consumeItem,
    activateShield,
    shieldActive,
    buy,
    processDue,
    leaderboard,
    SHOP,
  };
};
