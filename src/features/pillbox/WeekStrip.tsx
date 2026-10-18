import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { statusStyles } from '@/components/StatusBadge';
import { dayLongName, dayShortName, type DayOfWeek } from '@/constants/weekdays';
import type { Compartment } from '@/features/pillbox/compartments';
import { openCompartment } from '@/features/pillbox/navigation';
import { colors, radius, spacing } from '@/theme';

type Props = {
  compartments: Compartment[];
  today: DayOfWeek;
};

/** Compact Monday–Sunday status row. Each tile opens that compartment. */
export function WeekStrip({ compartments, today }: Props) {
  return (
    <View style={styles.row}>
      {compartments.map((c) => {
        const s = statusStyles[c.status];
        const isToday = c.dayOfWeek === today;
        return (
          <Pressable
            key={c.dayOfWeek}
            onPress={() => openCompartment(c.dayOfWeek)}
            accessibilityRole="button"
            accessibilityLabel={`${dayLongName(c.dayOfWeek)}${isToday ? ', today' : ''}: ${s.label}`}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: s.background },
              isToday && styles.today,
              pressed && styles.pressed,
            ]}>
            <AppText variant="label" color={colors.text}>
              {dayShortName(c.dayOfWeek)}
            </AppText>
            <Icon name={s.icon} size={18} color={s.color} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tile: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  today: {
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
