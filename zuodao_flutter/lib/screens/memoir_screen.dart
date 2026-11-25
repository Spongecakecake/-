// 大结局 · 回忆录（六章节，M3 深色）
import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../ui.dart';

class MemoirScreen extends StatefulWidget {
  final String id;
  const MemoirScreen({super.key, required this.id});

  @override
  State<MemoirScreen> createState() => _MemoirScreenState();
}

class _MemoirScreenState extends State<MemoirScreen> {
  Memoir? _m;
  String _err = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await api('/api/memoirs/${widget.id}');
      if (!mounted) return;
      setState(() => _m = Memoir.fromJson(r['memoir'] as Map));
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final m = _m;
    return Scaffold(
      backgroundColor: C.darkSurface,
      appBar: AppBar(
        backgroundColor: C.darkSurface,
        foregroundColor: C.darkOnSurface,
        title: const Text('回忆录'),
      ),
      body: m == null
          ? Center(
              child: Text(_err.isEmpty ? '加载中…' : _err,
                  style: const TextStyle(color: C.darkOnSurfaceVariant)),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 60),
              children: [
                // 卷首
                Column(
                  children: [
                    const Text('回忆录',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: C.primaryContainer)),
                    const SizedBox(height: 8),
                    H(m.title,
                        size: 26,
                        color: C.darkOnSurface,
                        textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    Text(m.participants.join(' × '),
                        style: const TextStyle(
                            fontSize: 12, color: C.darkOnSurfaceVariant)),
                    const SizedBox(height: 14),
                    Container(
                        width: 56,
                        height: 2,
                        decoration: BoxDecoration(
                            color: C.primary,
                            borderRadius: BorderRadius.circular(1))),
                  ],
                ),
                const SizedBox(height: 20),
                // 章节
                for (final c in m.chapters)
                  Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: C.darkSurfaceContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.no.toString().padLeft(2, '0'),
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: C.primaryContainer)),
                        const SizedBox(height: 4),
                        Text(c.title,
                            style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: C.darkOnSurface)),
                        const SizedBox(height: 8),
                        Text(c.text,
                            style: const TextStyle(
                                fontSize: 14,
                                color: C.darkOnSurfaceVariant,
                                height: 1.7)),
                      ],
                    ),
                  ),
                // 卷尾
                const SizedBox(height: 8),
                Column(
                  children: [
                    Seal(label: '做到', size: 54, color: C.tertiary),
                    const SizedBox(height: 8),
                    const Text('此约已入册 · 一诺既出，做到了',
                        style: TextStyle(
                            fontSize: 12, color: C.darkOnSurfaceVariant)),
                  ],
                ),
              ],
            ),
    );
  }
}
