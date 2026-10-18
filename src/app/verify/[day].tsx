import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { dayLongName } from '@/constants/weekdays';
import { useCompartments } from '@/features/pillbox/compartments';
import { ExpectedContentsCard } from '@/features/pillbox/ExpectedContentsCard';
import { parseDayParam } from '@/features/pillbox/navigation';
import { BackendMissingCard } from '@/features/settings/BackendMissingCard';
import { ResultDetails } from '@/features/verification/ResultDetails';
import { BackendError, buildVerifyRequest, toStoredResult, verifyCompartment } from '@/services/backend';
import { useMedications } from '@/state/MedicationsContext';
import { useSettings } from '@/state/SettingsContext';
import { useVerifications } from '@/state/VerificationsContext';
import { colors } from '@/theme';
import type { VerificationResult } from '@/types/verification';

export default function VerifyCompartmentScreen() {
  const day = parseDayParam(useLocalSearchParams<{ day: string }>().day);
  const { status: medicationsStatus } = useMedications();
  const { status: resultsStatus, addResult } = useVerifications();
  const { settings } = useSettings();
  const compartments = useCompartments();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const name = day ? dayLongName(day) : 'this compartment';

  if (day === null) {
    return (
      <Screen>
        <EmptyState
          title="Compartment not found"
          action={{ label: 'Back', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  if (medicationsStatus === 'loading' || resultsStatus === 'loading') {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Verify ${name}` }} />
        <LoadingState />
      </Screen>
    );
  }

  const compartment = compartments[day - 1];
  const canStart = Boolean(settings.backendUrl) && !busy;

  const startCheck = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await verifyCompartment(
        settings.backendUrl,
        buildVerifyRequest(day, compartment.expected.counts, compartment.expected.weightGrams),
      );
      const stored = toStoredResult(response);
      addResult(stored);
      setResult(stored);
    } catch (e) {
      setError(e instanceof BackendError ? e.message : 'The check could not run.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: `Verify ${name}` }} />

      <AppText color={colors.textMuted}>
        Refill {name}, keep the pillbox in its calibrated position, then start the check. The
        laptop will count pills in that compartment and weigh it. The day&apos;s LED blinks while
        the check runs.
      </AppText>

      <BackendMissingCard />

      <SectionHeader title="Should contain" />
      <ExpectedContentsCard expected={compartment.expected} dayName={name} />

      {busy && (
        <Card>
          <LoadingState message="Checking this compartment…" />
          <AppText color={colors.textMuted} style={{ textAlign: 'center' }}>
            Camera and scale are running. Leave the box still until this finishes.
          </AppText>
        </Card>
      )}

      {error && (
        <ErrorState title="Check did not finish" message={error} onRetry={canStart ? startCheck : undefined} />
      )}

      {result && !busy && (
        <>
          <SectionHeader title="Result" />
          <Card>
            <ResultDetails result={result} />
          </Card>
        </>
      )}

      <Button
        label={result ? `Verify ${name} again` : `Start ${name} check`}
        icon={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
        onPress={startCheck}
        loading={busy}
        disabled={!canStart}
        fullWidth
      />
      <Button label="Back" variant="secondary" onPress={() => router.back()} disabled={busy} fullWidth />
    </Screen>
  );
}
