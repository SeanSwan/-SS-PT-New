import { describe, expect, it } from 'vitest';
import { workspaceStatus } from './workspaceStatus';

describe('workspaceStatus (review #5: failures reach the screen)', () => {
  it('shows a note-save failure as a warning', () => {
    expect(workspaceStatus('Client note was not saved - your draft is still in the composer')).toEqual({
      text: 'Client note was not saved - your draft is still in the composer', tone: 'warn',
    });
  });

  it.each([
    'Voice input is not available in this browser',
    'Browser dictation failed - recorder fallback opened',
    'Wait for the current message to finish, then retry',
    'Client note is too long (5100/5000 characters)',
    'Choose a main client before capturing profile notes',
  ])('warns: %s', (status) => {
    expect(workspaceStatus(status)?.tone).toBe('warn');
  });

  it('shows a success quietly', () => {
    expect(workspaceStatus('Note saved to Client #12 - ready for the next note')?.tone).toBe('info');
  });

  it('CONTROL: the resting initial status shows nothing', () => {
    expect(workspaceStatus('No coach thread selected')).toBeNull();
    expect(workspaceStatus('')).toBeNull();
    expect(workspaceStatus(undefined)).toBeNull();
  });
});
