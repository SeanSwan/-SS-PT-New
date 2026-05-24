import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/galleryRoutes.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('gallery referral notification contract', () => {
  it('notifies admins when a guarded gallery referral is accepted', () => {
    expect(routeSource).toContain("title: 'Gallery Referral Received'");
    expect(routeSource).toContain('referral.id');
    expect(routeSource).toContain('cleanReferralName');
    expect(routeSource).toContain('logger.warn(`Gallery referral notification failed: ${notifErr.message}`)');
  });
});
