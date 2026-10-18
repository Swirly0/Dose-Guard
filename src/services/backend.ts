import { VERIFY_ENDPOINT, WEIGHT_TOLERANCE_GRAMS } from '@/constants/verification';
import type { DayOfWeek } from '@/constants/weekdays';
import type {
  PillCounts,
  VerificationRequest,
  VerificationResponse,
  VerificationResult,
} from '@/types/verification';

export const STATUS_TIMEOUT_MS = 8_000;
export const VERIFY_TIMEOUT_MS = 90_000;

export type BackendStatus = {
  backend: string;
  camera: { index: number; open: boolean; error: string | null };
  scale: {
    connected: boolean;
    port: string | null;
    weightsGrams: (number | null)[] | null;
    error: string | null;
  };
  model: { configured: boolean };
};

export type LedMode = 'ON' | 'OFF' | 'BLINK' | 'FAST';

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

/** Trims whitespace and trailing slashes. Empty input stays empty. */
export function normalizeBackendUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

export function validateBackendUrl(raw: string): string | null {
  const url = normalizeBackendUrl(raw);
  if (!url) return 'Enter the URL printed when you start the backend.';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL must start with http:// or https://';
    }
  } catch {
    return 'Enter a valid URL, like http://192.168.1.10:8000';
  }
  return null;
}

export function toStoredResult(response: VerificationResponse): VerificationResult {
  return { ...response, isDemo: false };
}

export async function fetchStatus(baseUrl: string): Promise<BackendStatus> {
  return requestJson<BackendStatus>(baseUrl, '/status', { method: 'GET' }, STATUS_TIMEOUT_MS);
}

export async function verifyCompartment(
  baseUrl: string,
  body: VerificationRequest,
): Promise<VerificationResponse> {
  return requestJson<VerificationResponse>(
    baseUrl,
    VERIFY_ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    VERIFY_TIMEOUT_MS,
  );
}

export function buildVerifyRequest(
  dayOfWeek: DayOfWeek,
  expectedCounts: PillCounts,
  expectedWeightGrams: number,
): VerificationRequest {
  return {
    dayOfWeek,
    expectedCounts,
    expectedWeightGrams,
    weightToleranceGrams: WEIGHT_TOLERANCE_GRAMS,
  };
}

export async function tareScale(baseUrl: string, dayOfWeek?: DayOfWeek): Promise<void> {
  await requestJson(
    baseUrl,
    '/scale/tare',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dayOfWeek === undefined ? {} : { dayOfWeek }),
    },
    STATUS_TIMEOUT_MS,
  );
}

export async function setLeds(
  baseUrl: string,
  dayOfWeek: DayOfWeek | null,
  mode: LedMode,
  durationMs = 0,
): Promise<void> {
  await requestJson(
    baseUrl,
    '/leds',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayOfWeek, mode, durationMs }),
    },
    STATUS_TIMEOUT_MS,
  );
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const url = `${normalizeBackendUrl(baseUrl)}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw new BackendError('The backend did not respond in time.');
    }
    throw new BackendError(
      'Could not reach the backend. Check the URL in Settings and that the laptop is on the same Wi-Fi.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new BackendError(await readError(response), response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)))
        .join(' ');
    }
  } catch {
    // Fall through to the status-code message.
  }
  if (response.status === 409) return 'Another verification is already running.';
  return `Backend returned ${response.status}.`;
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}
