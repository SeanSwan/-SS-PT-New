import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/galleryRoutes.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('gallery message notification contract', () => {
  it('notifies admins after the active gallery message route stores a visitor note', () => {
    expect(routeSource).toContain("router.post('/message', requireGalleryAccess, messageLimiter");
    expect(routeSource).toContain('const galleryMessage = await GalleryMessage.create({');
    expect(routeSource).toContain("title: 'Gallery Message Received'");
    expect(routeSource).toContain('galleryMessage.id');
    expect(routeSource).toContain('logger.warn(`Gallery message notification failed: ${notifErr.message}`)');
  });
});
