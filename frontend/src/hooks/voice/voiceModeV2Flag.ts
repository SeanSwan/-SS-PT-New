/**
 * voiceModeV2Flag.ts — S10 feature gate for the Jarvis voice loop
 * (JARVIS blueprint §6.6). Ships DARK: with the flag OFF the pre-S6 mic
 * path (dictation strip) is fully wired and untouched — never half-cutover.
 * Flip via VITE_ENABLE_VOICE_MODE_V2=true. Gate to flip: 10 real dictations
 * on Sean's iPhone, ≥85% exercises correct pre-edit, 0 auto-commits.
 */
export const isVoiceModeV2Enabled = (): boolean => {
  try {
    return String(import.meta.env?.VITE_ENABLE_VOICE_MODE_V2 ?? '').toLowerCase() === 'true';
  } catch {
    return false;
  }
};
