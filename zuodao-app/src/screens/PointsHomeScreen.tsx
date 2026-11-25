import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C, R } from '../theme';
import { Frame, H } from '../ui';
import { pointsSummary, trustMe } from '../api/flags';

export default function PointsHomeScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any>(null);
  const [trust, setTrust] = useState<any>(null);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([pointsSummary().catch(() => null), trustMe().catch(() => null)]);
    setSummary(s?.points || null);
    setTrust(t?.trust || null);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={st.root}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 80 }}>
        <View style={st.hero}>
          <Text style={st.label}>积分账户 · 行为分 + 结算分</Text>
          <Text style={st.balance}>{summary?.balance ?? 0}</Text>
          <Text style={st.pending}>结算中 {summary?.pending ?? 0} · 结算后 T+7 发放</Text>
          <Text style={st.hint}>积分不可兑现、不可转让；仅用于商店与玩法权益。</Text>
        </View>
        <Frame style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={st.label}>信任分</Text>
            <View style={{ flex: 1 }} />
            <H size={20}>{trust?.score ?? 100}</H>
          </View>
          <Text style={st.meta}>{trust?.canPlant ? '可正常插旗' : '禁插旗期内'}{trust?.noPullUntil ? ` · 保护至 ${String(trust.noPullUntil).slice(0, 10)}` : ''}</Text>
        </Frame>
        <TouchableOpacity onPress={() => navigation.navigate('PointsLedger')}>
          <Frame style={[st.link, { marginTop: 12 }]}><H size={17}>积分账本</H><Text style={st.meta}>已到账 / 结算中 / 已扣除</Text></Frame>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('PointsShop')}>
          <Frame style={st.link}><H size={17}>积分商店</H><Text style={st.meta}>延期卡 · 重启券 · 免战盾 · 抽奖</Text></Frame>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('PointsLedger', { tab: 'board' })}>
          <Frame style={st.link}><H size={17}>阵营排行榜</H><Text style={st.meta}>L1 旗不贡献榜单分</Text></Frame>
        </TouchableOpacity>
        <Frame style={{ marginTop: 12 }}>
          <Text style={st.label}>积分规则</Text>
          <Text style={st.desc}>留言上墙 +2 · 收进旗帜 +10 · 戳到我 +3。达成护旗 +20×成色，旗落拔旗 +15×成色；复活重算后护旗翻倍、拔旗减半。</Text>
        </Frame>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  hero: { backgroundColor: C.secondaryContainer, borderRadius: R.lg, padding: 18 },
  label: { color: C.primary, fontSize: 11, fontWeight: '700' },
  balance: { color: C.primary, fontSize: 56, fontWeight: '700', marginTop: 8 },
  pending: { color: C.onSecondaryContainer, fontSize: 13, marginTop: 4 },
  hint: { color: C.outline, fontSize: 11, marginTop: 10 },
  meta: { color: C.onSurfaceVariant, fontSize: 12, marginTop: 6 },
  desc: { color: C.onSurfaceVariant, fontSize: 13, lineHeight: 21, marginTop: 8 },
  link: { marginBottom: 10 },
});
