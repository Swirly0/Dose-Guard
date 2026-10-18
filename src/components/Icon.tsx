import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

export type IconName = SymbolViewProps['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = 20, color = colors.text }: Props) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}
