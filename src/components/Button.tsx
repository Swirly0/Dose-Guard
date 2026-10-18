import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing, touchTarget } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

const variantStyles: Record<Variant, { bg: string; pressedBg: string; fg: string; border: string }> =
  {
    primary: {
      bg: colors.primary,
      pressedBg: colors.primaryPressed,
      fg: colors.textOnPrimary,
      border: colors.primary,
    },
    secondary: {
      bg: colors.surface,
      pressedBg: colors.neutralSoft,
      fg: colors.primary,
      border: colors.border,
    },
    ghost: {
      bg: 'transparent',
      pressedBg: colors.primarySoft,
      fg: colors.primary,
      border: 'transparent',
    },
    danger: {
      bg: colors.surface,
      pressedBg: colors.dangerSoft,
      fg: colors.danger,
      border: colors.border,
    },
  };

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
}: Props) {
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? v.pressedBg : v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          icon && <Icon name={icon} size={18} color={v.fg} />
        )}
        <AppText variant="subheading" color={v.fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
