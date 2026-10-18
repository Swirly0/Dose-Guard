import { router } from 'expo-router';

import { EMPTY_DRAFT, MedicationForm } from '@/features/medications/MedicationForm';
import { useMedications } from '@/state/MedicationsContext';

export default function NewMedicationScreen() {
  const { addMedication } = useMedications();

  return (
    <MedicationForm
      initial={EMPTY_DRAFT}
      submitLabel="Save medication"
      onSubmit={(draft) => {
        addMedication(draft);
        router.back();
      }}
    />
  );
}
