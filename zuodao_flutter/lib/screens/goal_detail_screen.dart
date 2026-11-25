// 契约详情 · 正文 + 打卡 + 监督批阅 + 结果判定 + 开启奖励
import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../session.dart';
import '../theme.dart';
import '../ui.dart';

String _two(int n) => n.toString().padLeft(2, '0');
String _today() {
  final d = DateTime.now();
  return '${d.year}-${_two(d.month)}-${_two(d.day)}';
}

int _daysBetween(String a, String b) {
  if (a.isEmpty || b.isEmpty) return 0;
  return DateTime.parse(b).difference(DateTime.parse(a)).inDays + 1;
}

class GoalDetailScreen extends StatefulWidget {
  final String id;
  const GoalDetailScreen({super.key, required this.id});

  @override
  State<GoalDetailScreen> createState() => _GoalDetailScreenState();
}

class _GoalDetailScreenState extends State<GoalDetailScreen> {
  Goal? _goal;
  String _err = '';
  bool _busy = false;
  bool _giftOpened = false;
  final _note = TextEditingController();
  final _reviewCtrls = <String, TextEditingController>{};

  @override
  void initState() {
    super.initState();
    _load();
  }

  TextEditingController _rn(String id) =>
      _reviewCtrls.putIfAbsent(id, TextEditingController.new);

  Future<void> _load() async {
    try {
      final r = await api('/api/goals/${widget.id}');
      if (!mounted) return;
      setState(() {
        _goal = Goal.fromJson(r['goal'] as Map);
        _err = '';
      });
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    }
  }

  Future<void> _act(Future<dynamic> Function() fn) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _err = '';
    });
    try {
      await fn();
      await _load();
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openMemoir() async {
    try {
      final r = await api('/api/me/memoirs');
      final list = (r['memoirs'] as List?) ?? const [];
      for (final m in list) {
        if ((m as Map)['goalId'] == widget.id) {
          if (!mounted) return;
          Navigator.pushNamed(context, '/memoir', arguments: m['id']);
          return;
        }
      }
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    }
  }

  @override
  void dispose() {
    _note.dispose();
    for (final c in _reviewCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final g = _goal;
    return Scaffold(
      appBar: AppBar(title: const Text('契约详情')),
      body: g == null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_err.isEmpty ? '加载中…' : _err,
                      style: const TextStyle(color: C.onSurfaceVariant)),
                ],
              ),
            )
          : RefreshIndicator(
              color: C.primary,
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 80),
                children: [
                  _contract(g),
                  if (g.status == 'active' && g.myRole == 'owner') ...[
                    const SizedBox(height: 14),
                    _checkinCard(g),
                  ],
                  if (g.checkins.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text('打卡记录',
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: C.onSurface)),
                    const SizedBox(height: 10),
                    ...g.checkins.map(_checkinRow),
                  ],
                  if (g.status == 'active') ...[
                    const SizedBox(height: 6),
                    _resultCard(g),
                  ],
                  if (g.status == 'achieved') ...[
                    const SizedBox(height: 14),
                    _giftCard(g),
                  ],
                  if (g.status == 'failed') ...[
                    const SizedBox(height: 14),
                    _failedCard(g),
                  ],
                  if (g.events.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text('动态',
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: C.onSurface)),
                    const SizedBox(height: 10),
                    Frame(
                      child: Column(
                        children: [
                          for (final e in g.events)
                            Container(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              decoration: const BoxDecoration(
                                border: Border(
                                    bottom: BorderSide(color: C.outlineVariant)),
                              ),
                              child: Text(e.message,
                                  style: const TextStyle(
                                      fontSize: 13,
                                      color: C.onSurfaceVariant,
                                      height: 1.5)),
                            ),
                        ],
                      ),
                    ),
                  ],
                  if (_err.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Text(_err,
                        style: const TextStyle(color: C.error, fontSize: 13),
                        textAlign: TextAlign.center),
                  ],
                ],
              ),
            ),
    );
  }

  // ---- 契约正文 ----
  Widget _contract(Goal g) {
    final isOwner = g.myRole == 'owner';
    final totalDays = _daysBetween(g.startDate, g.endDate);
    final ratio = totalDays > 0 ? g.stats.approved / totalDays : 0.0;
    return Frame(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                      color: C.primary, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              const Text('契约书',
                  style: TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
              const Spacer(),
              TagChip(
                kStatusText[g.status] ?? g.status,
                color: g.status == 'achieved'
                    ? C.secondary
                    : g.status == 'failed'
                        ? C.error
                        : C.onSurfaceVariant,
                filled: g.status == 'achieved',
              ),
            ],
          ),
          const SizedBox(height: 12),
          H(g.title, size: 20),
          if (g.description.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(g.description,
                style: const TextStyle(
                    fontSize: 13, color: C.onSurfaceVariant, height: 1.5)),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Text('${g.startDate} 起',
                  style: const TextStyle(
                      fontSize: 12, color: C.onSurfaceVariant)),
              const SizedBox(width: 18),
              Text('为期 ${totalDays == 0 ? '—' : totalDays} 天',
                  style: const TextStyle(
                      fontSize: 12, color: C.onSurfaceVariant)),
            ],
          ),
          const SizedBox(height: 12),
          _ruleBox(g.rule),
          const SizedBox(height: 12),
          for (final p in g.participants)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: const BoxDecoration(
                        color: C.primaryContainer, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: Text(
                      p.nickname.isNotEmpty ? p.nickname[0] : '?',
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: C.onPrimaryContainer),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(p.nickname,
                      style: const TextStyle(fontSize: 13, color: C.onSurface)),
                  const SizedBox(width: 8),
                  TagChip(kRoleText[p.role] ?? p.role,
                      color: p.role == 'owner' ? C.primary : C.secondary),
                ],
              ),
            ),
          if (g.encouragement.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text('附言：「${g.encouragement}」',
                style: const TextStyle(fontSize: 12, color: C.secondary)),
          ],
          // 待接受：展示邀请码
          if (g.status == 'awaiting' && g.inviteCode != null && isOwner) ...[
            const SizedBox(height: 14),
            const Divider(color: C.outlineVariant),
            Column(
              children: [
                const Text('邀请码（等待接受）',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: C.primary)),
                const SizedBox(height: 6),
                Text(g.inviteCode!,
                    style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                        color: C.tertiary,
                        letterSpacing: 6)),
              ],
            ),
          ],
          // 履约进度
          if (g.status == 'active') ...[
            const SizedBox(height: 14),
            Bar(ratio),
            const SizedBox(height: 6),
            Text(
                '通过 ${g.stats.approved} / $totalDays 天 · 最长连续 ${g.stats.bestStreak} 天',
                style: const TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
          ],
        ],
      ),
    );
  }

  // ---- 今日打卡（立约人）----
  Widget _checkinCard(Goal g) {
    final checkedToday = g.checkins.any((c) => c.day == _today());
    return Frame(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('今日打卡',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: C.primary)),
          const SizedBox(height: 4),
          Text(
            checkedToday ? '今日已打卡，明日请早' : '${_today()} · 一句实话，写下来',
            style: const TextStyle(fontSize: 12, color: C.onSurfaceVariant),
          ),
          const SizedBox(height: 10),
          InputField(_note, hint: '今天做到了什么？', multiline: true),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: Btn(
              '提交打卡',
              small: true,
              onPress: (_busy || checkedToday || _note.text.trim().isEmpty)
                  ? null
                  : () => _act(() => api('/api/goals/${widget.id}/checkins',
                      method: 'POST', body: {'note': _note.text.trim()}))
                      .then((_) => _note.clear()),
            ),
          ),
        ],
      ),
    );
  }

  // ---- 打卡记录行 ----
  Widget _checkinRow(Checkin c) {
    final isReviewer =
        _goal?.myRole == 'supervisor' || _goal?.myRole == 'witness';
    final pending = c.status == 'pending' && isReviewer;
    return Frame(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(c.day,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: C.onSurfaceVariant)),
              const Spacer(),
              if (c.status == 'pending') const TagChip('待批阅', color: C.secondary),
              if (c.status == 'approved') const TagChip('通过', color: C.primary, filled: true),
              if (c.status == 'rejected') const TagChip('驳回', color: C.error, filled: true),
            ],
          ),
          const SizedBox(height: 8),
          Text(c.note,
              style: const TextStyle(
                  fontSize: 15, color: C.onSurface, height: 1.5)),
          if (c.reviewMessage.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '批语：「${c.reviewMessage}」',
              style: TextStyle(
                  fontSize: 13,
                  color: c.status == 'rejected' ? C.error : C.primary),
            ),
          ],
          if (pending) ...[
            const SizedBox(height: 8),
            InputField(_rn(c.id), hint: '批语（可空）'),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Btn(
                    '通过',
                    small: true,
                    onPress: _busy
                        ? null
                        : () => _act(() => api('/api/checkins/${c.id}/review',
                            method: 'POST',
                            body: {
                              'approved': true,
                              'message': _rn(c.id).text.trim()
                            })),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Btn(
                    '驳回',
                    small: true,
                    variant: 'danger',
                    onPress: _busy
                        ? null
                        : () => _act(() => api('/api/checkins/${c.id}/review',
                            method: 'POST',
                            body: {
                              'approved': false,
                              'message': _rn(c.id).text.trim()
                            })),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ---- 结局判定 ----
  Widget _resultCard(Goal g) {
    final proposal = g.resultProposal;
    final meId = ((SessionScope.of(context).user?['id'] ?? '') as String);
    final proposedByMe = proposal != null && proposal.proposedBy == meId;
    return Frame(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('结局判定',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: C.primary)),
          const SizedBox(height: 4),
          const Text('任一方可发起；双方确认后生效。',
              style: TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
          if (proposal != null && proposedByMe) ...[
            const SizedBox(height: 10),
            Text(
              '已发起「${proposal.result == 'achieved' ? '做到了' : '未做到'}」，待对方确认…',
              style: const TextStyle(fontSize: 13, color: C.secondary),
            ),
          ],
          if (proposal != null && !proposedByMe) ...[
            const SizedBox(height: 10),
            Text(
              '对方判定此约：${proposal.result == 'achieved' ? '做到了' : '未做到'}',
              style: const TextStyle(fontSize: 14, color: C.onSurface),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Btn('同意',
                      small: true,
                      onPress: _busy
                          ? null
                          : () => _act(() => api(
                              '/api/goals/${widget.id}/result/confirm',
                              method: 'POST',
                              body: {'agree': true}))),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Btn('不同意',
                      small: true,
                      variant: 'outlined',
                      onPress: _busy
                          ? null
                          : () => _act(() => api(
                              '/api/goals/${widget.id}/result/confirm',
                              method: 'POST',
                              body: {'agree': false}))),
                ),
              ],
            ),
          ],
          if (proposal == null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Btn('判定：做到了',
                      small: true,
                      variant: 'tonal',
                      onPress: _busy
                          ? null
                          : () => _act(() => api('/api/goals/${widget.id}/result',
                              method: 'POST',
                              body: {'result': 'achieved'}))),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Btn('判定：未做到',
                      small: true,
                      variant: 'danger',
                      onPress: _busy
                          ? null
                          : () => _act(() => api('/api/goals/${widget.id}/result',
                              method: 'POST',
                              body: {'result': 'failed'}))),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ---- 心愿达成 ----
  Widget _giftCard(Goal g) {
    return Frame(
      child: Column(
        children: [
          const Text('心愿达成',
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: C.secondary)),
          if (!_giftOpened) ...[
            const SizedBox(height: 14),
            GestureDetector(
              onTap: () => setState(() => _giftOpened = true),
              child: Container(
                width: 88,
                height: 88,
                decoration: const BoxDecoration(
                  color: C.tertiaryContainer,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                        color: Color(0x24000000),
                        blurRadius: 6,
                        offset: Offset(0, 2)),
                  ],
                ),
                alignment: Alignment.center,
                child: const Text('拆',
                    style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: C.onTertiaryContainer)),
              ),
            ),
            const SizedBox(height: 8),
            const Text('点按开启心愿礼物',
                style: TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
          ] else ...[
            const SizedBox(height: 14),
            Seal(label: '成', size: 52, color: C.secondary),
            const SizedBox(height: 10),
            H(g.giftName.isEmpty ? '此约无奖励，达成即可' : g.giftName, size: 20),
            if (g.giftNote.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(g.giftNote,
                  style: const TextStyle(
                      fontSize: 13, color: C.onSurfaceVariant),
                  textAlign: TextAlign.center),
            ],
            const SizedBox(height: 12),
            const Text('礼物由立约人线下兑现，平台不经手资金与物品',
                style: TextStyle(fontSize: 12, color: C.secondary),
                textAlign: TextAlign.center),
            const SizedBox(height: 12),
            Btn('查看回忆录', small: true, variant: 'tonal', onPress: _openMemoir),
          ],
        ],
      ),
    );
  }

  // ---- 未达成 ----
  Widget _failedCard(Goal g) {
    return Frame(
      child: Column(
        children: [
          const SizedBox(height: 4),
          Seal(
              label: '憾',
              size: 48,
              color: C.surfaceContainerHighest,
              textColor: C.onSurfaceVariant),
          const SizedBox(height: 10),
          const H('此约未达成', size: 18),
          const SizedBox(height: 8),
          const Text('无妨。许过的愿，还可以再许。',
              style: TextStyle(fontSize: 12, color: C.secondary),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _ruleBox(String rule) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: C.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('每日规则',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: C.primary)),
            const SizedBox(height: 4),
            Text(rule,
                style: const TextStyle(
                    fontSize: 15, color: C.onSurface, height: 1.45)),
          ],
        ),
      );
}
