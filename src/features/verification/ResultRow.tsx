import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { DemoBadge } from '@/components/DemoBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { dayLongName } from '@/constants/weekdays';
import { RESULT_LABELS } from '@/features/verification/ResultDetails';
import { colors, spacing } from '@/theme';
import type { VerificationResult } from '@/types/verification';
import { formatDateTime } from '@/utils/time';

type Props = {
  result: VerificationResult;
  /** Hide the weekday when the list is already for a single compartment. */
  showDay?: boolean;
  onPress?: () => void;
};

/** One line of verification history. */
export function ResultRow({ result, showDay = true, onPress }: Props) {
  const title = showDay ? dayLongName(result.dayOfWeek) : formatDateTime(result.createdAt);

  return (
    <Card onPress={onPress} accessibilityLabel={`${title}: ${RESULT_LABELS[result.status]}. ${result.summary}`}>
      <View style={styles.header}>
        <AppText variant="subheading" style={styles.flex}>
          {title}
        </AppText>
        <StatusBadge status={result.status} label={RESULT_LABELS[result.status]} />
      </View>
      <AppText color={colors.textMuted}>{result.summary}</AppText>
      <View style={styles.meta}>
        {showDay && (
          <AppText variant="caption" color={colors.textSubtle}>
            {formatDateTime(result.createdAt)}
          </AppText>
        )}
        {result.isDemo && <DemoBadge />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
