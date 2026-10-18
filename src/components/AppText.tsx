import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
};

export function AppText({ variant = 'body', color = colors.text, style, ...rest }: Props) {
  return <Text style={[typography[variant], { color }, style]} {...rest} />;
}
