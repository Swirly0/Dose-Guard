import { router } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { LoadingState } from '@/components/StateViews';
import { dayOfWeekFromDate } from '@/constants/weekdays';
import { CompartmentCard } from '@/features/pillbox/CompartmentCard';
import { useCompartments } from '@/features/pillbox/compartments';
import { useMedications } from '@/state/MedicationsContext';
import { useVerifications } from '@/state/VerificationsContext';
import { colors } from '@/theme';

export default function PillboxScreen() {
  const { medications, status: medicationsStatus } = useMedications();
  const { status: resultsStatus } = useVerifications();
  const compartments = useCompartments();
  const today = dayOfWeekFromDate(new Date());

  if (medicationsStatus === 'loading' || resultsStatus === 'loading') {
    return (
      <Screen>
        <LoadingState message="Loading pillbox…" />
      </Screen>
    );
  }

  const verified = compartments.filter((c) => c.status === 'verified').length;
  const attention = compartments.filter(
    (c) => c.status === 'mismatch' || c.status === 'needs_review',
  ).length;

  return (
    <Screen>
      <AppText color={colors.textMuted}>
        Each compartment holds one day of pills. Verify a compartment after refilling it to check
        the pill count and weight.
      </AppText>
      <AppText variant="label">
        {verified} of 7 verified{attention > 0 ? ` · ${attention} need attention` : ''}
      </AppText>

      {medications.length === 0 && (
        <Card>
          <AppText variant="subheading">Your pillbox is empty</AppText>
          <AppText color={colors.textMuted}>
            Add a medication and its schedule to see what each compartment should hold.
          </AppText>
          <Button label="Add medication" onPress={() => router.push('/medications/new')} />
        </Card>
      )}

      {compartments.map((c) => (
        <CompartmentCard key={c.dayOfWeek} compartment={c} isToday={c.dayOfWeek === today} />
      ))}
    </Screen>
  );
}
