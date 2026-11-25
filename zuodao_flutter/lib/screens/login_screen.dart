// 启动 · 登录（M3 浅色 + 品牌绿）
import 'package:flutter/material.dart';

import '../session.dart';
import '../theme.dart';
import '../ui.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String _err = '';

  Future<void> _go() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _err = '';
    });
    try {
      await SessionScope.of(context).login(_username.text.trim(), _password.text);
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(28, 24, 28, 40),
            child: Column(
              children: [
                const Seal(label: '做', size: 64),
                const SizedBox(height: 16),
                const Text(
                  '做到',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                    color: C.onSurface,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  '一诺千金 · 白纸黑字',
                  style: TextStyle(color: C.onSurfaceVariant, fontSize: 13),
                ),
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(top: 28),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(
                          color: Color(0x1A000000), blurRadius: 3, offset: Offset(0, 1)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('登录',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: C.onSurface)),
                      const SizedBox(height: 4),
                      const Text('首次输入即自动注册账号',
                          style: TextStyle(fontSize: 12, color: C.onSurfaceVariant)),
                      const SizedBox(height: 16),
                      InputField(_username, hint: '用户名'),
                      const SizedBox(height: 12),
                      InputField(_password, hint: '密码', obscure: true),
                      if (_err.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(_err,
                            style: const TextStyle(color: C.error, fontSize: 13)),
                      ],
                      const SizedBox(height: 16),
                      Btn(_busy ? '登录中…' : '登录',
                          onPress: _busy ? null : _go, expand: true),
                    ],
                  ),
                ),
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(top: 26),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: C.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    '每日一分钟，读一遍约定：目标由自己立，打卡由自己写；\n'
                    '监督只过目，成败双方确认。\n'
                    '心愿礼物仅线下兑现，平台不经手任何资金与物品；\n'
                    '争议由管理员人工终裁。本应用不设年龄门槛，请量力而诺。',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: C.onSurfaceVariant, fontSize: 11, height: 1.8),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
