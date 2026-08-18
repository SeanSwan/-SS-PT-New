/**
 * requireSubjectAiConsent — multipart field-order contract
 * =========================================================
 * The consent gate on the upload lanes resolves its data subject from
 * `req.body.clientId`, which only exists once multer has parsed the multipart
 * body. Every frontend caller appends the FILE first and `clientId` second:
 *
 *   formData.append('file', file);
 *   formData.append('clientId', String(clientId));
 *
 * (useTranscriptIntake.ts, VoiceMemoUpload.tsx, HistoricalWorkoutImportPanel.tsx)
 *
 * If a field arriving after the file were not visible to the next middleware,
 * the gate would resolve no subject and **400 every upload in production** —
 * a total outage of the PLAUD lane, introduced by a privacy fix. Reading
 * multer's source is not proof of that; a real multipart request is.
 *
 * This test sends an actual HTTP multipart body through the real multer
 * configuration in that exact field order, and asserts the gate saw the
 * client. It is a regression lock on middleware ORDERING, not on consent
 * logic — that lives in aiConsentSubjectGate.test.mjs.
 */
import express from 'express';
import multer from 'multer';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { requireSubjectAiConsent } = await import('../../middleware/aiConsent.mjs');

/** Mirrors the upload lanes: multer memoryStorage, then the consent gate. */
const buildApp = (profile, options = { failOpenWhenMissing: true }) => {
  const seen = { subjectId: null, reachedHandler: false };
  const upload = multer({ storage: multer.memoryStorage() });

  const gate = requireSubjectAiConsent(
    () => ({
      findOne: vi.fn(async ({ where }) => {
        seen.subjectId = where.userId;
        return profile;
      }),
    }),
    (req) => req.body?.clientId,
    options,
  );

  const app = express();
  app.post('/upload', upload.single('file'), gate, (req, res) => {
    seen.reachedHandler = true;
    res.status(200).json({ ok: true, clientId: req.body?.clientId });
  });

  return { app, seen };
};

const FILE = Buffer.from('fake audio bytes');

describe('consent gate sees clientId when it arrives AFTER the file', () => {
  it('resolves the subject from a field appended after the file', async () => {
    const { app, seen } = buildApp({ aiEnabled: true, withdrawnAt: null });

    const res = await request(app)
      .post('/upload')
      .attach('file', FILE, 'memo.mp3') // file FIRST — as every caller sends it
      .field('clientId', '84'); //          clientId SECOND

    expect(res.status).toBe(200);
    expect(seen.subjectId).toBe(84); // the gate looked up the CLIENT
    expect(seen.reachedHandler).toBe(true);
  });

  it('still BLOCKS an opted-out client in that same field order', async () => {
    const { app, seen } = buildApp({ aiEnabled: false, withdrawnAt: null });

    const res = await request(app)
      .post('/upload')
      .attach('file', FILE, 'memo.mp3')
      .field('clientId', '84');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_DISABLED');
    expect(seen.reachedHandler).toBe(false); // audio never reached the handler
  });

  /**
   * The gate must not become a consent oracle. It runs before the handler's
   * scope check, so if it looked up any caller-supplied clientId, a `client`
   * could probe arbitrary user ids and tell "that person opted out of AI"
   * (403 AI_CONSENT_DISABLED) apart from "not your client" (the uniform scope
   * 403) — leaking a privacy preference about strangers, from a privacy fix.
   *
   * The route resolves its subject through its own access scope, so an
   * unauthorized request resolves to NO subject: no lookup happens and the
   * handler's identical refusal answers instead.
   */
  it('does not look up a subject the caller is not authorized for', async () => {
    const findOne = vi.fn(async () => ({ aiEnabled: false, withdrawnAt: null }));
    const upload = multer({ storage: multer.memoryStorage() });

    // Mirrors the route: client role may only act on its own id.
    const resolveSubject = (req) => {
      const requested = Number(req.body?.clientId);
      const self = Number(req.user?.id);
      const allowed = req.user?.role === 'client' ? requested === self : true;
      return allowed ? requested : undefined;
    };

    const gate = requireSubjectAiConsent(() => ({ findOne }), resolveSubject, {
      failOpenWhenMissing: true,
      skipWhenUnresolved: true,
    });

    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: 7, role: 'client' };
      next();
    });
    app.post('/upload', upload.single('file'), gate, (_req, res) =>
      res.status(403).json({ error: 'You can only upload voice logs for your own workouts' }),
    );

    const res = await request(app)
      .post('/upload')
      .attach('file', FILE, 'memo.mp3')
      .field('clientId', '9999'); // someone else's id

    // No consent lookup for a client the caller has no access to...
    expect(findOne).not.toHaveBeenCalled();
    // ...and the refusal is the handler's uniform one, not a consent code.
    expect(res.status).toBe(403);
    expect(res.body.code).toBeUndefined();
    expect(res.body.error).toContain('your own workouts');
  });

  it('proceeds for a client with no profile row (fail-open on absence)', async () => {
    const { app, seen } = buildApp(null);

    const res = await request(app)
      .post('/upload')
      .attach('file', FILE, 'memo.mp3')
      .field('clientId', '84');

    expect(res.status).toBe(200);
    expect(seen.reachedHandler).toBe(true);
  });
});
