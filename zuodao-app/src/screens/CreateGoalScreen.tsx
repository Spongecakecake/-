// 立约 · 类型/模板/周期/规则/礼物/隐私 → 契约书与邀请码
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { api, copyText } from '../api/client';
import { plantFlag } from '../api/flags';
import { goBackOrHome } from '../navigation';
import { C, R, TEMPLATES, tplName } from '../theme';
import { Seal, Btn, Field, H } from '../ui';
import ScreenHeader from '../components/ScreenHeader';

const PRESETS = [21, 30, 60, 90];
const GOAL_TYPES = [
  { id: 'habit', name: '习惯型' },
  { id: 'numeric', name: '数值型' },
  { id: 'milestone', name: '里程碑型' },
];
const CHECKIN_TYPES = [
  { id: 'text', name: '文字' },
  { id: 'numeric', name: '数值' },
  { id: 'choice', name: '选项' },
  { id: 'duration', name: '时长' },
  { id: 'photo', name: '图文' },
];
const PRIVACY = [
  { id: 'private', name: '仅自己' },
  { id: 'followers', name: '仅见证人' },
  { id: 'public', name: '全部公开 · 插旗' },
];
const PROOF_LEVELS = [
  { id: 'L1', name: 'L1 自证 ×0.5' },
  { id: 'L2', name: 'L2 点验 ×0.8' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const dateAfter = (days: number) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayStr = () => dateAfter(0);
type Created = { goal: any; code: string };

function Segmented({ items, value, onChange }: { items: { id: string; name: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={st.chipWrap}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <TouchableOpacity key={it.id} onPress={() => onChange(it.id)} activeOpacity={0.8}>
            <View style={[st.chip, on && st.chipOn]}>
              <Text style={{ color: on ? C.onPrimary : C.onSurfaceVariant, fontSize: 13, fontWeight: '500' }}>{it.name}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CreateGoalScreen({ navigation }: any) {
  const [tpl, setTpl] = useState('habit');
  const [goalType, setGoalType] = useState('habit');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [days, setDays] = useState(21);
  const [customDays, setCustomDays] = useState('30');
  const [checkinType, setCheckinType] = useState('text');
  const [restDays, setRestDays] = useState(0);
  const [privacy, setPrivacy] = useState('followers');
  const [proofLevel, setProofLevel] = useState('L2');
  const [pullEnabled, setPullEnabled] = useState(false);
  const [milestones, setMilestones] = useState('');
  const [gifts, setGifts] = useState([{ name: '', note: '' }]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [healthAgreed, setHealthAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [created, setCreated] = useState<Created | null>(null);

  const needHealth = tpl === 'fitness' || tpl === 'health';
  const highRisk = tpl === 'fitness' || tpl === 'health';
  const duration = days === 0 ? Math.max(7, Math.min(180, Number(customDays) || 7)) : days;

  const submit = async () => {
    if (busy) return;
    setErr('');
    if (!title.trim()) {
      setErr('请填写目标名称');
      return;
    }
    if (goalType === 'milestone' && !desc.trim()) {
      setErr('请填写里程碑说明');
      return;
    }
    if (needHealth && !healthAgreed) {
      setErr('创建体重相关目标前，请先阅读并同意健康风险提示');
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ goal: any }>('/api/goals', {
        method: 'POST',
        body: {
          title: title.trim(), template: tpl, goalType, checkinType,
          description: desc.trim(), startDate: todayStr(), endDate: dateAfter(duration - 1),
          rule: desc.trim() || title.trim(), restDays, privacy,
          milestones: milestones.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean),
          gifts: gifts.map((g) => ({ name: g.name.trim(), note: g.note.trim() })).filter((g) => g.name),
          health: needHealth ? { height, weight, agreed: healthAgreed } : null,
        },
      });
      const inv = await api<{ code: string }>(`/api/goals/${r.goal.id}/invite`, { method: 'POST' });
      if (privacy === 'public') {
        try {
          await plantFlag(r.goal.id, privacy, proofLevel, highRisk ? false : pullEnabled);
        } catch (flagErr: any) {
          setErr(`契约已创建，但插旗失败：${flagErr.message}`);
        }
      }
      setCreated({ goal: r.goal, code: inv.code });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const g = created.goal;
    return (
      <View style={st.root}>
        <ScreenHeader title="契约已立" subtitle="等待对方接印" onBack={() => goBackOrHome(navigation)} />
        <ScrollView style={st.root} contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
          <View style={[st.card, { marginTop: 12 }]}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Seal label="立" size={46} />
              <Text style={st.docTag}>契约书</Text>
              <H size={22} style={{ textAlign: 'center' }}>{g.title}</H>
              <Text style={st.docMeta}>{tplName(g.template)} · {g.startDate} 起 · 为期 {duration} 天</Text>
            </View>
            <View style={st.docRule}>
              <Text style={st.docLabel}>每日规则</Text>
              <Text style={st.docText}>{g.rule}</Text>
            </View>
            <View style={st.docRule}>
              <Text style={st.docLabel}>心愿礼物（线下兑现）</Text>
              <Text style={st.docText}>{(g.gifts || []).map((x: any) => x.name).join('、') || '—'}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: C.outlineVariant, paddingTop: 12, alignItems: 'center' }}>
              <Text style={st.docLabel}>邀请码</Text>
              <Text style={st.code}>{created.code}</Text>
              <Text style={st.docHint}>发给监督人或见证人；两个席位可先后加入</Text>
              <Btn title="复制邀请码" small variant="tonal" style={{ marginTop: 10 }} onPress={() => copyText(created.code).then((ok) => Alert.alert(ok ? '已复制' : '提示', ok ? '邀请码已复制' : '请手动长按复制'))} />
            </View>
          </View>
          <View style={{ marginTop: 16, gap: 10 }}>
            {privacy === 'public' && <Btn title="去旗场看看" variant="tonal" onPress={() => navigation.navigate('Tabs', { screen: '旗场Tab' })} />}
            <Btn title="回到首页" onPress={() => navigation.navigate('Tabs', { screen: '首页Tab' })} />
            <Btn title="再建一份" variant="outlined" onPress={() => setCreated(null)} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <ScreenHeader title="新建契约" subtitle="想清楚，再落笔" onBack={() => goBackOrHome(navigation)} />
      <ScrollView style={st.root} contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <H size={15}>目标类型</H>
        <Segmented items={GOAL_TYPES} value={goalType} onChange={setGoalType} />

        <H size={15} style={{ marginTop: 20 }}>类别模板</H>
        <Segmented items={TEMPLATES.map((t) => ({ id: t.id, name: t.name }))} value={tpl} onChange={setTpl} />

        <H size={15} style={{ marginTop: 20 }}>立下目标</H>
        <View style={{ marginTop: 10, gap: 10 }}>
          <Field value={title} onChangeText={setTitle} placeholder={goalType === 'milestone' ? '如：完成马拉松' : '如：连续晨跑 21 天'} />
          <Field value={desc} onChangeText={setDesc} placeholder={goalType === 'milestone' ? '里程碑描述与验收标准' : '缘由与每日规则（可空）'} multiline />
        </View>

        <H size={15} style={{ marginTop: 20 }}>设定周期</H>
        <Segmented items={PRESETS.map((d) => ({ id: String(d), name: `${d} 天` })).concat([{ id: '0', name: '自定义' }])} value={String(days)} onChange={(v) => setDays(Number(v))} />
        {days === 0 && (
          <View style={{ marginTop: 10 }}>
            <Field value={customDays} onChangeText={(t) => setCustomDays(t.replace(/\D/g, '').slice(0, 3))} placeholder="7–180 天" />
          </View>
        )}
        <Text style={st.range}>{todayStr()} ～ {dateAfter(duration - 1)} · 共 {duration} 天</Text>

        <H size={15} style={{ marginTop: 20 }}>打卡方式</H>
        <Segmented items={CHECKIN_TYPES} value={checkinType} onChange={setCheckinType} />
        <H size={15} style={{ marginTop: 18 }}>每周休息天</H>
        <Segmented items={[0, 1, 2, 3].map((n) => ({ id: String(n), name: `${n} 天` }))} value={String(restDays)} onChange={(v) => setRestDays(Number(v))} />

        {goalType === 'milestone' && (
          <>
            <H size={15} style={{ marginTop: 20 }}>里程碑（逗号或换行分隔）</H>
            <View style={{ marginTop: 10 }}>
              <Field value={milestones} onChangeText={setMilestones} placeholder="完成 5 公里, 完成 10 公里" multiline />
            </View>
          </>
        )}

        {needHealth && (
          <View style={[st.card, { marginTop: 20 }]}>
            <H size={15}>健康风险提示</H>
            <Text style={st.desc}>体重类目标涉及健康信息，仅在你创建此类目标时采集，默认不公开。本应用不提供医疗诊断，请量力而行。</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}><Field value={height} onChangeText={setHeight} placeholder="身高 cm（选填）" /></View>
              <View style={{ flex: 1 }}><Field value={weight} onChangeText={setWeight} placeholder="当前体重 kg（选填）" /></View>
            </View>
            <TouchableOpacity onPress={() => setHealthAgreed(!healthAgreed)} style={st.row}>
              <View style={[st.check, healthAgreed && st.checkOn]}>{healthAgreed && <Text style={st.checkMark}>✓</Text>}</View>
              <Text style={st.rowText}>我已阅读并同意健康风险提示与免责声明</Text>
            </TouchableOpacity>
          </View>
        )}

        <H size={15} style={{ marginTop: 20 }}>心愿礼物（最多 5 件）</H>
        <Text style={st.range}>仅线下兑现，平台不经手资金与物品</Text>
        {gifts.map((g, i) => (
          <View key={i} style={{ marginTop: 10, gap: 8 }}>
            <Field value={g.name} onChangeText={(t) => setGifts(gifts.map((x, idx) => idx === i ? { ...x, name: t } : x))} placeholder={`礼物 ${i + 1} 名称`} />
            <Field value={g.note} onChangeText={(t) => setGifts(gifts.map((x, idx) => idx === i ? { ...x, note: t } : x))} placeholder="补充说明（可空）" />
            {gifts.length > 1 && <Btn title="移除" small variant="outlined" onPress={() => setGifts(gifts.filter((_, idx) => idx !== i))} />}
          </View>
        ))}
        {gifts.length < 5 && <Btn title="添加一件礼物" small variant="tonal" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => setGifts([...gifts, { name: '', note: '' }])} />}

        <H size={15} style={{ marginTop: 20 }}>插旗设置</H>
        <Text style={st.range}>仅“全部公开”会生成旗，围观者可护旗 / 拔旗</Text>
        <Segmented items={PRIVACY} value={privacy} onChange={setPrivacy} />
        {privacy === 'public' && (
          <>
            <H size={15} style={{ marginTop: 16 }}>举证等级</H>
            <Segmented items={PROOF_LEVELS} value={proofLevel} onChange={setProofLevel} />
            <TouchableOpacity style={st.row} onPress={() => !highRisk && setPullEnabled(!pullEnabled)} disabled={highRisk}>
              <View style={[st.check, (pullEnabled || highRisk) && st.checkOn]}>
                {(pullEnabled || highRisk) && <Text style={st.checkMark}>✓</Text>}
              </View>
              <Text style={st.rowText}>{highRisk ? '此类目标只护不拔（高危禁拔）' : '允许围观者拔旗（默认关闭）'}</Text>
            </TouchableOpacity>
          </>
        )}

        {!!err && <Text style={st.err}>{err}</Text>}
        <Btn title={busy ? '创建中…' : '创建契约'} onPress={submit} disabled={busy} style={{ marginTop: 22 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: C.outlineVariant, borderRadius: R.sm, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  range: { fontSize: 12, color: C.onSurfaceVariant, marginTop: 8 },
  err: { color: C.error, fontSize: 13, marginTop: 14, textAlign: 'center' },
  desc: { fontSize: 12, color: C.onSurfaceVariant, lineHeight: 20, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  rowText: { fontSize: 12, color: C.onSurface, flex: 1 },
  check: { width: 20, height: 20, borderRadius: R.sm, borderWidth: 1, borderColor: C.outline, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkMark: { color: C.onPrimary, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: R.lg, padding: 16, ...{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } },
  docTag: { fontSize: 13, fontWeight: '600', color: C.primary },
  docMeta: { fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 },
  docRule: { marginTop: 14, backgroundColor: C.surfaceContainerHigh, borderRadius: R.md, padding: 12 },
  docLabel: { fontSize: 11, fontWeight: '600', color: C.primary },
  docText: { fontSize: 15, color: C.onSurface, marginTop: 4, lineHeight: 22 },
  code: { fontSize: 32, fontWeight: '700', color: C.tertiary, letterSpacing: 6, marginTop: 6 },
  docHint: { fontSize: 11, color: C.onSurfaceVariant, marginTop: 6 },
});
