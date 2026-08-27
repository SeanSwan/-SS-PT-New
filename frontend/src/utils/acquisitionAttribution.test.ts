import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REFERRAL_STORAGE_KEY, REFERRAL_TTL_MS, captureReferralOnLanding, readAcquisitionParams, rememberReferral } from './acquisitionAttribution';

const CODE_A = '42.abcdefghijklmnop';
const CODE_B = '43.ABCDEFGHIJKLMNOP';

describe('acquisitionAttribution — referral code (first-touch, 30 days)', () => {
  beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/'); });
  afterEach(() => { localStorage.clear(); });

  it('reads ?ref= from the URL, persists it, and returns it', () => {
    window.history.replaceState({}, '', `/?ref=${CODE_A}&utm_source=youtube`);
    const p = readAcquisitionParams();
    expect(p.ref).toBe(CODE_A);
    expect(p.utmSource).toBe('youtube');
    expect(JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY)!).code).toBe(CODE_A);
  });

  it('keeps sending a remembered code on later visits with no ?ref=', () => {
    rememberReferral(CODE_A);
    expect(readAcquisitionParams().ref).toBe(CODE_A);
  });

  it('FIRST touch wins: a second ?ref= does not overwrite a live one', () => {
    rememberReferral(CODE_A, 1_000);
    expect(rememberReferral(CODE_B, 2_000)).toBe(CODE_A);
  });

  it('expires after 30 days and then accepts a new code', () => {
    rememberReferral(CODE_A, 0);
    expect(rememberReferral(null, REFERRAL_TTL_MS + 1)).toBeUndefined();
    expect(rememberReferral(CODE_B, REFERRAL_TTL_MS + 2)).toBe(CODE_B);
  });

  it('ignores a malformed ref and never stores it', () => {
    window.history.replaceState({}, '', '/?ref=<script>alert(1)</script>');
    expect(readAcquisitionParams().ref).toBeUndefined();
    expect(localStorage.getItem(REFERRAL_STORAGE_KEY)).toBeNull();
  });

  it('omits ref entirely when nothing is present (no empty key)', () => {
    expect('ref' in readAcquisitionParams()).toBe(false);
  });
});

describe('captureReferralOnLanding - the landing -> navigate -> submit path', () => {
  beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/'); });
  afterEach(() => { localStorage.clear(); });

  it('survives in-app navigation that drops the query param (the whole point)', () => {
    window.history.replaceState({}, '', `/?ref=${CODE_A}`);
    captureReferralOnLanding();
    window.history.replaceState({}, '', '/signup'); // SPA route change - ?ref= is gone
    expect(readAcquisitionParams().ref).toBe(CODE_A);
  });

  it('is a no-op with no ?ref= and never invents one', () => {
    captureReferralOnLanding();
    expect(localStorage.getItem(REFERRAL_STORAGE_KEY)).toBeNull();
    expect(readAcquisitionParams().ref).toBeUndefined();
  });

  it('is idempotent across repeated boots and keeps the first code', () => {
    window.history.replaceState({}, '', `/?ref=${CODE_A}`);
    captureReferralOnLanding();
    window.history.replaceState({}, '', `/?ref=${CODE_B}`);
    captureReferralOnLanding();
    expect(readAcquisitionParams().ref).toBe(CODE_A);
  });
});
