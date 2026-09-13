/**
 * resolveSelectedClientAdvice — S05 / R-H22 pure adapter tests
 * ==========================================================
 * H22-T3 (every unknown state) and the pure half of H22-T1/T2/T5.
 * The rendered component and the hook are covered separately.
 */

import { describe, expect, it } from 'vitest';
import {
  resolveSelectedClientAdvice,
  SELECTED_CLIENT_ADVICE_COPY,
  type ResolveSelectedClientAdviceInput,
} from './resolveSelectedClientAdvice';

const ROSTER = [
  { id: 1, initials: 'AA' },
  { id: 2, initials: 'BB' },
];

const base: ResolveSelectedClientAdviceInput = {
  selectedClientId: 2,
  roster: ROSTER,
  listStatus: 'ready',
  listClientId: 2,
  plans: [],
};

const resolve = (over: Partial<ResolveSelectedClientAdviceInput> = {}) =>
  resolveSelectedClientAdvice({ ...base, ...over });

describe('resolveSelectedClientAdvice', () => {
  it('offers picker focus only when no client is selected', () => {
    const advice = resolve({ selectedClientId: null });
    expect(advice.kind).toBe('no-client');
    expect(advice.copy).toBe(SELECTED_CLIENT_ADVICE_COPY.noClient);
  });

  it('reports a ready active plan for the selected client', () => {
    const advice = resolve({ plans: [{ active: true }] });
    expect(advice.kind).toBe('ready-active');
    expect(advice.copy).toBe('Current plan available');
  });

  it('reports no active plan ONLY from a ready list for the same client', () => {
    const advice = resolve({ plans: [{ active: false }] });
    expect(advice).toEqual({
      kind: 'ready-empty',
      copy: 'BB has no active plan',
      clientId: 2,
      action: 'offer-draft',
    });
  });

  it('treats a valid empty ready array as real absence', () => {
    expect(resolve({ plans: [] }).kind).toBe('ready-empty');
  });

  // ── H22-T3: no unknown state may ever be read as absence ──────────────────

  it('never reports absence while the read is idle or loading', () => {
    for (const listStatus of ['idle', 'loading'] as const) {
      const advice = resolve({ listStatus, listClientId: null });
      expect(advice.kind).toBe('checking');
      expect(advice.copy).toBe(SELECTED_CLIENT_ADVICE_COPY.checking);
    }
  });

  it('never reports absence from an error or denied read', () => {
    const advice = resolve({ listStatus: 'error', listClientId: null, plans: [] });
    expect(advice).toEqual({
      kind: 'unavailable',
      copy: 'Saved plans unavailable',
      action: 'retry',
    });
  });

  it('never reports absence when the ready list belongs to another client', () => {
    const advice = resolve({ listStatus: 'ready', listClientId: 1, plans: [] });
    expect(advice.kind).toBe('checking');
  });

  it('never reports absence when the ready list has no identity at all', () => {
    const advice = resolve({ listStatus: 'ready', listClientId: null, plans: [] });
    expect(advice.kind).toBe('checking');
  });

  it('never reports absence for an unrecognised selected roster entry', () => {
    const advice = resolve({ selectedClientId: 99, listClientId: null, plans: [] });
    expect(advice.kind).toBe('checking');
  });

  it('ignores plan facts that do not belong to an identified list', () => {
    // A stale active flag from a different client must not become this client's
    // "current plan available" either.
    expect(resolve({ listClientId: 1, plans: [{ active: true }] }).kind).toBe('checking');
    expect(resolve({ listStatus: 'error', plans: [{ active: true }] }).kind).toBe('unavailable');
  });

  it('exposes no client id on any non-empty-advice branch', () => {
    // Only the real draft offer may carry an id; a client-changing action is
    // impossible by construction.
    for (const over of [
      { selectedClientId: null },
      { listStatus: 'loading' as const },
      { listStatus: 'error' as const },
      { plans: [{ active: true }] },
      { selectedClientId: 99 },
    ]) {
      expect('clientId' in resolve(over)).toBe(false);
    }
  });

  it('names the selected client by initials only', () => {
    const advice = resolve({ plans: [] });
    expect(advice.kind).toBe('ready-empty');
    if (advice.kind === 'ready-empty') {
      expect(advice.copy).toBe('BB has no active plan');
      // The other roster entry's initials never appear in B's advice.
      expect(advice.copy).not.toContain('AA');
    }
  });
});
