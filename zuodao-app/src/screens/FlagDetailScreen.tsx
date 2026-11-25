import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C, R } from '../theme';
import { Frame, H, Chip, Btn, Field, Bar } from '../ui';
import ScreenHeader from '../components/ScreenHeader';
import { goBackOrHome } from '../navigation';
import { api, copyText } from '../api/client';
import {
  flagDetail, flagCard, sendStanding, featureStanding, pokeStanding, reportStanding,
  setFlagPrivacy, setFlagPull, track, FLAG_STATE_TEXT, COLOR_TEXT,
} from '../api/flags';

const REASONS = ['未达规则', '证据不足', '逾期未说明'];

export default function FlagDetailScreen({ route, navigation }: any) {
  const id: string = route?.params?.id;
  const template = route?.params?.template;
  const [flag, setFlag] = useState<any>(null);
  const [side, setSide] = useState('defend');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!id) { setErr('缺少旗编号'); return; }
    setLoading(true);
    try {
      const r = await flagDetail(id);
      setFlag(r.flag);
      setErr('');
      track('flag_view', { flagId: id, from: 'detail' });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    if (template && typeof template === 'object') {
      setContent(template.text);
      setSide('tempt');
    }
    load();
  }, [load, template]));

  const act = async (fn: () => Promise<any>, msg?: string) => {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      await fn();
      if (msg) Alert.alert('提示', msg);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!flag) {
    return (
      <View style={st.root}>
        <ScreenHeader title="旗面" onBack={() => goBackOrHome(navigation)} />
        <View style={{ alignItems: 'center', paddingTop: 100 }}>
          <Text style={{ color: C.onSurfaceVariant }}>{err || '加载中…'}</Text>
        </View>
      </View>
    );
  }

  const progress = flag.progress || {};
  const counts = flag.counts || {};
  const color = flag.color || 'self';
  const standings: any[] = (flag.standings || []).filter((s: any) => s.side === side);

  const share = async () => {
    const r = await flagCard(id);
    const card = r.card || {};
    await copyText(`【做到战况卡】${card.title || flag.title}\n威胁值 ${card.threatValue || 0} · ${card.progress || ''}`);
    Alert.alert('已复制', '战况文案已复制，可分享给朋友');
  };

  return (
    <View style={st.root}>
      <ScreenHeader
        title="旗面"
        subtitle={`${COLOR_TEXT[color] || ''} · ${FLAG_STATE_TEXT[flag.state] || flag.state}`}
        onBack={() => goBackOrHome(navigation)}
        right={<TouchableOpacity onPress={share} hitSlop={10}><Text style={{ color: C.primary, fontWeight: '600' }}>分享</Text></TouchableOpacity>}
      />
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
      >
        <Frame>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[st.ring, { borderColor: color === 'auto' ? C.secondary : color === 'witness' ? C.primary : C.outline }]}>
              <Text style={st.ringText}>{Math.round(Number(progress.ratio || 0) * 100)}%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <H size={20}>{flag.title}</H>
              <Text style={st.meta}>{flag.startDate} ～ {flag.endDate}</Text>
              <Text style={[st.meta, { marginTop: 4 }]}>通过 {progress.approved || 0} / {progress.total || 0} 天</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Chip text={COLOR_TEXT[color] || color} color={C.secondary} filled={color === 'auto'} />
            <Chip text={FLAG_STATE_TEXT[flag.state] || flag.state} color={flag.state === 'fallen' ? C.error : C.primary} filled={flag.state === 'active'} />
            <Chip text={`威胁 ${flag.threatValue || 0}`} color={C.tertiary} />
          </View>
          <View style={st.ruleBox}>
            <Text style={st.ruleLabel}>每日规则</Text>
            <Text style={st.ruleText}>{flag.rule}</Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <Bar ratio={Number(progress.ratio || 0)} />
            <Text style={[st.meta, { marginTop: 6 }]}>护旗 {counts.defend || 0} · 拔旗 {flag.pullEnabledEffective ? counts.tempt || 0 : '已关'} · {flag.hasProof ? '已举证' : '待举证'}</Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('ProofRequest', { flagId: id, goalId: flag.goalId, source: 'witness' })}>
            <View style={st.proof}><Text style={st.proofText}>点验举证 · 牵挂式提醒</Text></View>
          </TouchableOpacity>

          {flag.canManage && (
            <View style={{ borderTopWidth: 1, borderTopColor: C.outlineVariant, marginTop: 14, paddingTop: 12 }}>
              <Text style={st.ruleLabel}>旗主管理</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <Btn title={flag.privacy === 'public' ? '转私密' : '转公开'} small variant="outlined" onPress={() => act(() => setFlagPrivacy(id, flag.privacy === 'public' ? 'private' : 'public'))} />
                <Btn title={flag.pullEnabled ? '关拔旗' : '开拔旗'} small variant="outlined" onPress={() => act(() => setFlagPull(id, !flag.pullEnabled))} />
                {flag.state === 'fallen' && <Btn title="旗落 / 复活" small variant="tonal" onPress={() => navigation.navigate('FlagFall', { id })} />}
              </View>
              {flag.state === 'active' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <View style={{ flex: 1 }}><Btn title="判定：做到了" small variant="tonal" onPress={() => act(() => api(`/api/goals/${flag.goalId}/result`, { method: 'POST', body: { result: 'achieved' } }))} /></View>
                  <View style={{ flex: 1 }}><Btn title="判定：未做到" small variant="danger" onPress={() => act(() => api(`/api/goals/${flag.goalId}/result`, { method: 'POST', body: { result: 'failed' } }))} /></View>
                </View>
              )}
            </View>
          )}
        </Frame>

        <View style={st.sideTabs}>
          <TouchableOpacity style={[st.sideTab, side === 'defend' && st.sideTabOn]} onPress={() => setSide('defend')}>
            <Text style={[st.sideText, side === 'defend' && st.sideTextOn]}>护旗 {counts.defend || 0}</Text>
          </TouchableOpacity>
          {flag.pullEnabledEffective && (
            <TouchableOpacity style={[st.sideTab, side === 'tempt' && st.sideTabRed]} onPress={() => setSide('tempt')}>
              <Text style={[st.sideText, side === 'tempt' && { color: C.error }]}>拔旗 {counts.tempt || 0}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Frame>
          <Text style={st.ruleLabel}>{side === 'defend' ? '护旗留言（≤100 字）' : '拔旗留言'}</Text>
          {side === 'defend' ? (
            <View style={{ marginTop: 8 }}><Field value={content} onChangeText={setContent} placeholder="说点什么，陪他把旗守住" multiline /></View>
          ) : (
            <Btn title={content || '选一句官方模板（即选即发）'} variant="tonal" small style={{ marginTop: 10 }} onPress={() => navigation.navigate('TemptPicker', { id, flagId: id })} />
          )}
          {side === 'tempt' && <Text style={[st.hint, { marginTop: 8 }]}>自定义文案需审核；金额、转账一律拦截</Text>}
          <Btn
            title={busy ? '提交中…' : '站队留言'}
            small
            style={{ marginTop: 12, alignSelf: 'flex-end' }}
            disabled={busy || !content.trim()}
            onPress={() => act(() => sendStanding(id, side, side === 'tempt' ? 'template' : 'custom', content.trim(), 'T1'), content.trim())}
          />
        </Frame>

        {standings.map((s) => (
          <Frame key={s.id} style={[st.standing, s.featured && st.standingFeatured, s.status === 'pending' && st.standingPending]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={st.meta}>{s.userId.slice(0, 6)} · {String(s.createdAt).slice(0, 10)}</Text>
              <View style={{ flex: 1 }} />
              {!!s.official && <Chip text="官方" color={C.secondary} filled />}
              {!!s.featured && <Chip text="已收进旗帜" color={C.secondary} />}
              {s.status === 'pending' && <Chip text="审核中" color={C.outline} />}
            </View>
            <Text style={st.quote}>{s.content}</Text>
            {flag.canManage && s.status === 'published' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn title="收进旗帜" small variant="tonal" onPress={() => act(() => featureStanding(s.id))} />
                <Btn title={`戳到我 ${s.pokedCount ? `×${s.pokedCount}` : ''}`} small variant="outlined" onPress={() => act(() => pokeStanding(s.id))} />
              </View>
            )}
            {!flag.canManage && (
              <Btn title="举报" small variant="outlined" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => Alert.alert('举报理由', '请说明举报原因', REASONS.map((r) => ({ text: r, onPress: () => act(() => reportStanding(s.id, r), '举报已提交') })))} />
            )}
          </Frame>
        ))}

        {!!err && <Text style={st.err}>{err}</Text>}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  ring: { width: 68, height: 68, borderRadius: 34, borderWidth: 6, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  ringText: { color: C.onPrimaryContainer, fontWeight: '700' },
  meta: { fontSize: 12, color: C.onSurfaceVariant },
  hint: { fontSize: 11, color: C.outline },
  err: { color: C.error, fontSize: 13, marginTop: 12 },
  ruleBox: { backgroundColor: C.surfaceContainerHigh, borderRadius: R.md, padding: 12, marginTop: 12 },
  ruleLabel: { fontSize: 11, fontWeight: '700', color: C.primary },
  ruleText: { fontSize: 15, color: C.onSurface, lineHeight: 22, marginTop: 4 },
  proof: { backgroundColor: C.secondaryContainer, borderRadius: R.md, padding: 12, alignItems: 'center', marginTop: 12 },
  proofText: { color: C.onSecondaryContainer, fontSize: 13, fontWeight: '600' },
  sideTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.outlineVariant, marginTop: 16, marginBottom: 10 },
  sideTab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  sideTabOn: { borderBottomWidth: 3, borderBottomColor: C.primary },
  sideTabRed: { borderBottomWidth: 3, borderBottomColor: C.error },
  sideText: { fontSize: 14, color: C.onSurfaceVariant },
  sideTextOn: { color: C.primary, fontWeight: '700' },
  standing: { marginBottom: 10 },
  standingFeatured: { borderWidth: 1, borderColor: C.secondary },
  standingPending: { backgroundColor: C.secondaryContainer },
  quote: { fontSize: 15, color: C.onSurface, lineHeight: 22, marginTop: 8 },
});
