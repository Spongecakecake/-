// 契约详情 · 正文 + 打卡 + 批阅 + 结果判定 + 拆礼 + 回忆录
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, copyText } from '../api/client';
import { pickWebPhoto, wrapWatermark } from '../api/watermark';
import { useAuth } from '../auth';
import { goBackOrHome } from '../navigation';
import { C, R, E, tplName, STATUS_TEXT } from '../theme';
import { Frame, Seal, Btn, Field, H, Chip, Bar } from '../ui';
import ScreenHeader from '../components/ScreenHeader';

type Checkin = {
  id: string; day: string; note: string; status: 'pending' | 'approved' | 'rejected';
  reviewMessage: string; createdAt: string;
  value?: string | null; option?: string; duration?: number | null; photo?: string; makeup?: boolean;
};
type Goal = {
  id: string; title: string; template: string; description: string;
  goalType: string; checkinType: string; privacy: string; restDays: number;
  milestones: string[]; gifts: { name: string; note: string }[];
  startDate: string; endDate: string; rule: string;
  status: 'awaiting' | 'active' | 'achieved' | 'failed';
  myRole: string; inviteCode: string | null; giftOpenedAt: string | null;
  participants: { id: string; nickname: string; role: string }[];
  encouragement: { message: string } | null;
  checkins: Checkin[];
  events: { id: string; type: string; message: string; at: string }[];
  stats: { total: number; approved: number; rejected: number; pending: number; bestStreak: number };
  resultProposal: { result: string; proposedBy: string; votes: Record<string, boolean> } | null;
};

const ROLE_TEXT: Record<string, string> = { owner: '立约人', supervisor: '监督人', witness: '见证人' };
const TYPE_TEXT: Record<string, string> = { habit: '习惯型', numeric: '数值型', milestone: '里程碑型' };
const CHECKIN_TEXT: Record<string, string> = { text: '文字', numeric: '数值', choice: '选项', duration: '时长', photo: '图文' };
const REJECT_REASONS = ['未达每日规则', '证据不足', '逾期且未说明', '内容敷衍，请重来'];
const todayStr = () => new Date().toLocaleDateString('sv-SE');
const yesterdayStr = () => new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');

function daysBetween(a: string, b: string) {
  if (!a || !b) return 0;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
}

export default function GoalDetailScreen({ route, navigation }: any) {
  const id: string = route?.params?.id;
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [value, setValue] = useState('');
  const [option, setOption] = useState('已完成');
  const [duration, setDuration] = useState('');
  const [photo, setPhoto] = useState('');
  const [makeup, setMakeup] = useState(false);
  const [makeupDay, setMakeupDay] = useState(yesterdayStr());
  const [busy, setBusy] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) { setErr('缺少契约编号'); return; }
    setLoading(true);
    try {
      const r = await api<{ goal: Goal }>(`/api/goals/${id}`);
      setGoal(r.goal);
      setErr('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (fn: () => Promise<any>) => {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      await fn();
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const share = () => {
    if (!goal) return;
    const text = `【我的契约】${goal.title}\n${tplName(goal.template)} · ${TYPE_TEXT[goal.goalType] || ''} · ${goal.startDate} 起\n每日规则：${goal.rule}\n${goal.inviteCode ? `邀请码：${goal.inviteCode}` : ''}`;
    copyText(text).then((ok) => Alert.alert(ok ? '已复制' : '提示', ok ? '契约卡文案已复制，可分享给朋友' : '请手动截图分享'));
  };

  if (!goal) {
    return (
      <View style={st.root}>
        <ScreenHeader title="契约详情" onBack={() => goBackOrHome(navigation)} />
        <View style={{ alignItems: 'center', paddingTop: 120 }}>
          <Text style={{ color: C.onSurfaceVariant }}>{err || '加载中…'}</Text>
          <Btn title="返回" variant="outlined" small style={{ marginTop: 16 }} onPress={() => goBackOrHome(navigation)} />
        </View>
      </View>
    );
  }

  const me = user;
  const isOwner = goal.myRole === 'owner';
  const isReviewer = goal.myRole === 'supervisor' || goal.myRole === 'witness';
  const checkedToday = goal.checkins.some((c) => c.day === (makeup ? makeupDay : todayStr()));
  const totalDays = daysBetween(goal.startDate, goal.endDate);
  const ratio = totalDays > 0 ? goal.stats.approved / totalDays : 0;
  const proposal = goal.resultProposal;
  const proposedByMe = !!proposal && proposal.proposedBy === me?.id;

  const submitCheckin = () => act(async () => {
    await api(`/api/goals/${id}/checkins`, {
      method: 'POST',
      body: {
        note: note.trim(),
        value: goal.checkinType === 'numeric' ? value : undefined,
        option: goal.checkinType === 'choice' ? option : undefined,
        duration: goal.checkinType === 'duration' ? Number(duration) || 0 : undefined,
        photo: goal.checkinType === 'photo' ? photo : undefined,
        makeup, day: makeup ? makeupDay : undefined,
      },
    });
    setNote(''); setValue(''); setDuration(''); setPhoto(''); setMakeup(false);
  });

  const openGift = () => act(() => api(`/api/goals/${id}/gift/open`, { method: 'POST' }));

  const openMemoir = async () => {
    try {
      const r = await api<{ memoirs: { id: string; goalId: string }[] }>('/api/me/memoirs');
      const m = (r.memoirs || []).find((x) => x.goalId === goal.id);
      if (m) navigation.navigate('Memoir', { id: m.id });
      else Alert.alert('提示', '回忆录正在整理中，请稍后重试');
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <View style={st.root}>
      <ScreenHeader
        title="契约详情"
        subtitle={`${tplName(goal.template)} · ${STATUS_TEXT[goal.status] || goal.status}`}
        onBack={() => goBackOrHome(navigation)}
        right={<TouchableOpacity onPress={share} hitSlop={10}><Text style={{ color: C.primary, fontSize: 14, fontWeight: '600' }}>分享</Text></TouchableOpacity>}
      />
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
      >
        <Frame>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} />
              <Text style={st.meta}>契约书 · {TYPE_TEXT[goal.goalType] || ''}</Text>
            </View>
            <Chip text={STATUS_TEXT[goal.status] || goal.status} color={goal.status === 'achieved' ? C.secondary : goal.status === 'failed' ? C.error : C.onSurfaceVariant} filled={goal.status === 'achieved'} />
          </View>
          <H size={20} style={{ marginTop: 12 }}>{goal.title}</H>
          {!!goal.description && <Text style={st.desc}>{goal.description}</Text>}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
            <Text style={st.meta}>{goal.startDate} 起</Text>
            <Text style={st.meta}>为期 {totalDays || '—'} 天</Text>
            <Text style={st.meta}>打卡：{CHECKIN_TEXT[goal.checkinType] || '文字'}</Text>
            <Text style={st.meta}>休息 {goal.restDays || 0} 天/周</Text>
          </View>
          <View style={st.ruleBox}>
            <Text style={st.ruleLabel}>每日规则</Text>
            <Text style={st.ruleText}>{goal.rule}</Text>
          </View>
          {goal.milestones.length > 0 && (
            <View style={st.ruleBox}>
              <Text style={st.ruleLabel}>里程碑</Text>
              {goal.milestones.map((m, i) => <Text key={i} style={st.ruleText}>· {m}</Text>)}
            </View>
          )}

          <View style={{ marginTop: 12, gap: 6 }}>
            {goal.participants.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={st.miniAvatar}>
                  <Text style={{ color: C.onPrimaryContainer, fontSize: 12, fontWeight: '700' }}>{(p.nickname || '客')[0]}</Text>
                </View>
                <Text style={{ fontSize: 13, color: C.onSurface }}>{p.nickname}</Text>
                <Chip text={ROLE_TEXT[p.role] || p.role} color={p.role === 'owner' ? C.primary : C.secondary} />
              </View>
            ))}
          </View>

          {!!goal.encouragement?.message && <Text style={st.quote}>附言：「{goal.encouragement.message}」</Text>}

          {goal.status === 'awaiting' && goal.inviteCode && isOwner && (
            <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: C.outlineVariant, paddingTop: 12, marginTop: 14, alignItems: 'center' }}>
              <Text style={st.ruleLabel}>邀请码（等待接印）</Text>
              <Text style={st.inviteCode}>{goal.inviteCode}</Text>
              <Btn title="复制邀请码" small variant="tonal" style={{ marginTop: 8 }} onPress={() => copyText(goal.inviteCode!).then(() => Alert.alert('已复制'))} />
            </View>
          )}

          {goal.status === 'active' && (
            <View style={{ marginTop: 14, gap: 6 }}>
              <Bar ratio={ratio} />
              <Text style={st.meta}>通过 {goal.stats.approved} / {totalDays} 天 · 最长连续 {goal.stats.bestStreak} 天</Text>
            </View>
          )}
        </Frame>

        {goal.status === 'active' && isOwner && (
          <Frame style={{ marginTop: 14 }}>
            <Text style={st.ruleLabel}>{makeup ? '补卡' : '今日打卡'} · {makeup ? makeupDay : todayStr()}</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              <Field value={note} onChangeText={setNote} placeholder="今天做到了什么？" multiline />
              {goal.checkinType === 'numeric' && <Field value={value} onChangeText={(t) => setValue(t.replace(/[^\d.-]/g, ''))} placeholder="今日数值" />}
              {goal.checkinType === 'choice' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['已完成', '未完成'].map((o) => (
                    <TouchableOpacity key={o} onPress={() => setOption(o)}>
                      <View style={[st.choice, option === o && st.choiceOn]}><Text style={{ fontSize: 13, color: option === o ? C.onPrimary : C.onSurfaceVariant }}>{o}</Text></View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {goal.checkinType === 'duration' && <Field value={duration} onChangeText={(t) => setDuration(t.replace(/\D/g, ''))} placeholder="时长（分钟）" />}
              {goal.checkinType === 'photo' && (
                <View style={{ gap: 8 }}>
                  <Btn title={photo ? '重新选择图片' : '选择图片并加水印'} small variant="tonal" onPress={() => pickWebPhoto().then((p) => p && setPhoto(wrapWatermark(p, user?.nickname || '做到用户')))} />
                  {!!photo && <Text style={st.meta}>已选择 1 张图片，已叠加昵称与时间水印</Text>}
                </View>
              )}
              <TouchableOpacity onPress={() => setMakeup(!makeup)} style={st.row}>
                <View style={[st.check, makeup && st.checkOn]}>{makeup && <Text style={st.checkMark}>✓</Text>}</View>
                <Text style={st.rowText}>使用补卡券（补最近 7 天，留补卡标识）</Text>
              </TouchableOpacity>
              {makeup && <Field value={makeupDay} onChangeText={setMakeupDay} placeholder="YYYY-MM-DD" />}
              <Btn title="提交打卡" small onPress={submitCheckin} disabled={busy || checkedToday || !note.trim()} style={{ alignSelf: 'flex-end' }} />
            </View>
          </Frame>
        )}

        {goal.checkins.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={st.secTitle}>打卡记录</Text>
            {goal.checkins.map((c) => {
              const pending = c.status === 'pending' && isReviewer;
              const rn = reviewNotes[c.id] || '';
              return (
                <Frame key={c.id} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: C.onSurfaceVariant, fontSize: 14, fontWeight: '500' }}>
                      {c.day}{c.makeup ? ' · 补卡' : ''}
                    </Text>
                    {c.status === 'pending' && <Chip text="待批阅" color={C.secondary} />}
                    {c.status === 'approved' && <Chip text="通过" color={C.primary} filled />}
                    {c.status === 'rejected' && <Chip text="驳回" color={C.error} filled />}
                  </View>
                  <Text style={st.note}>{c.note}</Text>
                  {!!c.value && <Text style={st.meta}>数值：{c.value}</Text>}
                  {!!c.option && <Text style={st.meta}>选项：{c.option}</Text>}
                  {!!c.duration && <Text style={st.meta}>时长：{c.duration} 分钟</Text>}
                  {!!c.photo && <Text style={st.meta}>含图片证据</Text>}
                  {!!c.reviewMessage && <Text style={c.status === 'rejected' ? st.reviewBad : st.review}>批语：「{c.reviewMessage}」</Text>}
                  {pending && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={st.ruleLabel}>驳回理由（必选或填写）</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {REJECT_REASONS.map((r) => (
                          <TouchableOpacity key={r} onPress={() => setReviewNotes({ ...reviewNotes, [c.id]: r })}>
                            <View style={[st.choice, rn === r && st.choiceOn]}><Text style={{ fontSize: 11, color: rn === r ? C.onPrimary : C.onSurfaceVariant }}>{r}</Text></View>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ marginTop: 8 }}>
                        <Field value={rn} onChangeText={(t) => setReviewNotes({ ...reviewNotes, [c.id]: t })} placeholder="批语 / 驳回理由" />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Btn title="通过" small onPress={() => act(() => api(`/api/checkins/${c.id}/review`, { method: 'POST', body: { approved: true, message: rn.trim() } }))} disabled={busy} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Btn title="驳回" small variant="danger" onPress={() => act(() => api(`/api/checkins/${c.id}/review`, { method: 'POST', body: { approved: false, message: rn.trim() } }))} disabled={busy} />
                        </View>
                      </View>
                    </View>
                  )}
                </Frame>
              );
            })}
          </View>
        )}

        {goal.status === 'active' && (
          <Frame style={{ marginTop: 6 }}>
            <Text style={st.ruleLabel}>结局判定</Text>
            <Text style={st.meta}>任一方发起；其他参与者确认后生效，不同意则作废重议。</Text>
            {proposal && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: C.secondary, fontSize: 13 }}>
                  「{proposal.result === 'achieved' ? '做到了' : '未做到'}」· 发起人：{goal.participants.find((p) => p.id === proposal.proposedBy)?.nickname || '对方'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {goal.participants.map((p) => (
                    <Chip key={p.id} text={`${p.nickname} ${proposal.votes[p.id] ? '已确认' : '待确认'}`} color={proposal.votes[p.id] ? C.primary : C.outline} filled={!!proposal.votes[p.id]} />
                  ))}
                </View>
              </View>
            )}
            {proposal && !proposedByMe && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Btn title="同意" small onPress={() => act(() => api(`/api/goals/${id}/result/confirm`, { method: 'POST', body: { agree: true } }))} disabled={busy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Btn title="不同意" small variant="outlined" onPress={() => act(() => api(`/api/goals/${id}/result/confirm`, { method: 'POST', body: { agree: false } }))} disabled={busy} />
                </View>
              </View>
            )}
            {!proposal && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Btn title="判定：做到了" small variant="tonal" onPress={() => act(() => api(`/api/goals/${id}/result`, { method: 'POST', body: { result: 'achieved' } }))} disabled={busy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Btn title="判定：未做到" small variant="danger" onPress={() => act(() => api(`/api/goals/${id}/result`, { method: 'POST', body: { result: 'failed' } }))} disabled={busy} />
                </View>
              </View>
            )}
          </Frame>
        )}

        {goal.status === 'achieved' && (
          <Frame style={{ marginTop: 14 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={st.docTag}>心愿达成</Text>
              {!goal.giftOpenedAt ? (
                <>
                  <TouchableOpacity activeOpacity={0.85} onPress={openGift} style={{ marginTop: 14 }}>
                    <View style={st.gift}><Text style={{ color: C.onTertiaryContainer, fontSize: 28, fontWeight: '700' }}>拆</Text></View>
                  </TouchableOpacity>
                  <Text style={st.meta}>点按开启心愿礼物（状态会保存）</Text>
                </>
              ) : (
                <>
                  <Seal label="成" size={52} color={C.secondary} />
                  <H size={20} style={{ marginTop: 10 }}>{goal.gifts.map((g) => g.name).join('、') || '此约无奖励，达成即可'}</H>
                  <Text style={st.quote}>礼物由立约人线下兑现，平台不经手资金与物品</Text>
                </>
              )}
              <Btn title="查看回忆录" small variant="tonal" style={{ marginTop: 12 }} onPress={openMemoir} />
            </View>
          </Frame>
        )}

        {goal.status === 'failed' && (
          <Frame style={{ marginTop: 14 }}>
            <View style={{ alignItems: 'center' }}>
              <Seal label="憾" size={48} color={C.surfaceContainerHighest} textColor={C.onSurfaceVariant} />
              <H size={18} style={{ marginTop: 10 }}>此约未达成</H>
              <Text style={st.quote}>无妨。许过的愿，还可以再许。</Text>
              <Btn title="查看旅程纪念册" small variant="tonal" style={{ marginTop: 12 }} onPress={openMemoir} />
            </View>
          </Frame>
        )}

        {goal.events.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={st.secTitle}>动态</Text>
            <Frame>
              {goal.events.map((e) => (
                <View key={e.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
                  <Text style={{ fontSize: 13, color: C.onSurfaceVariant, lineHeight: 20 }}>{e.message}</Text>
                </View>
              ))}
            </Frame>
          </View>
        )}

        {!!err && <Text style={st.err}>{err}</Text>}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  meta: { fontSize: 12, color: C.onSurfaceVariant },
  desc: { fontSize: 13, color: C.onSurfaceVariant, marginTop: 6, lineHeight: 20 },
  ruleBox: { marginTop: 12, backgroundColor: C.surfaceContainerHigh, borderRadius: R.md, padding: 12 },
  ruleLabel: { fontSize: 11, fontWeight: '600', color: C.primary },
  ruleText: { fontSize: 15, color: C.onSurface, marginTop: 4, lineHeight: 22 },
  quote: { fontSize: 12, color: C.secondary, marginTop: 12 },
  inviteCode: { fontSize: 30, fontWeight: '700', color: C.tertiary, letterSpacing: 6, marginTop: 6 },
  secTitle: { fontSize: 15, fontWeight: '600', color: C.onSurface, marginBottom: 10 },
  note: { fontSize: 15, color: C.onSurface, marginTop: 8, lineHeight: 22 },
  review: { fontSize: 13, color: C.primary, marginTop: 8 },
  reviewBad: { fontSize: 13, color: C.error, marginTop: 8 },
  docTag: { fontSize: 13, fontWeight: '600', color: C.secondary },
  err: { color: C.error, fontSize: 13, marginTop: 14, textAlign: 'center' },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  gift: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.tertiaryContainer, alignItems: 'center', justifyContent: 'center', ...E.e2 },
  choice: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.sm, borderWidth: 1, borderColor: C.outlineVariant },
  choiceOn: { backgroundColor: C.primary, borderColor: C.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  rowText: { fontSize: 12, color: C.onSurfaceVariant, flex: 1 },
  check: { width: 20, height: 20, borderRadius: R.sm, borderWidth: 1, borderColor: C.outline, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkMark: { color: C.onPrimary, fontSize: 13, fontWeight: '700' },
});
