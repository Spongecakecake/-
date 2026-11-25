// 首页 · 契约列表（我的全部契约 + 凭码加入 + 新建入口）
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth';
import { C, R, E, tplName, tplColor, STATUS_TEXT } from '../theme';
import { Frame, Btn, H, Chip, Bar } from '../ui';

type GoalItem = {
  id: string;
  title: string;
  template: string;
  status: string;
  myRole: string;
  startDate: string;
  endDate: string;
  stats: { total: number; approved: number; pending: number };
  pendingToReview: number;
};

const ROLE_TEXT: Record<string, string> = { owner: '立约人', supervisor: '监督人', witness: '见证人' };

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [pledged, setPledged] = useState(() => {
    try {
      const g = globalThis as any;
      return g.localStorage?.getItem('zd_pledge_date') === new Date().toLocaleDateString('sv-SE');
    } catch {
      return false;
    }
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api('/api/goals');
      setGoals(r.goals);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goInvite = async () => {
    setErr('');
    const c = code.trim();
    if (!/^\d{6}$/.test(c)) {
      setErr('请输入六位邀请码');
      return;
    }
    try {
      await api(`/api/invites/${c}`);
      navigation.navigate('Invite', { code: c });
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const shownGoals = filter === 'all'
    ? goals
    : filter === 'active'
      ? goals.filter((g) => g.status === 'active' || g.status === 'awaiting')
      : goals.filter((g) => g.status === 'achieved' || g.status === 'failed');

  const markPledge = () => {
    const next = !pledged;
    setPledged(next);
    try {
      const g = globalThis as any;
      g.localStorage?.setItem('zd_pledge_date', next ? new Date().toLocaleDateString('sv-SE') : '');
    } catch {}
  };

  const renderItem = ({ item }: { item: GoalItem }) => {
    const ratio = item.stats.total > 0 ? item.stats.approved / Math.max(1, item.stats.total) : 0;
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GoalDetail', { id: item.id })}>
        <Frame style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tplColor(item.template) }} />
              <Text style={st.tpl}>{tplName(item.template)}</Text>
              <Text style={st.role}>{ROLE_TEXT[item.myRole] || ''}</Text>
            </View>
            {item.pendingToReview > 0 ? (
              <Chip text={`${item.pendingToReview} 待批阅`} color={C.error} filled />
            ) : (
              <Chip
                text={STATUS_TEXT[item.status] || item.status}
                color={item.status === 'achieved' ? C.secondary : item.status === 'failed' ? C.error : C.onSurfaceVariant}
                filled={item.status === 'achieved'}
              />
            )}
          </View>
          <H size={16} style={{ marginTop: 10 }}>{item.title}</H>
          <Text style={st.dates}>
            {item.startDate} ～ {item.endDate || '—'}
          </Text>
          {item.status === 'active' && (
            <View style={{ marginTop: 12, gap: 6 }}>
              <Bar ratio={ratio} />
              <Text style={st.stat}>
                通过 {item.stats.approved} · 在批 {item.stats.pending} · 共 {item.stats.total}
              </Text>
            </View>
          )}
        </Frame>
      </TouchableOpacity>
    );
  };

  return (
    <View style={st.root}>
      <View style={st.header}>
        <View>
          <Text style={st.hello}>{user?.nickname} 的</Text>
          <H size={24}>我的契约</H>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('我的Tab')} activeOpacity={0.7}>
          <View style={st.avatar}>
            <Text style={{ color: C.onPrimary, fontSize: 16, fontWeight: '600' }}>{(user?.nickname || '客')[0]}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={markPledge} activeOpacity={0.8} style={st.pledge}>
        <View style={[st.check, pledged && st.checkOn]}>{pledged && <Text style={st.checkMark}>✓</Text>}</View>
        <Text style={st.pledgeText}>{pledged ? '今日约定已读 · 一诺千金' : '点此读一遍今日约定（1 分钟）'}</Text>
      </TouchableOpacity>

      <View style={st.filters}>
        {[
          { id: 'all', name: '全部' },
          { id: 'active', name: '进行中' },
          { id: 'done', name: '已结束' },
        ].map((f) => (
          <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)}>
            <View style={[st.filter, filter === f.id && st.filterOn]}>
              <Text style={{ fontSize: 12, color: filter === f.id ? C.onPrimary : C.onSurfaceVariant }}>{f.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={st.inviteRow}>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="输入六位邀请码加入契约"
          placeholderTextColor={C.outline}
          keyboardType="number-pad"
          style={st.codeInput}
        />
        <Btn title="加入" small onPress={goInvite} />
      </View>
      {!!err && <Text style={st.err}>{err}</Text>}

      <FlatList
        data={shownGoals}
        keyExtractor={(g) => g.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 18, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={st.empty}>还没有契约</Text>
            <Text style={st.emptySub}>创建一份契约，或用邀请码加入</Text>
          </View>
        }
      />

      <TouchableOpacity activeOpacity={0.85} style={st.fab} onPress={() => navigation.navigate('CreateGoal')}>
        <Text style={st.fabText}>＋ 新建契约</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  hello: { fontSize: 13, color: C.onSurfaceVariant },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pledge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 18, marginBottom: 10, padding: 12,
    backgroundColor: C.secondaryContainer, borderRadius: R.md,
  },
  check: { width: 20, height: 20, borderRadius: R.sm, borderWidth: 1, borderColor: C.outline, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkMark: { color: C.onPrimary, fontSize: 13, fontWeight: '700' },
  pledgeText: { fontSize: 12, color: C.onSecondaryContainer, flex: 1 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 8 },
  filter: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: R.full, borderWidth: 1, borderColor: C.outlineVariant },
  filterOn: { backgroundColor: C.primary, borderColor: C.primary },
  inviteRow: { flexDirection: 'row', gap: 10, padding: 18, paddingBottom: 6, alignItems: 'center' },
  codeInput: {
    flex: 1,
    backgroundColor: C.surfaceContainerHigh,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    fontSize: 14,
    color: C.onSurface,
    letterSpacing: 2,
  },
  err: { color: C.error, fontSize: 12, paddingHorizontal: 20 },
  tpl: { fontSize: 12, color: C.onSurfaceVariant },
  role: { fontSize: 12, color: C.outline },
  dates: { fontSize: 12, color: C.onSurfaceVariant, marginTop: 4 },
  stat: { fontSize: 11, color: C.onSurfaceVariant },
  empty: { fontSize: 16, fontWeight: '600', color: C.onSurfaceVariant },
  emptySub: { fontSize: 12, color: C.outline, marginTop: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: C.primaryContainer,
    borderRadius: R.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...E.e2,
  },
  fabText: { color: C.onPrimaryContainer, fontSize: 14, fontWeight: '600' },
});
