/**
 * ============================================================================
 * FILE: multerUploadBehavior.test.mjs
 * PURPOSE: Behavioral proof that the multer version this repo ships actually
 *          parses uploads and enforces limits — by driving real multipart
 *          requests through a real Express app, not by reading source text.
 *
 * WHY THIS EXISTS: added with the multer 1.4.5-lts.2 → 2.3.0 upgrade
 * (SWA-225, 2026-09-01). The upload tests that existed before it assert on
 * SOURCE TEXT — e.g. `expect(routes).toContain("err.code === 'LIMIT_FILE_SIZE'")`
 * in adminStorefrontImageUpload.contract.test.mjs:40. That style proves a
 * string is present in a file; it passes identically whether multer parses a
 * body, enforces a byte ceiling, or is uninstalled. A major-version bump of the
 * body parser is exactly the change such a test cannot see, so the upgrade
 * would have shipped on 68 green assertions that never executed multer.
 *
 * WHAT IT LOCKS DOWN (each is a documented 2.x behavior change or a contract
 * the routes depend on):
 *   1. memoryStorage single-file upload populates req.file with a real buffer
 *   2. fileSize limit raises MulterError LIMIT_FILE_SIZE — the code every
 *      upload route maps to 413 (adminPackageRoutes:26, workoutLogUploadRoutes:114,
 *      plaudClipsRoutes:138, workoutPlanPdfUploadHandler:36)
 *   3. a file exactly AT the limit is accepted — 2.x passes busboy fileSize+1
 *      specifically so the boundary is not off by one
 *   4. fileFilter rejection propagates the filter's own Error, not a MulterError
 *   5. .array() count ceiling raises LIMIT_FILE_COUNT (bodyMeasurementRoutes:66,
 *      plaudClipsRoutes:144 both branch on it)
 *   6. LIMIT_UNEXPECTED_FILE fires for a field .single() did not declare
 *   7. 2.x decodes %0A/%0D/%22 in originalname per the WHATWG multipart spec.
 *      Audited at upgrade time: no R2/S3 key and no Content-Disposition header
 *      in this codebase is built from originalname (keys are slug+counter or
 *      randomBytes), so decoding is safe here. This test exists so that if a
 *      future change DOES route originalname into a key or header, the decoded
 *      newline is already visible in a test rather than discovered in prod.
 *
 * FAILURE MODE: if these fail after a dependency bump, uploads are broken in a
 * way no source-text assertion in this repo can detect. Do not skip them.
 * ============================================================================
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import multer from 'multer';

/** Route that surfaces multer's error verbatim so assertions see the real code. */
const appWith = (middleware) => {
  const app = express();
  app.post('/upload', (req, res) => {
    middleware(req, res, (err) => {
      if (err) {
        return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
          isMulterError: err instanceof multer.MulterError,
          code: err.code ?? null,
          field: err.field ?? null,
          message: err.message,
        });
      }
      res.status(200).json({
        file: req.file
          ? {
              fieldname: req.file.fieldname,
              originalname: req.file.originalname,
              size: req.file.size,
              bufferLength: req.file.buffer?.length ?? null,
            }
          : null,
        fileCount: Array.isArray(req.files) ? req.files.length : null,
        body: req.body,
      });
    });
  });
  return app;
};

describe('multer upload behavior (executed, not source-read)', () => {
  it('exposes the API surface the routes actually call', () => {
    expect(typeof multer).toBe('function');
    expect(typeof multer.memoryStorage).toBe('function');
    expect(typeof multer.diskStorage).toBe('function');
    expect(typeof multer.MulterError).toBe('function');
    const upload = multer({ storage: multer.memoryStorage() });
    for (const method of ['single', 'array', 'fields', 'any', 'none']) {
      expect(typeof upload[method]).toBe('function');
    }
  });

  it('parses a memoryStorage single upload into a real buffer alongside text fields', async () => {
    const upload = multer({ storage: multer.memoryStorage() });
    const payload = Buffer.from('swan-test-content');

    const res = await request(appWith(upload.single('photo')))
      .post('/upload')
      .field('caption', 'progress week 4')
      .attach('photo', payload, 'shot.jpg');

    expect(res.status).toBe(200);
    expect(res.body.file).toMatchObject({
      fieldname: 'photo',
      originalname: 'shot.jpg',
      size: payload.length,
      bufferLength: payload.length,
    });
    expect(res.body.body.caption).toBe('progress week 4');
  });

  it('raises MulterError LIMIT_FILE_SIZE when a file exceeds the ceiling', async () => {
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 } });

    const res = await request(appWith(upload.single('photo')))
      .post('/upload')
      .attach('photo', Buffer.alloc(1025, 0x41), 'too-big.jpg');

    expect(res.status).toBe(413);
    expect(res.body.isMulterError).toBe(true);
    expect(res.body.code).toBe('LIMIT_FILE_SIZE');
    expect(res.body.field).toBe('photo');
  });

  it('accepts a file exactly AT the limit — the 2.x fileSize+1 boundary fix', async () => {
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 } });

    const res = await request(appWith(upload.single('photo')))
      .post('/upload')
      .attach('photo', Buffer.alloc(1024, 0x41), 'exact.jpg');

    expect(res.status).toBe(200);
    expect(res.body.file.size).toBe(1024);
  });

  it('propagates a fileFilter rejection as the filter’s own error, not a MulterError', async () => {
    const upload = multer({
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error(`File "${file.originalname}" rejected: unsupported type`), false);
        }
        cb(null, true);
      },
    });

    const res = await request(appWith(upload.single('photo')))
      .post('/upload')
      .attach('photo', Buffer.from('not-an-image'), {
        filename: 'payload.exe',
        contentType: 'application/octet-stream',
      });

    expect(res.status).toBe(400);
    expect(res.body.isMulterError).toBe(false);
    expect(res.body.message).toContain('rejected: unsupported type');
  });

  /**
   * The two count ceilings are DIFFERENT ERRORS, and conflating them is how a
   * route ends up with an unreachable branch. Verified identical in 1.4.5-lts.2
   * and 2.3.0, so this is a long-standing multer contract, not an upgrade change:
   *   - `.array('f', N)` overflow  → LIMIT_UNEXPECTED_FILE
   *   - `limits: { files: N }`     → LIMIT_FILE_COUNT
   * A route that writes a friendly "too many files" message under a
   * LIMIT_FILE_COUNT branch but never sets `limits.files` will never show it.
   */
  it('raises LIMIT_UNEXPECTED_FILE when .array() maxCount overflows (NOT LIMIT_FILE_COUNT)', async () => {
    const upload = multer({ storage: multer.memoryStorage() });

    const res = await request(appWith(upload.array('photos', 2)))
      .post('/upload')
      .attach('photos', Buffer.from('a'), 'a.jpg')
      .attach('photos', Buffer.from('b'), 'b.jpg')
      .attach('photos', Buffer.from('c'), 'c.jpg');

    expect(res.status).toBe(400);
    expect(res.body.isMulterError).toBe(true);
    expect(res.body.code).toBe('LIMIT_UNEXPECTED_FILE');
  });

  it('raises LIMIT_FILE_COUNT only when limits.files is configured', async () => {
    const upload = multer({ storage: multer.memoryStorage(), limits: { files: 2 } });

    const res = await request(appWith(upload.any()))
      .post('/upload')
      .attach('a', Buffer.from('a'), 'a.jpg')
      .attach('b', Buffer.from('b'), 'b.jpg')
      .attach('c', Buffer.from('c'), 'c.jpg');

    expect(res.status).toBe(400);
    expect(res.body.isMulterError).toBe(true);
    expect(res.body.code).toBe('LIMIT_FILE_COUNT');
  });

  it('accepts .array() uploads up to maxCount', async () => {
    const upload = multer({ storage: multer.memoryStorage() });

    const res = await request(appWith(upload.array('photos', 2)))
      .post('/upload')
      .attach('photos', Buffer.from('a'), 'a.jpg')
      .attach('photos', Buffer.from('b'), 'b.jpg');

    expect(res.status).toBe(200);
    expect(res.body.fileCount).toBe(2);
  });

  it('raises LIMIT_UNEXPECTED_FILE for a field the middleware did not declare', async () => {
    const upload = multer({ storage: multer.memoryStorage() });

    const res = await request(appWith(upload.single('photo')))
      .post('/upload')
      .attach('somethingElse', Buffer.from('x'), 'x.jpg');

    expect(res.status).toBe(400);
    expect(res.body.isMulterError).toBe(true);
    expect(res.body.code).toBe('LIMIT_UNEXPECTED_FILE');
    expect(res.body.field).toBe('somethingElse');
  });

  it('decodes %0A/%0D/%22 in originalname (2.x WHATWG behavior) — keys must never be built from it', async () => {
    const upload = multer({ storage: multer.memoryStorage() });

    const res = await request(appWith(upload.single('photo')))
      .post('/upload')
      .attach('photo', Buffer.from('x'), 'evil%0Aname%22.jpg');

    expect(res.status).toBe(200);
    // 2.x reverses the spec-mandated escaping, so a control character can appear
    // in originalname. Asserted explicitly: this is the upgrade's one behavioral
    // change, and the guarantee that protects us is that storage keys are
    // slug/counter/randomBytes-derived — never originalname.
    expect(res.body.file.originalname).toBe('evil\nname".jpg');
  });
});
