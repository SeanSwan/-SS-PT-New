import { describe, expect, it } from 'vitest';
import { useCoachSessionDraft } from './useCoachSessionDraft';

describe('useCoachSessionDraft', () => {
  it('exports the shell-owned hook boundary', () => {
    expect(typeof useCoachSessionDraft).toBe('function');
    expect(useCoachSessionDraft.name).toBe('useCoachSessionDraft');
  });
});
