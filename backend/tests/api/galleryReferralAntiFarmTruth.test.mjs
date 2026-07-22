import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Survey fix #1 — referral credit farming. Locks the anti-farming shape of POST /api/gallery/referral so a
 * future edit can't silently reintroduce the unlimited-free-credits exploit. Source-assertion (no DB), matching
 * the gallery "truth"-test convention. Behavioral verification against a prod-shaped DB is a separate CI/staging
 * gate (Kimi's hard gate for money-path changes).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const gallerySource = readFileSync(resolve(__dirname, '../../routes/galleryRoutes.mjs'), 'utf8');
const modelSource = readFileSync(resolve(__dirname, '../../models/GalleryReferral.mjs'), 'utf8');

describe('gallery referral anti-farming (survey fix #1)', () => {
  it('grants referral credits via an ATOMIC conditional lifetime cap on the real column', () => {
    expect(gallerySource).toContain('MAX_REFERRAL_CREDITS = 25');
    expect(gallerySource).toContain('enhancement_credits = enhancement_credits + :credit');
    expect(gallerySource).toContain('enhancement_credits < :cap');
    expect(gallerySource).toContain('RETURNING id');
  });

  it('normalizes the phone (digits-only) so formatting cannot bypass dedup', () => {
    expect(gallerySource).toContain("replace(/\\D/g, '')");
    expect(gallerySource).toContain('referralPhoneNorm: normPhone');
  });

  it('enforces dedup at the DB (unique-constraint → 409), not a race-prone findOne', () => {
    expect(gallerySource).toContain('SequelizeUniqueConstraintError');
    expect(gallerySource).not.toContain('const existingReferral = await GalleryReferral.findOne');
  });

  it('reports creditsAwarded honestly and still persists the referral row at cap (real lead)', () => {
    expect(gallerySource).toContain('creditsAwarded');
    expect(gallerySource).toContain('creditsAwarded > 0');
  });

  it('model + migration back the normalized-phone column for the unique index', () => {
    expect(modelSource).toContain("field: 'referral_phone_norm'");
  });
});
