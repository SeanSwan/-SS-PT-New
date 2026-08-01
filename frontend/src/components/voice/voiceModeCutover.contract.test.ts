/**
 * voiceModeCutover.contract.test.ts — S10 acceptance fence.
 * Locks: ONE mic — flag ON routes the ActionBar mic to the Jarvis overlay
 * and the legacy dictation strip cannot mount; flag OFF leaves the pre-S6
 * path fully wired (no half-cutover); the flag defaults OFF; voice widens
 * input never authority (the container only appends local rows — the save
 * path and its Cortex gates are untouched).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');
const logger = read('../WorkoutLogger/WorkoutLogger.tsx');
const container = read('JarvisVoiceMode.tsx');
const flag = read('../../hooks/voice/voiceModeV2Flag.ts');

describe('S10 one-mic cutover', () => {
  it('flag defaults OFF and gates every new mount', () => {
    expect(flag).toContain('VITE_ENABLE_VOICE_MODE_V2');
    expect(flag).toContain('return false');
    expect(logger).toContain('voiceModeV2 && jarvis.jarvisOpen');
  });

  it('ONE mic: the ActionBar mic is the only voice entry point under the flag', () => {
    // Strip cannot mount when the flag is on…
    expect(logger).toContain('canUseDictation && !voiceModeV2 && <LoggerDictationStrip');
    // …the legacy dictation engine is disabled at the hook level…
    expect(logger).toContain('enabled: canUseDictation && !voiceModeV2');
    // …and the same ActionBar button becomes the overlay trigger.
    expect(logger).toContain('onToggleDictation={voiceModeV2 ? jarvis.toggleJarvis : dictation.toggle}');
  });

  it('flag OFF keeps the pre-S6 path fully wired — no half-cutover', () => {
    expect(logger).toContain('dictation.toggle');
    expect(logger).toContain('<LoggerDictationStrip');
  });

  it('voice widens input, never authority: the container appends rows only', () => {
    // No direct save, no workout-forms post, no gate bypass in the container.
    const containerCode = container.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(containerCode).not.toMatch(/workout-forms|handleSubmit|axios\.|fetch\(/);
    expect(container).toContain('onCommitRows');
    // Commit path in the logger uses the SAME exercises state the manual path saves from.
    expect(read('../WorkoutLogger/useJarvisVoiceCutover.ts')).toContain('applyReviewedExerciseRows(rows)');
  });
});

describe('R10 hostile-loop fixes (final review)', () => {
  it('S11 talk-back is actually mounted: tier-1 confirmation on commit, barge-in + iOS unlock on hold', () => {
    expect(container).toContain('useCoachSpeech');
    expect(container).toContain('speech.speakConfirmation(`Logged.');
    expect(container).toContain('speech.cancelSpeech()');
    expect(container).toContain('speech.unlockOnGesture()');
  });

  it('unsupported browsers land in the honest failure state, never a raw crash', () => {
    expect(container).toContain('isVoiceCaptureSupported()');
    expect(container).toContain('cannot record audio — type instead');
  });

  it('a lock-stopped recording waits for the explicit Send-it confirm', () => {
    expect(container).toContain('capture.stoppedByLock && !lockSendConfirmed) return;');
    expect(container).toContain('Recording stopped when the screen locked — send it?');
    const overlay = read('VoiceModeOverlay/VoiceModeOverlay.tsx');
    expect(overlay).toContain('voice-lock-confirm');
  });

  it('keeps release armed while listening but blocks new holds during owned async phases', () => {
    expect(container).toContain('const holdControlDisabled');
    expect(container).toContain('lockPromptVisible');
    expect(container).toContain("loop.state !== 'listening'");
    expect(container).toContain('holdDisabled={holdControlDisabled}');
    expect(container).toContain('if (!canStartListening) return;');
  });
});
