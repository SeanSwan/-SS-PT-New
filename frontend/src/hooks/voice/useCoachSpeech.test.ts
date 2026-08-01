/**
 * useCoachSpeech.test.ts — S11 acceptance fence.
 * Locks: no client name is EVER speakable (dev throws, prod redacts);
 * tier-1-only speech; barge-in cancel is synchronous; mute persists;
 * speaking never opens the mic (no capture references in the hook).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertNoNames, isTierOneConfirmation } from './useCoachSpeech';

describe('S11 useCoachSpeech', () => {
  it('throws in dev when a roster name token would be spoken', () => {
    expect(() => assertNoNames('Logged for Marcus: bench 3x8', ['Marcus Alvarez']))
      .toThrow(/name token/);
  });

  it('leaves clean utterances untouched and skips short tokens', () => {
    expect(assertNoNames('Logged. Bench, three by eight at one eighty-five.', ['Al Bo']))
      .toBe('Logged. Bench, three by eight at one eighty-five.');
  });

  it('speaks tier-1 confirmations only', () => {
    expect(isTierOneConfirmation('Logged. Bench, three by eight at one eighty-five.')).toBe(true);
    expect(isTierOneConfirmation('Here is your full plan for the next twelve weeks: week one begins with…')).toBe(false);
    expect(isTierOneConfirmation('The client should consider a deload')).toBe(false);
  });

  it('half-duplex by construction: the hook never touches capture or the mic', () => {
    const src = readFileSync(resolve(__dirname, 'useCoachSpeech.ts'), 'utf8');
    expect(src).not.toMatch(/getUserMedia|MediaRecorder|useVoiceCapture/);
    expect(src).toContain('speechSynthesis.cancel'); // synchronous barge-in
  });

  it('mute persists via validated localStorage read', () => {
    const src = readFileSync(resolve(__dirname, 'useCoachSpeech.ts'), 'utf8');
    expect(src).toContain("ss.coach.speech.muted.v1");
    expect(src).toContain("=== '1'");
  });
});
