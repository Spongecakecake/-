// 「做到」Material Design 3 主题 token（seed = 品牌深松绿 #1e4b3a）

export const C = {
  // Primary
  primary: '#1E4B3A',
  onPrimary: '#FFFFFF',
  primaryContainer: '#B9E7CF',
  onPrimaryContainer: '#0E2A1F',

  // Secondary（鎏金）
  secondary: '#8A6B32',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F3EAD6',
  onSecondaryContainer: '#5C4A1F',

  // Tertiary（朱砂）
  tertiary: '#A63E2C',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#F7E9E3',
  onTertiaryContainer: '#4A120A',

  // Error
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  // Surface（浅色）
  surface: '#F9FAF5',
  onSurface: '#191C19',
  surfaceContainerLow: '#F3F5EE',
  surfaceContainer: '#EEF0E9',
  surfaceContainerHigh: '#EFF2EA',
  surfaceContainerHighest: '#E3E7DE',
  onSurfaceVariant: '#404943',
  outline: '#717971',
  outlineVariant: '#C1C9C0',

  // 回忆录深色
  darkSurface: '#101613',
  darkSurfaceContainer: '#1B231E',
  darkOnSurface: '#E1E3DC',
  darkOnSurfaceVariant: '#C0C9C2',
  darkPrimaryContainer: '#2C4A3B',
};

// 圆角
export const R = { sm: 8, md: 12, lg: 16, xl: 28, full: 999 } as const;

// 阴影（elevation）
export const E = {
  e1: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  e2: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  e3: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

export const TEMPLATES = [
  { id: 'study', name: '学业精进', color: '#1e4b3a' },
  { id: 'fitness', name: '强身健体', color: '#2f4d6e' },
  { id: 'habit', name: '习惯养成', color: '#a06b2a' },
  { id: 'create', name: '创作输出', color: '#5d4270' },
  { id: 'health', name: '身心调养', color: '#9c4048' },
  { id: 'other', name: '其他立志', color: '#8a6b32' },
];

export const tplColor = (id: string) =>
  (TEMPLATES.find((t) => t.id === id) || TEMPLATES[5]).color;
export const tplName = (id: string) =>
  (TEMPLATES.find((t) => t.id === id) || TEMPLATES[5]).name;

export const STATUS_TEXT: Record<string, string> = {
  awaiting: '待接受',
  active: '进行中',
  achieved: '已达成',
  failed: '未达成',
};
