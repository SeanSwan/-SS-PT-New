/**
 * themeStorageFailures.test.tsx
 * =============================
 *
 * Astra R6 S1, `09-tests.md` T3 — what happens when persistence FAILS.
 *
 * ── HOW FAILURE IS INDUCED, AND WHY NOT BY REPLACING `localStorage` ───────────
 *
 * The obvious approach is to swap `window.localStorage` for a stub. It does not work here,
 * and both reasons were measured on 2026-09-20:
 *
 *   - `new StorageEvent('storage', { storageArea: stub })` THROWS, because jsdom validates
 *     that `storageArea` is a genuine `Storage`. So a replaced object cannot be used to
 *     deliver a peer event.
 *   - even setting it aside, `useCrossTabThemeSync` obtains its handle ONCE inside the
 *     guarded boundary and compares with strict equality, so an event carrying the genuine
 *     object would be rejected against a stub handle — and restoring the real object after
 *     mount does not help, because the handle was already captured.
 *
 * And `vi.spyOn(storage, 'setItem')` does not work either: jsdom's `Storage` proxy resolves
 * its API members without consulting own properties on the instance, so the mock is
 * installed and never called (measured; see `themePreferenceSnapshot.test.ts`).
 *
 * What DOES work is patching `Storage.prototype.setItem`. It is an own, writable, data
 * property of `Storage.prototype`, the proxy reads it through on every call, and the
 * object identity of `window.localStorage` is untouched — so peer events still validate and
 * still match the captured handle.
 *
 * The patch distinguishes THREE write outcomes, and the middle one is why this suite
 * exists:
 *
 *   'ok'      the write lands
 *   'throw'   the write raises — private mode, policy, a blocked origin
 *   'silent'  the write returns normally and stores NOTHING — a quota or policy drop that
 *             does not raise. A "did `setItem` throw?" check calls this a success; the
 *             contract's READBACK requirement is what catches it.
 *
 * `writeThemePreference` must therefore judge success from what it can READ BACK, not from
 * whether a call raised. `readback mismatch is not saved` fails if that regresses.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import { FOLLOW_SYSTEM_STORAGE_KEY, THEME_STORAGE_KEY } from './UniversalThemeContext';
import { deliverStorageEvent, mountProbe } from './themeTestProbe';

type WriteBehaviour = 'ok' | 'throw' | 'silent';

interface WriteControls {
  /** Programme what subsequent writes to a key do. Reads are never affected. */
  behave: (key: string, mode: WriteBehaviour) => void;
  /** How many `setItem` calls reached the patched method, per key. */
  writeAttempts: () => Record<string, number>;
  restore: () => void;
}

const installWriteControls = (): WriteControls => {
  const proto = Object.getPrototypeOf(window.localStorage) as Storage;
  const originalSetItem = proto.setItem;
  const behaviour = new Map<string, WriteBehaviour>();
  const attempts: Record<string, number> = {};

  proto.setItem = function controlledSetItem(this: Storage, key: string, value: string) {
    attempts[key] = (attempts[key] ?? 0) + 1;
    const mode = behaviour.get(key) ?? 'ok';
    if (mode === 'throw') throw new Error('write denied');
    if (mode === 'silent') return;
    return originalSetItem.call(this, key, value);
  } as Storage['setItem'];

  return {
    behave: (key, mode) => {
      behaviour.set(key, mode);
    },
    writeAttempts: () => ({ ...attempts }),
    restore: () => {
      proto.setItem = originalSetItem;
    },
  };
};

let controls: WriteControls | null = null;

const withWriteControls = (): WriteControls => {
  controls = installWriteControls();
  return controls;
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  // Restore the prototype BEFORE clearing, so a patched writer cannot turn cleanup into a
  // second failure that hides the first.
  controls?.restore();
  controls = null;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('storage write failures', () => {
  it('first write failure retains local choice', async () => {
    // Seeded BEFORE the controls are installed: the patch counts every `setItem`, and a
    // seed routed through it would inflate the attempt count this case asserts on.
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');

    const write = withWriteControls();
    // The FIRST write of a manual operation is the theme key.
    write.behave(THEME_STORAGE_KEY, 'throw');

    const { read, setTheme, readPersistenceStatus, readPendingLocalWrite } = mountProbe();

    await act(async () => {
      setTheme('solar-gold');
    });

    // The choice is on screen and in memory — the theme still applies, it just will not
    // survive a reload, and the status says so.
    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
    expect(readPersistenceStatus()).toBe('session-only');
    expect(readPendingLocalWrite()).toBe(true);

    // Storage still holds the OLD theme. There are no compensating writes and no silent
    // repair: the failure is reported, not papered over.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('crystalline-light');
    expect(write.writeAttempts()[THEME_STORAGE_KEY]).toBe(1);
  });

  it('second write failure reports session-only', async () => {
    const write = withWriteControls();
    /*
     * The pre-existing flag value is deliberately INVALID rather than 'false'. A manual
     * operation's second write sets the flag to 'false', so seeding 'false' would make a
     * FAILED second write read back as a match and report `saved`. Rule 6 says invalid
     * follow values behave as false, so this is a reachable state — and it is the only way
     * the second write's failure is observable at all.
     */
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'garbage');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');
    write.behave(FOLLOW_SYSTEM_STORAGE_KEY, 'throw');

    const { read, setTheme, readPersistenceStatus } = mountProbe();

    await act(async () => {
      setTheme('solar-gold');
    });

    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
    expect(readPersistenceStatus()).toBe('session-only');

    // The first write DID land and is left in place. Unwinding it would clobber a decision
    // another tab may have made in between — the contract forbids compensating writes.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('solar-gold');
    expect(window.localStorage.getItem(FOLLOW_SYSTEM_STORAGE_KEY)).toBe('garbage');
  });

  it('readback mismatch is not saved', async () => {
    const write = withWriteControls();
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');
    // Returns normally and stores nothing — the failure a try/catch would miss.
    write.behave(THEME_STORAGE_KEY, 'silent');

    const { read, setTheme, readPersistenceStatus, readPendingLocalWrite } = mountProbe();

    await act(async () => {
      setTheme('solar-gold');
    });

    expect(read().theme).toBe('solar-gold');
    expect(readPersistenceStatus()).toBe('session-only');
    expect(readPendingLocalWrite()).toBe(true);

    // `setItem` did not raise, so nothing about the call itself indicates failure. Only
    // the readback does.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('crystalline-light');
  });

  it('peer event preserves pending local choice', async () => {
    const write = withWriteControls();
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');
    write.behave(THEME_STORAGE_KEY, 'throw');

    const { read, setTheme, readPendingLocalWrite } = mountProbe();

    await act(async () => {
      setTheme('solar-gold');
    });
    expect(readPendingLocalWrite()).toBe(true);

    await act(async () => {
      // A peer's write lands and we receive its event. Storage now disagrees with the
      // screen — exactly the situation the pending flag has to arbitrate. The event
      // validates because `localStorage` is still the genuine object.
      write.behave(THEME_STORAGE_KEY, 'ok');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'enchanted-forest');
      deliverStorageEvent({ key: THEME_STORAGE_KEY, newValue: 'enchanted-forest', oldValue: 'crystalline-light' });
    });

    // The unsaved local choice WINS. Adopting here would silently discard what the user
    // just picked — the measured A1-01 failure.
    expect(read()).toEqual({ theme: 'solar-gold', follow: 'false' });
  });

  it('retry saves current desired preference once', async () => {
    const write = withWriteControls();
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'crystalline-light');
    write.behave(THEME_STORAGE_KEY, 'throw');

    const { read, setTheme, readPersistenceStatus, readPendingLocalWrite, retryPersistence } = mountProbe();

    await act(async () => {
      setTheme('solar-gold');
    });
    expect(readPersistenceStatus()).toBe('session-only');

    const attemptsBefore = write.writeAttempts()[THEME_STORAGE_KEY] ?? 0;

    // The obstruction clears and the user presses "Save preference".
    write.behave(THEME_STORAGE_KEY, 'ok');
    await act(async () => {
      retryPersistence();
    });

    expect(readPersistenceStatus()).toBe('saved');
    expect(readPendingLocalWrite()).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('solar-gold');
    expect(read().theme).toBe('solar-gold');

    // ONE attempt. The contract forbids automatic retry, and a retry loop against a
    // storage area failing for an unfixable reason would never terminate.
    expect((write.writeAttempts()[THEME_STORAGE_KEY] ?? 0) - attemptsBefore).toBe(1);
  });

  it('enable-follow requires only follow readback', async () => {
    const write = withWriteControls();
    window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'false');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');
    // The theme key cannot be written. Enable-follow must not care — it never writes it.
    write.behave(THEME_STORAGE_KEY, 'throw');

    const { read, setFollow, readPersistenceStatus } = mountProbe();

    await act(async () => {
      setFollow(true);
    });

    expect(read()).toEqual({ theme: 'crystalline-dark', follow: 'true' });
    // `saved`, because enable-follow writes and reads back ONLY the flag. Requiring the
    // theme key to match would fail a write that is entirely correct.
    expect(readPersistenceStatus()).toBe('saved');
    expect(window.localStorage.getItem(FOLLOW_SYSTEM_STORAGE_KEY)).toBe('true');
    // And the theme key is untouched, because nothing asked it to change.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('solar-gold');
  });
});
