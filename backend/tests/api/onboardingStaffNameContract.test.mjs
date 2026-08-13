/**
 * ============================================================================
 * FILE: onboardingStaffNameContract.test.mjs
 * PURPOSE: Drive POST /api/onboarding with the payload the MOUNTED staff wizard
 *          actually sends, and prove it is accepted without corrupting names.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S2 · F1)
 * ============================================================================
 *
 * THE DEFECT THIS PINS
 * The admin route /client-onboarding mounts a 14-line wrapper that renders the
 * shared wizard with no `onSubmit`, so the wizard POSTs its raw formData to
 * /api/onboarding. That formData carries `firstName` and `lastName` — the only
 * name inputs the wizard has (components/BasicInfoSection.tsx:46,54). The
 * controller required `fullName`, which appears NOWHERE in the frontend
 * onboarding flow. Every staff onboarding submission returned 400.
 *
 * WHY THE EXISTING SUITE DID NOT CATCH IT
 * clientStaffOnboardingPersistence.test.mjs builds its fixture with
 * `fullName: 'Ava Stone'` — a shape the mounted UI cannot produce. It is green,
 * and the user journey it claims to cover is completely broken. A fixture that
 * documents the contract the server WANTS, rather than the payload the client
 * SENDS, cannot fail when the two disagree. That is the entire bug class.
 *
 * WHY JOINING THE NAMES IS NOT THE FIX
 * The controller splits fullName back apart on the way to User.create
 * (onboardingController.mjs:123-124, 183-184). Join-then-split is lossy:
 * {firstName:'Mary Jane', lastName:'Van Der Berg'} would round-trip to
 * {firstName:'Mary', lastName:'Jane Van Der Berg'}. The repair must PRESERVE the
 * split the wizard already collected, not reconstruct it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

/** Exactly what the mounted staff wizard sends: split names, no fullName. */
const mountedWizardPayload = (overrides = {}) => ({
  firstName: 'Ava',
  lastName: 'Stone',
  email: 'ava.stone@example.test',
  primaryGoal: 'Build strength',
  commitmentLevel: '8',
  currentWeight: '180',
  heightFeet: '5',
  heightInches: '10',
  gender: 'female',
  ...overrides,
});

async function loadController({ existingUser = null } = {}) {
  vi.resetModules();

  const createdUser = { id: 42, email: 'ava.stone@example.test', update: vi.fn().mockResolvedValue(undefined) };
  const mockUser = {
    findOne: vi.fn().mockResolvedValue(existingUser),
    create: vi.fn().mockResolvedValue(createdUser),
  };
  const mockQuestionnaire = {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 91 }),
  };

  vi.doMock('../../models/User.mjs', () => ({ default: mockUser }));
  vi.doMock('../../models/ClientOnboardingQuestionnaire.mjs', () => ({ default: mockQuestionnaire }));
  vi.doMock('../../database.mjs', () => ({ default: { query: vi.fn().mockResolvedValue([]) } }));
  vi.doMock('../../services/automationService.mjs', () => ({ triggerSequence: vi.fn().mockResolvedValue(undefined) }));
  vi.doMock('../../services/gamification/goalChallengeService.mjs', () => ({
    generateChallengesFromGoals: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('../../services/onboardingResetHandoffService.mjs', () => ({
    buildOnboardingResetLinkHandoff: vi.fn(async () => ({
      credentialAction: 'reset_link_sent',
      resetEmailSent: true,
    })),
  }));

  const mod = await import('../../controllers/onboardingController.mjs');
  return { createClientOnboarding: mod.createClientOnboarding, mockUser, createdUser };
}

const run = async (body, ctx = {}) => {
  const { createClientOnboarding, mockUser, createdUser } = await loadController(ctx);
  const res = makeRes();
  await createClientOnboarding({ user: { id: 7, role: 'admin' }, body }, res);
  return { res, mockUser, createdUser };
};

const statusOf = (res) => res.status.mock.calls.at(-1)?.[0];
const bodyOf = (res) => res.json.mock.calls.at(-1)?.[0];

describe('POST /api/onboarding — staff wizard name contract (F1)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts the payload the mounted wizard actually sends', async () => {
    const { res } = await run(mountedWizardPayload());

    // Before the fix this is 400 "Missing required fields: fullName, …" for
    // every staff onboarding ever attempted through the admin dashboard.
    expect(statusOf(res)).not.toBe(400);
  });

  it('preserves the split the wizard collected instead of round-tripping it', async () => {
    const { mockUser } = await run(
      mountedWizardPayload({ firstName: 'Mary Jane', lastName: 'Van Der Berg' }),
    );

    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Mary Jane', lastName: 'Van Der Berg' }),
    );
  });

  it('trims surrounding whitespace on both name parts', async () => {
    const { mockUser } = await run(
      mountedWizardPayload({ firstName: '  Ava  ', lastName: '  Stone  ' }),
    );

    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ava', lastName: 'Stone' }),
    );
  });

  it('preserves non-ASCII names byte-for-byte', async () => {
    const { mockUser } = await run(
      mountedWizardPayload({ firstName: 'José', lastName: 'Ñuñez-Bäcker' }),
    );

    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'José', lastName: 'Ñuñez-Bäcker' }),
    );
  });

  it('accepts a mononym — a surname is not universally required', async () => {
    const { res, mockUser } = await run(
      mountedWizardPayload({ firstName: 'Prince', lastName: '' }),
    );

    expect(statusOf(res)).not.toBe(400);
    expect(mockUser.create).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Prince' }));
  });

  it('prefers the structured split when BOTH shapes arrive', async () => {
    // Ambiguous input needs a decided answer, not an emergent one. The structured
    // fields are what a human typed into two labelled boxes; fullName is a derived
    // display string. Structure wins.
    const { mockUser } = await run(
      mountedWizardPayload({ firstName: 'Ada', lastName: 'Lovelace', fullName: 'Someone Else' }),
    );

    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ada', lastName: 'Lovelace' }),
    );
  });

  it('promotes a surname-only payload rather than storing a blank first name', async () => {
    const { mockUser } = await run(mountedWizardPayload({ firstName: '', lastName: 'Stone' }));

    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Stone', lastName: '' }),
    );
  });

  it.each([
    ['number', 42],
    ['object', { toString: () => 'Injected' }],
    ['array', ['Ava']],
  ])('ignores a non-string %s name instead of coercing it', async (_label, firstName) => {
    const { res } = await run({ firstName, email: 'x@example.test', primaryGoal: 'Build strength' });

    expect(statusOf(res)).toBe(400);
    expect(String(bodyOf(res)?.error)).toMatch(/name/i);
  });

  it.each([
    ['number', 12345],
    ['object', { a: 1 }],
    ['array', ['Stone']],
  ])('refuses a non-string %s lastName instead of silently dropping it', async (_label, lastName) => {
    // Found by probing the fix, not by the tests written for it: this used to
    // create a client with NO surname and return 201. Silent data loss, and
    // inconsistent with rejecting a non-string firstName.
    const { res, mockUser } = await run(mountedWizardPayload({ lastName }));

    expect(statusOf(res)).toBe(400);
    expect(String(bodyOf(res)?.error)).toMatch(/text/i);
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it('normalizes internal whitespace runs in a legacy fullName', async () => {
    // The split already used /\s+/, but the STORED fullName kept the raw runs,
    // so the display name and the split disagreed about the same person.
    const { mockUser } = await run({
      fullName: 'Ava   Marie   Stone',
      email: 'ava.stone@example.test',
      primaryGoal: 'Build strength',
    });

    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ava', lastName: 'Marie Stone' }),
    );
  });

  it('falls back to fullName when the split parts are whitespace-only', async () => {
    const { res, mockUser } = await run({
      firstName: '  ',
      lastName: ' ',
      fullName: 'Ava Stone',
      email: 'ava.stone@example.test',
      primaryGoal: 'Build strength',
    });

    expect(statusOf(res)).not.toBe(400);
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ava', lastName: 'Stone' }),
    );
  });

  it('still accepts a legacy fullName-only payload', async () => {
    // Backward compatibility: any existing integration posting fullName keeps working.
    const { res, mockUser } = await run({
      fullName: 'Ava Stone',
      email: 'ava.stone@example.test',
      primaryGoal: 'Build strength',
    });

    expect(statusOf(res)).not.toBe(400);
    expect(mockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ava', lastName: 'Stone' }),
    );
  });

  it('rejects a payload with no usable name, naming ONLY that field', async () => {
    const { res } = await run({ email: 'x@example.test', primaryGoal: 'Build strength' });
    const error = String(bodyOf(res)?.error);

    expect(statusOf(res)).toBe(400);
    expect(error).toMatch(/name/i);
    // The old message listed all three required fields on every failure, so
    // `toMatch(/name/i)` alone passed against a blob that named nothing in
    // particular. Asserting the OTHER fields are absent is what makes this test
    // about specificity rather than about the word "name" appearing somewhere.
    expect(error).not.toMatch(/email/i);
    expect(error).not.toMatch(/primaryGoal/i);
  });

  it('rejects a whitespace-only name rather than creating a blank client', async () => {
    const { res, mockUser } = await run(
      mountedWizardPayload({ firstName: '   ', lastName: '   ' }),
    );

    expect(statusOf(res)).toBe(400);
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it('names the missing field specifically when email is absent', async () => {
    const { res } = await run(mountedWizardPayload({ email: undefined }));
    const error = String(bodyOf(res)?.error);

    expect(statusOf(res)).toBe(400);
    expect(error).toMatch(/email/i);
    expect(error).not.toMatch(/primaryGoal/i);
  });

  it('never echoes a submitted value back in a validation error', async () => {
    // Errors are field-specific by NAME, not by value. Echoing input into an
    // error message is how contact data and credentials end up in logs.
    const { res } = await run(
      mountedWizardPayload({ email: undefined, phone: '555-0100', password: 'hunter2' }),
    );

    const serialized = JSON.stringify(bodyOf(res) ?? {});
    expect(serialized).not.toMatch(/555-0100/);
    expect(serialized).not.toMatch(/hunter2/);
  });
});
