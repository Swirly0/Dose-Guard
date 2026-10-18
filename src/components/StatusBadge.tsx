import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme';
import type { CheckStatus } from '@/types/verification';

type StatusStyle = { label: string; icon: IconName; color: string; background: string };

export const statusStyles: Record<CheckStatus, StatusStyle> = {
  not_checked: {
    label: 'Not checked',
    icon: { ios: 'circle.dashed', android: 'radio_button_unchecked', web: 'radio_button_unchecked' },
    color: colors.neutral,
    background: colors.neutralSoft,
  },
  verified: {
    label: 'Verified',
    icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
    color: colors.success,
    background: colors.successSoft,
  },
  mismatch: {
    label: 'Mismatch',
    icon: { ios: 'xmark.octagon.fill', android: 'cancel', web: 'cancel' },
    color: colors.danger,
    background: colors.dangerSoft,
  },
  needs_review: {
    label: 'Needs review',
    icon: {
      ios: 'exclamationmark.triangle.fill',
      android: 'warning',
      web: 'warning',
    },
    color: colors.warning,
    background: colors.warningSoft,
  },
};

type Props = {
  status: CheckStatus;
  /** Overrides the default label, e.g. "Checks passed" on a result screen. */
  label?: string;
  size?: 'sm' | 'lg';
};

export function StatusBadge({ status, label, size = 'sm' }: Props) {
  const s = statusStyles[status];
  const text = label ?? s.label;
  const large = size === 'lg';

  return (
    <View
      style={[styles.badge, large && styles.large, { backgroundColor: s.background }]}
      accessible
      accessibilityLabel={`Status: ${text}`}>
      <Icon name={s.icon} size={large ? 20 : 14} color={s.color} />
      <AppText variant={large ? 'subheading' : 'label'} color={s.color}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  large: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
