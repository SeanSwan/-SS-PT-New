import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/galleryRoutes.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('gallery referral credit guard contract', () => {
  it('rate-limits referral submissions and prevents duplicate referral credit awards for the same visitor event phone', () => {
    expect(routeSource).toContain('const referralLimiter = rateLimit({');
    expect(routeSource).toContain("router.post('/referral', requireGalleryAccess, referralLimiter");
    expect(routeSource).toContain('const cleanReferralPhone = referralPhone.trim();');
    // Dedup is a DB partial-unique index over (visitor, event, normalised phone):
    // the create carries the normalised phone, and a duplicate surfaces as a
    // unique-constraint error mapped to 409. Strictly stronger than the old
    // read-then-write findOne (no concurrent double-credit race).
    expect(routeSource).toContain('const normPhone = cleanReferralPhone.replace(/\\D/g, ');
    expect(routeSource).toContain('referralPhoneNorm: normPhone,');
    expect(routeSource).toContain("e?.name === 'SequelizeUniqueConstraintError'");
    expect(routeSource).toContain('This referral has already been submitted for this event.');
    // Credit grant is an atomic, lifetime-capped conditional UPDATE.
    expect(routeSource).toContain('const REFERRAL_CREDIT = 5;');
    expect(routeSource).toContain('const MAX_REFERRAL_CREDITS = 25;');
    expect(routeSource).toContain('enhancement_credits < :cap');
  });
});
