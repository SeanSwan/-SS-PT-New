/**
 * trainerOnboardingController — regression tests (SWA-62, trainer self-serve onboarding)
 *
 * WHY THIS FILE EXISTS: the feature was ported to main from a long-lived WIP branch with ZERO
 * test coverage, while storing applicant PII (name, email, phone, certification and INSURANCE
 * POLICY numbers) and accepting file uploads. Shipping that untested was not acceptable, so the
 * coverage was written as part of the port rather than deferred.
 *
 * WHAT IT PINS: controller LOGIC — validation, status codes, and the four security behaviours
 * the handler already implements but nothing verified:
 *   1. IDOR on file keys — a caller may not attach another user's uploaded credential.
 *   2. Path traversal — a '..' local key is refused.
 *   3. Consent allowlisting — attacker-supplied extra keys never reach the JSONB evidence record.
 *   4. Contract-version pinning — a stale agreement cannot be signed.
 * Persistence, migrations and index behaviour are verified separately against real Postgres.
 *
 * The model is mocked deliberately: these are unit tests of the handler's decisions, not of
 * Sequelize.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// getModel is resolved at call time inside each handler, so mocking the module is enough.
const store = { rows: [], created: null, throwOnCreate: null };

vi.mock('../../models/index.mjs', () => ({
  getModel: () => ({
    findOne: async ({ where }) => store.rows.filter((r) => r.userId === where.userId).at(-1) || null,
    create: async (payload) => {
      if (store.throwOnCreate) throw store.throwOnCreate;
      store.created = payload;
      return { id: 1, ...payload };
    },
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: () => {}, warn: () => {}, error: () => {} },
}));

const uploadCredentialMock = vi.fn();
const credentialExistsMock = vi.fn();
vi.mock('../../services/trainerCredentialStorageService.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  uploadTrainerCredential: (...args) => uploadCredentialMock(...args),
  credentialExistsForUser: (...args) => credentialExistsMock(...args),
}));
vi.mock('../../services/trainerCredentialReceiptService.mjs', () => ({
  CredentialReceiptError: class CredentialReceiptError extends Error {
    constructor(message, { code = 'INVALID_CREDENTIAL_RECEIPT', statusCode = 400 } = {}) {
      super(message);
      this.name = 'CredentialReceiptError';
      this.code = code;
      this.statusCode = statusCode;
    }
  },
  storeTrainerCredentialUpload: (...args) => uploadCredentialMock(...args),
  createApplicationWithCredentialReceipts: async ({
    userId, credentialKeys, applicationModel, applicationPayload,
  }) => {
    for (const [field, kind] of [
      ['certificationFileKey', 'certification'],
      ['insuranceFileKey', 'insurance'],
    ]) {
      const key = credentialKeys[field];
      if (key && !(await credentialExistsMock(key, userId, kind))) {
        const error = new Error('invalid credential receipt');
        error.name = 'CredentialReceiptError';
        error.statusCode = 400;
        throw error;
      }
    }
    return applicationModel.create({ ...applicationPayload, userId });
  },
}));


const {
  getContract, getMyApplicationStatus, uploadCredential, submitApplication,
} = await import('../../controllers/trainerOnboardingController.mjs');
const {
  CURRENT_CONTRACT_VERSION,
  CONTRACT_CONSENTS,
  contractPackageHash,
} = await import('../../config/trainerContract.mjs');

const REQUIRED_KEYS = CONTRACT_CONSENTS.filter((c) => c.required).map((c) => c.key);
const ALL_KEYS = CONTRACT_CONSENTS.map((c) => c.key);
const allConsents = () => Object.fromEntries(ALL_KEYS.map((k) => [k, true]));

function mockRes() {
  const res = { code: 200, payload: null };
  res.status = (code) => { res.code = code; return res; };
  res.json = (payload) => { res.payload = payload; return res; };
  return res;
}
const call = async (handler, req) => { const res = mockRes(); await handler(req, res); return res; };

const USER_ID = 42;
/** A minimally-valid application body; individual tests break one field at a time. */
const validBody = (over = {}) => ({
  fullName: 'Alex Trainer',
  email: 'alex@example.com',
  contractVersion: CURRENT_CONTRACT_VERSION,
  contractPackageHash: contractPackageHash(),
  signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  consentFlags: allConsents(),
  ...over,
});
const asUser = (body) => ({ user: { id: USER_ID }, body, ip: '203.0.113.9', headers: { 'user-agent': 'vitest' } });

beforeEach(() => {
  store.rows = [];
  store.created = null;
  store.throwOnCreate = null;
  uploadCredentialMock.mockReset();
  credentialExistsMock.mockReset().mockImplementation(async (key, userId) => (
    typeof key === 'string'
    && !key.includes('..')
    && key.startsWith(`private/trainer-credentials/${userId}/`)
  ));
});

describe('getContract', () => {
  it('returns the current contract for display', async () => {
    const res = await call(getContract, asUser({}));
    expect(res.payload.success).toBe(true);
    expect(res.payload.contract).toBeTruthy();
  });
});

describe('getMyApplicationStatus', () => {
  it('returns null when the user has never applied', async () => {
    const res = await call(getMyApplicationStatus, asUser({}));
    expect(res.payload).toEqual({ success: true, application: null });
  });

  it('returns the most recent application when one exists', async () => {
    store.rows.push({ userId: USER_ID, id: 7, status: 'pending_review' });
    const res = await call(getMyApplicationStatus, asUser({}));
    expect(res.payload.application.status).toBe('pending_review');
  });
});

describe('uploadCredential', () => {
  it('400s when no file was attached', async () => {
    const res = await call(uploadCredential, { ...asUser({}), file: undefined });
    expect(res.code).toBe(400);
  });

  it('502s when storage returns no reference — never reports success on a lost file', async () => {
    uploadCredentialMock.mockResolvedValue({ storage: 'r2' }); // no storageKey
    const req = { ...asUser({}), file: { buffer: Buffer.from('x'), originalname: 'coi.pdf', mimetype: 'application/pdf' } };
    const res = await call(uploadCredential, req);
    expect(res.code).toBe(502);
  });

  it('returns the storage key and defaults kind to certification', async () => {
    uploadCredentialMock.mockResolvedValue({
      storageKey: `private/trainer-credentials/${USER_ID}/certification/2026-08/a.pdf.enc`,
      storage: 'r2',
    });
    const req = { ...asUser({}), file: { buffer: Buffer.from('x'), originalname: 'cert.pdf', mimetype: 'application/pdf' } };
    const res = await call(uploadCredential, req);
    expect(res.payload.success).toBe(true);
    expect(res.payload.kind).toBe('certification');
    expect(res.payload.key).toContain('trainer-credentials');
  });
});

describe('submitApplication — validation', () => {
  it('409s when an application is already pending_review', async () => {
    store.rows.push({ userId: USER_ID, status: 'pending_review' });
    const res = await call(submitApplication, asUser(validBody()));
    expect(res.code).toBe(409);
  });

  it('allows re-applying after a rejection', async () => {
    store.rows.push({ userId: USER_ID, status: 'rejected' });
    const res = await call(submitApplication, asUser(validBody()));
    expect(res.code).toBe(201);
  });

  it('400s on a missing full name', async () => {
    const res = await call(submitApplication, asUser(validBody({ fullName: '   ' })));
    expect(res.code).toBe(400);
  });

  it('400s on a malformed email', async () => {
    const res = await call(submitApplication, asUser(validBody({ email: 'not-an-email' })));
    expect(res.code).toBe(400);
  });

  it('409s when signing a STALE contract version — the anti-stale-signing guard', async () => {
    const res = await call(submitApplication, asUser(validBody({ contractVersion: 'v0-ancient' })));
    expect(res.code).toBe(409);
    expect(res.payload.currentVersion).toBe(CURRENT_CONTRACT_VERSION);
  });

  it('409s when the displayed contract package changed without a version bump', async () => {
    const res = await call(submitApplication, asUser(validBody({
      contractPackageHash: '0'.repeat(64),
    })));
    expect(res.code).toBe(409);
    expect(store.created).toBeNull();
  });

  it('400s without a drawn signature', async () => {
    const res = await call(submitApplication, asUser(validBody({ signatureData: 'nope' })));
    expect(res.code).toBe(400);
  });

  it('413s on an oversized signature payload', async () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(250_001);
    const res = await call(submitApplication, asUser(validBody({ signatureData: huge })));
    expect(res.code).toBe(413);
  });

  it('400s and names the missing consents when a required one is absent', async () => {
    const partial = allConsents();
    delete partial[REQUIRED_KEYS[0]];
    const res = await call(submitApplication, asUser(validBody({ consentFlags: partial })));
    expect(res.code).toBe(400);
    expect(res.payload.missingConsents).toContain(REQUIRED_KEYS[0]);
  });

  it('400s on a malformed date, and on a real-looking but invalid one', async () => {
    expect((await call(submitApplication, asUser(validBody({ certificationExpiry: '31-12-2026' })))).code).toBe(400);
    // 2026-02-30 matches the regex but is not a real calendar date.
    expect((await call(submitApplication, asUser(validBody({ cprAedExpiry: '2026-02-30' })))).code).toBe(400);
  });

  it('accepts an empty optional date', async () => {
    const res = await call(submitApplication, asUser(validBody({ insuranceExpiry: '' })));
    expect(res.code).toBe(201);
  });

  it('409s (not 500) when the unique index rejects a racing duplicate', async () => {
    store.throwOnCreate = Object.assign(new Error('dup'), { name: 'SequelizeUniqueConstraintError' });
    const res = await call(submitApplication, asUser(validBody()));
    expect(res.code).toBe(409);
  });
});

describe('submitApplication — security behaviours', () => {
  it('IDOR: refuses to attach ANOTHER user\'s private credential key', async () => {
    const victimKey = 'private/trainer-credentials/99999/certification/2026-08/stolen.pdf.enc';
    const res = await call(submitApplication, asUser(validBody({ certificationFileKey: victimKey })));
    expect(res.code).toBe(400);
    expect(store.created).toBeNull();
  });

  it('keeps this user\'s OWN private credential key', async () => {
    const ownKey = `private/trainer-credentials/${USER_ID}/certification/2026-08/mine.pdf.enc`;
    await call(submitApplication, asUser(validBody({ certificationFileKey: ownKey })));
    expect(store.created.certificationFileKey).toBe(ownKey);
  });

  it('refuses a local key containing a traversal segment', async () => {
    const evil = `private/trainer-credentials/${USER_ID}/insurance/../../../etc/passwd.pdf.enc`;
    const res = await call(submitApplication, asUser(validBody({ insuranceFileKey: evil })));
    expect(res.code).toBe(400);
    expect(store.created).toBeNull();
  });

  it('refuses a key outside the credentials namespace entirely', async () => {
    const res = await call(submitApplication, asUser(validBody({ insuranceFileKey: 'photos/avatars/1/a.png' })));
    expect(res.code).toBe(400);
    expect(store.created).toBeNull();
  });

  it('consent allowlist: attacker-supplied extra keys never reach the evidence record', async () => {
    const polluted = { ...allConsents(), isAdmin: true, __proto__polluted: 'x', platformFeePercent: 0 };
    await call(submitApplication, asUser(validBody({ consentFlags: polluted })));
    expect(Object.keys(store.created.consentFlags).sort()).toEqual([...ALL_KEYS].sort());
    expect(store.created.consentFlags.isAdmin).toBeUndefined();
  });

  it('rejects a truthy string for a required consent instead of treating it as agreement', async () => {
    const truthy = { ...allConsents(), [REQUIRED_KEYS[0]]: 'yes' };
    const res = await call(submitApplication, asUser(validBody({ consentFlags: truthy })));
    expect(res.code).toBe(400);
    expect(res.payload.missingConsents).toContain(REQUIRED_KEYS[0]);
  });

  it('always creates as pending_review and never trusts a client-supplied status', async () => {
    await call(submitApplication, asUser(validBody({ status: 'approved', platformFeePercent: 0 })));
    expect(store.created.status).toBe('pending_review');
    expect(store.created.platformFeePercent).toBe(15.0);
  });

  it('records the proxy-aware req.ip, not a spoofable forwarded header', async () => {
    const req = asUser(validBody());
    req.headers['x-forwarded-for'] = '1.2.3.4';
    await call(submitApplication, req);
    expect(store.created.ipAddress).toBe('203.0.113.9');
  });
});
