import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C, R } from '../theme';
import { Frame } from '../ui';
import { pointsLedger, leaderboard } from '../api/flags';

const STATUS: Record<string, string> = { pending: '结算中', granted: '已到账', deducted: '已扣除' };

export default function PointsLedgerScreen({ route }: any) {
  const [tab, setTab] = useState(route?.params?.tab === 'board' ? 'board' : 'ledger');
  const [rows, setRows] = useState<any[]>([]);
  const [season, setSeason] = useState('');

  const load = useCallback(async () => {
    if (tab === 'ledger') {
      const r = await pointsLedger();
      setRows(r.ledger || []);
    } else {
      const r = await leaderboard('defend');
      setRows(r.rows || []);
      setSeason(r.season || '');
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { load().catch(() => setRows([])); }, [load]));

  return (
    <View style={st.root}>
      <View style={st.tabs}>
        <TouchableOpacity style={[st.tab, tab === 'ledger' && st.tabOn]} onPress={() => setTab('ledger')}><Text style={st.tabText}>积分流水</Text></TouchableOpacity>
        <TouchableOpacity style={[st.tab, tab === 'board' && st.tabOn]} onPress={() => setTab('board')}><Text style={st.tabText}>阵营榜</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        {tab === 'board' && <Text style={st.meta}>赛季 {season} · 仅统计可计入榜单的旗</Text>}
        {rows.map((r: any, i: number) => (
          <Frame key={r.id || r.userId || i} style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>{tab === 'ledger' ? r.reason : `${i + 1}. ${r.nickname}`}</Text>
              <Text style={st.meta}>{tab === 'ledger' ? `${String(r.at).slice(0, 16)} · ${STATUS[r.status] || r.status}` : r.source || ''}</Text>
            </View>
            <Text style={[st.amount, (tab === 'ledger' ? r.amount : r.score) >= 0 ? st.plus : st.minus]}>
              {tab === 'ledger' ? `${r.amount >= 0 ? '+' : ''}${r.amount}` : r.score}
            </Text>
          </Frame>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: R.full, backgroundColor: C.surfaceContainer },
  tabOn: { backgroundColor: C.primary },
  tabText: { color: C.onSurfaceVariant, fontSize: 13 },
  meta: { color: C.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  title: { fontSize: 15, color: C.onSurface },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  amount: { fontSize: 17, fontWeight: '700' },
  plus: { color: C.primary },
  minus: { color: C.error },
});
