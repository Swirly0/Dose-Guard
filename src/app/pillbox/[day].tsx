import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DemoBadge } from '@/components/DemoBadge';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { StatusBadge } from '@/components/StatusBadge';
import { dayLongName } from '@/constants/weekdays';
import { useCompartments } from '@/features/pillbox/compartments';
import { ExpectedContentsCard } from '@/features/pillbox/ExpectedContentsCard';
import { parseDayParam, startVerification } from '@/features/pillbox/navigation';
import { ResultDetails } from '@/features/verification/ResultDetails';
import { ResultRow } from '@/features/verification/ResultRow';
import { useMedications } from '@/state/MedicationsContext';
import { useVerifications } from '@/state/VerificationsContext';
import { colors, spacing } from '@/theme';
import { formatDateTime } from '@/utils/time';

export default function CompartmentDetailScreen() {
  const day = parseDayParam(useLocalSearchParams<{ day: string }>().day);
  const { status: medicationsStatus } = useMedications();
  const { results, status: resultsStatus } = useVerifications();
  const compartments = useCompartments();

  if (day === null) {
    return (
      <Screen>
        <EmptyState
          title="Compartment not found"
          action={{ label: 'Back to pillbox', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  const name = dayLongName(day);

  if (medicationsStatus === 'loading' || resultsStatus === 'loading') {
    return (
      <Screen>
        <Stack.Screen options={{ title: name }} />
        <LoadingState />
      </Screen>
    );
  }

  const c = compartments[day - 1];
  const history = results.filter((r) => r.dayOfWeek === day);

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />

      <Card>
        <View style={styles.rowBetween}>
          <StatusBadge status={c.status} size="lg" />
          {c.latestResult?.isDemo && <DemoBadge />}
        </View>
        <AppText variant="caption" color={colors.textSubtle}>
          {c.lastVerifiedAt ? `Last checked ${formatDateTime(c.lastVerifiedAt)}` : 'Never checked'}
        </AppText>
        {c.isOutdated && (
          <AppText color={colors.warning}>
            The medication schedule changed after the last check, so that result no longer
            applies. Verify this compartment again.
          </AppText>
        )}
      </Card>

      <SectionHeader title="Should contain" />
      <ExpectedContentsCard expected={c.expected} dayName={name} />

      <Button label={`Verify ${name}`} onPress={() => startVerification(day)} fullWidth />

      <SectionHeader title="Latest result" />
      {c.latestResult ? (
        <Card>
          {c.isOutdated && (
            <AppText variant="caption" color={colors.warning}>
              This result was for an earlier schedule.
            </AppText>
          )}
          <ResultDetails result={c.latestResult} />
        </Card>
      ) : (
        <Card>
          <AppText color={colors.textMuted}>
            This compartment has not been verified yet. Refill it, then tap Verify.
          </AppText>
        </Card>
      )}

      {history.length > 1 && (
        <>
          <SectionHeader title="Earlier checks" />
          {history.slice(1).map((r) => (
            <ResultRow key={r.id} result={r} showDay={false} />
          ))}
        </>
      )}
    </Screen>
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
});
