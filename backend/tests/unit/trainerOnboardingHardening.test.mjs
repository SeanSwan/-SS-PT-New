/**
 * ============================================================================
 * BLUEPRINT: Trainer onboarding hostile-review regression contract
 * ============================================================================
 * PURPOSE: Pin controller behavior discovered missing during hostile review.
 * SECURITY: Applicants cannot expose internal review notes, attach unverifiable
 *           credentials, submit fake signatures, or turn validation failures
 *           into server errors.
 * EVIDENCE: The exact displayed draft contract is snapshotted at signing time.
 * SCOPE: Controller decisions with persistence and storage mocked at boundaries.
 * ============================================================================
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  created: null,
  findOptions: null,
  row: null,
};

vi.mock('../../models/index.mjs', () => ({
  getModel: () => ({
    findOne: async (options) => {
      state.findOptions = options;
      return state.row;
    },
    create: async (payload) => {
      state.created = payload;
      return { id: 91, ...payload };
    },
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: () => {}, warn: () => {}, error: () => {} },
}));

const uploadMock = vi.fn();
const existsMock = vi.fn();
vi.mock('../../services/trainerCredentialStorageService.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    uploadTrainerCredential: (...args) => uploadMock(...args),
    credentialExistsForUser: (...args) => existsMock(...args),
  };
});
vi.mock('../../services/trainerCredentialReceiptService.mjs', () => ({
  CredentialReceiptError: class CredentialReceiptError extends Error {
    constructor(message, { code = 'INVALID_CREDENTIAL_RECEIPT', statusCode = 400 } = {}) {
      super(message);
      this.name = 'CredentialReceiptError';
      this.code = code;
      this.statusCode = statusCode;
    }
  },
  storeTrainerCredentialUpload: (...args) => uploadMock(...args),
  createApplicationWithCredentialReceipts: async ({
    userId, credentialKeys, applicationModel, applicationPayload,
  }) => {
    for (const [field, kind] of [
      ['certificationFileKey', 'certification'],
      ['insuranceFileKey', 'insurance'],
    ]) {
      const key = credentialKeys[field];
      if (key && !(await existsMock(key, userId, kind))) {
        const error = new Error('invalid credential receipt');
        error.name = 'CredentialReceiptError';
        error.statusCode = 400;
        throw error;
      }
    }
    return applicationModel.create({ ...applicationPayload, userId });
  },
}));


// Kept only so this test is red against the original controller implementation.
vi.mock('../../services/photoStorageService.mjs', () => ({
  uploadPhoto: (...args) => uploadMock(...args),
}));

const {
  getMyApplicationStatus,
  submitApplication,
  uploadCredential,
} = await import('../../controllers/trainerOnboardingController.mjs');
const {
  CONTRACT_CONSENTS,
  CURRENT_CONTRACT_VERSION,
  contractPackageHash,
  getCurrentContract,
} = await import('../../config/trainerContract.mjs');

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const consents = () => Object.fromEntries(CONTRACT_CONSENTS.map(({ key }) => [key, true]));
const validBody = (overrides = {}) => ({
  fullName: 'Alex Trainer',
  email: 'alex@example.com',
  contractVersion: CURRENT_CONTRACT_VERSION,
  contractPackageHash: contractPackageHash(),
  signatureData: PNG_DATA_URL,
  consentFlags: consents(),
  ...overrides,
});

function response() {
  const res = { code: 200, payload: null };
  res.status = (code) => { res.code = code; return res; };
  res.json = (payload) => { res.payload = payload; return res; };
  return res;
}

const request = (body = {}) => ({
  user: { id: 42 },
  body,
  headers: { 'user-agent': 'vitest' },
  ip: '203.0.113.8',
});

async function call(handler, req) {
  const res = response();
  await handler(req, res);
  return res;
}

beforeEach(() => {
  state.created = null;
  state.findOptions = null;
  state.row = null;
  uploadMock.mockReset();
  existsMock.mockReset().mockResolvedValue(true);
});

describe('status privacy', () => {
  it('never selects internal reviewer notes for the applicant response', async () => {
    await call(getMyApplicationStatus, request());
    expect(state.findOptions.attributes).not.toContain('reviewNotes');
  });
});

describe('credential boundary', () => {
  it('rejects an unknown credential kind instead of relabeling it as certification', async () => {
    const req = {
      ...request({ kind: 'passport' }),
      file: { buffer: Buffer.from('%PDF-1.7'), originalname: 'id.pdf', mimetype: 'application/pdf' },
    };
    const res = await call(uploadCredential, req);
    expect(res.code).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('maps a validated storage rejection to its safe client status', async () => {
    uploadMock.mockRejectedValue(Object.assign(new Error('bad content'), {
      name: 'CredentialStorageError', code: 'INVALID_FILE_CONTENT', statusCode: 400,
    }));
    const req = {
      ...request({ kind: 'certification' }),
      file: { buffer: Buffer.from('<html>'), originalname: 'attack.html', mimetype: 'image/png' },
    };
    const res = await call(uploadCredential, req);
    expect(res.code).toBe(400);
    expect(res.payload.success).toBe(false);
  });

  it('maps the durable pending-byte quota to a bounded conflict response', async () => {
    const error = new Error('internal quota detail');
    error.name = 'CredentialReceiptError';
    error.statusCode = 409;
    uploadMock.mockRejectedValueOnce(error);
    const res = await call(uploadCredential, {
      ...request({ kind: 'insurance' }),
      file: { buffer: Buffer.from('ignored'), mimetype: 'application/pdf' },
    });
    expect(res.code).toBe(409);
    expect(res.payload.message).toMatch(/pending credential storage is full/i);
    expect(res.payload.message).not.toContain('internal quota detail');
  });

  it('rejects a missing or foreign credential object instead of silently dropping it', async () => {
    existsMock.mockResolvedValue(false);
    const res = await call(submitApplication, request(validBody({
      certificationFileKey: 'private/trainer-credentials/42/2026-08/missing.pdf.enc',
    })));
    expect(res.code).toBe(400);
    expect(state.created).toBeNull();
  });

  it('does not let a certification upload masquerade as insurance evidence', async () => {
    const certificationKey = 'private/trainer-credentials/42/certification/2026-08/cert.pdf.enc';
    existsMock.mockImplementation(async (key, userId, expectedKind) => (
      key.startsWith(`private/trainer-credentials/${userId}/${expectedKind}/`)
    ));

    const res = await call(submitApplication, request(validBody({
      insuranceFileKey: certificationKey,
    })));

    expect(existsMock).toHaveBeenCalledWith(certificationKey, 42, 'insurance');
    expect(res.code).toBe(400);
    expect(state.created).toBeNull();
  });
});

describe('bounded input and signature evidence', () => {
  it.each([
    ['fullName', 'x'.repeat(201)],
    ['email', `${'x'.repeat(250)}@example.com`],
    ['phone', 'x'.repeat(51)],
    ['businessName', 'x'.repeat(201)],
    ['specialties', 'x'.repeat(4001)],
    ['bio', 'x'.repeat(5001)],
    ['yearsExperience', 81],
  ])('400s when %s exceeds its model-safe boundary', async (field, value) => {
    const res = await call(submitApplication, request(validBody({ [field]: value })));
    expect(res.code).toBe(400);
    expect(state.created).toBeNull();
  });

  it.each([
    ['fullName', 'Alex\u0000Trainer'],
    ['email', 'alex\u0000@example.com'],
    ['bio', 'Valid-looking\u0000text'],
  ])('rejects PostgreSQL-invalid NUL data in %s', async (field, value) => {
    const res = await call(submitApplication, request(validBody({ [field]: value })));
    expect(res.code).toBe(400);
    expect(state.created).toBeNull();
  });

  it('rejects an SVG or malformed base64 payload masquerading as a signature', async () => {
    const svg = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+';
    expect((await call(submitApplication, request(validBody({ signatureData: svg })))).code).toBe(400);
    expect((await call(submitApplication, request(validBody({
      signatureData: 'data:image/png;base64,AAAA',
    })))).code).toBe(400);
  });

  it('stores the exact displayed contract package and its package hash', async () => {
    const res = await call(submitApplication, request(validBody()));
    expect(res.code).toBe(201);
    expect(state.created.metadata.contractDisplaySnapshot).toEqual(getCurrentContract());
    expect(state.created.metadata.contractPackageHash).toBe(contractPackageHash());
    expect(res.payload.message).not.toMatch(/activate your trainer account/i);
  });
});
