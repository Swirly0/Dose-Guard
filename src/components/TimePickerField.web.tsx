import { TextField } from '@/components/TextField';

type Props = {
  /** `HH:mm` */
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
};

export function TimePickerField({ value, onChange, accessibilityLabel }: Props) {
  return (
    <TextField
      value={value}
      onChangeText={onChange}
      placeholder="HH:mm"
      maxLength={5}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
