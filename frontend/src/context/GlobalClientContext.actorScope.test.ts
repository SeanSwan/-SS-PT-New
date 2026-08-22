/**
 * GlobalClientContext — actor-scoped pinned client
 * ================================================
 * Regression cover for SWA-192 P0-4.
 *
 * BEFORE: the pinned client lived at a FIXED sessionStorage key
 * (`ss-active-client`) holding the FULL client record — including email — with
 * no actor namespace, no clear on logout or actor change, and a reconciliation
 * effect that returned early (leaving the pin intact) when the pinned client was
 * absent from the freshly fetched authorised roster.
 *
 * Fable's ruling raised this from P2 to P1 on a threat model everyone else
 * missed: trainers share front-desk kiosks and floor tablets. sessionStorage is
 * per-tab and SURVIVES logout in that tab, so Trainer A logs out, Trainer B logs
 * in on the same kiosk, and Trainer A's pinned client — name and email —
 * hydrates into Trainer B's session. No crafted request, no malice.
 *
 * Two invariants are pinned here:
 *   1. the key is namespaced by actor, so B can never read A's pin; and
 *   2. only the client ID is persisted, and it is rehydrated ONLY from the
 *      freshly fetched authorised roster — so a pin that is no longer on the
 *      roster resolves to null instead of surviving.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  LEGACY_ACTIVE_CLIENT_KEY,
  activeClientStorageKey,
  purgeLegacyActiveClient,
  readStoredActiveClientId,
  reconcileActiveClient,
  writeStoredActiveClientId,
} from './GlobalClientContext';

/** Minimal in-memory Storage stand-in. */
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, v); },
  } as Storage;
}

const roster = [
  { id: 42, firstName: 'Jane', lastName: 'Client', email: 'c42@example.test' },
  { id: 77, firstName: 'Sam', lastName: 'Client', email: 'c77@example.test' },
] as any[];

let storage: Storage;
beforeEach(() => { storage = makeStorage(); });

describe('activeClientStorageKey', () => {
  it('namespaces the key by actor id and role', () => {
    expect(activeClientStorageKey(101, 'trainer')).toBe('ss-active-client:101:trainer');
  });

  it('gives two actors on the same kiosk different keys', () => {
    expect(activeClientStorageKey(101, 'trainer')).not.toBe(activeClientStorageKey(202, 'trainer'));
  });

  it('separates the same person acting in a different role', () => {
    expect(activeClientStorageKey(1, 'admin')).not.toBe(activeClientStorageKey(1, 'trainer'));
  });

  it('returns null for an unusable actor rather than a shared fallback key', () => {
    expect(activeClientStorageKey(null as any, 'trainer')).toBeNull();
    expect(activeClientStorageKey(101, '' as any)).toBeNull();
  });
});

describe('persistence stores only the id', () => {
  it('writes the bare id, never the client record', () => {
    writeStoredActiveClientId(storage, 101, 'trainer', 42);

    const raw = storage.getItem('ss-active-client:101:trainer');
    expect(raw).toBe('42');
    // The whole record — and the email in it — must not be persisted.
    expect(raw).not.toContain('example.test');
    expect(raw).not.toContain('Jane');
  });

  it('round-trips the id for the same actor', () => {
    writeStoredActiveClientId(storage, 101, 'trainer', 42);
    expect(readStoredActiveClientId(storage, 101, 'trainer')).toBe(42);
  });

  it('does not expose one actor\'s pin to another actor', () => {
    writeStoredActiveClientId(storage, 101, 'trainer', 42);
    // Trainer B on the same shared kiosk, same tab.
    expect(readStoredActiveClientId(storage, 202, 'trainer')).toBeNull();
  });

  it('clears the pin when null is written', () => {
    writeStoredActiveClientId(storage, 101, 'trainer', 42);
    writeStoredActiveClientId(storage, 101, 'trainer', null);
    expect(readStoredActiveClientId(storage, 101, 'trainer')).toBeNull();
  });

  it('treats a corrupt stored value as no pin', () => {
    storage.setItem('ss-active-client:101:trainer', 'not-a-number');
    expect(readStoredActiveClientId(storage, 101, 'trainer')).toBeNull();
  });
});

describe('legacy key purge', () => {
  it('removes the old unscoped record so stale PII cannot linger', () => {
    storage.setItem(LEGACY_ACTIVE_CLIENT_KEY, JSON.stringify({ id: 42, email: 'c42@example.test' }));

    purgeLegacyActiveClient(storage);

    expect(storage.getItem(LEGACY_ACTIVE_CLIENT_KEY)).toBeNull();
  });
});

describe('reconcileActiveClient — rehydrate only from the authorised roster', () => {
  it('resolves a pinned id against the fresh roster', () => {
    expect(reconcileActiveClient(42, roster)).toMatchObject({ id: 42, firstName: 'Jane' });
  });

  it('DROPS a pin that is absent from the fresh roster', () => {
    // The old effect returned early here, leaving the stale pin in place.
    expect(reconcileActiveClient(999, roster)).toBeNull();
  });

  it('returns null when there is no pin', () => {
    expect(reconcileActiveClient(null, roster)).toBeNull();
  });

  it('resolves to null against an empty roster', () => {
    // Deliberately a pure function of (pin, roster) with no loading sentinel:
    // "still fetching" is provider state, and encoding it here as a third
    // return value is the kind of tri-state that gets misread at the call site.
    // The provider only reconciles once the roster has actually loaded.
    expect(reconcileActiveClient(42, [])).toBeNull();
  });
});
