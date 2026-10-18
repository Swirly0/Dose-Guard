import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme';

type Action = { label: string; onPress: () => void };

function StateLayout({ visual, title, message, action }: {
  visual: ReactNode;
  title: string;
  message?: string;
  action?: Action;
}) {
  return (
    <View style={styles.container}>
      {visual}
      <AppText variant="subheading" style={styles.center}>
        {title}
      </AppText>
      {message && (
        <AppText color={colors.textMuted} style={styles.center}>
          {message}
        </AppText>
      )}
      {action && <Button label={action.label} onPress={action.onPress} />}
    </View>
  );
}

function IconBubble({ name, color, background }: { name: IconName; color: string; background: string }) {
  return (
    <View style={[styles.bubble, { backgroundColor: background }]}>
      <Icon name={name} size={28} color={color} />
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  message?: string;
  icon?: IconName;
  action?: Action;
};

export function EmptyState({
  title,
  message,
  icon = { ios: 'tray', android: 'inbox', web: 'inbox' },
  action,
}: EmptyStateProps) {
  return (
    <StateLayout
      visual={<IconBubble name={icon} color={colors.primary} background={colors.primarySoft} />}
      title={title}
      message={message}
      action={action}
    />
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <StateLayout
      visual={<ActivityIndicator size="large" color={colors.primary} />}
      title={message}
    />
  );
}

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <StateLayout
      visual={
        <IconBubble
          name={{ ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }}
          color={colors.danger}
          background={colors.dangerSoft}
        />
      }
      title={title}
      message={message}
      action={onRetry && { label: 'Try again', onPress: onRetry }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
