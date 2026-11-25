// 后端 API 客户端（http + token 持久化）
import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// 真机直连：填电脑的局域网 IP（手机与电脑需在同一网络）；模拟器可用 http://10.0.2.2:3001
const String kBaseUrl = 'http://10.4.16.44:3001';

String? kToken;
String? _storedUserJson;

class ApiError implements Exception {
  final String message;
  ApiError(this.message);

  @override
  String toString() => message;
}

/// 启动时恢复本地会话
Future<void> loadStoredSession() async {
  final sp = await SharedPreferences.getInstance();
  kToken = sp.getString('zd_token');
  _storedUserJson = sp.getString('zd_user');
}

Map<String, dynamic>? get storedUser {
  if (_storedUserJson == null) return null;
  try {
    return jsonDecode(_storedUserJson!) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
}

/// 登录成功后持久化；登出传 null
Future<void> saveSession(String? token, Map<String, dynamic>? user) async {
  final sp = await SharedPreferences.getInstance();
  kToken = token;
  if (token == null) {
    await sp.remove('zd_token');
    await sp.remove('zd_user');
    _storedUserJson = null;
  } else {
    await sp.setString('zd_token', token);
    if (user != null) {
      _storedUserJson = jsonEncode(user);
      await sp.setString('zd_user', _storedUserJson!);
    }
  }
}

Future<Map<String, dynamic>> api(
  String path, {
  String method = 'GET',
  Object? body,
}) async {
  final uri = Uri.parse('$kBaseUrl$path');
  final headers = <String, String>{
    'Content-Type': 'application/json',
    if (kToken != null) 'Authorization': 'Bearer $kToken',
  };
  http.Response res;
  try {
    switch (method) {
      case 'POST':
        res = await http
            .post(uri, headers: headers, body: jsonEncode(body ?? {}))
            .timeout(const Duration(seconds: 15));
      case 'DELETE':
        res = await http
            .delete(uri, headers: headers)
            .timeout(const Duration(seconds: 15));
      default:
        res = await http
            .get(uri, headers: headers)
            .timeout(const Duration(seconds: 15));
    }
  } on TimeoutException {
    throw ApiError('请求超时，请稍后再试');
  } catch (_) {
    throw ApiError('网络异常，请确认后端服务已启动');
  }

  Map<String, dynamic> data = {};
  try {
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (decoded is Map<String, dynamic>) data = decoded;
  } catch (_) {}

  if (res.statusCode >= 400) {
    throw ApiError((data['error'] as String?) ?? '请求失败(${res.statusCode})');
  }
  return data;
}
