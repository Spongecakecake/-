// 我的 · 账号 + 消息中心（契约动态） + 设置与运营入口
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth';
import { C } from '../theme';
import { Frame, H, Seal } from '../ui';

type Notice = {
  id: string;
  goalId: string;
  type: string;
  message: string;
  at: string;
  actor: { nickname: string } | null;
};

const TYPE_ICON: Record<string, string> = {
  accept: '诺', checkin: '打', approve: '过', reject: '驳', auto_approve: '过',
  result_propose: '判', result_agree: '同', result_disagree: '异', finalize: '终',
  gift_open: '礼', decline: '辞', invite: '邀', flag_view: '旗',
};

export default function ProfileScreen({ navigation }: any) {
  const { user, updateNickname } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState(user?.nickname || '');
  const [items, setItems] = useState<Notice[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const readKey = `zd_read_${user?.id || 'guest'}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ notifications: Notice[] }>('/api/notifications');
      setItems(r.notifications || []);
      try {
        const g = globalThis as any;
        const saved = JSON.parse(g.localStorage?.getItem(readKey) || '[]');
        setRead(Array.isArray(saved) ? saved : []);
      } catch {
        setRead([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [readKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unread = useMemo(() => items.filter((i) => !read.includes(i.id)).length, [items, read]);

  const persistRead = (ids: string[]) => {
    const next = Array.from(new Set(ids)).slice(-300);
    try {
      const g = globalThis as any;
      g.localStorage?.setItem(readKey, JSON.stringify(next));
    } catch {}
    setRead(next);
  };

  const open = (n: Notice) => {
    persistRead([...read, n.id]);
    navigation.navigate('GoalDetail', { id: n.goalId });
  };

  const markAllRead = () => {
    persistRead(items.map((i) => i.id));
    Alert.alert('已处理', '全部消息已标为已读');
  };

  const saveNick = async () => {
    if (!nick.trim()) { Alert.alert('提示', '昵称不可为空'); return; }
    try {
      await updateNickname(nick.trim());
      setEditing(false);
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    }
  };

  return (
    <ScrollView
      style={st.root}
      contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
    >
      <View style={st.header}>
        <Seal label={(user?.nickname || '客')[0]} size={52} />
        <View style={{ marginLeft: 14, flex: 1 }}>
          {editing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: C.primary, minWidth: 100 }}>
                <TextInput value={nick} onChangeText={setNick} style={{ fontSize: 20, color: C.onSurface, paddingVertical: 2 }} />
              </View>
              <TouchableOpacity onPress={saveNick}><Text style={{ color: C.primary, fontWeight: '600' }}>保存</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setNick(user?.nickname || ''); setEditing(true); }}>
              <H size={20}>{user?.nickname} <Text style={{ fontSize: 12, color: C.primary }}>编辑</Text></H>
            </TouchableOpacity>
          )}
          <Text style={st.username}>@{user?.username}</Text>
        </View>
      </View>

      <View style={st.sectionHead}>
        <View>
          <Text style={st.eyebrow}>契约有回声</Text>
          <H size={19}>消息{unread > 0 ? ` · ${unread} 未读` : ''}</H>
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={st.action}>全部已读</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 && !loading ? (
        <Frame style={st.emptyCard}><Text style={st.empty}>暂时没有新消息</Text></Frame>
      ) : items.map((item) => {
        const isRead = read.includes(item.id);
        return (
          <TouchableOpacity key={item.id} activeOpacity={0.8} onPress={() => open(item)}>
            <Frame style={isRead ? st.card : [st.card, st.unread]}>
              <View style={st.icon}><Text style={st.iconText}>{TYPE_ICON[item.type] || '讯'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.msg}>{item.message}</Text>
                <Text style={st.time}>{String(item.at).slice(0, 16).replace('T', ' ')}</Text>
              </View>
              <Text style={st.arrow}>›</Text>
            </Frame>
          </TouchableOpacity>
        );
      })}

      <Text style={st.sectionTitle}>设置与说明</Text>
      <Frame>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={st.linkRow}>
          <Text style={st.link}>每日约定 · 提醒 · 连接设置</Text>
          <Text style={st.arrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Ops')} style={st.linkRow}>
          <Text style={st.link}>运营后台（需权限）</Text>
          <Text style={st.arrow}>›</Text>
        </TouchableOpacity>
        <Text style={st.bound}>
          · 心愿礼物仅线下兑现，平台不经手任何资金与物品{'\n'}
          · 目标结果以双方确认为准，平台不代判{'\n'}
          · 打卡 48 小时未审核，按约自动通过
        </Text>
      </Frame>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 54, marginBottom: 22 },
  username: { fontSize: 12, color: C.onSurfaceVariant, marginTop: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  eyebrow: { fontSize: 12, color: C.onSurfaceVariant, marginBottom: 4 },
  action: { fontSize: 13, color: C.primary, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: C.primary, marginTop: 24, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 14 },
  unread: { borderLeftWidth: 3, borderLeftColor: C.primary },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: C.onPrimaryContainer, fontSize: 13, fontWeight: '700' },
  msg: { fontSize: 13, color: C.onSurface, lineHeight: 19 },
  time: { fontSize: 11, color: C.outline, marginTop: 5 },
  arrow: { fontSize: 20, color: C.outline },
  emptyCard: { alignItems: 'center', paddingVertical: 30 },
  empty: { fontSize: 13, color: C.onSurfaceVariant },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.outlineVariant },
  link: { fontSize: 14, color: C.onSurface },
  bound: { fontSize: 12, color: C.onSurfaceVariant, lineHeight: 21, marginTop: 12 },
});
