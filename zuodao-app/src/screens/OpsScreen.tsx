import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C, R } from '../theme';
import { Frame, H, Btn, Field } from '../ui';
import ScreenHeader from '../components/ScreenHeader';
import { goBackOrHome } from '../navigation';
import { api } from '../api/client';
import { adminOverview, adminModeration, adminMetrics } from '../api/flags';

const SWITCHES = [
  { key: 'flagsField', name: '旗场' },
  { key: 'pull', name: '拔旗' },
  { key: 'pointsShop', name: '积分商店' },
  { key: 'shareCard', name: '战况卡分享' },
];

export default function OpsScreen({ navigation }: any) {
  const [config, setConfig] = useState<any>({});
  const [pending, setPending] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [featured, setFeatured] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [c, m, k] = await Promise.all([adminOverview().catch(() => null), adminModeration().catch(() => null), adminMetrics().catch(() => null)]);
    if (c?.config) setConfig(c.config);
    if (m) { setPending(m.standings || []); setReports(m.reports || []); }
    if (k?.metrics) setMetrics(k.metrics);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (key: string) => {
    const body: any = { [key]: !config[key] };
    try { await api('/api/admin/feature-flags', { method: 'POST', body }); load(); } catch (e: any) { setErr(e.message); }
  };

  const saveFeatured = async () => {
    try {
      await api('/api/admin/featured', { method: 'POST', body: { flagIds: featured.split(',').map((s) => s.trim()).filter(Boolean) } });
      Alert.alert('已保存', '精选位已更新');
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const pct = (v: number) => `${Math.round((v || 0) * 1000) / 10}%`;

  return (
    <View style={st.root}>
      <ScreenHeader title="运营后台" subtitle="精选 · 审核 · 举报 · 指标" onBack={() => goBackOrHome(navigation)} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        <Frame>
          <Text style={st.label}>功能开关</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {SWITCHES.map((s) => (
              <Btn key={s.key} title={`${s.name}：${config[s.key] ? '开' : '关'}`} small variant={config[s.key] ? 'filled' : 'outlined'} onPress={() => toggle(s.key)} />
            ))}
          </View>
        </Frame>
        <Frame style={{ marginTop: 10 }}>
          <Text style={st.label}>编辑推荐（最多 20 面旗）</Text>
          <View style={{ marginTop: 8 }}><Field value={featured} onChangeText={setFeatured} placeholder="旗 ID，英文逗号分隔" /></View>
          <Btn title="保存精选" small variant="tonal" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={saveFeatured} />
        </Frame>
        <Frame style={{ marginTop: 10 }}>
          <Text style={st.label}>自定义文案审核</Text>
          {pending.map((p) => (
            <View key={p.id} style={st.item}>
              <Text style={st.text}>{p.content}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn title="通过" small onPress={() => api(`/api/admin/moderation/${p.id}`, { method: 'POST', body: { approved: true, reason: '运营复核' } }).then(load).catch((e) => setErr(e.message))} />
                <Btn title="驳回" small variant="outlined" onPress={() => api(`/api/admin/moderation/${p.id}`, { method: 'POST', body: { approved: false, reason: '运营复核' } }).then(load).catch((e) => setErr(e.message))} />
              </View>
            </View>
          ))}
          {pending.length === 0 && <Text style={st.hint}>暂无待审文案</Text>}
        </Frame>
        <Frame style={{ marginTop: 10 }}>
          <Text style={st.label}>举报处理</Text>
          {reports.map((r) => (
            <View key={r.id} style={st.item}>
              <Text style={st.text}>{r.reason}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn title="成立" small variant="danger" onPress={() => api(`/api/admin/reports/${r.id}`, { method: 'POST', body: { uphold: true, reason: '运营复核' } }).then(load).catch((e) => setErr(e.message))} />
                <Btn title="不成立" small variant="outlined" onPress={() => api(`/api/admin/reports/${r.id}`, { method: 'POST', body: { uphold: false, reason: '运营复核' } }).then(load).catch((e) => setErr(e.message))} />
              </View>
            </View>
          ))}
          {reports.length === 0 && <Text style={st.hint}>暂无待处理举报</Text>}
        </Frame>
        <Frame style={{ marginTop: 10 }}>
          <Text style={st.label}>八项指标</Text>
          {[
            ['旗场渗透率', pct(metrics.penetration)], ['首旗响应时长', `${metrics.firstResponseMinutes || 0} 分钟`],
            ['护旗→注册转化', pct(metrics.defendToRegister)], ['复活反转率', pct(metrics.reviveRate)],
            ['免战/关闭率', pct(metrics.optoutRate)], ['失败用户7日回访', pct(metrics.failureReturnRate)],
            ['举报率', pct(metrics.reportRate)], ['打卡摩擦流失', pct(metrics.proofFriction)],
          ].map(([k, v]) => (
            <TouchableOpacity key={String(k)} style={st.metric}><Text style={st.text}>{k}</Text><H size={15}>{v}</H></TouchableOpacity>
          ))}
          {Array.isArray(metrics.alerts) && metrics.alerts.length > 0 && <Text style={st.err}>{metrics.alerts.join('；')}</Text>}
        </Frame>
        {!!err && <Text style={st.err}>{err}</Text>}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  label: { color: C.primary, fontSize: 11, fontWeight: '700' },
  hint: { color: C.outline, fontSize: 11, marginTop: 8 },
  err: { color: C.error, fontSize: 13, marginTop: 10 },
  item: { backgroundColor: C.surfaceContainerHigh, borderRadius: R.md, padding: 10, marginTop: 10 },
  text: { color: C.onSurfaceVariant, fontSize: 13 },
  metric: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
});
