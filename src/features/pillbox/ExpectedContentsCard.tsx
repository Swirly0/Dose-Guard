import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { formatGrams, gramsPerPill, modelClassLabel } from '@/constants/modelClasses';
import type { ExpectedContents } from '@/features/pillbox/expectedContents';
import { formatPills } from '@/features/pillbox/format';
import { colors, spacing } from '@/theme';
import { formatTime } from '@/utils/time';

type Props = {
  expected: ExpectedContents;
  dayName: string;
};

/** What one compartment should hold, including expected camera counts and weight. */
export function ExpectedContentsCard({ expected, dayName }: Props) {
  return (
    <Card>
      {expected.items.length === 0 ? (
        <AppText color={colors.textMuted}>
          Nothing is scheduled for {dayName}. This compartment should be empty.
        </AppText>
      ) : (
        <>
          {expected.items.map((item) => {
            const weight = gramsPerPill(item.modelClass);
            return (
              <View key={item.medicationId} style={styles.item}>
                <View style={styles.rowBetween}>
                  <AppText variant="subheading" style={styles.flex}>
                    {item.name}
                  </AppText>
                  <AppText variant="subheading">{formatPills(item.pills)}</AppText>
                </View>
                <AppText variant="caption" color={colors.textMuted}>
                  {item.doseTimes.map(formatTime).join(', ')} · camera detects as{' '}
                  {modelClassLabel(item.modelClass)}
                  {weight !== undefined ? ` · ${formatGrams(item.pills * weight)}` : ''}
                </AppText>
              </View>
            );
          })}
          <View style={[styles.rowBetween, styles.total]}>
            <AppText variant="label">Total</AppText>
            <AppText variant="label">
              {formatPills(expected.totalPills)} · {formatGrams(expected.weightGrams)}
            </AppText>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
  },
  item: {
    gap: 2,
    paddingVertical: spacing.xs,
  },
  total: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
