// 广场 · 围观公开契约（不展示精确数值）
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { C, R, tplName, tplColor, STATUS_TEXT } from '../theme';
import { Frame, H, Chip } from '../ui';

type PlazaGoal = {
  id: string;
  title: string;
  template: string;
  goalType: string;
  status: string;
  rule: string;
  owner: { nickname: string } | null;
  participantCount: number;
};

const FILTERS = [
  { id: 'all', name: '全部' },
  { id: 'habit', name: '习惯' },
  { id: 'numeric', name: '数值' },
  { id: 'milestone', name: '里程碑' },
];

export default function PlazaScreen() {
  const [goals, setGoals] = useState<PlazaGoal[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ goals: PlazaGoal[] }>('/api/plaza');
      setGoals(r.goals || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = filter === 'all' ? goals : goals.filter((g) => g.goalType === filter);

  return (
    <View style={st.root}>
      <View style={st.header}>
        <Text style={st.hello}>看看别人</Text>
        <H size={24}>契约广场</H>
        <Text style={st.hint}>只展示公开摘要，精确数值默认隐藏</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)}>
            <View style={[st.filter, filter === f.id && st.filterOn]}>
              <Text style={{ fontSize: 13, color: filter === f.id ? C.onPrimary : C.onSurfaceVariant }}>{f.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList
        data={shown}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Frame style={{ marginHorizontal: 18, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tplColor(item.template) }} />
              <Text style={st.meta}>{tplName(item.template)}</Text>
              <Chip text={STATUS_TEXT[item.status] || item.status} color={C.onSurfaceVariant} />
            </View>
            <H size={17} style={{ marginTop: 10 }}>{item.title}</H>
            <Text style={st.rule}>{item.rule}</Text>
            <Text style={st.foot}>{item.owner?.nickname || '有人'} 发起 · {item.participantCount} 人同行</Text>
          </Frame>
        )}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={st.meta}>还没有公开的契约</Text>
          </View>
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12 },
  hello: { fontSize: 13, color: C.onSurfaceVariant },
  hint: { fontSize: 11, color: C.outline, marginTop: 6 },
  filters: { paddingHorizontal: 18, gap: 8, paddingBottom: 8 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.full, borderWidth: 1, borderColor: C.outlineVariant },
  filterOn: { backgroundColor: C.primary, borderColor: C.primary },
  meta: { fontSize: 12, color: C.onSurfaceVariant },
  rule: { fontSize: 13, color: C.onSurface, marginTop: 8, lineHeight: 20 },
  foot: { fontSize: 11, color: C.outline, marginTop: 10 },
});
