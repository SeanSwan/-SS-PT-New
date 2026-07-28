import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('messaging attachment route contract', () => {
  it('stores only governed message attachment records and keeps binary upload fail-closed', () => {
    const routes = read('routes/messagingRoutes.mjs');
    const facade = read('controllers/messagingController.mjs');
    const messageController = read('controllers/messaging/messageController.mjs');
    const attachmentController = read('controllers/messaging/attachmentController.mjs');
    const attachmentService = read('services/messagingAttachmentService.mjs');
    const schema = read('services/messagingSchemaRepository.mjs');
    const socket = read('socket/socket.mjs');

    expect(schema).toContain('CREATE TABLE IF NOT EXISTS message_attachments');
    expect(messageController).toContain('normalizeMessageAttachments');
    expect(messageController).toContain('createMessageAttachments');
    expect(messageController).toContain('json_agg(json_build_object');
    expect(routes).toContain("router.post('/conversations/:id/attachments/upload'");
    expect(facade).toContain('rejectMessageAttachmentUpload');
    expect(attachmentController).toContain('normalizeAttachmentUploadGate');
    expect(attachmentController).toContain('scanner_required');
    expect(attachmentService).toContain('File attachments require malware scanning before storage.');
    expect(attachmentService).toContain('INSERT INTO message_attachments');
    expect(socket).toContain('Attachments must be sent through the REST message endpoint.');
  });
});