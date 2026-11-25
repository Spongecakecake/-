// 设置 · 每日约定阅读、免打扰时段、接口地址与退出
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../auth';
import { BASE_URL } from '../api/client';
import { goBackOrHome } from '../navigation';
import { C, R } from '../theme';
import { Frame, Btn, H, Chip } from '../ui';
import ScreenHeader from '../components/ScreenHeader';

const today = () => new Date().toLocaleDateString('sv-SE');

export default function SettingsScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [pledged, setPledged] = useState(() => {
    try {
      const g = globalThis as any;
      return g.localStorage?.getItem('zd_pledge_date') === today();
    } catch {
      return false;
    }
  });
  const [quiet, setQuiet] = useState(() => {
    try {
      const g = globalThis as any;
      return g.localStorage?.getItem('zd_quiet') !== 'off';
    } catch {
      return true;
    }
  });

  const togglePledge = () => {
    const next = !pledged;
    setPledged(next);
    try {
      const g = globalThis as any;
      g.localStorage?.setItem('zd_pledge_date', next ? today() : '');
    } catch {}
  };

  const toggleQuiet = () => {
    const next = !quiet;
    setQuiet(next);
    try {
      const g = globalThis as any;
      g.localStorage?.setItem('zd_quiet', next ? 'on' : 'off');
    } catch {}
  };

  return (
    <View style={st.root}>
      <ScreenHeader title="设置" subtitle="按自己的节奏，也可随时回来" onBack={() => goBackOrHome(navigation)} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        <Frame>
          <H size={16}>每日一分钟</H>
          <Text style={st.desc}>目标由自己立，打卡由自己写；监督只过目，成败双方确认。礼物仅线下兑现，平台不经手资金与物品。</Text>
          <TouchableOpacity onPress={togglePledge} style={st.row}>
            <View style={[st.check, pledged && st.checkOn]}>{pledged && <Text style={st.checkMark}>✓</Text>}</View>
            <Text style={st.rowText}>今日已读并同意约定</Text>
          </TouchableOpacity>
        </Frame>

        <Frame style={{ marginTop: 14 }}>
          <H size={16}>消息与提醒</H>
          <TouchableOpacity onPress={toggleQuiet} style={st.row}>
            <View style={[st.check, quiet && st.checkOn]}>{quiet && <Text style={st.checkMark}>✓</Text>}</View>
            <Text style={st.rowText}>22:00–08:00 免打扰（自定义打卡提醒不受影响）</Text>
          </TouchableOpacity>
        </Frame>

        <Frame style={{ marginTop: 14 }}>
          <H size={16}>连接信息</H>
          <Text style={st.desc}>后端地址：{BASE_URL}</Text>
          <Chip text="局域网 / 本机自适应" color={C.primary} />
        </Frame>

        <Btn title="退出登录" variant="danger" style={{ marginTop: 22 }} onPress={() => Alert.alert('退出登录', '确定要退出当前账号吗？', [
          { text: '取消', style: 'cancel' },
          { text: '退出', style: 'destructive', onPress: logout },
        ])} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  desc: { fontSize: 13, color: C.onSurfaceVariant, lineHeight: 21, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  rowText: { fontSize: 13, color: C.onSurface, flex: 1 },
  check: { width: 22, height: 22, borderRadius: R.sm, borderWidth: 1, borderColor: C.outline, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkMark: { color: C.onPrimary, fontSize: 14, fontWeight: '700' },
});
