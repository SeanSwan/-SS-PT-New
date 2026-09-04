/**
 * FILE: coachInputOrigin.ts
 * PURPOSE: Keep Swan Coach command provenance attached to the draft until submit.
 *
 * Voice is a safety boundary, not a visual hint. A dictated draft that is edited
 * by hand becomes mixed, and mixed/unknown provenance maps to the fail-closed
 * command mode so an identity-crossing write cannot inherit the safe text path.
 */

export type CoachInputOrigin = 'text' | 'voice' | 'ui' | 'mixed' | 'unknown';
export type CoachCommandInputMode = 'text' | 'voice' | 'ui';

export function mergeTypedDraftOrigin(
  origin: CoachInputOrigin,
  previousText: string,
  nextText: string,
): CoachInputOrigin {
  if (!nextText.trim()) return 'unknown';
  if (origin === 'voice' && previousText !== nextText) return 'mixed';
  if (origin === 'mixed') return 'mixed';
  if (origin === 'ui') return 'ui';
  return 'text';
}

export function mergeVoiceCaptureOrigin(
  origin: CoachInputOrigin,
  currentText: string,
  capturedText: string,
): CoachInputOrigin {
  if (!capturedText.trim()) return origin;
  if (currentText.trim()) return 'mixed';
  return 'voice';
}

/** Map the richer UI state to the server's allowlisted command mode. */
export function commandInputMode(origin: CoachInputOrigin): CoachCommandInputMode {
  if (origin === 'text') return 'text';
  if (origin === 'ui') return 'ui';
  // Mixed and unknown are intentionally treated like voice by the server policy.
  return 'voice';
}
