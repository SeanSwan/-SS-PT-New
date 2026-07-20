/**
 * FUSION F1 — /api/appearance/profile contract tests
 * (BLUEPRINT-lens-world-fusion 03-contracts §3, as corrected in review:
 * motionMode is auto|reduced|off, profileSchemaVersion is NUMBER 1).
 * Server validation must mirror frontend core/style-lens-os/validation.ts
 * EXACTLY — a value the client persists can never be rejected by the server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

vi.mock('../../models/UserAppearanceProfile.mjs', () => ({
  default: { findOne: vi.fn(), upsert: vi.fn() },
}));

const { validateAppearanceProfilePayload, getAppearanceProfile, putAppearanceProfile } =
  await import('../../controllers/appearanceProfileController.mjs');
const UserAppearanceProfile = (await import('../../models/UserAppearanceProfile.mjs')).default;

const VALID_PROFILE = {
  profileSchemaVersion: 1,
  paletteThemeId: 'crystalline-dark',
  styleLensId: 'candy-glass-arcade',
  motionMode: 'reduced',
  density: 'comfortable',
  updatedAt: '2026-07-16T00:00:00.000Z',
};

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
};

describe('validateAppearanceProfilePayload (mirrors client validation.ts)', () => {
  it('accepts every value the client can actually persist (the drift-trap)', () => {
    expect(validateAppearanceProfilePayload(VALID_PROFILE)).toEqual([]);
    expect(validateAppearanceProfilePayload({ ...VALID_PROFILE, motionMode: 'auto' })).toEqual([]);
    expect(validateAppearanceProfilePayload({ ...VALID_PROFILE, motionMode: 'off' })).toEqual([]);
    expect(validateAppearanceProfilePayload({ ...VALID_PROFILE, density: 'compact' })).toEqual([]);
  });

  it('rejects the invented enum, string schema version, and malformed fields', () => {
    const issues = (profile) => validateAppearanceProfilePayload(profile).map(({ path }) => path);
    expect(issues({ ...VALID_PROFILE, motionMode: 'lean' })).toContain('motionMode');
    expect(issues({ ...VALID_PROFILE, motionMode: 'still' })).toContain('motionMode');
    expect(issues({ ...VALID_PROFILE, profileSchemaVersion: '1' })).toContain('profileSchemaVersion');
    expect(issues({ ...VALID_PROFILE, paletteThemeId: 'galaxy-swan' })).toContain('paletteThemeId');
    expect(issues({ ...VALID_PROFILE, styleLensId: 'Bad Id!' })).toContain('styleLensId');
    expect(issues({ ...VALID_PROFILE, density: 'cozy' })).toContain('density');
    expect(issues({ ...VALID_PROFILE, updatedAt: 'not-a-date' })).toContain('updatedAt');
    expect(issues(null)).toContain('profile');
  });
});

describe('GET /api/appearance/profile (controller)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('first visit is NOT an error: no row -> 200 with nulls', async () => {
    UserAppearanceProfile.findOne.mockResolvedValue(null);
    const res = mockRes();
    await getAppearanceProfile({ user: { id: 42 } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, profile: null, overlay: null, updatedAt: null });
    expect(UserAppearanceProfile.findOne).toHaveBeenCalledWith({ where: { userId: 42 } });
  });

  it('returns the stored row scoped to the AUTH user only', async () => {
    UserAppearanceProfile.findOne.mockResolvedValue({
      profile: VALID_PROFILE, overlay: null, updatedAt: new Date('2026-07-16T01:00:00Z'),
    });
    const res = mockRes();
    await getAppearanceProfile({ user: { id: 7 } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile).toEqual(VALID_PROFILE);
  });
});

describe('PUT /api/appearance/profile (controller)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valid profile upserts under the auth userId and echoes the row', async () => {
    UserAppearanceProfile.upsert.mockResolvedValue([
      { profile: VALID_PROFILE, overlay: null, updatedAt: new Date('2026-07-16T02:00:00Z') },
    ]);
    const res = mockRes();
    await putAppearanceProfile({ user: { id: 42 }, body: { profile: VALID_PROFILE } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(UserAppearanceProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, profile: VALID_PROFILE, overlay: null }),
      expect.anything(),
    );
  });

  it('invalid profile -> 422 INVALID_PROFILE with details; nothing written', async () => {
    const res = mockRes();
    await putAppearanceProfile(
      { user: { id: 42 }, body: { profile: { ...VALID_PROFILE, motionMode: 'lean' } } },
      res,
    );
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual(
      expect.objectContaining({ success: false, error: 'INVALID_PROFILE' }),
    );
    expect(UserAppearanceProfile.upsert).not.toHaveBeenCalled();
  });

  it('F1 scope: non-null overlay is rejected fail-closed (F4 replaces this with real validation)', async () => {
    const res = mockRes();
    await putAppearanceProfile(
      { user: { id: 42 }, body: { profile: VALID_PROFILE, overlay: { accent: 'ice-wing' } } },
      res,
    );
    expect(res.statusCode).toBe(422);
    expect(res.body.error).toBe('UNSUPPORTED_OVERLAY');
    expect(UserAppearanceProfile.upsert).not.toHaveBeenCalled();
  });
});

describe('route + mount source contract (own-user-only by construction)', () => {
  const read = (relative) => readFileSync(resolve(__dirname, relative), 'utf8');

  it('the route derives identity from auth ONLY — no userId params exist', () => {
    const route = read('../../routes/appearanceProfileRoutes.mjs');
    expect(route).toContain("import { protect }");
    expect(route).not.toMatch(/req\.params\.userId|req\.query\.userId/);
    expect(route).not.toMatch(/:userId/);
  });

  it('mounts at /api/appearance in the route index', () => {
    const index = read('../../core/routes.mjs');
    expect(index).toMatch(/app\.use\('\/api\/appearance', appearanceProfileRoutes\)/);
  });
});
