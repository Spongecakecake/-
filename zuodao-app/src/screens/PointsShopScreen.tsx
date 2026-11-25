import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../theme';
import { Frame, H, Btn } from '../ui';
import { pointsShop, pointsSummary, buyPointsItem } from '../api/flags';

export default function PointsShopScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [s, shop] = await Promise.all([pointsSummary().catch(() => null), pointsShop().catch(() => null)]);
    setBalance(s?.points?.balance || 0);
    setItems(shop?.items || []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const limit = (it: any) => {
    if (it.period === 'quarter') return `每季度限购 ${it.limit} 次`;
    if (it.period === 'year') return `每年限购 ${it.limit} 次`;
    return '不限购';
  };

  return (
    <View style={st.root}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        <Frame>
          <Text style={st.label}>可用积分</Text>
          <Text style={st.balance}>{balance}</Text>
          <Text style={st.hint}>商品限购按季度 / 年度重置</Text>
        </Frame>
        {items.map((it) => (
          <Frame key={it.id} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <H size={17}>{it.name}</H>
              <View style={{ flex: 1 }} />
              <Text style={st.price}>{it.price}</Text>
            </View>
            <Text style={st.hint}>{limit(it)}</Text>
            <Btn title={it.price > balance ? '积分不足' : '兑换'} small variant="tonal" style={{ marginTop: 10, alignSelf: 'flex-start' }} disabled={it.price > balance} onPress={() => buyPointsItem(it.id).then(() => load()).catch((e) => setErr(e.message))} />
          </Frame>
        ))}
        {!!err && <Text style={st.err}>{err}</Text>}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  label: { color: C.primary, fontSize: 11, fontWeight: '700' },
  balance: { color: C.primary, fontSize: 48, fontWeight: '700', marginTop: 6 },
  hint: { color: C.outline, fontSize: 11, marginTop: 6 },
  price: { color: C.secondary, fontSize: 18, fontWeight: '700' },
  err: { color: C.error, fontSize: 13, marginTop: 12 },
});
