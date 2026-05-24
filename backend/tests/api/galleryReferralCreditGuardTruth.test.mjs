import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/galleryRoutes.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('gallery referral credit guard contract', () => {
  it('rate-limits referral submissions and prevents duplicate referral credit awards for the same visitor event phone', () => {
    expect(routeSource).toContain('const referralLimiter = rateLimit({');
    expect(routeSource).toContain("router.post('/referral', requireGalleryAccess, referralLimiter");
    expect(routeSource).toContain('const cleanReferralPhone = referralPhone.trim();');
    expect(routeSource).toContain('const existingReferral = await GalleryReferral.findOne({');
    expect(routeSource).toContain('visitorId, eventId, referralPhone: cleanReferralPhone');
    expect(routeSource).toContain('This referral has already been submitted for this event.');
    expect(routeSource).toContain('by: 5,');
  });
});
