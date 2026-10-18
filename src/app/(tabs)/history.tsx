import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { openCompartment, chooseCompartmentToVerify } from '@/features/pillbox/navigation';
import { ResultRow } from '@/features/verification/ResultRow';
import { useVerifications } from '@/state/VerificationsContext';

export default function HistoryScreen() {
  const { results, status } = useVerifications();

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState message="Loading history…" />
      </Screen>
    );
  }

  if (results.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No checks yet"
          message="Verify a compartment after you refill it. Results from the camera and scale will appear here."
          icon={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }}
          action={{ label: 'Verify a refill', onPress: chooseCompartmentToVerify }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {results.map((result) => (
        <ResultRow
          key={result.id}
          result={result}
          onPress={() => openCompartment(result.dayOfWeek)}
        />
      ))}
    </Screen>
  );
}
