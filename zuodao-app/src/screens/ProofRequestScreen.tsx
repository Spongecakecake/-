import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C, R } from '../theme';
import { Frame, H, Btn } from '../ui';
import ScreenHeader from '../components/ScreenHeader';
import { goBackOrHome } from '../navigation';
import { api } from '../api/client';
import { proofRequests, submitProof } from '../api/flags';
import { pickWebPhoto, wrapWatermark } from '../api/watermark';
import { useAuth } from '../auth';

export default function ProofRequestScreen({ route, navigation }: any) {
  const flagId: string = route?.params?.flagId;
  const goalId: string = route?.params?.goalId;
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [preview, setPreview] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [requestId, setRequestId] = useState('');
  const [source, setSource] = useState('witness');
  const [checkinId, setCheckinId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await proofRequests(flagId);
      setRequests(r.requests || []);
      const pending = (r.requests || []).find((x: any) => x.status === 'pending');
      if (pending) { setRequestId(pending.id); setSource(pending.type); }
    } catch (e: any) {
      setErr(e.message);
    }
  }, [flagId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pick = async () => {
    const raw = await pickWebPhoto();
    if (!raw) { Alert.alert('提示', '未选择图片'); return; }
    const marked = wrapWatermark(raw, user?.nickname || '做到用户');
    setDataUrl(marked);
    setPreview(marked);
    setCheckinId('');
  };

  const useCheckin = async () => {
    try {
      const r = await api<{ goal: any }>(`/api/goals/${goalId}`);
      const today = new Date().toLocaleDateString('sv-SE');
      const found = (r.goal.checkins || []).find((c: any) => c.day === today && String(c.photo || '').startsWith('data:image/'));
      if (!found) { setErr('今日打卡没有图片证据，请先选择图片'); return; }
      setCheckinId(found.id);
      setDataUrl(found.photo);
      setPreview(found.photo);
      setSource('checkin');
      setErr('');
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const submit = async () => {
    if (!dataUrl || busy) return;
    setBusy(true);
    try {
      await submitProof(flagId, dataUrl, source, requestId, checkinId);
      Alert.alert('已提交', '举证材料已发送');
      navigation.goBack();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={st.root}>
      <ScreenHeader title="点验举证" subtitle="牵挂式提醒 · 2 小时内提交" onBack={() => goBackOrHome(navigation)} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        <Frame>
          <Text style={st.label}>牵挂式点验</Text>
          <H size={18} style={{ marginTop: 8 }}>有人牵挂你这面旗</H>
          <Text style={st.desc}>请在 2 小时内提交今日证据。图里会带上昵称与时间水印；不提交会扣 5 点信任分。</Text>
          {requests.map((r) => (
            <View key={r.id} style={st.req}>
              <Text style={st.meta}>{r.type === 'witness' ? '见证人点验' : '系统抽检'} · {r.status}</Text>
              <Text style={[st.meta, { marginTop: 4 }]}>截止 {String(r.dueAt).slice(0, 16)}</Text>
            </View>
          ))}
        </Frame>
        <Frame style={{ marginTop: 12 }}>
          <Text style={st.label}>上传举证图</Text>
          <Btn title={preview ? '已选择 · 重新选择' : '选择图片并加水印'} small variant="tonal" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={pick} />
          {!!preview && <Image source={{ uri: preview }} style={st.preview} resizeMode="cover" />}
          <Text style={st.hint}>V1 采用上传模拟：选图后自动叠加昵称与时间水印。</Text>
          <Btn title="一键引用今日打卡" small variant="outlined" style={{ marginTop: 10 }} onPress={useCheckin} />
          <Btn title={busy ? '提交中…' : '提交举证'} small style={{ marginTop: 10 }} disabled={busy || !dataUrl} onPress={submit} />
          {!!err && <Text style={st.err}>{err}</Text>}
        </Frame>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  label: { color: C.primary, fontSize: 11, fontWeight: '700' },
  desc: { color: C.onSurfaceVariant, fontSize: 13, lineHeight: 21, marginTop: 8 },
  meta: { fontSize: 12, color: C.onSurfaceVariant },
  hint: { fontSize: 11, color: C.outline, marginTop: 8 },
  err: { color: C.error, fontSize: 13, marginTop: 10 },
  req: { backgroundColor: C.surfaceContainerHigh, borderRadius: R.md, padding: 10, marginTop: 10 },
  preview: { width: '100%', height: 220, borderRadius: R.md, marginTop: 12 },
});
