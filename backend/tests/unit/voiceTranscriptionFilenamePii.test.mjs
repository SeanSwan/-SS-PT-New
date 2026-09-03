/**
 * RULE 8 regression: an upload filename is USER-SUPPLIED and routinely carries
 * client PII — a trainer uploads "sarah-jones-knee-injury.m4a" and that name,
 * plus a medical hint, used to land in production logs from two places
 * (voiceTranscriptionService's completion log and aiChatRoutes' request log).
 *
 * getFileExt is the fix, and the first version of it was WRONG in exactly the
 * way that matters: `'sarah'.split('.').pop()` returns `'sarah'`, which passed
 * the extension regex and echoed the identifier straight back. So the cases
 * below are weighted toward PII-SHAPED input, not toward happy-path extensions.
 */
import { describe, it, expect } from 'vitest';
import { getFileExt } from '../../services/voiceTranscriptionService.mjs';

describe('getFileExt — filename PII must never reach a log line', () => {
  it('returns the extension for ordinary uploads', () => {
    expect(getFileExt('recording.m4a')).toBe('m4a');
    expect(getFileExt('file.MP3')).toBe('mp3');
    expect(getFileExt('session.2026.wav')).toBe('wav');
    expect(getFileExt('/tmp/a/b/clip.webm')).toBe('webm');
  });

  it('never echoes a dotless filename — the bug the first version had', () => {
    // Each of these is a plausible client identifier with no extension.
    for (const name of ['sarah', 'noext', 'sarah-jones-knee-injury', 'JohnDoe']) {
      const out = getFileExt(name);
      expect(out).toBe('unknown');
      expect(out).not.toContain(name.slice(0, 4));
    }
  });

  it('never echoes a DOTFILE name — the second bug, found after the first fix', () => {
    // ".sarah" has a leading dot and no basename. Requiring only that a dot
    // exists returned "sarah" — the identifier, straight into the log.
    for (const name of ['.sarah', '.johndoe', '.hidden']) {
      expect(getFileExt(name)).toBe('unknown');
    }
  });

  it('never echoes anything that is not a short alphanumeric extension', () => {
    expect(getFileExt('weird.na me')).toBe('unknown');
    expect(getFileExt(`x.${'a'.repeat(20)}`)).toBe('unknown');
    expect(getFileExt('report.sarah-jones')).toBe('unknown');
    expect(getFileExt('a.m4a;rm -rf /')).toBe('unknown');
  });

  it('survives absent or non-string input without throwing', () => {
    expect(getFileExt('')).toBe('unknown');
    expect(getFileExt(null)).toBe('unknown');
    expect(getFileExt(undefined)).toBe('unknown');
    expect(getFileExt(12345)).toBe('unknown');
  });

  it('bounds its own output — a log field cannot be made arbitrarily long', () => {
    for (const probe of ['sarah', `x.${'a'.repeat(500)}`, 'a.'.repeat(200)]) {
      expect(getFileExt(probe).length).toBeLessThanOrEqual(8);
    }
  });
});
