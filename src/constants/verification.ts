/**
 * Measured compartment weight may differ from the expected weight by up to this many grams
 * and still pass. Sent to the backend with every verification request.
 */
export const WEIGHT_TOLERANCE_GRAMS = 0.06;

/**
 * Backend contract (not final; the backend URL is configured separately):
 *
 *   POST {backendUrl}/verify
 *   Content-Type: application/json
 *   Body:     VerificationRequest   (see @/types/verification)
 *   Response: VerificationResponse  (200) — detected counts, measured weight, status, summary
 *
 * The backend runs the camera and load-cell checks and decides the status. The app only
 * displays the result; it does not run its own competing verification.
 */
export const VERIFY_ENDPOINT = '/verify';
