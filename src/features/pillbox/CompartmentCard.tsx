import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DemoBadge } from '@/components/DemoBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { formatGrams } from '@/constants/modelClasses';
import { dayLongName } from '@/constants/weekdays';
import type { Compartment } from '@/features/pillbox/compartments';
import { formatCounts, formatPills } from '@/features/pillbox/format';
import { openCompartment, startVerification } from '@/features/pillbox/navigation';
import { colors, radius, spacing } from '@/theme';
import { formatDateTime } from '@/utils/time';

type Props = {
  compartment: Compartment;
  isToday?: boolean;
  /** `verify` shows a single full-width verify button (used when choosing a compartment). */
  actions?: 'both' | 'verify';
};

export function CompartmentCard({ compartment: c, isToday = false, actions = 'both' }: Props) {
  const name = dayLongName(c.dayOfWeek);
  const empty = c.expected.totalPills === 0;

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.title}>
          <AppText variant="subheading">{name}</AppText>
          {isToday && (
            <View style={styles.todayTag}>
              <AppText variant="label" color={colors.primary}>
                Today
              </AppText>
            </View>
          )}
        </View>
        <StatusBadge status={c.status} />
      </View>

      {empty ? (
        <AppText color={colors.textMuted}>Nothing scheduled. This compartment should be empty.</AppText>
      ) : (
        <>
          <AppText>{formatCounts(c.expected.counts)}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {formatPills(c.expected.totalPills)} · expected weight {formatGrams(c.expected.weightGrams)}
          </AppText>
        </>
      )}

      {c.isOutdated && (
        <AppText variant="caption" color={colors.warning}>
          Schedule changed since the last check. Verify again.
        </AppText>
      )}

      <View style={styles.meta}>
        <AppText variant="caption" color={colors.textSubtle}>
          {c.lastVerifiedAt ? `Last checked ${formatDateTime(c.lastVerifiedAt)}` : 'Never checked'}
        </AppText>
        {c.latestResult?.isDemo && <DemoBadge />}
      </View>

      {actions === 'verify' ? (
        <Button
          label={`Verify ${name}`}
          onPress={() => startVerification(c.dayOfWeek)}
          fullWidth
        />
      ) : (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button
              label="Details"
              variant="secondary"
              onPress={() => openCompartment(c.dayOfWeek)}
              fullWidth
            />
          </View>
          <View style={styles.flex}>
            <Button label="Verify" onPress={() => startVerification(c.dayOfWeek)} fullWidth />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  todayTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
});
