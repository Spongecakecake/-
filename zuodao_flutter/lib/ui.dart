// Material 3 基础组件：卡片、品牌标、标题、状态签、进度条、按钮、输入框
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'theme.dart';

// 全局路由观察器：页面返回时自动刷新列表
final RouteObserver<PageRoute<void>> routeObserver =
    RouteObserver<PageRoute<void>>();

/// M3 Elevated Card
class Frame extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  const Frame({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color ?? Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Color(0x1A000000), blurRadius: 3, offset: Offset(0, 1)),
        ],
      ),
      child: child,
    );
  }
}

/// 品牌方标（原朱砂方印 → M3 圆角方标）
class Seal extends StatelessWidget {
  final String label;
  final double size;
  final Color? color;
  final Color? textColor;
  const Seal({
    super.key,
    this.label = '做到',
    this.size = 44,
    this.color,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final bg = color ?? C.primaryContainer;
    final fg = textColor ?? (color == null ? C.onPrimaryContainer : Colors.white);
    final fontSize =
        label.length > 2 ? size * 0.28 : label.length > 1 ? size * 0.4 : size * 0.55;
    final lines =
        label.length > 2 ? [label.substring(0, 2), label.substring(2)] : [label];
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(size * 0.22),
      ),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final l in lines)
            Text(
              l,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: fg,
                fontSize: fontSize,
                height: 1.15,
                fontWeight: FontWeight.w700,
              ),
            ),
        ],
      ),
    );
  }
}

/// 标题（M3 title 字阶）
class H extends StatelessWidget {
  final String text;
  final double size;
  final Color? color;
  final TextAlign? textAlign;
  const H(this.text, {super.key, this.size = 20, this.color, this.textAlign});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: textAlign,
      style: TextStyle(
        fontSize: size,
        color: color ?? C.onSurface,
        fontWeight: size >= 22 ? FontWeight.w700 : FontWeight.w600,
      ),
    );
  }
}

/// 状态签（M3 chip：filled = 实底，否则描边）
class TagChip extends StatelessWidget {
  final String text;
  final Color color;
  final bool filled;
  const TagChip(
    this.text, {
    super.key,
    this.color = C.onSurfaceVariant,
    this.filled = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: filled ? color : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        border: filled ? null : Border.all(color: C.outlineVariant),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: filled ? Colors.white : color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

/// 进度条
class Bar extends StatelessWidget {
  final double ratio;
  final Color? color;
  const Bar(this.ratio, {super.key, this.color});

  @override
  Widget build(BuildContext context) {
    final v = ratio.clamp(0.0, 1.0).toDouble();
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: SizedBox(
        height: 8,
        child: Stack(
          children: [
            Container(color: C.surfaceContainerHighest),
            FractionallySizedBox(
              widthFactor: v,
              child: Container(color: color ?? C.primary),
            ),
          ],
        ),
      ),
    );
  }
}

/// 按钮：variant = filled | tonal | danger | outlined
class Btn extends StatelessWidget {
  final String title;
  final VoidCallback? onPress;
  final String variant;
  final bool small;
  final bool expand;
  const Btn(
    this.title, {
    super.key,
    this.onPress,
    this.variant = 'filled',
    this.small = false,
    this.expand = false,
  });

  @override
  Widget build(BuildContext context) {
    final bg = switch (variant) {
      'tonal' => C.secondaryContainer,
      'danger' => C.error,
      'outlined' => Colors.transparent,
      _ => C.primary,
    };
    final fg = switch (variant) {
      'tonal' => C.onSecondaryContainer,
      'danger' => C.onError,
      'outlined' => C.primary,
      _ => C.onPrimary,
    };
    final style = ButtonStyle(
      backgroundColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.disabled)
            ? C.surfaceContainerHighest
            : bg,
      ),
      foregroundColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.disabled)
            ? const Color(0xFF9BA29A)
            : fg,
      ),
      elevation: const WidgetStatePropertyAll(0),
      side: WidgetStatePropertyAll(
        variant == 'outlined' ? const BorderSide(color: C.outline) : null,
      ),
      padding: WidgetStatePropertyAll(
        EdgeInsets.symmetric(vertical: small ? 8 : 13, horizontal: small ? 16 : 20),
      ),
      minimumSize: const WidgetStatePropertyAll(Size(0, 40)),
      shape: const WidgetStatePropertyAll(StadiumBorder()),
      textStyle: WidgetStatePropertyAll(
        TextStyle(fontSize: small ? 13 : 15, fontWeight: FontWeight.w600),
      ),
    );
    final btn = variant == 'outlined'
        ? OutlinedButton(onPressed: onPress, style: style, child: Text(title))
        : FilledButton(onPressed: onPress, style: style, child: Text(title));
    return expand ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}

/// M3 Filled 输入框
class InputField extends StatelessWidget {
  final TextEditingController controller;
  final String? hint;
  final bool multiline;
  final bool obscure;
  final bool digits;
  const InputField(
    this.controller, {
    super.key,
    this.hint,
    this.multiline = false,
    this.obscure = false,
    this.digits = false,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: digits
          ? TextInputType.number
          : (multiline ? TextInputType.multiline : TextInputType.text),
      inputFormatters: digits
          ? [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(6),
            ]
          : null,
      maxLines: multiline ? 3 : 1,
      minLines: multiline ? 3 : 1,
      style: const TextStyle(fontSize: 15, color: C.onSurface, height: 1.4),
      decoration: InputDecoration(hintText: hint),
    );
  }
}
