// 启动 · 登录（M3 浅色 + 品牌绿）
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../auth';
import { C, R } from '../theme';
import { Seal, Btn, Field } from '../ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    if (busy) return;
    setErr('');
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (e: any) {
      setErr(e.message || '登录失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={st.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <View style={st.head}>
            <Seal label="做" size={64} />
            <Text style={st.brand}>做到</Text>
            <Text style={st.slogan}>一诺千金 · 白纸黑字</Text>
          </View>

          <View style={st.form}>
            <Text style={st.formTitle}>登录</Text>
            <Text style={st.formHint}>首次输入即自动注册账号</Text>
            <View style={{ marginTop: 16, gap: 12 }}>
              <Field value={username} onChangeText={setUsername} placeholder="用户名" />
              <Field value={password} onChangeText={setPassword} placeholder="密码" secure />
            </View>
            {!!err && <Text style={st.err}>{err}</Text>}
            <Btn title={busy ? '登录中…' : '登录'} onPress={go} disabled={busy} style={{ marginTop: 16 }} />
          </View>

          <View style={st.pledge}>
            <Text style={st.pledgeText}>
              每日一分钟，读一遍约定：目标由自己立，打卡由自己写；{'\n'}
              监督只过目，成败双方确认。{'\n'}
              心愿礼物仅线下兑现，平台不经手任何资金与物品；{'\n'}
              争议由管理员人工终裁。本应用不设年龄门槛，请量力而诺。
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 28, paddingBottom: 40 },
  head: { alignItems: 'center' },
  brand: { fontSize: 32, fontWeight: '700', color: C.onSurface, letterSpacing: 2, marginTop: 16 },
  slogan: { color: C.onSurfaceVariant, fontSize: 13, marginTop: 6 },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: R.lg,
    padding: 20,
    marginTop: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  formTitle: { fontSize: 16, fontWeight: '600', color: C.onSurface },
  formHint: { fontSize: 12, color: C.onSurfaceVariant, marginTop: 4 },
  err: { color: C.error, fontSize: 13, marginTop: 12 },
  pledge: { marginTop: 26, backgroundColor: C.surfaceContainerHigh, borderRadius: R.md, padding: 14 },
  pledgeText: { color: C.onSurfaceVariant, fontSize: 11, lineHeight: 20, textAlign: 'center' },
});
