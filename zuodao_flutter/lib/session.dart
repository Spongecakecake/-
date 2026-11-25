// 会话状态（登录 / 登出 / 恢复）+ 全局作用域
import 'package:flutter/material.dart';

import 'api.dart';

class Session extends ChangeNotifier {
  Map<String, dynamic>? user;
  bool ready = false;

  Future<void> init() async {
    await loadStoredSession();
    if (kToken != null) {
      user = storedUser;
    }
    ready = true;
    notifyListeners();
  }

  Future<void> login(String username, String password) async {
    final r = await api(
      '/api/auth/login',
      method: 'POST',
      body: {'username': username, 'password': password},
    );
    user = (r['user'] as Map).cast<String, dynamic>();
    await saveSession(r['token'] as String, user);
    notifyListeners();
  }

  Future<void> logout() async {
    user = null;
    await saveSession(null, null);
    notifyListeners();
  }
}

/// InheritedNotifier：登录态变化时自动重建依赖方
class SessionScope extends InheritedNotifier<Session> {
  const SessionScope({
    super.key,
    required Session notifier,
    required super.child,
  }) : super(notifier: notifier);

  static Session of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SessionScope>()!.notifier!;
}
