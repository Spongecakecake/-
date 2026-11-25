// 我的 · 个人档案 + 回忆录藏品 + 平台说明
import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../session.dart';
import '../theme.dart';
import '../ui.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with RouteAware {
  List<MemoirItem> _memoirs = [];

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
    super.dispose();
  }

  @override
  void didPopNext() => _load();

  Future<void> _load() async {
    try {
      final r = await api('/api/me/memoirs');
      if (!mounted) return;
      setState(() {
        _memoirs = ((r['memoirs'] as List?) ?? const [])
            .map((e) => MemoirItem.fromJson(e as Map))
            .toList();
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final nick = ((session.user?['nickname'] ?? '客') as String);
    final username = ((session.user?['username'] ?? '') as String);
    final avatarChar = nick.isNotEmpty ? nick[0] : '客';
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 60),
          children: [
            // 头部
            Row(
              children: [
                Seal(label: avatarChar, size: 52),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      H(nick, size: 20),
                      const SizedBox(height: 4),
                      Text('@$username',
                          style: const TextStyle(
                              fontSize: 12, color: C.onSurfaceVariant)),
                    ],
                  ),
                ),
              ],
            ),
            _sec('回忆录'),
            if (_memoirs.isEmpty)
              Frame(
                child: Text(
                  '暂无回忆录\n完成一份契约后自动生成',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 13,
                      color: C.onSurfaceVariant,
                      height: 1.7),
                ),
              )
            else
              ..._memoirs.map((m) => GestureDetector(
                    onTap: () =>
                        Navigator.pushNamed(context, '/memoir', arguments: m.id),
                    child: Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: C.darkSurface,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('回忆录',
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: C.primaryContainer)),
                          const SizedBox(height: 6),
                          Text(m.title,
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: C.darkOnSurface)),
                          const SizedBox(height: 6),
                          Text('生成于 ${shortDate(m.createdAt)}',
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: C.darkOnSurfaceVariant)),
                        ],
                      ),
                    ),
                  )),
            _sec('平台说明'),
            Frame(
              child: const Text(
                '· 心愿礼物仅线下兑现，平台不经手任何资金与物品\n'
                '· 目标结果以双方确认为准，平台不代判\n'
                '· 投诉与争议由管理员人工终裁\n'
                '· 打卡 48 小时未审核，按约自动通过\n'
                '· 不限制未成年人使用，请量力而诺',
                style: TextStyle(
                    fontSize: 13, color: C.onSurfaceVariant, height: 1.85),
              ),
            ),
            const SizedBox(height: 20),
            Btn('退出登录',
                variant: 'outlined',
                expand: true,
                onPress: () => SessionScope.of(context).logout()),
          ],
        ),
      ),
    );
  }

  Widget _sec(String label) => Padding(
        padding: const EdgeInsets.only(top: 16, bottom: 10),
        child: Text(label,
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600, color: C.primary)),
      );
}
