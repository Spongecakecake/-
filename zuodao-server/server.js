// 「做到」App MVP 后端
// 职责边界（与 PRD V0.2 一致）：
//  - 礼物仅线下兑现，平台不经手任何资金与物品
//  - 结果以双方确认为准；投诉/争议由管理员人工终裁（MVP 暂不实现，接口留待后续）
//  - 打卡 48 小时未审核自动通过
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const AUTO_APPROVE_MS = 48 * 3600 * 1000; // 48 小时

// ---------- 工具 ----------
const uid = () => crypto.randomBytes(8).toString('hex');
const nowISO = () => new Date().toISOString();
const today = () => new Date().toLocaleDateString('sv-SE'); // yyyy-mm-dd（本地时区）

// ---------- 数据集合 ----------
let users = db.col('users'); // {id, username, password, nickname, createdAt}
let tokens = db.col('tokens'); // {token: userId}
let goals = db.col('goals');
let memoirs = db.col('memoirs');
const checkins = () => db.col('checkins');

const saveAll = () => {
  db.save('users', users);
  db.save('tokens', tokens);
  db.save('goals', goals);
  db.save('memoirs', memoirs);
};
const saveCheckins = (list) => db.save('checkins', list);

// ---------- 认证 ----------
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const userId = token && tokens[token];
  const user = userId && users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ error: '请先登录' });
  req.user = user;
  req.token = token;
  next();
}

const publicUser = (u) => ({ id: u.id, username: u.username, nickname: u.nickname });

// 共享上下文：新增领域模块通过工厂注入，复用同一套鉴权、用户内存引用与持久化函数。
const ctx = {
  db, auth, publicUser, uid, nowISO, today,
  users, tokens, goals, memoirs, checkins,
  saveAll, saveCheckins, pushEvent,
  services: {},
};
let recordEvent = () => {};

// ---------- 契约工具 ----------
function participantsOf(goal) {
  const ids = [goal.ownerId, goal.supervisorId, goal.witnessId].filter(Boolean);
  return users.filter((u) => ids.includes(u.id));
}
function roleIn(goal, userId) {
  if (goal.ownerId === userId) return 'owner';
  if (goal.supervisorId === userId) return 'supervisor';
  if (goal.witnessId === userId) return 'witness';
  return null;
}
function pushEvent(goal, type, userId, message) {
  goal.events = goal.events || [];
  goal.events.push({ id: uid(), type, userId, message: message || '', at: nowISO() });
}

// 48 小时未审核自动通过（读与写之间保持一致，落盘）
function applyAutoApprovals(goal) {
  const list = checkins();
  let changed = false;
  const deadline = Date.now() - AUTO_APPROVE_MS;
  for (const c of list) {
    if (c.goalId === goal.id && c.status === 'pending' && new Date(c.createdAt).getTime() < deadline) {
      c.status = 'approved';
      c.reviewMessage = '48小时未审核，按约自动通过';
      c.reviewedBy = 'system';
      c.reviewedAt = nowISO();
      changed = true;
      pushEvent(goal, 'auto_approve', null, `有一条打卡满 48 小时未审核，已自动通过`);
    }
  }
  if (changed) {
    saveCheckins(list);
    db.save('goals', goals);
  }
  return changed;
}

function goalStats(goal, list) {
  const mine = list.filter((c) => c.goalId === goal.id);
  const approved = mine.filter((c) => c.status === 'approved');
  // 最长连续通过天数（按自然日）
  const days = [...new Set(approved.map((c) => c.day))].sort();
  let best = 0, cur = 0, prev = null;
  for (const d of days) {
    cur = prev && (new Date(d) - new Date(prev)) / 86400000 === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return {
    total: mine.length,
    approved: approved.length,
    rejected: mine.filter((c) => c.status === 'rejected').length,
    pending: mine.filter((c) => c.status === 'pending').length,
    bestStreak: best,
  };
}

function goalListItem(goal, me) {
  const list = checkins();
  applyAutoApprovals(goal);
  const s = goalStats(goal, list);
  const owner = users.find((u) => u.id === goal.ownerId);
  const pendingToReview =
    roleIn(goal, me.id) !== 'owner'
      ? list.filter((c) => c.goalId === goal.id && c.status === 'pending').length
      : 0;
  return {
    id: goal.id, title: goal.title, template: goal.template,
    goalType: goal.goalType || 'habit',
    checkinType: goal.checkinType || 'text',
    privacy: goal.privacy || 'public',
    startDate: goal.startDate, endDate: goal.endDate, rule: goal.rule,
    status: goal.status, myRole: roleIn(goal, me.id),
    owner: owner ? publicUser(owner) : null,
    hasSupervisor: !!goal.supervisorId, hasWitness: !!goal.witnessId,
    stats: s, pendingToReview,
    resultProposal: goal.resultProposal || null,
  };
}

function goalDetail(goal, me) {
  const list = checkins();
  applyAutoApprovals(goal);
  const mine = list
    .filter((c) => c.goalId === goal.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return {
    ...goalListItem(goal, me),
    description: goal.description,
    restDays: goal.restDays || 0,
    milestones: goal.milestones || [],
    gifts: goal.gifts || (goal.gift && goal.gift.name ? [goal.gift] : []),
    gift: goal.gift || { name: '', note: '' },
    giftOpenedAt: goal.giftOpenedAt || null,
    health: goal.health || null,
    inviteCode: roleIn(goal, me.id) ? goal.inviteCode : null,
    participants: participantsOf(goal).map((u) => ({
      ...publicUser(u), role: roleIn(goal, u.id),
    })),
    encouragement: goal.encouragement || null,
    checkins: mine,
    events: (goal.events || []).slice().reverse(),
  };
}

// ---------- 结果判定与回忆录 ----------
function finalizeGoal(goal, result) {
  goal.status = result; // achieved | failed
  goal.finalizedAt = nowISO();
  goal.resultProposal = null;
  const m = buildMemoir(goal, result);
  if (!memoirs.some((x) => x.goalId === goal.id)) memoirs.push(m);
  pushEvent(goal, 'finalize', null, result === 'achieved' ? '契约达成，火漆可启' : '契约终了，旅程入册');
  ctx.services?.flags?.onGoalFinalized?.(goal, result);
}

function buildMemoir(goal, result = goal.status || 'achieved') {
  const list = checkins();
  const s = goalStats(goal, list);
  const parts = participantsOf(goal);
  const owner = parts.find((u) => u.id === goal.ownerId);
  const others = parts.filter((u) => u.id !== goal.ownerId);
  const firstOk = list
    .filter((c) => c.goalId === goal.id && c.status === 'approved')
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))[0];
  const quotes = (goal.events || [])
    .filter((e) => e.type === 'accept' && e.message)
    .map((e) => e.message);
  const chapter = (no, title, text) => ({ no, title, text });
  const win = result === 'achieved';
  const m = {
    id: uid(),
    goalId: goal.id,
    title: goal.title,
    result,
    createdAt: nowISO(),
    participants: parts.map(publicUser),
    chapters: [
      chapter(1, '序 · 立约', `${(goal.startDate || '某日').replace(/-/g, '.')}，${owner ? owner.nickname : '立约人'}与${others.map((o) => o.nickname).join('、') || '自己'}立下此约：「${goal.title}」。白纸黑字，按印为凭。每日一条打卡，监督人一一批阅。`),
      chapter(2, '启 · 第一程', firstOk ? `第一程的脚印落在 ${(firstOk.day || '').replace(/-/g, '.')}——「${(firstOk.note || '').slice(0, 60)}」万事开头难，这一步已经迈出。` : '第一程尚未留下脚印，但约定已经生效。'),
      chapter(3, '磨 · 中流', `共打卡 ${s.total} 次，通过 ${s.approved} 次。中流最易松懈，而每一次按时的打卡，都是对自己承诺的重申。`),
      chapter(4, '韧 · 关山', `被驳回 ${s.rejected} 次，最长连过 ${s.bestStreak} 天。关山难越，越过去便是阅历。`),
      chapter(5, win ? '终 · 大结局' : '终 · 旅程纪念', win
        ? `${(goal.endDate || '').replace(/-/g, '.')}，契约期满。双方共同确认：此约——做到了。`
        : `${(goal.endDate || '').replace(/-/g, '.')}，契约终了。这一次没能走到终点，但每一步都算数。`),
      chapter(6, win ? '礼 · 火漆启封' : '礼 · 未启之封', win
        ? `火漆启封，心愿礼物「${goal.gift && goal.gift.name ? goal.gift.name : '—'}」由${owner ? owner.nickname : '立约人'}线下兑现，平台不经手资金与物品。${quotes[0] ? `仍记得那句：「${quotes[0]}」` : ''}`
        : `心愿礼物「${goal.gift && goal.gift.name ? goal.gift.name : '—'}」随此约止步，承诺自然失效。${quotes[0] ? `仍记得那句：「${quotes[0]}」` : ''}`),
    ],
  };
  return m;
}

// ---------- 路由 ----------
app.get('/api/health', (req, res) => res.json({ ok: true, name: 'zuodao-server', time: nowISO() }));

// 登录（首次用户名即注册，便于双账号演示）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '请填写用户名与密码' });
  let user = users.find((u) => u.username === username);
  if (user) {
    if (user.password !== password) return res.status(401).json({ error: '密码不正确' });
  } else {
    user = { id: uid(), username, password, nickname: username, createdAt: nowISO() };
    users.push(user);
  }
  const token = crypto.randomBytes(16).toString('hex');
  tokens[token] = user.id;
  saveAll();
  recordEvent('user_active', { userId: user.id, source: 'login' });
  if (ctx.services.flags?.all?.().some((f) => f.ownerId === user.id && f.state === 'fallen')) {
    recordEvent('user_return', { userId: user.id, reason: 'login_after_fall' });
  }
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/logout', auth, (req, res) => {
  delete tokens[req.token];
  saveAll();
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.patch('/api/me', auth, (req, res) => {
  const nickname = String((req.body && req.body.nickname) || '').trim().slice(0, 20);
  if (!nickname) return res.status(400).json({ error: '昵称不可为空' });
  req.user.nickname = nickname;
  saveAll();
  res.json({ user: publicUser(req.user) });
});

// 建立契约（目标）
app.post('/api/goals', auth, (req, res) => {
  const b = req.body || {};
  const { title, template, description, startDate, endDate, rule } = b;
  if (!title || !rule) return res.status(400).json({ error: '目标与每日规约不可为空' });
  const rawGifts = Array.isArray(b.gifts) ? b.gifts : [b.gift];
  const gifts = rawGifts
    .map((g) => ({ name: String((g && g.name) || '').trim().slice(0, 60), note: String((g && g.note) || '').trim().slice(0, 120) }))
    .filter((g) => g.name)
    .slice(0, 5);
  const milestones = Array.isArray(b.milestones)
    ? b.milestones.map((m) => String(m || '').trim().slice(0, 60)).filter(Boolean).slice(0, 10)
    : [];
  const goal = {
    id: uid(),
    ownerId: req.user.id,
    title: String(title).slice(0, 40),
    template: template || 'other',
    goalType: ['numeric', 'habit', 'milestone'].includes(b.goalType) ? b.goalType : 'habit',
    checkinType: ['text', 'numeric', 'choice', 'duration', 'photo'].includes(b.checkinType) ? b.checkinType : 'text',
    privacy: ['public', 'followers', 'private'].includes(b.privacy) ? b.privacy : 'public',
    restDays: Math.max(0, Math.min(6, Number(b.restDays) || 0)),
    health: b.health && typeof b.health === 'object'
      ? { height: String(b.health.height || '').slice(0, 10), weight: String(b.health.weight || '').slice(0, 10), agreed: !!b.health.agreed }
      : null,
    description: String(description || '').slice(0, 200),
    startDate: startDate || today(),
    endDate: endDate || '',
    rule: String(rule).slice(0, 200),
    milestones,
    gifts,
    gift: gifts[0] || { name: '', note: '' },
    giftOpenedAt: null,
    status: 'awaiting', // awaiting 待接受 → active 进行中 → achieved/failed
    inviteCode: null,
    supervisorId: null,
    witnessId: null,
    encouragement: null,
    resultProposal: null,
    events: [],
    createdAt: nowISO(),
  };
  pushEvent(goal, 'create', req.user.id, '立下契约，静候监督人');
  goals.push(goal);
  saveAll();
  res.json({ goal: goalDetail(goal, req.user) });
});

app.get('/api/goals', auth, (req, res) => {
  const mine = goals
    .filter((g) => roleIn(g, req.user.id))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((g) => goalListItem(g, req.user));
  res.json({ goals: mine });
});

app.get('/api/goals/:id', auth, (req, res) => {
  const goal = goals.find((g) => g.id === req.params.id);
  if (!goal || !roleIn(goal, req.user.id)) return res.status(404).json({ error: '契约不存在' });
  res.json({ goal: goalDetail(goal, req.user) });
});

// 生成 6 位邀请码（立约人）
app.post('/api/goals/:id/invite', auth, (req, res) => {
  const goal = goals.find((g) => g.id === req.params.id);
  if (!goal || goal.ownerId !== req.user.id) return res.status(404).json({ error: '契约不存在' });
  if (goal.status !== 'awaiting') return res.status(400).json({ error: '此契约已在履约中' });
  if (!goal.inviteCode) {
    let code;
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } while (goals.some((g) => g.status === 'awaiting' && g.inviteCode === code));
    goal.inviteCode = code;
    pushEvent(goal, 'invite', req.user.id, '发出契约邀请函');
    saveAll();
  }
  res.json({ code: goal.inviteCode });
});

// 凭码查看邀请函
app.get('/api/invites/:code', auth, (req, res) => {
  const goal = goals.find((g) => g.inviteCode === req.params.code && ['awaiting', 'active'].includes(g.status));
  if (!goal) return res.status(404).json({ error: '邀请码无效或席位已满' });
  const owner = users.find((u) => u.id === goal.ownerId);
  res.json({
    invite: {
      code: goal.inviteCode,
      title: goal.title, template: goal.template, description: goal.description,
      rule: goal.rule, startDate: goal.startDate, endDate: goal.endDate,
      gift: goal.gift, gifts: goal.gifts || [],
      owner: owner ? publicUser(owner) : null,
      taken: { supervisor: !!goal.supervisorId, witness: !!goal.witnessId },
      status: goal.status,
    },
  });
});

// 接印（三选一：监督人 / 见证人 / 婉拒）+ 首句鼓励；两个席位可先后加入
app.post('/api/invites/:code/accept', auth, (req, res) => {
  const goal = goals.find((g) => g.inviteCode === req.params.code && ['awaiting', 'active'].includes(g.status));
  if (!goal) return res.status(404).json({ error: '邀请码无效或席位已满' });
  if (goal.ownerId === req.user.id) return res.status(400).json({ error: '不能接自己发出的契约' });
  const { role, message, reason } = req.body || {};
  if (role === 'decline') {
    pushEvent(goal, 'decline', req.user.id, `对方婉拒了邀请${reason ? `：${String(reason).slice(0, 60)}` : ''}`);
    saveAll();
    return res.json({ ok: true, declined: true, message: '已婉拒。愿对方另觅良监督。' });
  }
  if (role !== 'supervisor' && role !== 'witness') return res.status(400).json({ error: '请选择以监督人或见证人身份接印' });
  if (goal.supervisorId === req.user.id || goal.witnessId === req.user.id) return res.status(400).json({ error: '你已加入此契约' });
  if (role === 'supervisor' && goal.supervisorId) return res.status(400).json({ error: '监督人之位已有人接印' });
  if (role === 'witness' && goal.witnessId) return res.status(400).json({ error: '见证人之位已有人接印' });
  if (role === 'supervisor') goal.supervisorId = req.user.id;
  else goal.witnessId = req.user.id;
  goal.status = 'active';
  goal.encouragement = goal.encouragement || { userId: req.user.id, message: String(message || '').slice(0, 60) };
  pushEvent(goal, 'accept', req.user.id, `${req.user.nickname} 以${role === 'supervisor' ? '监督人' : '见证人'}身份接印${message ? `：「${message}」` : ''}`);
  saveAll();
  res.json({ ok: true, goalId: goal.id, role });
});

// 打卡（立约人，每日一条）
app.post('/api/goals/:id/checkins', auth, (req, res) => {
  const goal = goals.find((g) => g.id === req.params.id);
  if (!goal || goal.ownerId !== req.user.id) return res.status(404).json({ error: '契约不存在' });
  if (goal.status !== 'active') return res.status(400).json({ error: '契约不在履约中' });
  const b = req.body || {};
  const note = String(b.note || '').trim();
  if (!note) return res.status(400).json({ error: '写一句话，今日才算数' });
  const day = /^\d{4}-\d{2}-\d{2}$/.test(b.day || '') ? b.day : today();
  if (day > today()) return res.status(400).json({ error: '不能打未来的卡' });
  const makeup = day !== today();
  if (makeup && !b.makeup) return res.status(400).json({ error: '补卡需使用补卡券' });
  const list = checkins();
  if (list.some((c) => c.goalId === goal.id && c.day === day))
    return res.status(400).json({ error: '该日已打卡，明日请早' });
  const c = {
    id: uid(), goalId: goal.id, userId: req.user.id,
    day, note: note.slice(0, 120),
    value: b.value == null ? null : String(b.value).slice(0, 40),
    option: b.option ? String(b.option).slice(0, 20) : '',
    duration: b.duration ? Number(b.duration) : null,
    photo: b.photo ? String(b.photo).slice(0, 200000) : '',
    makeup,
    status: 'pending', reviewMessage: '', reviewedBy: null, reviewedAt: null,
    createdAt: nowISO(),
  };
  list.push(c);
  pushEvent(goal, 'checkin', req.user.id, `${makeup ? '补卡' : '今日打卡'}：「${c.note}」`);
  saveCheckins(list);
  saveAll();
  res.json({ checkin: c });
});

// 审批打卡（监督人/见证人）
app.post('/api/checkins/:id/review', auth, (req, res) => {
  const list = checkins();
  const c = list.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: '打卡不存在' });
  const goal = goals.find((g) => g.id === c.goalId);
  if (!goal || !roleIn(goal, req.user.id)) return res.status(404).json({ error: '无权审阅此契约' });
  if (req.user.id === goal.ownerId) return res.status(403).json({ error: '立约人不能自审' });
  if (c.status !== 'pending') return res.status(400).json({ error: '此打卡已批阅' });
  const approved = !!(req.body && req.body.approved);
  const message = String((req.body && req.body.message) || '').trim();
  if (!approved && !message) return res.status(400).json({ error: '驳回必须选择或填写理由' });
  c.status = approved ? 'approved' : 'rejected';
  c.reviewMessage = message.slice(0, 60) || '甚好，继续。';
  c.reviewedBy = req.user.id;
  c.reviewedAt = nowISO();
  pushEvent(goal, approved ? 'approve' : 'reject', req.user.id, `${approved ? '通过' : '驳回'}了一条打卡${c.reviewMessage ? `：「${c.reviewMessage}」` : ''}`);
  saveCheckins(list);
  saveAll();
  res.json({ checkin: c });
});

// 发起结果判定（任一方）
app.post('/api/goals/:id/result', auth, (req, res) => {
  const goal = goals.find((g) => g.id === req.params.id);
  if (!goal || !roleIn(goal, req.user.id)) return res.status(404).json({ error: '契约不存在' });
  if (goal.status !== 'active') return res.status(400).json({ error: '契约不在履约中' });
  const result = req.body && req.body.result;
  if (result !== 'achieved' && result !== 'failed') return res.status(400).json({ error: '结果只能是 达成 或 未达成' });
  const confirmers = participantsOf(goal).filter((u) => u.id !== req.user.id);
  if (confirmers.length === 0) {
    finalizeGoal(goal, result);
    saveAll();
    return res.json({ goal: goalDetail(goal, req.user), finalized: true });
  }
  goal.resultProposal = {
    result,
    proposedBy: req.user.id,
    proposedAt: nowISO(),
    votes: { [req.user.id]: true },
  };
  pushEvent(goal, 'result_propose', req.user.id, `发起结果判定：${result === 'achieved' ? '做到了' : '未做到'}，待对方确认`);
  saveAll();
  res.json({ goal: goalDetail(goal, req.user), finalized: false });
});

// 确认结果（另一方：同意/不同意）
app.post('/api/goals/:id/result/confirm', auth, (req, res) => {
  const goal = goals.find((g) => g.id === req.params.id);
  if (!goal || !roleIn(goal, req.user.id)) return res.status(404).json({ error: '契约不存在' });
  if (goal.status !== 'active' || !goal.resultProposal) return res.status(400).json({ error: '当前没有待确认的结果' });
  const agree = !!(req.body && req.body.agree);
  if (!agree) {
    pushEvent(goal, 'result_disagree', req.user.id, '对方不同意判定结果，此提议作废，可重新协商');
    goal.resultProposal = null;
    saveAll();
    return res.json({ goal: goalDetail(goal, req.user), finalized: false });
  }
  goal.resultProposal.votes[req.user.id] = true;
  const confirmers = participantsOf(goal).filter((u) => u.id !== goal.resultProposal.proposedBy);
  const allAgreed = confirmers.every((u) => goal.resultProposal.votes[u.id]);
  if (allAgreed) {
    finalizeGoal(goal, goal.resultProposal.result);
  } else {
    pushEvent(goal, 'result_agree', req.user.id, '确认了判定结果');
  }
  saveAll();
  res.json({ goal: goalDetail(goal, req.user), finalized: allAgreed });
});

// 回忆录
app.get('/api/me/memoirs', auth, (req, res) => {
  const mine = memoirs
    .filter((m) => m.participants.some((p) => p.id === req.user.id))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ memoirs: mine });
});

app.get('/api/memoirs/:id', auth, (req, res) => {
  const m = memoirs.find((x) => x.id === req.params.id);
  if (!m || !m.participants.some((p) => p.id === req.user.id)) return res.status(404).json({ error: '回忆录不存在' });
  res.json({ memoir: m });
});

// 拆礼：状态落盘，避免刷新后回到未拆
app.post('/api/goals/:id/gift/open', auth, (req, res) => {
  const goal = goals.find((g) => g.id === req.params.id);
  if (!goal || !roleIn(goal, req.user.id)) return res.status(404).json({ error: '契约不存在' });
  if (goal.status !== 'achieved') return res.status(400).json({ error: '契约尚未达成' });
  if (!goal.giftOpenedAt) {
    goal.giftOpenedAt = nowISO();
    pushEvent(goal, 'gift_open', req.user.id, '火漆启封，心愿礼物已拆');
    saveAll();
  }
  res.json({ goal: goalDetail(goal, req.user) });
});

// 广场：只展示非私密契约，隐藏精确数值
app.get('/api/plaza', auth, (req, res) => {
  const list = goals
    .filter((g) => g.privacy !== 'private' && ['active', 'achieved'].includes(g.status))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 50)
    .map((g) => {
      const owner = users.find((u) => u.id === g.ownerId);
      return {
        id: g.id,
        title: g.title,
        template: g.template,
        goalType: g.goalType || 'habit',
        status: g.status,
        rule: String(g.rule || '').slice(0, 60),
        owner: owner ? publicUser(owner) : null,
        participantCount: participantsOf(g).length,
        createdAt: g.createdAt,
      };
    });
  res.json({ goals: list });
});

// 消息中心：由契约动态聚合，不额外存储
app.get('/api/notifications', auth, (req, res) => {
  const mine = goals.filter((g) => roleIn(g, req.user.id));
  const items = [];
  for (const g of mine) {
    for (const e of g.events || []) {
      if (e.type === 'create') continue;
      items.push({
        id: e.id,
        goalId: g.id,
        type: e.type,
        message: e.message,
        at: e.at,
        actor: e.userId ? publicUser(users.find((u) => u.id === e.userId) || { id: e.userId, username: '', nickname: '有人' }) : null,
      });
    }
  }
  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  res.json({ notifications: items.slice(0, 60) });
});

// ---------- V1 插旗体系领域模块 ----------
ctx.services.events = require('./modules/events')(ctx);
ctx.services.points = require('./modules/points')(ctx);
ctx.services.trust = require('./modules/trust')(ctx);
ctx.services.standings = require('./modules/standings')(ctx);
ctx.services.flags = require('./modules/flags')(ctx);
ctx.services.proofs = require('./modules/proofs')(ctx);
ctx.services.admin = require('./modules/admin')(ctx);
recordEvent = ctx.services.events.record;

app.use('/api/flags', ctx.services.flags.router);
app.use('/api/standings', ctx.services.standings.router);
app.use('/api/points', ctx.services.points.router);
app.use('/api/trust', ctx.services.trust.router);
app.use('/api/proofs', ctx.services.proofs.router);
app.use('/api/admin', ctx.services.admin.router);
app.use('/api/events', ctx.services.events.router);

// 仅在直接运行时启动监听（被 require 时不启动，方便测试）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[zuodao-server] listening on http://localhost:${PORT}`);
    const timer = setInterval(() => {
      try {
        ctx.services.points.processDue();
        ctx.services.proofs.processDue();
      } catch (e) {
        console.error('[zuodao-server] scheduled task failed:', e.message);
      }
    }, 60 * 1000);
    timer.unref();
  });
}

module.exports = { app, db, ctx };
