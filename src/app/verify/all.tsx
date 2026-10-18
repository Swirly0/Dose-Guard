import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState } from '@/components/StateViews';
import { ALL_DAYS, dayLongName } from '@/constants/weekdays';
import { useCompartments } from '@/features/pillbox/compartments';
import { BackendMissingCard } from '@/features/settings/BackendMissingCard';
import { ResultDetails } from '@/features/verification/ResultDetails';
import {
  BackendError,
  buildVerifyRequest,
  toStoredResult,
  verifyCompartment,
} from '@/services/backend';
import { useMedications } from '@/state/MedicationsContext';
import { useSettings } from '@/state/SettingsContext';
import { useVerifications } from '@/state/VerificationsContext';
import { colors, spacing } from '@/theme';
import type { DayOfWeek } from '@/constants/weekdays';
import type { VerificationResult } from '@/types/verification';

type DayProgress = {
  day: DayOfWeek;
  status: 'pending' | 'checking' | 'done' | 'failed';
  result?: VerificationResult;
  error?: string;
};

const emptyProgress = (): DayProgress[] =>
  ALL_DAYS.map((day) => ({ day, status: 'pending' }));

async function verifyWithRetry(
  baseUrl: string,
  body: ReturnType<typeof buildVerifyRequest>,
): Promise<Awaited<ReturnType<typeof verifyCompartment>>> {
  try {
    return await verifyCompartment(baseUrl, body);
  } catch (error) {
    if (error instanceof BackendError && error.status === 409) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await verifyCompartment(baseUrl, body);
    }
    throw error;
  }
}

export default function VerifyAllScreen() {
  const { status: medicationsStatus } = useMedications();
  const { status: resultsStatus, addResult } = useVerifications();
  const { settings } = useSettings();
  const compartments = useCompartments();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DayProgress[]>(emptyProgress);

  if (medicationsStatus === 'loading' || resultsStatus === 'loading') {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Verify all days' }} />
        <LoadingState />
      </Screen>
    );
  }

  const canStart = Boolean(settings.backendUrl) && !busy;
  const finished = progress.some((p) => p.status === 'done' || p.status === 'failed');
  const checking = progress.find((p) => p.status === 'checking');

  const setDay = (day: DayOfWeek, patch: Partial<DayProgress>) => {
    setProgress((prev) => prev.map((p) => (p.day === day ? { ...p, ...patch } : p)));
  };

  const startAll = async () => {
    setBusy(true);
    setProgress(emptyProgress());
    for (const compartment of compartments) {
      const day = compartment.dayOfWeek;
      setDay(day, { status: 'checking', error: undefined, result: undefined });
      try {
        const response = await verifyWithRetry(
          settings.backendUrl,
          buildVerifyRequest(day, compartment.expected.counts, compartment.expected.weightGrams),
        );
        const stored = toStoredResult(response);
        addResult(stored);
        setDay(day, { status: 'done', result: stored });
      } catch (error) {
        setDay(day, {
          status: 'failed',
          error: error instanceof BackendError ? error.message : 'The check could not run.',
        });
      }
    }
    setBusy(false);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Verify all days' }} />

      <AppText color={colors.textMuted}>
        Checks Sunday through Saturday, one day at a time. Leave the pillbox in its calibrated
        position until every day finishes.
      </AppText>

      <BackendMissingCard />

      {checking && (
        <Card>
          <LoadingState message={`Checking ${dayLongName(checking.day)}…`} />
        </Card>
      )}

      {progress.map((p) => (
        <Card key={p.day}>
          <View style={styles.row}>
            <AppText variant="subheading">{dayLongName(p.day)}</AppText>
            {p.status === 'pending' && <AppText color={colors.textSubtle}>Waiting</AppText>}
            {p.status === 'checking' && <AppText color={colors.primary}>Checking…</AppText>}
            {p.status === 'failed' && <AppText color={colors.danger}>Could not run</AppText>}
            {p.result && <StatusBadge status={p.result.status} />}
          </View>
          {p.error && <AppText color={colors.danger}>{p.error}</AppText>}
          {p.result && <ResultDetails result={p.result} />}
        </Card>
      ))}

      <Button
        label={finished ? 'Verify all days again' : 'Start all 7 days'}
        icon={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
        onPress={startAll}
        loading={busy}
        disabled={!canStart}
        fullWidth
      />
      <Button label="Back" variant="secondary" onPress={() => router.back()} disabled={busy} fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
