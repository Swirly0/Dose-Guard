import type { TextStyle } from 'react-native';

export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',

  text: '#111827',
  textMuted: '#4B5563',
  textSubtle: '#6B7280',
  textOnPrimary: '#FFFFFF',

  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#EFF6FF',

  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  neutral: '#4B5563',
  neutralSoft: '#F3F4F6',
  demo: '#6D28D9',
  demoSoft: '#EDE9FE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subheading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Minimum height for anything tappable. */
export const touchTarget = 48;
