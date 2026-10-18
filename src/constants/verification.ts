/**
 * Measured compartment weight may differ from the expected weight by up to this many grams
 * and still pass. Sent to the backend with every verification request.
 */
export const WEIGHT_TOLERANCE_GRAMS = 0.06;

/**
 * Backend contract. The laptop URL is stored in Settings.
 *
 *   GET  {backendUrl}/status
 *   POST {backendUrl}/verify      body: VerificationRequest
 *   POST {backendUrl}/scale/tare  body optional: { dayOfWeek?: 1-7 }
 *   POST {backendUrl}/leds        body: { dayOfWeek: 1-7 | null, mode, durationMs }
 *
 * The backend runs the camera and load-cell checks and decides the status. The app only
 * displays the result; it does not run its own competing verification.
 */
export const VERIFY_ENDPOINT = '/verify';
