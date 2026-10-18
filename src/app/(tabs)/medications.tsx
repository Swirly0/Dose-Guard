import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { modelClassLabel } from '@/constants/modelClasses';
import { formatDays } from '@/constants/weekdays';
import { useMedications } from '@/state/MedicationsContext';
import { colors, spacing } from '@/theme';
import type { Medication } from '@/types/medication';
import { formatTime } from '@/utils/time';

const addMedication = () => router.push('/medications/new');

export default function MedicationsScreen() {
  const { medications, status } = useMedications();

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState message="Loading medications…" />
      </Screen>
    );
  }

  return (
    <Screen>
      {status === 'error' && (
        <AppText variant="caption" color={colors.warning}>
          Saved medications could not be loaded or saved on this device. Changes may not persist.
        </AppText>
      )}

      {medications.length === 0 ? (
        <EmptyState
          title="No medications yet"
          message="Add your first medication to build your weekly pillbox. You can scan a barcode or type the details."
          icon={{ ios: 'pills', android: 'medication', web: 'medication' }}
          action={{ label: 'Add medication', onPress: addMedication }}
        />
      ) : (
        <>
          <Button
            label="Add medication"
            icon={{ ios: 'plus', android: 'add', web: 'add' }}
            onPress={addMedication}
            fullWidth
          />
          {medications.map((m) => (
            <MedicationCard key={m.id} medication={m} />
          ))}
        </>
      )}
    </Screen>
  );
}

function MedicationCard({ medication: m }: { medication: Medication }) {
  const pills = `${m.pillsPerDose} ${m.pillsPerDose === 1 ? 'pill' : 'pills'} per dose`;

  return (
    <Card
      onPress={() => router.push({ pathname: '/medications/[id]', params: { id: m.id } })}
      accessibilityLabel={`Edit ${m.name}`}>
      <View style={styles.rowBetween}>
        <AppText variant="subheading" style={styles.flex}>
          {m.name}
        </AppText>
        <Icon
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          color={colors.textSubtle}
          size={16}
        />
      </View>
      <AppText color={colors.textMuted}>
        {pills} · Camera detects as {modelClassLabel(m.modelClass)}
      </AppText>
      <AppText color={colors.textMuted}>
        {formatDays(m.daysOfWeek)} at {m.doseTimes.map(formatTime).join(', ')}
      </AppText>
      <View style={styles.row}>
        <Icon
          name={
            m.remindersEnabled
              ? { ios: 'bell.fill', android: 'notifications', web: 'notifications' }
              : { ios: 'bell.slash', android: 'notifications_off', web: 'notifications_off' }
          }
          color={colors.textSubtle}
          size={14}
        />
        <AppText variant="caption" color={colors.textSubtle}>
          {m.remindersEnabled ? 'Reminders on' : 'Reminders off'}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
