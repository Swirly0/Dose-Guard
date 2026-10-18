import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DemoBadge } from '@/components/DemoBadge';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { formatGrams, modelClassLabel } from '@/constants/modelClasses';
import { colors, radius, spacing } from '@/theme';
import type { VerificationResult, VerificationStatus } from '@/types/verification';
import { formatDateTime } from '@/utils/time';

export const RESULT_LABELS: Record<VerificationStatus, string> = {
  verified: 'Checks passed',
  mismatch: 'Mismatch',
  needs_review: 'Needs review',
};

/** Full breakdown of one verification: status, counts by medication, weight, and notes. */
export function ResultDetails({ result }: { result: VerificationResult }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <StatusBadge status={result.status} label={RESULT_LABELS[result.status]} size="lg" />
        {result.isDemo && <DemoBadge />}
      </View>
      <AppText variant="subheading">{result.summary}</AppText>
      <AppText variant="caption" color={colors.textSubtle}>
        {formatDateTime(result.createdAt)}
      </AppText>

      <CountsTable result={result} />
      <WeightRow result={result} />

      {result.details && result.details.length > 0 && (
        <View style={styles.details}>
          {result.details.map((line) => (
            <AppText key={line} color={colors.textMuted}>
              • {line}
            </AppText>
          ))}
        </View>
      )}

      {result.status === 'verified' && (
        <AppText variant="caption" color={colors.textSubtle}>
          Passing means the camera counts matched the schedule. Weight is shown for reference
          and does not fail the check. It does not guarantee medication safety.
        </AppText>
      )}
    </View>
  );
}

function CountsTable({ result }: { result: VerificationResult }) {
  const classes = [
    ...new Set([...Object.keys(result.expectedCounts), ...Object.keys(result.detectedCounts ?? {})]),
  ].sort((a, b) => modelClassLabel(a).localeCompare(modelClassLabel(b)));

  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        <AppText variant="label" style={styles.nameCol}>
          Pill count
        </AppText>
        <AppText variant="label" style={styles.numCol}>
          Expected
        </AppText>
        <AppText variant="label" style={styles.numCol}>
          Detected
        </AppText>
      </View>
      {classes.map((cls) => {
        const expected = result.expectedCounts[cls] ?? 0;
        const detected = result.detectedCounts?.[cls];
        const matches = detected === expected;
        return (
          <View key={cls} style={styles.tableRow}>
            <AppText style={styles.nameCol}>{modelClassLabel(cls)}</AppText>
            <AppText style={styles.numCol}>{expected}</AppText>
            <View style={[styles.numCol, styles.detectedCell]}>
              {detected !== undefined && !matches && (
                <Icon
                  name={{ ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' }}
                  size={14}
                  color={colors.danger}
                />
              )}
              <AppText color={detected === undefined ? colors.textSubtle : matches ? colors.text : colors.danger}>
                {detected ?? '—'}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function WeightRow({ result }: { result: VerificationResult }) {
  if (result.expectedWeightGrams === undefined) return null;
  const tolerance = result.weightToleranceGrams;
  return (
    <View style={styles.weight}>
      <AppText variant="label">Weight</AppText>
      <AppText color={colors.textMuted}>
        Expected {formatGrams(result.expectedWeightGrams)}
        {tolerance !== undefined ? ` (±${formatGrams(tolerance)})` : ''}
      </AppText>
      <AppText color={colors.textMuted}>
        Measured{' '}
        {result.measuredWeightGrams === undefined
          ? 'not available'
          : formatGrams(result.measuredWeightGrams)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  table: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tableHeader: {
    backgroundColor: colors.neutralSoft,
    borderTopWidth: 0,
  },
  nameCol: {
    flex: 2,
  },
  numCol: {
    flex: 1,
    textAlign: 'right',
  },
  detectedCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  weight: {
    gap: 2,
  },
  details: {
    gap: spacing.xs,
  },
});
