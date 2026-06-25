import { describe, expect, it } from 'vitest';
import { itemMeta, statusLabel } from './CoachIntakeWorkspace.utils';

describe('CoachIntakeWorkspace utils', () => {
  it('keeps sparse queue status data from crashing the intake workspace', () => {
    expect(statusLabel(undefined)).toBe('Pending');
    expect(itemMeta({
      id: 'sparse-item',
      entityId: 'sparse-item',
      kind: 'coach_intake',
      source: 'audio_upload',
      clientId: null,
      needsClient: true,
    } as any)).toBe('Client needs confirmation - Pending');
  });
});
