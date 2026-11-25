import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C, R } from '../theme';
import { Btn, H, Seal } from '../ui';
import ScreenHeader from '../components/ScreenHeader';
import { goBackOrHome } from '../navigation';
import { copyText } from '../api/client';
import { flagDetail, flagCard, reviveFlag } from '../api/flags';

export default function FlagFallScreen({ route, navigation }: any) {
  const id = route?.params?.id;
  const [flag, setFlag] = useState<any>(null);
  const [now, setNow] = useState(0);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await flagDetail(id);
      setFlag(r.flag);
      setNow(Date.now());
    } catch (e: any) {
      setErr(e.message);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!flag) {
    return (
      <View style={st.root}>
        <ScreenHeader title="旗落结果" dark onBack={() => goBackOrHome(navigation)} />
        <Text style={{ color: C.darkOnSurfaceVariant, textAlign: 'center', marginTop: 100 }}>{err || '加载中…'}</Text>
      </View>
    );
  }

  const left = flag.reviveUntil && now ? Math.ceil((new Date(flag.reviveUntil).getTime() - now) / 86400000) : 0;
  const canRevive = flag.canManage && flag.reviveUntil && !flag.revivedBy && left > 0;
  const quotes = (flag.standings || []).filter((s: any) => s.side === 'defend' && s.status === 'published');

  const share = async () => {
    const r = await flagCard(id);
    await copyText(`【做到 · 旗落】${(r.card || {}).title || flag.title} · 每一步都算数`);
    Alert.alert('已复制', '战况文案已复制');
  };

  return (
    <View style={st.root}>
      <ScreenHeader title="旗落结果" dark onBack={() => goBackOrHome(navigation)} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 70 }}>
        <View style={st.darkCard}>
          <Text style={st.tag}>旗落 · 旅程收束</Text>
          <H size={22} color={C.darkOnSurface} style={{ marginTop: 8 }}>{flag.title}</H>
          <Text style={st.darkText}>旗缓缓降下。没有胜负，只有一段真实走过的路。</Text>
          <View style={st.divider} />
          <Text style={st.darkText}>通过 {(flag.progress || {}).approved || 0} / {(flag.progress || {}).total || 0} 天 · 威胁 {flag.threatValue || 0}</Text>
        </View>
        <View style={st.darkCard}>
          <Text style={st.tag}>护旗留言合集</Text>
          {quotes.map((s: any) => (
            <View key={s.id} style={[st.quote, s.featured && st.quoteFeatured]}>
              <Text style={st.darkText}>「{s.content}」</Text>
            </View>
          ))}
          {quotes.length === 0 && <Text style={[st.darkText, { marginTop: 10 }]}>还没有护旗留言。</Text>}
        </View>
        {flag.canManage && (
          <View style={st.darkCard}>
            <Text style={st.tag}>复活窗 · 7 天</Text>
            <Text style={[st.darkText, { marginTop: 8 }]}>{left > 0 ? `剩余 ${left} 天` : '复活窗已关闭'}</Text>
            <Btn title="使用重启券 · 换新旗重来" small variant={canRevive ? 'tonal' : 'outlined'} style={{ marginTop: 12 }} disabled={!canRevive} onPress={() => reviveFlag(id).then(() => { Alert.alert('已重启', '新旗已生成，进度重置。'); load(); })} />
          </View>
        )}
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Seal label="做到" size={46} color={C.tertiary} />
          <Btn title="复制战况文案" small variant="outlined" style={{ marginTop: 12 }} onPress={share} />
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.darkSurface },
  darkCard: { backgroundColor: C.darkSurfaceContainer, borderRadius: R.lg, padding: 16, marginBottom: 12 },
  tag: { fontSize: 11, fontWeight: '700', color: C.primaryContainer },
  darkText: { color: C.darkOnSurfaceVariant, fontSize: 14, lineHeight: 22, marginTop: 8 },
  divider: { height: 1, backgroundColor: C.darkOnSurfaceVariant, opacity: 0.3, marginVertical: 12 },
  quote: { borderLeftWidth: 3, borderLeftColor: C.darkPrimaryContainer, paddingLeft: 10, marginTop: 10 },
  quoteFeatured: { borderLeftColor: C.secondary },
});
