import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { LoadingState } from '@/components/StateViews';
import { dayOfWeekFromDate } from '@/constants/weekdays';
import { CompartmentCard } from '@/features/pillbox/CompartmentCard';
import { useCompartments } from '@/features/pillbox/compartments';
import { startVerifyAll } from '@/features/pillbox/navigation';
import { useMedications } from '@/state/MedicationsContext';
import { useVerifications } from '@/state/VerificationsContext';
import { colors } from '@/theme';

export default function ChooseCompartmentScreen() {
  const { status: medicationsStatus } = useMedications();
  const { status: resultsStatus } = useVerifications();
  const compartments = useCompartments();
  const today = dayOfWeekFromDate(new Date());

  if (medicationsStatus === 'loading' || resultsStatus === 'loading') {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="heading">Which compartment did you refill?</AppText>
      <AppText color={colors.textMuted}>
        Choose a day to see what it should contain, then start the check. Or check the whole
        week in one pass.
      </AppText>
      <Button label="Verify all days" onPress={startVerifyAll} fullWidth />
      {compartments.map((c) => (
        <CompartmentCard
          key={c.dayOfWeek}
          compartment={c}
          isToday={c.dayOfWeek === today}
          actions="verify"
        />
      ))}
    </Screen>
  );
}
