// 赴约 · 凭码查看 → 权责告知 → 选择身份/首句鼓励 → 接受或婉拒
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { api, copyText } from '../api/client';
import { goBackOrHome } from '../navigation';
import { C, R, tplName } from '../theme';
import { Seal, Btn, Field, H } from '../ui';
import ScreenHeader from '../components/ScreenHeader';

type Invite = {
  code: string; title: string; template: string; description: string; rule: string;
  startDate: string; endDate: string;
  gifts: { name: string; note: string }[];
  owner: { nickname: string } | null;
  taken: { supervisor: boolean; witness: boolean };
  status: string;
};

export default function InviteScreen({ route, navigation }: any) {
  const initialCode: string = route?.params?.code || '';
  const [code, setCode] = useState(initialCode);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [role, setRole] = useState<'supervisor' | 'witness'>('supervisor');
  const [msg, setMsg] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const look = useCallback(async (c?: string) => {
    try {
      const r = await api<{ invite: Invite }>(`/api/invites/${(c ?? code).trim()}`);
      setInvite(r.invite);
      setRole(r.invite.taken.supervisor ? 'witness' : 'supervisor');
    } catch (e: any) {
      setErr(e.message);
    }
  }, [code]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (initialCode) look(initialCode); }, [initialCode, look]);

  const accept = async () => {
    if (!invite || busy) return;
    if (invite.taken[role]) { setErr('该席位已有人接印'); return; }
    setBusy(true); setErr('');
    try {
      await api(`/api/invites/${invite.code}/accept`, { method: 'POST', body: { role, message: msg.trim() } });
      setDone(`已以${role === 'supervisor' ? '监督人' : '见证人'}身份加入`);
      setInvite(null);
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  const decline = async () => {
    if (!invite || busy) return;
    if (!reason.trim()) { setErr('请填写婉拒理由，便于对方改进'); return; }
    setBusy(true); setErr('');
    try {
      await api(`/api/invites/${invite.code}/accept`, { method: 'POST', body: { role: 'decline', reason: reason.trim() } });
      setDone('已婉拒');
      setInvite(null);
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <View style={st.root}>
        <ScreenHeader title="赴约结果" onBack={() => navigation.navigate('Tabs', { screen: '首页Tab' })} />
        <View style={{ alignItems: 'center', justifyContent: 'center', padding: 30, flex: 1 }}>
          <Seal label={done === '已婉拒' ? '辞' : '诺'} size={60} />
          <H size={20} style={{ marginTop: 18 }}>{done}</H>
          <Text style={st.centerText}>{done === '已婉拒' ? '愿立约人另觅良监督' : '此后每一笔打卡，都将由你过目'}</Text>
          <Btn title="回到首页" onPress={() => navigation.navigate('Tabs', { screen: '首页Tab' })} style={{ marginTop: 24, alignSelf: 'stretch' }} />
        </View>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <ScreenHeader title="接受邀请" subtitle="先看权责，再按印" onBack={() => goBackOrHome(navigation)} />
      <ScrollView style={st.root} contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {!invite ? (
          <View style={[st.card, { marginTop: 12 }]}>
            <Text style={st.docLabel}>邀请码</Text>
            <H size={26} style={{ letterSpacing: 4, marginTop: 8 }}>{code || '— — — — — —'}</H>
            <View style={{ marginTop: 16, gap: 10 }}>
              <Field value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="输入六位数字邀请码" />
              <Btn title="查看邀请" onPress={() => { setErr(''); look(); }} disabled={code.length !== 6} />
            </View>
            {!!err && <Text style={st.err}>{err}</Text>}
          </View>
        ) : (
          <>
            <View style={[st.card, { marginTop: 12 }]}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Seal label="邀" size={46} />
                <Text style={st.docTag}>邀请详情</Text>
                <H size={22} style={{ textAlign: 'center' }}>{invite.title}</H>
                <Text style={st.docMeta}>{invite.owner?.nickname} 发起 · {tplName(invite.template)}</Text>
                <Text style={st.docMeta}>{invite.startDate} ～ {invite.endDate}</Text>
              </View>
              <View style={st.docRule}>
                <Text style={st.docLabel}>每日规则</Text>
                <Text style={st.docText}>{invite.rule}</Text>
              </View>
              {invite.gifts.length > 0 && (
                <View style={st.docRule}>
                  <Text style={st.docLabel}>心愿礼物（线下兑现）</Text>
                  <Text style={st.docText}>{invite.gifts.map((g) => g.name).join('、')}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => copyText(invite.code).then(() => Alert.alert('已复制'))}>
                <Text style={[st.docMeta, { textAlign: 'center', color: C.primary }]}>邀请码 {invite.code} · 点按复制</Text>
              </TouchableOpacity>
            </View>

            <View style={[st.card, { marginTop: 14 }]}>
              <Text style={st.docLabel}>权责告知</Text>
              <Text style={st.duty}>监督人负责逐条批阅打卡，驳回需给理由；见证人只见证与鼓励。不接受资金托管，不替平台做终裁。</Text>
              <Text style={[st.docLabel, { marginTop: 14 }]}>选择身份</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {(['supervisor', 'witness'] as const).map((r) => {
                  const taken = invite.taken[r];
                  const on = role === r;
                  return (
                    <View key={r} style={{ flex: 1 }}>
                      <Btn title={r === 'supervisor' ? '作监督人' : '作见证人'} small variant={on ? 'filled' : 'outlined'} disabled={taken} onPress={() => setRole(r)} />
                      {taken && <Text style={st.taken}>已有人接印</Text>}
                    </View>
                  );
                })}
              </View>
              <Text style={[st.docLabel, { marginTop: 14, marginBottom: 8 }]}>首句鼓励</Text>
              <Field value={msg} onChangeText={setMsg} placeholder="如：跑不动的时候，想想跑鞋" />
              {!!err && <Text style={st.err}>{err}</Text>}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <View style={{ flex: 2 }}><Btn title={busy ? '提交中…' : '接受邀请'} onPress={accept} disabled={busy} /></View>
                <View style={{ flex: 1 }}><Btn title="婉拒" variant="outlined" onPress={decline} disabled={busy} /></View>
              </View>
              <View style={{ marginTop: 12 }}>
                <Field value={reason} onChangeText={setReason} placeholder="婉拒理由（婉拒前必填）" />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  card: { backgroundColor: '#FFFFFF', borderRadius: R.lg, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  docLabel: { fontSize: 11, fontWeight: '600', color: C.primary },
  docMeta: { fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 },
  docRule: { marginTop: 14, backgroundColor: C.surfaceContainerHigh, borderRadius: R.md, padding: 12 },
  docText: { fontSize: 15, color: C.onSurface, marginTop: 4, lineHeight: 22 },
  docTag: { fontSize: 13, fontWeight: '600', color: C.primary },
  duty: { fontSize: 12, color: C.onSurfaceVariant, lineHeight: 20, marginTop: 8 },
  err: { color: C.error, fontSize: 13, marginTop: 12 },
  taken: { fontSize: 10, color: C.onSurfaceVariant, textAlign: 'center', marginTop: 4 },
  centerText: { color: C.onSurfaceVariant, fontSize: 13, marginTop: 8, textAlign: 'center' },
});
