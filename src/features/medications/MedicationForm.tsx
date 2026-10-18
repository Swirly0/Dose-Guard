import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { TimePickerField } from '@/components/TimePickerField';
import { MODEL_CLASSES } from '@/constants/modelClasses';
import { ALL_DAYS, WEEKDAYS, type DayOfWeek } from '@/constants/weekdays';
import { lookupBarcode } from '@/data/barcodeCatalog';
import { BarcodeScannerModal } from '@/features/medications/BarcodeScannerModal';
import { cleanDraft, LIMITS, validateDraft } from '@/features/medications/validation';
import { colors, radius, spacing } from '@/theme';
import type { MedicationDraft } from '@/types/medication';

type ScanOutcome = { found: true; code: string; name: string } | { found: false; code: string };

type Props = {
  initial: MedicationDraft;
  submitLabel: string;
  onSubmit: (draft: MedicationDraft) => void;
  onDelete?: () => void;
};

export const EMPTY_DRAFT: MedicationDraft = {
  name: '',
  modelClass: '',
  pillsPerDose: 1,
  daysOfWeek: [...ALL_DAYS],
  doseTimes: ['08:00'],
  remindersEnabled: true,
  notes: '',
};

export function MedicationForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const [draft, setDraft] = useState<MedicationDraft>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanOutcome, setScanOutcome] = useState<ScanOutcome | null>(null);

  const errors = submitted ? validateDraft(draft) : {};
  const update = (patch: Partial<MedicationDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const handleScanned = (code: string) => {
    setScannerOpen(false);
    const product = lookupBarcode(code);
    if (!product) {
      setScanOutcome({ found: false, code });
      return;
    }
    update({
      name: product.name,
      modelClass: product.modelClass,
      pillsPerDose: product.pillsPerDose,
      notes: product.notes ?? draft.notes,
      barcode: code,
    });
    setScanOutcome({ found: true, code, name: product.name });
  };

  const toggleDay = (day: DayOfWeek) =>
    update({
      daysOfWeek: draft.daysOfWeek.includes(day)
        ? draft.daysOfWeek.filter((d) => d !== day)
        : [...draft.daysOfWeek, day],
    });

  const setTime = (index: number, value: string) =>
    update({ doseTimes: draft.doseTimes.map((t, i) => (i === index ? value : t)) });

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.keys(validateDraft(draft)).length > 0) return;
    onSubmit(cleanDraft(draft));
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Screen>
      <Card>
        <AppText variant="subheading">Quick fill</AppText>
        <AppText color={colors.textMuted}>
          Scan the medication barcode, or type the details below.
        </AppText>
        <Button
          label="Scan barcode"
          variant="secondary"
          icon={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }}
          onPress={() => setScannerOpen(true)}
          fullWidth
        />
        {scanOutcome && <ScanBanner outcome={scanOutcome} />}
      </Card>

      <Card>
        <AppText variant="subheading">Details</AppText>
        <TextField
          label="Name"
          placeholder="e.g. Vitamin D3"
          value={draft.name}
          onChangeText={(name) => update({ name })}
          maxLength={LIMITS.nameMaxLength}
          autoCapitalize="words"
          error={errors.name}
        />

        <View style={styles.field}>
          <AppText variant="label">Camera recognizes it as</AppText>
          <View style={styles.wrap}>
            {MODEL_CLASSES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                selected={draft.modelClass === c.id}
                onPress={() =>
                  update({ modelClass: c.id, name: draft.name.trim() ? draft.name : c.label })
                }
              />
            ))}
          </View>
          <FieldNote
            error={errors.modelClass}
            hint="The medications the pillbox camera model is trained to recognize. Verification counts this medication in each compartment."
          />
        </View>

        <View style={styles.field}>
          <AppText variant="label">Pills per dose</AppText>
          <Stepper
            value={draft.pillsPerDose}
            min={LIMITS.minPillsPerDose}
            max={LIMITS.maxPillsPerDose}
            onChange={(pillsPerDose) => update({ pillsPerDose })}
          />
          <FieldNote error={errors.pillsPerDose} />
        </View>
      </Card>

      <Card>
        <AppText variant="subheading">Schedule</AppText>

        <View style={styles.field}>
          <View style={styles.rowBetween}>
            <AppText variant="label">Days</AppText>
            <View style={styles.row}>
              <Button label="Every day" variant="ghost" onPress={() => update({ daysOfWeek: [...ALL_DAYS] })} />
              <Button label="Clear" variant="ghost" onPress={() => update({ daysOfWeek: [] })} />
            </View>
          </View>
          <View style={styles.wrap}>
            {WEEKDAYS.map((d) => (
              <Chip
                key={d.value}
                label={d.short}
                accessibilityLabel={d.long}
                selected={draft.daysOfWeek.includes(d.value)}
                onPress={() => toggleDay(d.value)}
              />
            ))}
          </View>
          <FieldNote error={errors.daysOfWeek} />
        </View>

        <View style={styles.field}>
          <AppText variant="label">Dose times</AppText>
          {draft.doseTimes.map((time, index) => (
            <View key={index} style={styles.timeRow}>
              <View style={styles.flex}>
                <TimePickerField
                  value={time}
                  onChange={(value) => setTime(index, value)}
                  accessibilityLabel={`Dose time ${index + 1}`}
                />
              </View>
              <Pressable
                onPress={() => update({ doseTimes: draft.doseTimes.filter((_, i) => i !== index) })}
                accessibilityRole="button"
                accessibilityLabel={`Remove dose time ${index + 1}`}
                style={styles.iconButton}>
                <Icon name={{ ios: 'minus.circle', android: 'remove_circle_outline', web: 'remove_circle_outline' }} color={colors.danger} size={24} />
              </Pressable>
            </View>
          ))}
          {draft.doseTimes.length < LIMITS.maxDoseTimes && (
            <Button
              label="Add time"
              variant="ghost"
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              onPress={() => update({ doseTimes: [...draft.doseTimes, nextDefaultTime(draft.doseTimes)] })}
            />
          )}
          <FieldNote error={errors.doseTimes} />
        </View>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <AppText variant="subheading">Reminders</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Notify me at each dose time.
            </AppText>
          </View>
          <Switch
            value={draft.remindersEnabled}
            onValueChange={(remindersEnabled) => update({ remindersEnabled })}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Reminders"
          />
        </View>
      </Card>

      <Card>
        <TextField
          label="Notes (optional)"
          placeholder="e.g. Take with food"
          value={draft.notes ?? ''}
          onChangeText={(notes) => update({ notes })}
          maxLength={LIMITS.notesMaxLength}
          multiline
          error={errors.notes}
        />
      </Card>

      {hasErrors && (
        <AppText color={colors.danger} accessibilityLiveRegion="polite">
          Fix the highlighted fields to continue.
        </AppText>
      )}
      <Button label={submitLabel} onPress={handleSubmit} fullWidth />
      {onDelete && <Button label="Delete medication" variant="danger" onPress={onDelete} fullWidth />}

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />
    </Screen>
  );
}

const SUGGESTED_TIMES = ['08:00', '12:00', '18:00', '21:00'];

function nextDefaultTime(existing: string[]): string {
  return SUGGESTED_TIMES.find((t) => !existing.includes(t)) ?? '12:00';
}

function ScanBanner({ outcome }: { outcome: ScanOutcome }) {
  const found = outcome.found;
  return (
    <View
      style={[styles.banner, { backgroundColor: found ? colors.successSoft : colors.warningSoft }]}
      accessibilityLiveRegion="polite">
      <Icon
        name={
          found
            ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
            : { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }
        }
        color={found ? colors.success : colors.warning}
      />
      <AppText style={styles.flex} color={colors.text}>
        {found
          ? `Filled in ${outcome.name} from barcode ${outcome.code}. Check the details and set a schedule before saving.`
          : `Barcode ${outcome.code} isn't in the demo list. Enter the details manually.`}
      </AppText>
    </View>
  );
}

function FieldNote({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return (
      <AppText variant="caption" color={colors.danger}>
        {error}
      </AppText>
    );
  }
  if (!hint) return null;
  return (
    <AppText variant="caption" color={colors.textSubtle}>
      {hint}
    </AppText>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      <StepButton icon="minus" disabled={value <= min} onPress={() => onChange(value - 1)} label="Fewer pills" />
      <AppText variant="heading" style={styles.stepValue} accessibilityLabel={`${value} pills per dose`}>
        {value}
      </AppText>
      <StepButton icon="plus" disabled={value >= max} onPress={() => onChange(value + 1)} label="More pills" />
    </View>
  );
}

function StepButton({
  icon,
  disabled,
  onPress,
  label,
}: {
  icon: 'plus' | 'minus';
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.stepButton, pressed && styles.stepPressed, disabled && styles.disabled]}>
      <Icon
        name={icon === 'plus' ? { ios: 'plus', android: 'add', web: 'add' } : { ios: 'minus', android: 'remove', web: 'remove' }}
        color={colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPressed: {
    backgroundColor: colors.primarySoft,
  },
  stepValue: {
    minWidth: 40,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
