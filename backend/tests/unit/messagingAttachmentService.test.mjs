import { describe, expect, it } from 'vitest';

import {
  normalizeMessageAttachments,
  normalizeAttachmentUploadGate,
} from '../../services/messagingAttachmentService.mjs';

describe('messagingAttachmentService', () => {
  it('allows structured in-app card and link attachments only', () => {
    const normalized = normalizeMessageAttachments([
      { kind: 'workout_card', title: 'Upper body plan', entityType: 'workout', entityId: 42 },
      { kind: 'session_card', title: 'Saturday training', entityType: 'session', entityId: '77' },
      { kind: 'nutrition_card', title: 'Protein target', entityType: 'nutrition', entityId: 9 },
      { kind: 'link', title: 'Open progress', url: '/dashboard/client/progress' },
    ]);

    expect(normalized.error).toBeNull();
    expect(normalized.attachments).toHaveLength(4);
    expect(normalized.attachments[0]).toMatchObject({ kind: 'workout_card', scanStatus: 'not_required' });
    expect(normalized.attachments[3]).toMatchObject({ kind: 'link', url: '/dashboard/client/progress' });
  });

  it('rejects binary attachment metadata until malware scanning exists', () => {
    expect(normalizeMessageAttachments([{ kind: 'image', title: 'Photo', url: '/uploads/x.jpg' }]).error)
      .toBe('File attachments require malware scanning before storage.');
    expect(normalizeMessageAttachments([{ kind: 'link', title: 'External', url: 'https://evil.example/file' }]).error)
      .toBe('Attachment links must be internal app paths.');
    expect(normalizeAttachmentUploadGate().allowed).toBe(false);
    expect(normalizeAttachmentUploadGate().reason).toBe('scanner_required');
  });
});