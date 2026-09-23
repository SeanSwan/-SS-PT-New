/**
 * themeTestProbe.tsx
 * ==================
 *
 * A test instrument, shared by the cross-tab / write-path / system-preference suites.
 * It mounts the REAL `UniversalThemeProvider` with a probe child that exposes the same
 * setters the lens UI calls, and reports what the provider is currently doing.
 *
 * Why the real provider and not a mock: the defects this lane has produced were all in
 * the wiring between the setter, the storage write and the listener. A mocked provider
 * cannot have that class of bug.
 *
 * It lives in `src/` rather than a `test/` folder because the lane's other instrument
 * (`themeContrastInstrument.ts`) does, and because Rule 4's walker covers this directory
 * — so this file is line-capped like production code rather than growing freely.
 *
 * jsdom has no `matchMedia`; the provider treats a throw as "prefers dark". A suite that
 * needs a real OS change must install its own stub (see `themeSystemPreference.test.tsx`).
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  UniversalThemeProvider,
  useUniversalTheme,
  type ThemeId,
} from './UniversalThemeContext';

export interface ProbeState {
  theme: string | null;
  follow: string | null;
}

// === STORAGE EVENT DELIVERY ===
//
// Shared by `themeCrossTab.test.tsx` and `themeCrossTabResets.test.tsx`. It lives here
// rather than in either suite because a helper duplicated across two files is a helper
// that will drift.

/**
 * Deliver a `storage` event the way a REAL BROWSER does.
 *
 * `storageArea` defaults to the live `localStorage`, and that default is load-bearing: a
 * synthetic event that omits it carries `storageArea: null`, which `03-contracts.md` says
 * is "not production authority", and the strict guard drops it. Omitting it is how the
 * cross-tab suite's earlier cases came to pass WITHOUT exercising the listener at all —
 * the old guard read `event.storageArea && ...`, and `&&` short-circuits on null. Four of
 * them went red the moment the guard became strict.
 *
 * Pass `storageArea: null` or another area explicitly to test the guard itself.
 */
export const deliverStorageEvent = (init: {
  key: string | null;
  newValue?: string | null;
  oldValue?: string | null;
  storageArea?: Storage | null;
}): void => {
  window.dispatchEvent(new StorageEvent('storage', {
    storageArea: init.storageArea === undefined ? window.localStorage : init.storageArea,
    key: init.key,
    newValue: init.newValue ?? null,
    oldValue: init.oldValue ?? null,
  }));
};

/** Every key/value in `localStorage`, so "wrote nothing" can be asserted exactly. */
export const snapshotStorage = (): Record<string, string> => {
  const entries: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key !== null) entries[key] = window.localStorage.getItem(key) ?? '';
  }
  return entries;
};

export interface ProbeHandle {
  container: HTMLElement;
  /** What the provider is rendering right now. */
  read: () => ProbeState;
  /** Calls the same setter the picker's "Match system" switch calls. */
  setFollow: (follow: boolean) => void;
  /** Calls the same setter the picker's theme options call. */
  setTheme: (id: ThemeId) => void;
  /** What the provider currently reports the OS as wanting. */
  readSystemPrefersDark: () => boolean;
  /** `persistenceStatus` as the lens would read it. */
  readPersistenceStatus: () => string;
  /** `pendingLocalWrite` as the lens would read it. */
  readPendingLocalWrite: () => boolean;
  /** Calls the same retry the lens's save notice calls. */
  retryPersistence: () => void;
  /**
   * Every distinct (theme, follow) pair rendered so far, in order.
   *
   * A two-update implementation of a peer adoption renders an intermediate pair that
   * never existed in storage; asserting on this list is how a case can catch that.
   */
  readHistory: () => ProbeState[];
}

export const mountProbe = (): ProbeHandle => {
  let followApi: ((follow: boolean) => void) | null = null;
  let themeApi: ((id: ThemeId) => void) | null = null;
  let systemApi: (() => boolean) | null = null;
  let statusApi: (() => string) | null = null;
  let pendingApi: (() => boolean) | null = null;
  let retryApi: (() => void) | null = null;

  /*
   * Every DISTINCT (theme, follow) pair the provider has rendered, in order.
   *
   * This is what makes "apply a complete resolved preference in one state update"
   * observable rather than aspirational: a two-update implementation renders an
   * intermediate pair that never existed in storage, and that pair shows up here.
   * Consecutive duplicates are collapsed, because React re-rendering with the same values
   * is not a second state.
   */
  const history: ProbeState[] = [];

  const ProbeComponent: React.FC = () => {
    const {
      currentTheme,
      followSystemTheme,
      setFollowSystemTheme,
      setTheme,
      systemPrefersDark,
      persistenceStatus,
      pendingLocalWrite,
      retryThemePersistence,
    } = useUniversalTheme();

    followApi = setFollowSystemTheme;
    themeApi = setTheme;
    systemApi = () => systemPrefersDark;
    statusApi = () => persistenceStatus;
    pendingApi = () => pendingLocalWrite;
    retryApi = retryThemePersistence;

    const pair: ProbeState = { theme: currentTheme, follow: String(followSystemTheme) };
    const last = history[history.length - 1];
    if (!last || last.theme !== pair.theme || last.follow !== pair.follow) history.push(pair);

    return React.createElement('div', {
      'data-theme-id': currentTheme,
      'data-follow': String(followSystemTheme),
      'data-persistence': persistenceStatus,
    });
  };

  const { container } = render(
    React.createElement(UniversalThemeProvider, null, React.createElement(ProbeComponent))
  );

  const read = (): ProbeState => {
    const el = container.querySelector('[data-theme-id]') as HTMLElement;
    return {
      theme: el.getAttribute('data-theme-id'),
      follow: el.getAttribute('data-follow'),
    };
  };

  return {
    container,
    read,
    setFollow: (f: boolean) => followApi?.(f),
    setTheme: (id: ThemeId) => themeApi?.(id),
    readSystemPrefersDark: () => systemApi?.() ?? false,
    readPersistenceStatus: () => statusApi?.() ?? 'unmounted',
    readPendingLocalWrite: () => pendingApi?.() ?? false,
    retryPersistence: () => retryApi?.(),
    readHistory: () => history.map((pair) => ({ ...pair })),
  };
};
