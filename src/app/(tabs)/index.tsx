import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { StatusBadge } from '@/components/StatusBadge';
import { formatGrams } from '@/constants/modelClasses';
import { dayLongName, dayOfWeekFromDate, dayShortName } from '@/constants/weekdays';
import { useCompartments, type Compartment } from '@/features/pillbox/compartments';
import { formatCounts, formatPills } from '@/features/pillbox/format';
import { chooseCompartmentToVerify, openCompartment } from '@/features/pillbox/navigation';
import { WeekStrip } from '@/features/pillbox/WeekStrip';
import { getDosesForDay, getNextDose, type ScheduledDose } from '@/features/schedule/schedule';
import { BackendMissingCard } from '@/features/settings/BackendMissingCard';
import { ResultRow } from '@/features/verification/ResultRow';
import { useMedications } from '@/state/MedicationsContext';
import { useVerifications } from '@/state/VerificationsContext';
import { colors, spacing } from '@/theme';
import { dateToTime, formatDateLabel, formatFullDate, formatTime } from '@/utils/time';

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function needsAttention(c: Compartment): boolean {
  return c.status === 'mismatch' || c.status === 'needs_review' || c.isOutdated;
}

export default function HomeScreen() {
  const { medications, status: medicationsStatus } = useMedications();
  const { results, status: resultsStatus } = useVerifications();
  const compartments = useCompartments();

  if (medicationsStatus === 'loading' || resultsStatus === 'loading') {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const now = new Date();
  const today = dayOfWeekFromDate(now);
  const todaysDoses = getDosesForDay(medications, today);
  const todayExpected = compartments[today - 1]?.expected;
  const nextDose = getNextDose(medications, now);
  const attention = compartments.filter(needsAttention);
  const recent = results.slice(0, 3);

  return (
    <Screen>
      <View>
        <AppText variant="title">{greeting(now)}</AppText>
        <AppText color={colors.textMuted}>{formatFullDate(now)}</AppText>
      </View>

      <Button
        label="Verify a refill"
        icon={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
        onPress={chooseCompartmentToVerify}
        fullWidth
      />
      <BackendMissingCard />

      {medications.length === 0 ? (
        <Card>
          <EmptyState
            title="No medications yet"
            message="Add your first medication to build your schedule and weekly pillbox."
            icon={{ ios: 'pills', android: 'medication', web: 'medication' }}
            action={{ label: 'Add medication', onPress: () => router.push('/medications/new') }}
          />
        </Card>
      ) : (
        <>
          {nextDose && (
            <Card>
              <AppText variant="label" color={colors.textMuted}>
                NEXT DOSE
              </AppText>
              <AppText variant="heading">
                {formatDateLabel(nextDose.date, now)}, {formatTime(dateToTime(nextDose.date))}
              </AppText>
              <AppText>{describeDose(nextDose)}</AppText>
            </Card>
          )}

          <SectionHeader title="Today's schedule" />
          <Card>
            {todayExpected && (
              <AppText color={colors.textMuted}>
                {todayExpected.totalPills === 0
                  ? "Today's compartment should be empty."
                  : `${formatCounts(todayExpected.counts)} · ${formatPills(todayExpected.totalPills)} · ${formatGrams(todayExpected.weightGrams)}`}
              </AppText>
            )}
            {todaysDoses.length === 0 ? (
              <AppText color={colors.textMuted}>No doses scheduled today.</AppText>
            ) : (
              todaysDoses.map((dose) => {
                const past = dose.time <= dateToTime(now);
                const textColor = past ? colors.textSubtle : colors.text;
                return (
                  <View key={dose.time} style={styles.doseRow}>
                    <AppText variant="subheading" color={textColor} style={styles.doseTime}>
                      {formatTime(dose.time)}
                    </AppText>
                    <AppText color={textColor} style={styles.flex}>
                      {describeDose(dose)}
                    </AppText>
                  </View>
                );
              })
            )}
          </Card>
        </>
      )}

      <SectionHeader title="This week" actionLabel="Pillbox" onActionPress={() => router.push('/pillbox')} />
      <WeekStrip compartments={compartments} today={today} />
      <Card>
        {compartments.map((c) => (
          <View key={c.dayOfWeek} style={styles.weekRow}>
            <AppText variant="label" style={styles.weekDay}>
              {dayShortName(c.dayOfWeek)}
            </AppText>
            <View style={styles.flex}>
              <AppText color={c.expected.totalPills === 0 ? colors.textSubtle : colors.text}>
                {c.expected.totalPills === 0 ? 'Empty' : formatCounts(c.expected.counts)}
              </AppText>
              {c.expected.totalPills > 0 && (
                <AppText variant="caption" color={colors.textSubtle}>
                  {formatPills(c.expected.totalPills)} · {formatGrams(c.expected.weightGrams)}
                </AppText>
              )}
              {c.isOutdated && (
                <AppText variant="caption" color={colors.warning}>
                  Schedule changed. Verify again.
                </AppText>
              )}
            </View>
          </View>
        ))}
      </Card>

      <SectionHeader title="Needs attention" />
      {attention.length === 0 ? (
        <Card>
          <View style={styles.okRow}>
            <Icon
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              color={colors.success}
            />
            <AppText color={colors.textMuted} style={styles.flex}>
              No compartments need attention.
            </AppText>
          </View>
        </Card>
      ) : (
        attention.map((c) => (
          <Card
            key={c.dayOfWeek}
            onPress={() => openCompartment(c.dayOfWeek)}
            accessibilityLabel={`${dayLongName(c.dayOfWeek)} needs attention`}>
            <View style={styles.rowBetween}>
              <AppText variant="subheading">{dayLongName(c.dayOfWeek)}</AppText>
              <StatusBadge status={c.status} />
            </View>
            <AppText color={colors.textMuted}>
              {c.isOutdated
                ? `Schedule changed. Now ${c.expected.totalPills === 0 ? 'empty' : formatCounts(c.expected.counts)}. Verify again.`
                : c.latestResult?.summary}
            </AppText>
          </Card>
        ))
      )}

      <SectionHeader
        title="Recent activity"
        actionLabel={results.length > 0 ? 'See all' : undefined}
        onActionPress={() => router.push('/history')}
      />
      {recent.length === 0 ? (
        <Card>
          <AppText color={colors.textMuted}>
            No checks yet. Verify a compartment after refilling it.
          </AppText>
        </Card>
      ) : (
        recent.map((r) => (
          <ResultRow key={r.id} result={r} onPress={() => openCompartment(r.dayOfWeek)} />
        ))
      )}
    </Screen>
  );
}

function describeDose(dose: ScheduledDose): string {
  return dose.items.map((i) => `${i.medication.name} (${formatPills(i.pills)})`).join(', ');
}

const styles = StyleSheet.create({
  doseRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  doseTime: {
    width: 84,
  },
  flex: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  okRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  weekDay: {
    width: 36,
    paddingTop: 2,
  },
});
