// 大结局 / 旅程纪念册 · 六章节深色长页
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, copyText } from '../api/client';
import { goBackOrHome } from '../navigation';
import { C, R } from '../theme';
import { Seal, H } from '../ui';
import ScreenHeader from '../components/ScreenHeader';

type Memoir = {
  id: string; title: string; createdAt: string; result?: string;
  participants: { nickname: string; role: string }[];
  chapters: { no: number; title: string; text: string }[];
};

export default function MemoirScreen({ route, navigation }: any) {
  const [m, setM] = useState<Memoir | null>(null);
  const [err, setErr] = useState('');

  useFocusEffect(useCallback(() => {
    api<{ memoir: Memoir }>(`/api/memoirs/${route?.params?.id}`)
      .then((r) => setM(r.memoir))
      .catch((e) => setErr(e.message));
  }, [route?.params?.id]));

  const share = () => {
    if (!m) return;
    copyText(`【做到 · ${m.result === 'failed' ? '旅程纪念' : '大结局回忆录'}】${m.title}\n${m.chapters.map((c) => `${c.title}：${c.text}`).join('\n\n')}`)
      .then((ok) => Alert.alert(ok ? '已复制' : '提示', ok ? '回忆录文案已复制' : '请手动截图分享'));
  };

  if (!m) {
    return (
      <View style={[st.root, { flex: 1 }]}>
        <ScreenHeader title="回忆录" dark onBack={() => goBackOrHome(navigation)} />
        <View style={{ alignItems: 'center', paddingTop: 120 }}>
          <Text style={{ color: C.darkOnSurfaceVariant }}>{err || '加载中…'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <ScreenHeader
        title={m.result === 'failed' ? '旅程纪念册' : '大结局回忆录'}
        dark
        onBack={() => goBackOrHome(navigation)}
        right={<TouchableOpacity onPress={share} hitSlop={10}><Text style={{ color: C.primaryContainer, fontSize: 14, fontWeight: '600' }}>分享</Text></TouchableOpacity>}
      />
      <ScrollView style={st.root} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={st.tag}>{m.result === 'failed' ? '旅程纪念' : '回忆录'}</Text>
          <H size={26} color={C.darkOnSurface} style={{ textAlign: 'center', marginTop: 8 }}>{m.title}</H>
          <Text style={st.meta}>{m.participants.map((p) => p.nickname).join(' × ')}</Text>
          <View style={st.line} />
        </View>

        {m.chapters.map((c) => (
          <View key={c.no} style={st.chapter}>
            <Text style={st.chNo}>{String(c.no).padStart(2, '0')}</Text>
            <Text style={st.chTitle}>{c.title}</Text>
            <Text style={st.chText}>{c.text}</Text>
          </View>
        ))}

        <View style={{ alignItems: 'center', marginTop: 22 }}>
          <Seal label="做到" size={54} color={C.tertiary} />
          <Text style={st.meta}>此约已入册 · {m.result === 'failed' ? '每一步都算数' : '一诺既出，做到了'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.darkSurface },
  tag: { fontSize: 12, fontWeight: '600', color: C.primaryContainer },
  meta: { fontSize: 12, color: C.darkOnSurfaceVariant, marginTop: 8 },
  line: { width: 56, height: 2, borderRadius: 1, backgroundColor: C.primary, marginTop: 14 },
  chapter: { backgroundColor: C.darkSurfaceContainer, borderRadius: R.lg, padding: 16, marginBottom: 14 },
  chNo: { fontSize: 12, fontWeight: '700', color: C.primaryContainer },
  chTitle: { fontSize: 18, fontWeight: '600', color: C.darkOnSurface, marginTop: 4 },
  chText: { fontSize: 14, color: C.darkOnSurfaceVariant, lineHeight: 24, marginTop: 8 },
});
