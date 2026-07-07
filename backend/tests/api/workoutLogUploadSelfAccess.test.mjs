/**
 * workoutLogUploadSelfAccess.test.mjs
 * =====================================
 * Phase 3c.3 (launch charter P1-6): client voice logging un-gated for SELF only.
 * Locks: (1) the pure scope resolver — admin/trainer pass for any client,
 * client/user roles pass ONLY for their own id (IDOR-proof), unknown roles fail
 * closed; (2) source contracts — /upload authorizes the self roles + enforces
 * the in-handler scope check (clientId arrives in multipart form, so the check
 * MUST run after multer, inside the handler); /history-preview stays
 * trainer/admin-only (history import is a coaching flow).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { resolveVoiceUploadScope } from '../../routes/workoutLogUploadRoutes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  resolve(__dirname, '../../routes/workoutLogUploadRoutes.mjs'),
  'utf8'
);

describe('resolveVoiceUploadScope', () => {
  it('admin and trainer may upload for any client', () => {
    expect(resolveVoiceUploadScope({ role: 'admin', requestedClientId: 42, userId: 1 }).allowed).toBe(true);
    expect(resolveVoiceUploadScope({ role: 'trainer', requestedClientId: 42, userId: 9 }).allowed).toBe(true);
  });

  it('client/user roles may upload ONLY for themselves', () => {
    expect(resolveVoiceUploadScope({ role: 'client', requestedClientId: 42, userId: 42 })).toEqual({
      allowed: true,
      selfMode: true,
    });
    expect(resolveVoiceUploadScope({ role: 'user', requestedClientId: 7, userId: 7 }).allowed).toBe(true);
    // The IDOR case: a client naming someone else's id is refused.
    expect(resolveVoiceUploadScope({ role: 'client', requestedClientId: 41, userId: 42 }).allowed).toBe(false);
    expect(resolveVoiceUploadScope({ role: 'user', requestedClientId: 42, userId: 7 }).allowed).toBe(false);
  });

  it('fails closed on unknown/missing roles and malformed ids', () => {
    expect(resolveVoiceUploadScope({ role: undefined, requestedClientId: 1, userId: 1 }).allowed).toBe(false);
    expect(resolveVoiceUploadScope({ role: 'visitor', requestedClientId: 1, userId: 1 }).allowed).toBe(false);
    expect(resolveVoiceUploadScope({ role: 'client', requestedClientId: null, userId: 42 }).allowed).toBe(false);
    expect(resolveVoiceUploadScope({ role: 'client', requestedClientId: 42, userId: null }).allowed).toBe(false);
  });
});

describe('route source contracts', () => {
  it('/upload authorizes self roles and enforces the scope check in-handler', () => {
    expect(SOURCE).toMatch(
      /router\.post\(\s*'\/upload',\s*authorize\(\[\s*'admin',\s*'trainer',\s*'client',\s*'user'\s*\]\)/
    );
    expect(SOURCE).toMatch(/resolveVoiceUploadScope\(\{/);
    expect(SOURCE).toMatch(/status\(403\)/);
  });

  it('/history-preview remains trainer/admin-only', () => {
    expect(SOURCE).toMatch(
      /router\.post\(\s*'\/history-preview',\s*authorize\(\[\s*'admin',\s*'trainer'\s*\]\)/
    );
  });
});
