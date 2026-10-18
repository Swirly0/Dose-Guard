import { router, useLocalSearchParams } from 'expo-router';

import { confirmAction } from '@/components/confirm';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { formatDays } from '@/constants/weekdays';
import { MedicationForm } from '@/features/medications/MedicationForm';
import { useMedications } from '@/state/MedicationsContext';

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, getMedication, updateMedication, deleteMedication } = useMedications();
  const medication = getMedication(id);

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!medication) {
    return (
      <Screen>
        <EmptyState
          title="Medication not found"
          message="It may have been deleted."
          action={{ label: 'Back to medications', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  const handleDelete = async () => {
    const confirmed = await confirmAction({
      title: `Delete ${medication.name}?`,
      message: `It will be removed from the expected pillbox contents for ${formatDays(
        medication.daysOfWeek,
      )}, and its reminders will stop. Past verification history is kept.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    deleteMedication(medication.id);
    router.back();
  };

  return (
    <MedicationForm
      key={medication.id}
      initial={medication}
      submitLabel="Save changes"
      onSubmit={(draft) => {
        updateMedication(medication.id, draft);
        router.back();
      }}
      onDelete={handleDelete}
    />
  );
}
