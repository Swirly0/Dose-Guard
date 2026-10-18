import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { dayLongName } from '@/constants/weekdays';
import { parseDayParam } from '@/features/pillbox/navigation';

// Placeholder until the verification flow is built.
export default function VerifyCompartmentScreen() {
  const day = parseDayParam(useLocalSearchParams<{ day: string }>().day);
  const name = day ? dayLongName(day) : 'this compartment';

  return (
    <PlaceholderScreen
      title={`Verify ${name}`}
      description="The refill check will run here: review the expected pills, start the check, and see the result.">
      <Stack.Screen options={{ title: `Verify ${name}` }} />
      <Button label="Back" variant="secondary" onPress={() => router.back()} fullWidth />
    </PlaceholderScreen>
  );
}
