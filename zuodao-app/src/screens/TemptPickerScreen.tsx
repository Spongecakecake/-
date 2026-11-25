import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { C } from '../theme';
import { Frame, H, Btn, Field } from '../ui';
import ScreenHeader from '../components/ScreenHeader';
import { goBackOrHome } from '../navigation';
import { standingTemplates } from '../api/flags';

export default function TemptPickerScreen({ route, navigation }: any) {
  const id = route?.params?.id;
  const [items, setItems] = useState<any[]>([]);
  const [custom, setCustom] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    standingTemplates().then((r) => setItems(r.templates || [])).catch((e) => setErr(e.message));
  }, []);

  const choose = (item: any) => {
    navigation.navigate('FlagDetail', { id, template: { id: item.id, text: item.text } });
  };

  return (
    <View style={st.root}>
      <ScreenHeader title="选一句拔旗" subtitle="即选即发 · 口嗨免责" onBack={() => goBackOrHome(navigation)} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        {items.map((t, i) => (
          <TouchableOpacity key={`${t.id}-${i}`} activeOpacity={0.8} onPress={() => choose(t)}>
            <Frame style={{ marginBottom: 10 }}>
              <Text style={st.cat}>{t.category}</Text>
              <H size={16} style={{ marginTop: 6 }}>{t.text}</H>
              <Text style={st.hint}>{t.disclaimer}</Text>
            </Frame>
          </TouchableOpacity>
        ))}
        <Frame>
          <Text style={st.cat}>自定义文案 · 先审后发</Text>
          <View style={{ marginTop: 8 }}>
            <Field value={custom} onChangeText={setCustom} placeholder="涉及金额、转账会被拦截" multiline />
          </View>
          <Btn title="提交自定义文案" small variant="tonal" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => {
            if (!custom.trim()) { Alert.alert('提示', '请先写下文案'); return; }
            choose({ id: 'CUSTOM', text: custom.trim() });
          }} />
          {!!err && <Text style={st.err}>{err}</Text>}
        </Frame>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  cat: { color: C.primary, fontSize: 11, fontWeight: '700' },
  hint: { color: C.outline, fontSize: 11, marginTop: 6 },
  err: { color: C.error, fontSize: 13, marginTop: 10 },
});
