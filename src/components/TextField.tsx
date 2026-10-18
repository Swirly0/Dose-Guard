import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing, touchTarget, typography } from '@/theme';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, style, multiline, ...rest }: Props) {
  return (
    <View style={styles.container}>
      {label && <AppText variant="label">{label}</AppText>}
      <TextInput
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={label}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, error && styles.inputError, style]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : (
        hint && (
          <AppText variant="caption" color={colors.textSubtle}>
            {hint}
          </AppText>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
});
