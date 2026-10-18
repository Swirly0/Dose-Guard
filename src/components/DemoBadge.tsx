import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme';

type Props = {
  label?: string;
};

export function DemoBadge({ label = 'Demo data' }: Props) {
  return (
    <View style={styles.badge} accessible accessibilityLabel={label}>
      <Icon name={{ ios: 'flask.fill', android: 'science', web: 'science' }} size={14} color={colors.demo} />
      <AppText variant="label" color={colors.demo}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.demoSoft,
  },
});
