/**
 * ============================================================================
 * FILE: todayTrainingFeatureFlag.ts
 * PURPOSE: Fail closed around the shared client Today-module rollout.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Normalizes the Vite build flag to one strict boolean.
 * HOW IT FITS IN THE APP: Both client Home hosts call it before choosing the
 * shared module or their preserved fallback. KEY DECISIONS: Only explicit true
 * enables rollout, so missing or malformed configuration rolls back safely.
 * NASM PROTOCOL CONTEXT: None; this controls presentation rollout only.
 */

/** Return true only for the explicit, case-insensitive build value `true`. */export const clientTodayTrainingModuleEnabled = (
  raw: unknown = import.meta.env.VITE_CLIENT_TODAY_TRAINING_MODULE,
): boolean => String(raw ?? '').trim().toLowerCase() === 'true';