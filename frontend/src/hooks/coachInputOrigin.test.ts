import { describe, expect, it } from 'vitest';
import {
  commandInputMode,
  mergeTypedDraftOrigin,
  mergeVoiceCaptureOrigin,
  type CoachInputOrigin,
} from './coachInputOrigin';

describe('coach input provenance', () => {
  it('treats a fresh dictated draft as voice', () => {
    expect(mergeVoiceCaptureOrigin('unknown', '', 'log squats')).toBe('voice');
  });

  it('marks typed edits to dictated text as mixed', () => {
    expect(mergeTypedDraftOrigin('voice', 'log squats', 'log squats today')).toBe('mixed');
  });

  it('resets provenance when the draft is cleared', () => {
    expect(mergeTypedDraftOrigin('voice', 'log squats', '')).toBe('unknown');
    expect(mergeTypedDraftOrigin('mixed', 'log squats today', '')).toBe('unknown');
  });

  it('keeps mixed and unknown channels fail-closed at the command boundary', () => {
    const origins: CoachInputOrigin[] = ['mixed', 'unknown'];
    for (const origin of origins) expect(commandInputMode(origin)).toBe('voice');
  });

  it('preserves an explicit UI channel', () => {
    expect(commandInputMode('ui')).toBe('ui');
    expect(commandInputMode('text')).toBe('text');
  });
});
