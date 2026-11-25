import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C, R, E } from '../theme';
import { H, Chip, Btn } from '../ui';
import { flagField, flagMine, track, COLOR_TEXT, FLAG_STATE_TEXT } from '../api/flags';

const TABS = [
  { id: 'hot', name: '热门' },
  { id: 'latest', name: '最新' },
  { id: 'ending', name: '即将到期' },
];

export default function FlagFieldScreen({ navigation }: any) {
  const [tab, setTab] = useState('hot');
  const [flags, setFlags] = useState<any[]>([]);
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (mode = mine) => {
    setLoading(true);
    setErr('');
    track('flag_view', { from: mode ? 'mine' : tab });
    try {
      const r = mode ? await flagMine() : await flagField(tab, 50);
      setFlags(r.flags || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [mine, tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={st.root}>
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} tintColor={C.primary} />}
      >
        <View style={st.head}>
          <View>
            <Text style={st.eyebrow}>社区战况 · 本周热闹程度</Text>
            <H size={26}>旗场</H>
          </View>
          <Btn title={mine ? '看全场' : '我的旗'} small variant={mine ? 'filled' : 'outlined'} onPress={() => { const next = !mine; setMine(next); load(next); }} />
        </View>

        {!mine && (
          <View style={st.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.id} style={[st.tab, tab === t.id && st.tabOn]} onPress={() => { setTab(t.id); load(false); }}>
                <Text style={[st.tabText, tab === t.id && st.tabTextOn]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!!err && <Text style={st.err}>{err}</Text>}

        {flags.length === 0 && !loading ? (
          <View style={st.empty}>
            <H size={18}>还没有人插旗</H>
            <Text style={st.hint}>做第一个，把目标亮出来</Text>
            <Btn title="去建约" small variant="tonal" style={{ marginTop: 14 }} onPress={() => navigation.navigate('CreateGoal')} />
          </View>
        ) : flags.map((f) => {
          const progress = f.progress || {};
          const ratio = Number(progress.ratio || 0);
          const counts = f.counts || {};
          const color = f.color || 'self';
          return (
            <TouchableOpacity key={f.id} activeOpacity={0.85} onPress={() => navigation.navigate('FlagDetail', { id: f.id })}>
              <View style={[st.card, f.featured && st.featured]}>
                <View style={st.row}>
                  {!!f.featured && <Chip text="编辑推荐" color={C.secondary} filled />}
                  <Text style={st.meta}>{COLOR_TEXT[color] || f.color}</Text>
                  <View style={{ flex: 1 }} />
                  <Chip text={FLAG_STATE_TEXT[f.state] || f.state} color={f.state === 'fallen' ? C.error : f.state === 'achieved' ? C.secondary : C.primary} filled={f.state === 'active'} />
                </View>
                <H size={18} style={{ marginTop: 10 }}>{f.title}</H>
                <View style={st.cardBody}>
                  <View style={[st.ring, { borderColor: color === 'auto' ? C.secondary : color === 'witness' ? C.primary : C.outline }]}>
                    <Text style={st.ringText}>{Math.round(ratio * 100)}%</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={st.meta}>护旗 {counts.defend || 0} · 拔旗 {f.pullEnabled ? counts.tempt || 0 : '关'}</Text>
                    <Text style={[st.meta, { color: C.tertiary, marginTop: 4 }]}>威胁值 {f.threatValue || 0} · {f.endDate || '—'} 到期</Text>
                    <Text style={[st.hint, { marginTop: 4 }]}>围观不显示精确数值</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { color: C.onSurfaceVariant, fontSize: 12, marginBottom: 4 },
  tabs: { flexDirection: 'row', backgroundColor: C.surfaceContainer, borderRadius: R.full, padding: 4, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: R.full },
  tabOn: { backgroundColor: '#FFFFFF', ...E.e1 },
  tabText: { fontSize: 13, color: C.onSurfaceVariant },
  tabTextOn: { color: C.primary, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: R.lg, padding: 16, marginBottom: 12, ...E.e1 },
  featured: { borderWidth: 1, borderColor: C.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardBody: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ring: { width: 64, height: 64, borderRadius: 32, borderWidth: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primaryContainer },
  ringText: { fontSize: 14, fontWeight: '700', color: C.onPrimaryContainer },
  meta: { fontSize: 12, color: C.onSurfaceVariant },
  hint: { fontSize: 11, color: C.outline },
  err: { color: C.error, fontSize: 13, marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 90 },
});
