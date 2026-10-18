import { router } from 'expo-router';

import { ALL_DAYS, type DayOfWeek } from '@/constants/weekdays';

export function openCompartment(day: DayOfWeek) {
  router.push({ pathname: '/pillbox/[day]', params: { day: String(day) } });
}

export function startVerification(day: DayOfWeek) {
  router.push({ pathname: '/verify/[day]', params: { day: String(day) } });
}

/** Opens the "choose a compartment" step of the verification flow. */
export function chooseCompartmentToVerify() {
  router.push('/verify');
}

/** Checks Sunday through Saturday in one pass. */
export function startVerifyAll() {
  router.push('/verify/all');
}

/** Parses a `day` route param into a weekday, or null if invalid. */
export function parseDayParam(value: string | string[] | undefined): DayOfWeek | null {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return ALL_DAYS.find((d) => d === n) ?? null;
}
