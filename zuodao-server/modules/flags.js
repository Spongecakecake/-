// 旗实体、旗场、旗面、状态机、复活窗、隐私与成色。
const { Router } = require('express');

const HIGH_RISK = ['fitness', 'health', 'weight', 'lose_weight', '减脂', '体重'];
const DAY = 24 * 3600 * 1000;

const pad = n => String(n).padStart(2, '0');
const dateAfter = days => {
  const d = new Date(Date.now() + days * DAY);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const diffDays = (a, b) => {
  if (!a || !b) return 21;
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY) + 1);
};

module.exports = function createFlags(ctx) {
  const { db, auth, uid, nowISO, today } = ctx;

  function all() {
    const v = db.col('flags');
    return Array.isArray(v) ? v : [];
  }
  function save(list) { db.save('flags', list); }
  function find(id) { return all().find(f => f.id === id) || null; }
  function byGoal(goalId) { return all().find(f => f.goalId === goalId) || null; }
  function featureFlags() {
    const f = db.col('featureFlags');
    return f && typeof f === 'object' && !Array.isArray(f) ? f : {};
  }
  function enabled(name) { return featureFlags()[name] !== false; }

  function isHighRisk(template) { return HIGH_RISK.includes(String(template || '')); }

  function colorFor(level, color) {
    if (level === 'L1') return 'self';
    return color === 'auto' ? 'auto' : 'witness';
  }
  function multiplierFor(color) {
    return color === 'auto' ? 1.2 : color === 'witness' ? 0.8 : 0.5;
  }

  function goalFor(flag) { return ctx.goals.find(g => g.id === flag.goalId) || null; }
  function progress(flag) {
    const goal = goalFor(flag);
    if (!goal) return { approved: 0, total: 0, ratio: 0 };
    const list = ctx.checkins().filter(c => c.goalId === goal.id);
    const approved = list.filter(c => c.status === 'approved').length;
    const total = diffDays(goal.startDate, goal.endDate);
    return { approved, total, ratio: total ? Math.min(1, approved / total) : 0 };
  }

  function makeFlag(goal, body = {}) {
    const proofLevel = body.proofLevel === 'L1' ? 'L1' : 'L2';
    const color = colorFor(proofLevel, 'witness');
    return {
      id: uid(),
      goalId: goal.id,
      ownerId: goal.ownerId,
      state: 'active',
      privacy: 'public',
      proofLevel,
      color,
      multiplier: multiplierFor(color),
      pullEnabled: isHighRisk(goal.template) ? false : !!body.pullEnabled,
      highRisk: isHighRisk(goal.template),
      threatValue: 0,
      featured: false,
      reviveUntil: null,
      revivedFrom: body.revivedFrom || null,
      createdAt: nowISO(),
      fallenAt: null,
      finalizedAt: null,
      voidReason: null,
      reviveAdjusted: false,
      cardEnabled: true,
    };
  }

  function plant(userId, body = {}) {
    if (!ctx.services?.trust?.canPlant?.(userId)) throw new Error('当前处于禁插旗期，暂不能插旗');
    const goal = ctx.goals.find(g => g.id === body.goalId);
    if (!goal || goal.ownerId !== userId) throw new Error('目标不存在或无权插旗');
    if (byGoal(goal.id)) throw new Error('该目标已插旗');
    if (body.privacy !== 'public') throw new Error('只有「全部公开」才能生成旗');
    if (body.proofLevel !== 'L1' && body.proofLevel !== 'L2') throw new Error('请选择举证等级');
    const f = makeFlag(goal, body);
    const list = all();
    list.push(f);
    save(list);
    ctx.services?.events?.record?.('flag_plant', {
      userId, flagId: f.id, goalId: goal.id, proof_level: f.proofLevel, pull_enabled: f.pullEnabled, template_id: goal.template,
    });
    return f;
  }

  function effectivePull(flag) {
    if (!flag || flag.state !== 'active' || flag.highRisk || !flag.pullEnabled) return false;
    if (!enabled('pull')) return false;
    if (ctx.services?.points?.shieldActive?.(flag.ownerId, flag.id)) return false;
    if (ctx.services?.trust?.noPullLocked?.(flag.ownerId)) return false;
    return true;
  }

  function isPullEnabled(flagId) {
    return effectivePull(find(flagId));
  }

  function setPrivacy(flagId, userId, privacy) {
    const list = all();
    const f = list.find(x => x.id === flagId);
    if (!f || f.ownerId !== userId) throw new Error('无权操作此旗');
    if (!['public', 'private'].includes(privacy)) throw new Error('公开范围无效');
    f.privacy = privacy;
    save(list);
    return f;
  }

  function setPull(flagId, userId, wanted) {
    const list = all();
    const f = list.find(x => x.id === flagId);
    if (!f || f.ownerId !== userId) throw new Error('无权操作此旗');
    if (f.highRisk) throw new Error('此类目标只护不拔');
    if (wanted && ctx.services?.trust?.noPullLocked?.(userId)) throw new Error('连败保护期内不可开启拔旗');
    if (wanted && ctx.services?.points?.shieldActive?.(userId, flagId)) throw new Error('免战盾生效期间不可开启拔旗');
    f.pullEnabled = !!wanted;
    save(list);
    if (!wanted) {
      ctx.services?.events?.record?.('flag_optout_pull', { userId, flagId, trigger: 'manual', threat_value_at: f.threatValue });
    }
    return f;
  }

  function recomputeThreat(flagId) {
    const list = all();
    const f = list.find(x => x.id === flagId);
    if (!f) return 0;
    const week = Date.now() - 7 * DAY;
    const tempts = (ctx.services?.standings?.forFlag?.(flagId) || [])
      .filter(s => s.side === 'tempt' && s.status === 'published' && new Date(s.createdAt).getTime() >= week).length;
    f.threatValue = tempts;
    save(list);
    return f.threatValue;
  }

  function onGoalFinalized(goal, result) {
    const f = byGoal(goal.id);
    if (!f || f.finalizedAt) return f;
    const list = all();
    const target = list.find(x => x.id === f.id);
    target.finalizedAt = nowISO();
    target.state = result === 'achieved' ? 'achieved' : 'fallen';
    if (target.state === 'fallen') {
      target.fallenAt = nowISO();
      target.reviveUntil = new Date(Date.now() + 7 * DAY).toISOString();
      ctx.services?.trust?.recordFall?.(target.ownerId, target.id);
    }
    save(list);
    ctx.services?.points?.settleFlag?.(target, target.state);
    ctx.services?.events?.record?.('flag_result', {
      userId: target.ownerId, flagId: target.id, result: target.state,
      threat_total: target.threatValue,
      defender_n: (ctx.services?.standings?.forFlag?.(target.id) || []).filter(s => s.side === 'defend').length,
      tempter_n: (ctx.services?.standings?.forFlag?.(target.id) || []).filter(s => s.side === 'tempt').length,
    });
    return target;
  }

  function voidFlag(flagId, reason) {
    const list = all();
    const f = list.find(x => x.id === flagId);
    if (!f || f.state === 'void') return f;
    f.state = 'void';
    f.voidReason = String(reason || '实锤造假').slice(0, 200);
    f.voidAt = nowISO();
    save(list);
    return f;
  }

  function revive(flagId, userId) {
    const list = all();
    const f = list.find(x => x.id === flagId);
    if (!f || f.ownerId !== userId) throw new Error('无权操作此旗');
    if (f.state !== 'fallen') throw new Error('只有已掉落的旗可以重启');
    if (!f.reviveUntil || new Date(f.reviveUntil).getTime() < Date.now()) throw new Error('复活窗已关闭');
    if (f.revivedBy) throw new Error('该旗已重启过');
    if (!ctx.services?.points?.consumeItem?.(userId, 'revive_ticket')) throw new Error('重启券不足，可在积分商店购买');

    const source = goalFor(f);
    if (!source) throw new Error('原目标不存在');
    const duration = diffDays(source.startDate, source.endDate);
    const clone = {
      ...source,
      id: uid(),
      status: 'active',
      createdAt: nowISO(),
      startDate: today(),
      endDate: dateAfter(duration - 1),
      events: [],
      resultProposal: null,
      finalizedAt: null,
      giftOpenedAt: null,
    };
    ctx.goals.push(clone);
    ctx.saveAll();

    const nf = makeFlag(clone, { proofLevel: f.proofLevel, pullEnabled: false, revivedFrom: f.id });
    nf.color = f.color;
    nf.multiplier = f.multiplier;
    list.push(nf);
    f.revivedBy = nf.id;
    f.reviveAdjusted = true;
    save(list);

    ctx.services?.points?.reverseSettlement?.(f.id);
    ctx.services?.points?.settleFlag?.(f, 'fallen', { revive: true });
    ctx.services?.events?.record?.('flag_revive', { userId, flagId: nf.id, fromFlagId: f.id, days_after_fall: Math.round((Date.now() - new Date(f.fallenAt).getTime()) / DAY), cost_ticket: 1 });
    return { flag: nf, oldFlagId: f.id };
  }

  function markProof(flagId, type) {
    const list = all();
    const f = list.find(x => x.id === flagId);
    if (!f || f.proofLevel !== 'L2') return f;
    if (type === 'random') {
      f.color = 'auto';
      f.multiplier = 1.2;
      save(list);
    }
    return f;
  }

  function decorate(f, viewerId) {
    const goal = goalFor(f);
    const owner = ctx.users.find(u => u.id === f.ownerId);
    const standings = ctx.services?.standings?.visibleForFlag?.(f.id, viewerId) || [];
    const isOwner = f.ownerId === viewerId;
    return {
      ...f,
      pullEnabledEffective: effectivePull(f),
      goal: goal ? {
        id: goal.id, title: goal.title, template: goal.template, rule: goal.rule,
        startDate: goal.startDate, endDate: goal.endDate, status: goal.status,
      } : null,
      progress: progress(f),
      owner: owner ? ctx.publicUser(owner) : null,
      counts: {
        defend: standings.filter(s => s.side === 'defend' && s.status === 'published').length,
        tempt: standings.filter(s => s.side === 'tempt' && s.status === 'published').length,
      },
      standings: standings.slice(0, 100),
      canManage: isOwner,
      proofMark: { hasProof: !!ctx.services?.proofs?.hasProof?.(f.id), level: f.color },
    };
  }

  const router = Router();

  router.post('/plant', auth, (req, res) => {
    try { res.json({ flag: plant(req.user.id, req.body || {}) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.get('/mine', auth, (req, res) => {
    const list = all().filter(f => f.ownerId === req.user.id).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    res.json({ flags: list.map(f => decorate(f, req.user.id)) });
  });

  router.get('/field', auth, (req, res) => {
    const tab = String(req.query.tab || 'latest');
    const ff = featureFlags();
    if (ff.flagsField === false) return res.json({ flags: [], disabled: true });
    let list = all().filter(f => f.state === 'active' && f.privacy === 'public');
    if (tab === 'hot') list = list.filter(f => Number(f.multiplier) >= 0.8);
    const featuredIds = Array.isArray(ff.featured) ? ff.featured : [];
    list.sort((a, b) => {
      const fa = featuredIds.includes(a.id) ? 1 : 0;
      const fb = featuredIds.includes(b.id) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      if (tab === 'hot') return (b.threatValue || 0) - (a.threatValue || 0);
      if (tab === 'ending') {
        const ga = goalFor(a), gb = goalFor(b);
        return (ga?.endDate || '9999') < (gb?.endDate || '9999') ? -1 : 1;
      }
      return a.createdAt > b.createdAt ? -1 : 1;
    });
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    res.json({
      flags: list.slice(0, limit).map(f => {
        const d = decorate(f, req.user.id);
        return {
          id: d.id, title: d.goal?.title || '', state: d.state, color: d.color,
          multiplier: d.multiplier, threatValue: d.threatValue, featured: featuredIds.includes(d.id),
          progress: d.progress, counts: d.counts, pullEnabled: d.pullEnabledEffective,
          goalId: f.goalId, endDate: d.goal?.endDate || '',
        };
      }),
    });
  });

  router.get('/:id/card', auth, (req, res) => {
    const f = find(req.params.id);
    if (!f) return res.status(404).json({ error: '旗不存在' });
    if (f.privacy === 'private' && f.ownerId !== req.user.id) return res.status(403).json({ error: '此旗已转私密' });
    const d = decorate(f, req.user.id);
    const featured = (ctx.services?.standings?.forFlag?.(f.id) || []).find(s => s.featured);
    res.json({
      card: {
        type: f.state === 'achieved' ? 'victory' : 'battle',
        title: d.goal?.title || '',
        progress: d.progress,
        threatValue: f.threatValue,
        counts: d.counts,
        quote: featured ? featured.content : '',
        flagId: f.id,
      },
    });
  });

  router.get('/:id', auth, (req, res) => {
    const f = find(req.params.id);
    if (!f) return res.status(404).json({ error: '旗不存在' });
    if (f.privacy === 'private' && f.ownerId !== req.user.id) return res.status(403).json({ error: '此旗已转私密' });
    recomputeThreat(f.id);
    res.json({ flag: decorate(find(f.id), req.user.id) });
  });

  router.post('/:id/privacy', auth, (req, res) => {
    try { res.json({ flag: setPrivacy(req.params.id, req.user.id, String((req.body || {}).privacy || '')) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.post('/:id/pull', auth, (req, res) => {
    try { res.json({ flag: setPull(req.params.id, req.user.id, !!(req.body || {}).enabled) }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.post('/:id/revive', auth, (req, res) => {
    try { res.json(revive(req.params.id, req.user.id)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  return {
    router, all, save, find, byGoal, plant, effectivePull, isPullEnabled,
    setPrivacy, setPull, recomputeThreat, onGoalFinalized, voidFlag, revive, markProof, decorate, goalFor, isHighRisk,
  };
};
