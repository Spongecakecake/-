// Material 3 基础组件：卡片、品牌标、标题、状态签、进度条、按钮、输入框
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { C, R, E } from './theme';

/** M3 Elevated Card */
export function Frame({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[s.card, style as any]}>{children}</View>;
}

/** 品牌方标（原朱砂方印 → M3 圆角方标） */
export function Seal({
  label = '做到',
  size = 44,
  color,
  textColor,
}: {
  label?: string;
  size?: number;
  color?: string;
  textColor?: string;
}) {
  const bg = color || C.primaryContainer;
  const fg = textColor || (color ? '#FFFFFF' : C.onPrimaryContainer);
  const fontSize = label.length > 2 ? size * 0.28 : label.length > 1 ? size * 0.4 : size * 0.55;
  const lines = label.length > 2 ? [label.slice(0, 2), label.slice(2)] : [label];
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        borderRadius: size * 0.22,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
      }}
    >
      {lines.map((l, i) => (
        <Text key={i} style={{ color: fg, fontSize, lineHeight: fontSize * 1.15, fontWeight: '700' }}>
          {l}
        </Text>
      ))}
    </View>
  );
}

/** 标题（M3 title 字阶） */
export function H({
  children,
  size = 20,
  color = C.onSurface,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
}) {
  return (
    <Text style={[{ fontSize: size, color, fontWeight: size >= 22 ? '700' : '600' }, style]}>
      {children}
    </Text>
  );
}

/** 状态签（M3 chip：filled = 实底，否则描边） */
export function Chip({
  text,
  color = C.onSurfaceVariant,
  filled = false,
}: {
  text: string;
  color?: string;
  filled?: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: R.sm,
        borderWidth: filled ? 0 : 1,
        borderColor: filled ? 'transparent' : C.outlineVariant,
        backgroundColor: filled ? color : 'transparent',
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: filled ? '#FFFFFF' : color, fontSize: 12, fontWeight: '500' }}>
        {text}
      </Text>
    </View>
  );
}

/** 进度条 */
export function Bar({ ratio, color = C.primary }: { ratio: number; color?: string }) {
  return (
    <View style={{ height: 8, backgroundColor: C.surfaceContainerHighest, borderRadius: 4, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: 4,
        }}
      />
    </View>
  );
}

/** 按钮：variant = filled | tonal | danger | outlined */
export function Btn({
  title,
  onPress,
  variant = 'filled',
  disabled,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'tonal' | 'danger' | 'outlined';
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const bg = { filled: C.primary, tonal: C.secondaryContainer, danger: C.error, outlined: 'transparent' }[variant];
  const fg = { filled: C.onPrimary, tonal: C.onSecondaryContainer, danger: C.onError, outlined: C.primary }[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: disabled ? C.surfaceContainerHighest : bg,
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: disabled ? C.outlineVariant : C.outline,
          borderRadius: R.full,
          paddingVertical: small ? 8 : 13,
          paddingHorizontal: small ? 16 : 20,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: disabled ? '#9BA29A' : fg, fontSize: small ? 13 : 15, fontWeight: '600' }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/** M3 Filled 输入框 */
export function Field({
  value,
  onChangeText,
  placeholder,
  multiline,
  secure,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secure?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.outline}
      secureTextEntry={secure}
      multiline={multiline}
      style={{
        backgroundColor: C.surfaceContainerHigh,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomWidth: 1,
        borderBottomColor: C.outlineVariant,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 13,
        fontSize: 15,
        color: C.onSurface,
        minHeight: multiline ? 72 : undefined,
        textAlignVertical: 'top',
      }}
    />
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: R.lg,
    padding: 16,
    ...E.e1,
  },
});
