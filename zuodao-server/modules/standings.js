// 护旗/拔旗站队留言、官方模板、审核、精选、戳我与举报。
const { Router } = require('express');

const TEMPLATES = [
  ['撒娇型', '就差这一哆嗦啦，再坚持一天嘛'],
  ['撒娇型', '今天也想看你把旗插稳一点'],
  ['撒娇型', '别睡啦，旗还在等你回来'],
  ['撒娇型', '给未来的自己一个小小的交代吧'],
  ['撒娇型', '偷偷告诉你，你比昨天更接近终点了'],
  ['撒娇型', '再走一步， flag 就会亮一点'],
  ['撒娇型', '今天也把FLAG举高一点'],
  ['撒娇型', '就当陪我玩一会儿，别放弃呀'],
  ['撒娇型', '你的旗子有点孤单，去陪陪它'],
  ['撒娇型', '慢慢来，但别停呀'],
  ['激将型', '我就知道你会卡在这一步'],
  ['激将型', '嘴上说说，旗还插着吗？'],
  ['激将型', '今天怕不是又要悄悄跳过吧'],
  ['激将型', '这点风浪就够你收旗了？'],
  ['激将型', '别让旗面只停在开场那一页'],
  ['激将型', '我看你这面旗有点悬'],
  ['激将型', '再不打卡，旗子都要落灰了'],
  ['激将型', '你说要做到，我可都记着呢'],
  ['激将型', '今天就证明给我看'],
  ['激将型', '别只会在心里赢'],
  ['共情型', '我知道坚持很难，所以我来陪你'],
  ['共情型', '落一点点也没关系，还在路上就好'],
  ['共情型', '你不是一个人扛着这面旗'],
  ['共情型', '累了就歇一天，但别忘了为什么出发'],
  ['共情型', '每一次重新拿起，都比放弃更勇敢'],
  ['共情型', '你认真走过的日子，我都看得见'],
  ['共情型', '慢一点也没关系，别丢了自己'],
  ['共情型', '今天交给明天一点点勇气'],
  ['共情型', '我在旗这边，替你守着'],
  ['共情型', '把目标走完，不是为了赢我，是为了你自己'],
];

const TEMPLATE_LIST = TEMPLATES.map(([category, text], i) => ({
  id: `T${String(i + 1).padStart(2, '0')}`,
  category,
  text,
  disclaimer: '口嗨免责 · 激将玩法，可随时免战',
}));

const MONEY_RE = /(转账|代付|红包|现金|给你\s*\d+|\d+\s*元|打款|pay|支付宝|微信转)/i;

const DAY = 24 * 3600 * 1000;

module.exports = function createStandings(ctx) {
  const { db, auth, uid, nowISO } = ctx;

  function all() {
    const v = db.col('standings');
    return Array.isArray(v) ? v : [];
  }
  function save(list) { db.save('standings', list); }
  function forFlag(flagId) { return all().filter((s) => s.flagId === flagId); }
  function find(id) { return all().find((s) => s.id === id) || null; }

  function featureEnabled(name) {
    const f = db.col('featureFlags');
    return !f || typeof f !== 'object' || f[name] !== false;
  }

  function countable(user, flagId, deviceKey) {
    if (!user || !user.createdAt || Date.now() - new Date(user.createdAt).getTime() < 7 * DAY) return false;
    const sameDevice = all().filter((s) => s.flagId === flagId && s.deviceKey === deviceKey);
    const users = new Set(sameDevice.map((s) => s.userId));
    if (users.size >= 3) {
      const ids = Array.from(users).concat(user.id);
      const earliest = ids
        .map((id) => ctx.users.find((u) => u.id === id))
        .filter(Boolean)
        .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))[0];
      return earliest?.id === user.id;
    }
    return true;
  }

  function create(userId, body, options = {}) {
    const b = body || {};
    const flag = ctx.services?.flags?.find?.(b.flagId);
    if (!flag) throw new Error('旗不存在');
    if (flag.state !== 'active') throw new Error('旗不在生效中');
    if (!featureEnabled('pull') && b.side === 'tempt') throw new Error('拔旗功能已关闭');
    if (b.side === 'tempt' && !ctx.services?.flags?.isPullEnabled?.(flag.id)) throw new Error('此旗已关闭拔旗');
    if (b.side !== 'defend' && b.side !== 'tempt') throw new Error('请选择阵营');
    const today = ctx.today();
    const list = all();
    const already = list.find((s) => s.flagId === flag.id && s.userId === userId && s.day === today);
    if (already && !options.official) throw new Error('每旗每日只能站队一次');

    let content = String(b.content || '').trim().slice(0, 100);
    let contentType = b.contentType === 'template' ? 'template' : 'custom';
    let templateId = '';
    let status = 'published';
    if (b.side === 'tempt' && contentType === 'template') {
      const tpl = TEMPLATE_LIST.find((t) => t.id === b.templateId);
      if (!tpl) throw new Error('模板不存在');
      content = tpl.text;
      templateId = tpl.id;
    }
    if (!content) throw new Error('留言不可为空');
    if (b.side === 'tempt' && contentType === 'custom' && !options.official && MONEY_RE.test(content)) {
      throw new Error('涉及金额或转账的内容不可提交，请改用官方模板');
    }
    if (b.side === 'tempt' && contentType === 'custom' && !options.official) status = 'pending';

    const user = ctx.users.find((u) => u.id === userId);
    const item = {
      id: uid(),
      flagId: flag.id,
      userId,
      side: b.side,
      contentType,
      templateId,
      content,
      status,
      featured: false,
      pokedCount: 0,
      countable: options.official ? false : countable(user, flag.id, b.deviceKey || 'unknown'),
      official: !!options.official,
      day: today,
      reason: '',
      createdAt: nowISO(),
      reviewedAt: status === 'published' ? nowISO() : null,
    };
    list.push(item);
    save(list);

    if (status === 'published' && !options.official) {
      ctx.services?.points?.behavior?.(userId, 2, { flagId: flag.id, source: '留言上墙', reason: b.side === 'defend' ? '护旗留言' : '拔旗留言' });
    }
    ctx.services?.events?.record?.(b.side === 'defend' ? 'defend_send' : 'tempt_send', {
      userId, flagId: flag.id, content_type: contentType, word_count: content.length, template_id: templateId,
    });
    return item;
  }

  function approve(id, approved, reason) {
    const list = all();
    const item = list.find((s) => s.id === id);
    if (!item) return null;
    if (item.status !== 'pending') return item;
    item.status = approved ? 'published' : 'rejected';
    item.reason = String(reason || '').slice(0, 120);
    item.reviewedAt = nowISO();
    save(list);
    if (approved) {
      ctx.services?.points?.behavior?.(item.userId, 5, { flagId: item.flagId, source: '自定义文案审核通过' });
      ctx.services?.events?.record?.('standing_approved', { userId: item.userId, flagId: item.flagId });
    }
    return item;
  }

  function feature(id, ownerId) {
    const list = all();
    const item = list.find((s) => s.id === id);
    if (!item) throw new Error('留言不存在');
    const flag = ctx.services?.flags?.find?.(item.flagId);
    if (!flag || flag.ownerId !== ownerId) throw new Error('无权操作此旗');
    if (item.featured) throw new Error('已收进旗帜');
    const used = list.filter((s) => s.flagId === flag.id && s.featured).length;
    if (used >= 10) throw new Error('精选留言已满 10 条');
    item.featured = true;
    save(list);
    ctx.services?.points?.behavior?.(item.userId, 10, { flagId: flag.id, source: '收进旗帜' });
    return item;
  }

  function poke(id, ownerId) {
    const list = all();
    const item = list.find((s) => s.id === id);
    if (!item) throw new Error('留言不存在');
    const flag = ctx.services?.flags?.find?.(item.flagId);
    if (!flag || flag.ownerId !== ownerId) throw new Error('无权操作此旗');
    const today = ctx.today();
    const usedToday = list.filter((s) => s.flagId === flag.id && (s.pokedDay === today)).reduce((n, s) => n + (s.pokedCount || 0), 0);
    if (usedToday >= 3) throw new Error('今日戳到我次数已用完');
    item.pokedCount = (item.pokedCount || 0) + 1;
    item.pokedDay = today;
    save(list);
    ctx.services?.points?.behavior?.(item.userId, 3, { flagId: flag.id, source: '戳到我' });
    return item;
  }

  function report(id, userId, reason) {
    const item = find(id);
    if (!item) throw new Error('留言不存在');
    const m = ctx.services?.admin?.addReport?.({ targetId: id, flagId: item.flagId, reporterId: userId, reason });
    return m;
  }

  function visibleForFlag(flagId, viewerId) {
    const flag = ctx.services?.flags?.find?.(flagId);
    const isOwner = flag && flag.ownerId === viewerId;
    return forFlag(flagId)
      .filter((s) => s.status === 'published' || s.userId === viewerId || isOwner)
      .filter((s) => s.side === 'defend' || isOwner || (flag && ctx.services?.flags?.isPullEnabled?.(flagId)))
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  }

  const router = Router();
  router.get('/templates', (_req, res) => res.json({ templates: TEMPLATE_LIST }));
  router.post('/', auth, (req, res) => {
    try {
      res.json({ standing: create(req.user.id, req.body || {}) });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.get('/mine', auth, (req, res) => {
    res.json({ standings: all().filter((s) => s.userId === req.user.id).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)) });
  });
  router.get('/flag/:flagId', auth, (req, res) => {
    res.json({ standings: visibleForFlag(req.params.flagId, req.user.id) });
  });
  router.post('/:id/feature', auth, (req, res) => {
    try { res.json({ standing: feature(req.params.id, req.user.id) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.post('/:id/poke', auth, (req, res) => {
    try { res.json({ standing: poke(req.params.id, req.user.id) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.post('/:id/report', auth, (req, res) => {
    try {
      res.json({ report: report(req.params.id, req.user.id, String((req.body || {}).reason || '')) });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  return { router, all, save, forFlag, find, create, approve, feature, poke, report, visibleForFlag, TEMPLATE_LIST };
};
