// 首页 · 契约列表（我的全部契约 + 凭码加入 + 新建入口）
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../models.dart';
import '../session.dart';
import '../theme.dart';
import '../ui.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback onProfile;
  const HomeScreen({super.key, required this.onProfile});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with RouteAware {
  List<Goal> _goals = [];
  bool _loading = false;
  String _err = '';
  final _code = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    routeObserver.subscribe(this, ModalRoute.of(context)! as PageRoute<void>);
  }

  @override
  void dispose() {
    routeObserver.unsubscribe(this);
    _code.dispose();
    super.dispose();
  }

  @override
  void didPopNext() => _load();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _err = '';
    });
    try {
      final r = await api('/api/goals');
      setState(() {
        _goals = ((r['goals'] as List?) ?? const [])
            .map((e) => Goal.fromJson(e as Map))
            .toList();
      });
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _goInvite() async {
    setState(() => _err = '');
    final c = _code.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(c)) {
      setState(() => _err = '请输入六位邀请码');
      return;
    }
    try {
      await api('/api/invites/$c');
      if (!mounted) return;
      Navigator.pushNamed(context, '/invite', arguments: c);
    } catch (e) {
      setState(() => _err = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final nick = ((session.user?['nickname'] ?? '客') as String);
    final avatarChar = nick.isNotEmpty ? nick[0] : '客';
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/create'),
        backgroundColor: C.primaryContainer,
        foregroundColor: C.onPrimaryContainer,
        elevation: 3,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        icon: const Icon(Icons.add, size: 20),
        label: const Text('新建契约',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: C.primary,
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 100),
            children: [
              // 头部
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$nick 的',
                            style: const TextStyle(
                                fontSize: 13, color: C.onSurfaceVariant)),
                        const SizedBox(height: 2),
                        const H('我的契约', size: 24),
                      ],
                    ),
                    GestureDetector(
                      onTap: widget.onProfile,
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                            color: C.primary, shape: BoxShape.circle),
                        alignment: Alignment.center,
                        child: Text(avatarChar,
                            style: const TextStyle(
                                color: C.onPrimary,
                                fontSize: 16,
                                fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
              ),
              // 邀请码加入
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 6),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _code,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ],
                        style: const TextStyle(
                            fontSize: 14, color: C.onSurface, letterSpacing: 2),
                        decoration: const InputDecoration(
                          hintText: '输入六位邀请码加入契约',
                          hintStyle: TextStyle(
                              fontSize: 14, color: C.outline, letterSpacing: 0),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Btn('加入', onPress: _goInvite, small: true),
                  ],
                ),
              ),
              if (_err.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                  child: Text(_err,
                      style: const TextStyle(color: C.error, fontSize: 12)),
                ),
              // 契约卡片
              if (_goals.isEmpty && !_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Column(
                    children: [
                      Text('还没有契约',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: C.onSurfaceVariant)),
                      SizedBox(height: 8),
                      Text('创建一份契约，或用邀请码加入',
                          style: TextStyle(fontSize: 12, color: C.outline)),
                    ],
                  ),
                )
              else
                ..._goals.map(_card),
            ],
          ),
        ),
      ),
    );
  }

  Widget _card(Goal g) {
    final total = g.stats.total;
    final ratio = total > 0 ? g.stats.approved / total : 0.0;
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/detail', arguments: g.id),
      child: Frame(
        margin: const EdgeInsets.fromLTRB(18, 0, 18, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                    width: 8,
                    height: 8,
                    decoration:
                        BoxDecoration(color: tplColor(g.template), shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Text(tplName(g.template),
                    style: const TextStyle(
                        fontSize: 12, color: C.onSurfaceVariant)),
                const SizedBox(width: 8),
                Text(kRoleText[g.myRole] ?? '',
                    style: const TextStyle(fontSize: 12, color: C.outline)),
                const Spacer(),
                if (g.pendingToReview > 0)
                  TagChip('${g.pendingToReview} 待批阅',
                      color: C.error, filled: true)
                else
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
            const SizedBox(height: 10),
            H(g.title, size: 16),
            const SizedBox(height: 4),
            Text('${g.startDate} ～ ${g.endDate.isEmpty ? '—' : g.endDate}',
                style:
                    const TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
            if (g.status == 'active') ...[
              const SizedBox(height: 12),
              Bar(ratio),
              const SizedBox(height: 6),
              Text(
                  '通过 ${g.stats.approved} · 在批 ${g.stats.pending} · 共 ${g.stats.total}',
                  style:
                      const TextStyle(fontSize: 11, color: C.onSurfaceVariant)),
            ],
          ],
        ),
      ),
    );
  }
}
