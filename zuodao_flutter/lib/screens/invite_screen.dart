// 赴约 · 凭码查看邀请 → 选择身份（监督人 / 见证人 / 婉拒）+ 首句鼓励
import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../ui.dart';

class InviteScreen extends StatefulWidget {
  final String? initialCode;
  const InviteScreen({super.key, this.initialCode});

  @override
  State<InviteScreen> createState() => _InviteScreenState();
}

class _InviteScreenState extends State<InviteScreen> {
  final _code = TextEditingController();
  Invite? _invite;
  String _role = 'supervisor';
  final _msg = TextEditingController();
  bool _busy = false;
  String _err = '';
  String _done = '';

  @override
  void initState() {
    super.initState();
    if ((widget.initialCode ?? '').isNotEmpty) {
      _code.text = widget.initialCode!;
      _look(widget.initialCode!);
    }
  }

  @override
  void dispose() {
    _code.dispose();
    _msg.dispose();
    super.dispose();
  }

  Future<void> _look([String? c]) async {
    setState(() => _err = '');
    try {
      final r = await api('/api/invites/${(c ?? _code.text).trim()}');
      if (!mounted) return;
      final inv = Invite.fromJson(r['invite'] as Map);
      setState(() {
        _invite = inv;
        _role = inv.supTaken ? 'witness' : 'supervisor';
      });
    } catch (e) {
      if (mounted)
        setState(() {
          _err = e.toString();
          _invite = null;
        });
    }
  }

  Future<void> _accept() async {
    final inv = _invite;
    if (inv == null || _busy) return;
    setState(() {
      _busy = true;
      _err = '';
    });
    try {
      await api('/api/invites/${inv.code}/accept',
          method: 'POST', body: {'role': _role, 'message': _msg.text.trim()});
      if (!mounted) return;
      setState(() {
        _done = _role == 'supervisor' ? '已以监督人身份加入' : '已以见证人身份加入';
        _invite = null;
      });
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _decline() async {
    final inv = _invite;
    if (inv == null || _busy) return;
    setState(() {
      _busy = true;
      _err = '';
    });
    try {
      await api('/api/invites/${inv.code}/accept',
          method: 'POST', body: {'role': 'decline'});
      if (!mounted) return;
      setState(() {
        _done = '已婉拒';
        _invite = null;
      });
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // ---- 完成/婉拒后 ----
    if (_done.isNotEmpty) {
      final declined = _done == '已婉拒';
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(30),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Seal(label: declined ? '辞' : '诺', size: 60),
                const SizedBox(height: 18),
                H(_done, size: 20),
                const SizedBox(height: 8),
                Text(
                  declined ? '愿立约人另觅良监督' : '此后每一笔打卡，都将由你审核',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 13, color: C.onSurfaceVariant),
                ),
                const SizedBox(height: 24),
                Btn('回到首页',
                    onPress: () =>
                        Navigator.popUntil(context, (r) => r.isFirst),
                    expand: true),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('接受邀请')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_invite == null) ...[
              Frame(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('邀请码',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: C.primary)),
                    const SizedBox(height: 8),
                    H(_code.text.isEmpty ? '— — — — — —' : _code.text,
                        size: 26),
                    const SizedBox(height: 16),
                    InputField(_code, hint: '输入六位数字邀请码', digits: true),
                    const SizedBox(height: 10),
                    Btn('查看邀请',
                        onPress:
                            _code.text.length != 6 ? null : () => _look(),
                        expand: true),
                    if (_err.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(_err,
                          style:
                              const TextStyle(color: C.error, fontSize: 13)),
                    ],
                  ],
                ),
              ),
            ] else ...[
              Frame(
                child: Column(
                  children: [
                    const Seal(label: '邀', size: 46),
                    const SizedBox(height: 6),
                    const Text('邀请详情',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: C.primary)),
                    const SizedBox(height: 6),
                    H(_invite!.title, size: 22, textAlign: TextAlign.center),
                    const SizedBox(height: 2),
                    Text(
                      '${_invite!.ownerName ?? '—'} 发起 · ${tplName(_invite!.template)} · ${_invite!.startDate} ～ ${_invite!.endDate}',
                      style: const TextStyle(
                          fontSize: 12, color: C.onSurfaceVariant),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 14),
                    _box('每日规则', _invite!.rule),
                    if (_invite!.giftName.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      _box('心愿奖励（线下兑现）', _invite!.giftName),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Frame(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('选择身份',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: C.primary)),
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              Btn('作监督人',
                                  small: true,
                                  expand: true,
                                  variant: _role == 'supervisor'
                                      ? 'filled'
                                      : 'outlined',
                                  onPress: _invite!.supTaken
                                      ? null
                                      : () =>
                                          setState(() => _role = 'supervisor')),
                              if (_invite!.supTaken)
                                const Padding(
                                  padding: EdgeInsets.only(top: 4),
                                  child: Text('已有人加入',
                                      style: TextStyle(
                                          fontSize: 10,
                                          color: C.onSurfaceVariant)),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            children: [
                              Btn('作见证人',
                                  small: true,
                                  expand: true,
                                  variant: _role == 'witness'
                                      ? 'filled'
                                      : 'outlined',
                                  onPress: _invite!.witTaken
                                      ? null
                                      : () =>
                                          setState(() => _role = 'witness')),
                              if (_invite!.witTaken)
                                const Padding(
                                  padding: EdgeInsets.only(top: 4),
                                  child: Text('已有人加入',
                                      style: TextStyle(
                                          fontSize: 10,
                                          color: C.onSurfaceVariant)),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Text('首句鼓励（随邀请附上）',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: C.primary)),
                    const SizedBox(height: 8),
                    InputField(_msg, hint: '如：跑不动的时候，想想跑鞋'),
                    if (_err.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(_err,
                          style:
                              const TextStyle(color: C.error, fontSize: 13)),
                    ],
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: Btn(_busy ? '提交中…' : '接受邀请',
                              onPress: _busy ? null : _accept),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Btn('婉拒',
                              variant: 'outlined',
                              onPress: _busy ? null : _decline),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

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
