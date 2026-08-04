/**
 * WorkoutLoggerVoiceImport.contract.test.ts
 * ===========================================
 * Phase 3c.3 source locks: client voice logging is UN-GATED for self-mode.
 * - The shell renders the voice section for ANY numeric client context (the
 *   old `!isClientSelfMode` gate is gone).
 * - Self mode never passes the client's display name into the uploader
 *   (Rule 8 hygiene) and shows the privacy disclosure copy.
 * - Backend counterpart locked in backend/tests/api/workoutLogUploadSelfAccess.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const shell = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8');
const section = readFileSync(resolve(__dirname, './WorkoutLoggerVoiceImportSection.tsx'), 'utf8');

describe('client voice logging un-gate', () => {
  it('shell mounts the voice section without the self-mode exclusion', () => {
    expect(shell).toMatch(/<WorkoutLoggerVoiceImport/);
    expect(shell).not.toMatch(/!isClientSelfMode\s*&&\s*typeof effectiveClientId === 'number'\s*&&\s*\(\s*<WorkoutLoggerVoiceImport/);
    expect(shell).toMatch(/isSelfMode=\{isClientSelfMode\}/);
  });

  it('self mode drops the display name and shows the privacy disclosure', () => {
    expect(section).toMatch(/isSelfMode \? undefined : clientName/);
    // Rule 75 (Trailhead-Truth, fixed 2026-07-31): the old copy claimed names
    // were "removed before any AI processing" — false: raw AUDIO reaches the
    // transcription provider; redaction happens on the TRANSCRIPT before the
    // parse LLM. The disclosure must state the honest boundary and the old
    // overclaim must never return.
    expect(section).toMatch(/removed from the transcript before analysis/i);
    expect(section).not.toMatch(/before any AI processing/i);
    expect(section).toMatch(/review every parsed exercise/i);
  });
});
