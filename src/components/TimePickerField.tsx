import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing, touchTarget } from '@/theme';
import { dateToTime, formatTime, timeToDate } from '@/utils/time';

type Props = {
  /** `HH:mm` */
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
};

export function TimePickerField({ value, onChange, accessibilityLabel }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosRow}>
        <DateTimePicker
          mode="time"
          display="compact"
          value={timeToDate(value)}
          onValueChange={(_event, date) => onChange(dateToTime(date))}
          accentColor={colors.primary}
          themeVariant="light"
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      mode: 'time',
      value: timeToDate(value),
      is24Hour: false,
      onValueChange: (_event, date) => onChange(dateToTime(date)),
    });

  return (
    <Pressable
      onPress={openAndroidPicker}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${formatTime(value)}`}
      accessibilityHint="Opens a time picker"
      style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
      <AppText variant="subheading">{formatTime(value)}</AppText>
      <Icon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iosRow: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
  },
  field: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
});
