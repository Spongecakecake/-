// 「做到」Material Design 3 主题 token（seed = 品牌深松绿 #1E4B3A）
import 'package:flutter/material.dart';

class C {
  C._();

  // Primary
  static const primary = Color(0xFF1E4B3A);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryContainer = Color(0xFFB9E7CF);
  static const onPrimaryContainer = Color(0xFF0E2A1F);

  // Secondary（鎏金）
  static const secondary = Color(0xFF8A6B32);
  static const onSecondary = Color(0xFFFFFFFF);
  static const secondaryContainer = Color(0xFFF3EAD6);
  static const onSecondaryContainer = Color(0xFF5C4A1F);

  // Tertiary（朱砂）
  static const tertiary = Color(0xFFA63E2C);
  static const onTertiary = Color(0xFFFFFFFF);
  static const tertiaryContainer = Color(0xFFF7E9E3);
  static const onTertiaryContainer = Color(0xFF4A120A);

  // Error
  static const error = Color(0xFFBA1A1A);
  static const onError = Color(0xFFFFFFFF);
  static const errorContainer = Color(0xFFFFDAD6);
  static const onErrorContainer = Color(0xFF410002);

  // Surface（浅色）
  static const surface = Color(0xFFF9FAF5);
  static const onSurface = Color(0xFF191C19);
  static const surfaceContainerLow = Color(0xFFF3F5EE);
  static const surfaceContainer = Color(0xFFEEF0E9);
  static const surfaceContainerHigh = Color(0xFFEFF2EA);
  static const surfaceContainerHighest = Color(0xFFE3E7DE);
  static const onSurfaceVariant = Color(0xFF404943);
  static const outline = Color(0xFF717971);
  static const outlineVariant = Color(0xFFC1C9C0);

  // 回忆录深色
  static const darkSurface = Color(0xFF101613);
  static const darkSurfaceContainer = Color(0xFF1B231E);
  static const darkOnSurface = Color(0xFFE1E3DC);
  static const darkOnSurfaceVariant = Color(0xFFC0C9C2);
  static const darkPrimaryContainer = Color(0xFF2C4A3B);
}

const ColorScheme kScheme = ColorScheme(
  brightness: Brightness.light,
  primary: C.primary,
  onPrimary: C.onPrimary,
  primaryContainer: C.primaryContainer,
  onPrimaryContainer: C.onPrimaryContainer,
  secondary: C.secondary,
  onSecondary: C.onSecondary,
  secondaryContainer: C.secondaryContainer,
  onSecondaryContainer: C.onSecondaryContainer,
  tertiary: C.tertiary,
  onTertiary: C.onTertiary,
  tertiaryContainer: C.tertiaryContainer,
  onTertiaryContainer: C.onTertiaryContainer,
  error: C.error,
  onError: C.onError,
  errorContainer: C.errorContainer,
  onErrorContainer: C.onErrorContainer,
  surface: C.surface,
  onSurface: C.onSurface,
  surfaceContainerLow: C.surfaceContainerLow,
  surfaceContainer: C.surfaceContainer,
  surfaceContainerHigh: C.surfaceContainerHigh,
  surfaceContainerHighest: C.surfaceContainerHighest,
  onSurfaceVariant: C.onSurfaceVariant,
  outline: C.outline,
  outlineVariant: C.outlineVariant,
);

final ThemeData kTheme = ThemeData(
  useMaterial3: true,
  colorScheme: kScheme,
  scaffoldBackgroundColor: C.surface,
  appBarTheme: const AppBarTheme(
    backgroundColor: C.surface,
    foregroundColor: C.onSurface,
    elevation: 0,
    scrolledUnderElevation: 0,
    centerTitle: true,
    titleTextStyle: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      color: C.onSurface,
    ),
  ),
  dividerColor: C.outlineVariant,
  navigationBarTheme: const NavigationBarThemeData(
    backgroundColor: C.surfaceContainer,
    indicatorColor: Colors.transparent,
    height: 64,
    labelTextStyle: WidgetStatePropertyAll(
      TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
    ),
  ),
  inputDecorationTheme: const InputDecorationTheme(
    filled: true,
    fillColor: C.surfaceContainerHigh,
    hintStyle: TextStyle(color: C.outline, fontSize: 15),
    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    border: UnderlineInputBorder(
      borderSide: BorderSide(color: C.outlineVariant),
    ),
    enabledBorder: UnderlineInputBorder(
      borderSide: BorderSide(color: C.outlineVariant),
    ),
    focusedBorder: UnderlineInputBorder(
      borderSide: BorderSide(color: C.primary, width: 2),
    ),
  ),
);

// 目标模板
class Tpl {
  final String id;
  final String name;
  final Color color;
  const Tpl(this.id, this.name, this.color);
}

const List<Tpl> kTemplates = [
  Tpl('study', '学业精进', Color(0xFF1E4B3A)),
  Tpl('fitness', '强身健体', Color(0xFF2F4D6E)),
  Tpl('habit', '习惯养成', Color(0xFFA06B2A)),
  Tpl('create', '创作输出', Color(0xFF5D4270)),
  Tpl('health', '身心调养', Color(0xFF9C4048)),
  Tpl('other', '其他立志', Color(0xFF8A6B32)),
];

String tplName(String id) =>
    kTemplates.firstWhere((t) => t.id == id, orElse: () => kTemplates.last).name;

Color tplColor(String id) =>
    kTemplates.firstWhere((t) => t.id == id, orElse: () => kTemplates.last).color;

const Map<String, String> kStatusText = {
  'awaiting': '待接受',
  'active': '进行中',
  'achieved': '已达成',
  'failed': '未达成',
};

const Map<String, String> kRoleText = {
  'owner': '立约人',
  'supervisor': '监督人',
  'witness': '见证人',
};
