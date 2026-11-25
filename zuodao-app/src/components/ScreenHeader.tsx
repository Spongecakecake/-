import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';
import { H } from '../ui';

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const fg = dark ? C.darkOnSurface : C.onSurface;
  const sub = dark ? C.darkOnSurfaceVariant : C.onSurfaceVariant;
  return (
    <View style={[st.root, { paddingTop: insets.top + 8, backgroundColor: dark ? C.darkSurface : C.surface }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="返回"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={onBack}
        style={st.back}
      >
        <Text style={{ color: fg, fontSize: 26, lineHeight: 26, marginTop: -2 }}>‹</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <H size={17} color={fg}>{title}</H>
        {!!subtitle && <Text style={[st.subtitle, { color: sub }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.outlineVariant,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 11, marginTop: 2 },
});
