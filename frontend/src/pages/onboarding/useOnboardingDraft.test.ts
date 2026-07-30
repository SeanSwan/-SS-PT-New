/**
 * Tests for onboarding draft persistence (launch audit S4, 2026-07-27).
 *
 * THE GAP THIS CLOSES
 * ClientOnboardingWizard kept all 8 sections in React state and only POSTed at
 * the end. Closing the tab at section 6 silently destroyed everything. Length
 * is only painful when it is fragile.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readDraft, writeDraft, clearDraft, draftKeyFor } from './useOnboardingDraft';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('onboarding draft persistence', () => {
  it('round-trips a draft for a user', () => {
    writeDraft(42, { formData: { goal: 'strength' }, currentStep: 3 });
    const draft = readDraft(42);
    expect(draft?.formData).toEqual({ goal: 'strength' });
    expect(draft?.currentStep).toBe(3);
  });

  it('returns null when there is no draft', () => {
    expect(readDraft(42)).toBeNull();
  });

  // Two people sharing a browser profile must never inherit each other's health answers.
  it('scopes drafts per user id', () => {
    writeDraft(1, { formData: { injuries: 'left knee' }, currentStep: 2 });
    expect(readDraft(1)?.formData).toEqual({ injuries: 'left knee' });
    expect(readDraft(2)).toBeNull();
    expect(draftKeyFor(1)).not.toBe(draftKeyFor(2));
  });

  it('clears a draft on demand', () => {
    writeDraft(42, { formData: { goal: 'strength' }, currentStep: 1 });
    clearDraft(42);
    expect(readDraft(42)).toBeNull();
  });

  it('discards a draft older than the 30-day TTL', () => {
    const longAgo = Date.now() - 31 * DAY;
    writeDraft(42, { formData: { goal: 'stale' }, currentStep: 1 }, longAgo);
    expect(readDraft(42)).toBeNull();
    // and it is removed, not merely hidden
    expect(window.localStorage.getItem(draftKeyFor(42))).toBeNull();
  });

  it('keeps a draft that is still inside the TTL', () => {
    const recent = Date.now() - 3 * DAY;
    writeDraft(42, { formData: { goal: 'fresh' }, currentStep: 1 }, recent);
    expect(readDraft(42)?.formData).toEqual({ goal: 'fresh' });
  });

  it('discards malformed JSON instead of throwing', () => {
    window.localStorage.setItem(draftKeyFor(42), '{not json');
    expect(() => readDraft(42)).not.toThrow();
    expect(readDraft(42)).toBeNull();
  });

  it('EVICTS malformed JSON rather than leaving it to re-throw every mount', () => {
    // This is the assertion the suite was missing: returning null is not the same
    // as discarding. The catch branch used to leave the corrupt value in place, so
    // it survived in the client's localStorage indefinitely and every wizard mount
    // re-parsed and re-threw on it — while the sibling structurally-invalid branch
    // did remove its entry.
    window.localStorage.setItem(draftKeyFor(42), '{not json');
    readDraft(42);
    expect(window.localStorage.getItem(draftKeyFor(42))).toBeNull();
  });

  it('discards a structurally invalid draft', () => {
    window.localStorage.setItem(draftKeyFor(42), JSON.stringify({ formData: null, savedAt: Date.now() }));
    expect(readDraft(42)).toBeNull();
    expect(window.localStorage.getItem(draftKeyFor(42))).toBeNull();
  });

  it('defaults a missing step to 0 rather than NaN', () => {
    window.localStorage.setItem(
      draftKeyFor(42),
      JSON.stringify({ formData: { a: 1 }, savedAt: Date.now() })
    );
    expect(readDraft(42)?.currentStep).toBe(0);
  });

  // A draft is a convenience; it must never break the wizard.
  it('survives storage being unavailable (private mode / quota)', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(writeDraft(42, { formData: { a: 1 }, currentStep: 0 })).toBe(false);
    expect(() => clearDraft(42)).not.toThrow();
    setItem.mockRestore();
  });

  // Found by hostile review of the S4 wizard wiring: an "anonymous" fallback key
  // would let two different clients on one browser inherit each other's health
  // answers, so the wizard requires a REAL user id before enabling drafts.
  it('gives anonymous its own key, distinct from any real user', () => {
    expect(draftKeyFor(null)).toBe(draftKeyFor(undefined));
    expect(draftKeyFor(null)).not.toBe(draftKeyFor(7));
  });

  it('survives reads throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => readDraft(42)).not.toThrow();
    expect(readDraft(42)).toBeNull();
  });
});
