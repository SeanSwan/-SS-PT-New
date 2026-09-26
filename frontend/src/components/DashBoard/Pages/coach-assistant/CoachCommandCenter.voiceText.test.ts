import { describe, expect, it } from 'vitest';
import { appendDictatedText } from './CoachCommandCenter.voiceText';

/**
 * `appendDictatedText` replaced `capturedVoiceText`, whose rule was "if the
 * composer already holds text, keep it and throw the dictation away". That
 * silently discarded words the coach had just spoken, and only ever when they
 * had already typed something.
 */
describe('appendDictatedText', () => {
  it('sets the field when it was empty', () => {
    expect(appendDictatedText('', 'Log squats 3 by 10')).toBe('Log squats 3 by 10');
  });

  it('keeps typed text and appends the dictation after it', () => {
    expect(appendDictatedText('bench press', '225 for 5')).toBe('bench press 225 for 5');
  });

  it('never loses the typed text when dictation arrives', () => {
    const typed = 'ask Jesse about his knee';

    expect(appendDictatedText(typed, 'and his shoulder')).toContain(typed);
  });

  it('trims the fragment and collapses the seam to one space', () => {
    expect(appendDictatedText('bench press', '  225 for 5  ')).toBe('bench press 225 for 5');
  });

  it('does not double the space when the composer ends in whitespace', () => {
    expect(appendDictatedText('bench press\n', '225 for 5')).toBe('bench press 225 for 5');
    expect(appendDictatedText('bench press  ', '225 for 5')).toBe('bench press 225 for 5');
  });

  it('is a no-op for empty or whitespace-only dictation', () => {
    expect(appendDictatedText('bench press', '')).toBe('bench press');
    expect(appendDictatedText('bench press', '   ')).toBe('bench press');
    // A recogniser that heard nothing must not wipe the field.
    expect(appendDictatedText('bench press', '\n\t')).toBe('bench press');
  });

  it('returns empty for empty input on both sides', () => {
    expect(appendDictatedText('', '')).toBe('');
  });
});
