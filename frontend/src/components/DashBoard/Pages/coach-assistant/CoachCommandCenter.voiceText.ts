/**
 * FILE: CoachCommandCenter.voiceText.ts
 * PURPOSE: Pure text rules for folding dictated speech into the command composer.
 *
 * WHY THIS REPLACED `capturedVoiceText`
 * ------------------------------------
 * The old rule was "if the composer already holds text, keep it and throw the
 * dictation away". That silently discarded whatever the coach had just said out
 * loud, and it could only happen when they had already typed something — the
 * least expected moment to lose input. Dictation now APPENDS, so a typed
 * half-command survives being finished by voice.
 */

/**
 * Append a dictated fragment to the composer.
 *
 * Whitespace-tolerant on both sides: recognition results arrive with
 * inconsistent leading and trailing spaces, and the composer may already end in
 * a newline the coach typed. Empty dictation is a no-op rather than a clear, so
 * a recogniser that heard nothing cannot wipe the field.
 */
export function appendDictatedText(current: string, dictated: string): string {
  const addition = dictated.trim();
  if (!addition) return current;
  const base = current.replace(/\s+$/, '');
  return base ? `${base} ${addition}` : addition;
}
