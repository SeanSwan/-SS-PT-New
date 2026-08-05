/**
 * photoRecordValidation — SWA-129 Kimi upload audit RANK-1/2 (CRITICAL).
 * The `/api/photos/:userId` record endpoint accepted client-supplied
 * url+storageKey verbatim. These tests encode the exact attacks Kimi described
 * and prove they are now rejected, while the legitimate server-issued path
 * still passes.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const OWNER = 42;
const VICTIM = 123;

import * as mod from '../../utils/photoRecordValidation.mjs';

const ownedKey = `photos/progress/${OWNER}/2026-08/abc-123.jpg`;
const victimKey = `photos/progress/${VICTIM}/2026-08/secret.jpg`;

// Env is read lazily inside the module, so a plain assignment is enough.
beforeEach(() => { process.env.R2_PUBLIC_URL = 'https://pub-xyz.r2.dev'; });
afterEach(() => { delete process.env.R2_PUBLIC_URL; });

describe('CRITICAL — IDOR-by-key: a key owned by another user is rejected', () => {
  it("rejects storing a record that points at the VICTIM's key", () => {
    const r = mod.validatePhotoRecord({
      url: `https://pub-xyz.r2.dev/${victimKey}`, storageKey: victimKey, clientId: OWNER,
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/does not belong/i);
  });

  it('isOwnedPhotoStorageKey: owner segment must equal the authorized client', () => {
    expect(mod.isOwnedPhotoStorageKey(ownedKey, OWNER)).toBe(true);
    expect(mod.isOwnedPhotoStorageKey(victimKey, OWNER)).toBe(false);
    expect(mod.isOwnedPhotoStorageKey(ownedKey, VICTIM)).toBe(false);
  });
});

describe('CRITICAL — arbitrary external URL injection is rejected', () => {
  it('rejects an external phishing URL', () => {
    const r = mod.validatePhotoRecord({
      url: 'https://evil.example/login-clone', storageKey: ownedKey, clientId: OWNER,
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not a permitted/i);
  });

  it('rejects javascript:, data:, file: and protocol-relative schemes', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', '//evil.example/x']) {
      expect(mod.isSafePhotoUrl(url, OWNER, ownedKey)).toBe(false);
    }
  });

  it('rejects an SSRF metadata URL', () => {
    expect(mod.isSafePhotoUrl('http://169.254.169.254/latest/meta-data/', OWNER, ownedKey)).toBe(false);
  });

  it('rejects http (non-https) and credentialed URLs on the right host', () => {
    expect(mod.isSafePhotoUrl(`http://pub-xyz.r2.dev/${ownedKey}`, OWNER, ownedKey)).toBe(false);
    expect(mod.isSafePhotoUrl(`https://u:p@pub-xyz.r2.dev/${ownedKey}`, OWNER, ownedKey)).toBe(false);
  });
});

describe('HIGH — key-space traversal / encoding tricks are rejected', () => {
  it.each([
    `photos/progress/${OWNER}/../${VICTIM}/x.jpg`,
    `photos/progress/${OWNER}/%2e%2e/x.jpg`,
    `/photos/progress/${OWNER}/x.jpg`,
    `photos//${OWNER}/x.jpg`,
    'not-a-photo-key',
    'photos/progress/x.jpg',
  ])('rejects malformed key %j', (key) => {
    expect(mod.isOwnedPhotoStorageKey(key, OWNER)).toBe(false);
  });
});

describe('the legitimate server-issued path still passes', () => {
  it('accepts an owned key with the matching R2 public URL', () => {
    const r = mod.validatePhotoRecord({
      url: `https://pub-xyz.r2.dev/${ownedKey}`, storageKey: ownedKey, clientId: OWNER,
    });
    expect(r.ok).toBe(true);
  });

  it('accepts a same-origin relative proxy path referencing the owned key', () => {
    const r = mod.validatePhotoRecord({
      url: `/api/photos/proxy/${ownedKey}`, storageKey: ownedKey, clientId: OWNER,
    });
    expect(r.ok).toBe(true);
  });

  it('missing url/storageKey still 400s', () => {
    expect(mod.validatePhotoRecord({ url: '', storageKey: ownedKey, clientId: OWNER }).ok).toBe(false);
    expect(mod.validatePhotoRecord({ url: 'x', storageKey: '', clientId: OWNER }).ok).toBe(false);
  });

  it('with NO R2_PUBLIC_URL configured, an absolute URL is rejected (fail closed)', async () => {
    process.env.R2_PUBLIC_URL = "";
    expect(mod.isSafePhotoUrl(`https://pub-xyz.r2.dev/${ownedKey}`, OWNER, ownedKey)).toBe(false);
    // but the relative proxy path still works
    expect(mod.isSafePhotoUrl(`/proxy/${ownedKey}`, OWNER, ownedKey)).toBe(true);
  });
});
