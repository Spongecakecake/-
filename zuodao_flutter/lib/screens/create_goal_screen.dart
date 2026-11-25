// 立约 · 选择类型 → 目标内容 → 设定周期 → 每日规则 → 达成奖励 → 生成契约与邀请码
import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../ui.dart';

const List<int> _durations = [7, 21, 30, 100];

String _two(int n) => n.toString().padLeft(2, '0');
String _dateAfter(int days) {
  final d = DateTime.now().add(Duration(days: days));
  return '${d.year}-${_two(d.month)}-${_two(d.day)}';
}

String _today() => _dateAfter(0);

class CreateGoalScreen extends StatefulWidget {
  const CreateGoalScreen({super.key});

  @override
  State<CreateGoalScreen> createState() => _CreateGoalScreenState();
}

class _CreateGoalScreenState extends State<CreateGoalScreen> {
  String _tpl = 'habit';
  int _days = 21;
  bool _busy = false;
  String _err = '';
  Goal? _created;
  String _code = '';

  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _rule = TextEditingController();
  final _giftName = TextEditingController();
  final _giftNote = TextEditingController();

  Future<void> _submit() async {
    if (_busy) return;
    setState(() => _err = '');
    if (_title.text.trim().isEmpty || _rule.text.trim().isEmpty) {
      setState(() => _err = '目标名称与每日规则不可为空');
      return;
    }
    setState(() => _busy = true);
    try {
      final r = await api('/api/goals', method: 'POST', body: {
        'title': _title.text.trim(),
        'template': _tpl,
        'description': _desc.text.trim(),
        'startDate': _today(),
        'endDate': _dateAfter(_days),
        'rule': _rule.text.trim(),
        'gift': {'name': _giftName.text.trim(), 'note': _giftNote.text.trim()},
      });
      final goal = Goal.fromJson(r['goal'] as Map);
      final inv = await api('/api/goals/${goal.id}/invite', method: 'POST');
      setState(() {
        _created = goal;
        _code = (inv['code'] ?? '') as String;
      });
    } catch (e) {
      setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    _rule.dispose();
    _giftName.dispose();
    _giftNote.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final g = _created;
    return Scaffold(
      appBar: AppBar(title: const Text('新建契约')),
      body: g == null ? _form() : _success(g),
    );
  }

  // ---- 契约创建成功 ----
  Widget _success(Goal g) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('契约已创建 · 等待对方加入',
              style: TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
          const SizedBox(height: 12),
          Frame(
            child: Column(
              children: [
                const Seal(label: '立', size: 46),
                const SizedBox(height: 6),
                const Text('契约书',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: C.primary)),
                const SizedBox(height: 6),
                H(g.title, size: 22, textAlign: TextAlign.center),
                const SizedBox(height: 6),
                Text(
                  '${tplName(g.template)} · ${g.startDate} 起 · 为期 $_days 天',
                  style: const TextStyle(
                      fontSize: 12, color: C.onSurfaceVariant),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 14),
                _box('每日规则', g.rule),
                const SizedBox(height: 14),
                _box('心愿奖励（线下兑现）', g.giftName.isEmpty ? '—' : g.giftName),
                const SizedBox(height: 14),
                const Divider(color: C.outlineVariant),
                const Text('邀请码',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: C.primary)),
                const SizedBox(height: 4),
                Text(_code,
                    style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                        color: C.tertiary,
                        letterSpacing: 6)),
                const SizedBox(height: 4),
                const Text('把邀请码发给监督人 / 见证人，即可加入',
                    style: TextStyle(
                        fontSize: 11, color: C.onSurfaceVariant),
                    textAlign: TextAlign.center),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Btn('回到首页',
              onPress: () => Navigator.popUntil(context, (r) => r.isFirst),
              expand: true),
          const SizedBox(height: 10),
          Btn('再建一份',
              variant: 'outlined',
              onPress: () => setState(() => _created = null),
              expand: true),
        ],
      ),
    );
  }

  // ---- 立约表单 ----
  Widget _form() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const H('选择类型', size: 16),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final t in kTemplates)
                _sel(t.name, t.id == _tpl, () => setState(() => _tpl = t.id)),
            ],
          ),
          const SizedBox(height: 22),
          const H('立下目标', size: 16),
          const SizedBox(height: 10),
          InputField(_title, hint: '目标名称，如：连续晨跑 21 天'),
          const SizedBox(height: 10),
          InputField(_desc, hint: '缘由与细则（可空）', multiline: true),
          const SizedBox(height: 22),
          const H('设定周期', size: 16),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final d in _durations)
                _sel('$d 天', d == _days, () => setState(() => _days = d)),
            ],
          ),
          const SizedBox(height: 8),
          Text('${_today()} ～ ${_dateAfter(_days)}',
              style:
                  const TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
          const SizedBox(height: 22),
          const H('每日规则', size: 16),
          const SizedBox(height: 10),
          InputField(_rule, hint: '每天做到什么算过一天？如：晨跑 3 公里并记录', multiline: true),
          const SizedBox(height: 22),
          const H('达成奖励', size: 16),
          const SizedBox(height: 8),
          const Text('如愿达成，以此自赏 · 仅线下兑现，平台不经手资金',
              style: TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
          const SizedBox(height: 10),
          InputField(_giftName, hint: '心愿礼物，如：一双跑鞋'),
          const SizedBox(height: 10),
          InputField(_giftNote, hint: '补充说明（可空）'),
          if (_err.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(_err,
                style: const TextStyle(color: C.error, fontSize: 13),
                textAlign: TextAlign.center),
          ],
          const SizedBox(height: 22),
          Btn(_busy ? '创建中…' : '创建契约',
              onPress: _busy ? null : _submit, expand: true),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _sel(String label, bool on, VoidCallback tap) => GestureDetector(
        onTap: tap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: on ? C.primaryContainer : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: on ? Colors.transparent : C.outlineVariant),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: on ? C.onPrimaryContainer : C.onSurfaceVariant,
            ),
          ),
        ),
      );

  Widget _box(String label, String text) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: C.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: C.primary)),
            const SizedBox(height: 4),
            Text(text,
                style: const TextStyle(
                    fontSize: 15, color: C.onSurface, height: 1.45)),
          ],
        ),
      );
}
