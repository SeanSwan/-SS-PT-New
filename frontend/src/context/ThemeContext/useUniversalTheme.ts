/**
 * useUniversalTheme.ts
 * ====================
 *
 * The theme context object, its type, and the two hooks that read it.
 *
 * Extracted from `UniversalThemeContext.tsx` under Rule 4's remedy list ("extract hooks,
 * utils, styles, types") — the provider had reached 298/300 lines, and Astra's R5 review
 * (A1-02) required extending it, which is not possible without first moving something out.
 *
 * The split is provider / consumers, and it is one-directional: this module owns the
 * context, the provider imports it to supply a value, and nothing here imports the
 * provider — so there is no cycle. `UniversalThemeContext.tsx` re-exports everything
 * defined here, so no importer changed.
 */

import { createContext, useContext } from 'react';
import type { CrystallineTheme, ThemeId } from './themePalettes';
import type { PersistenceStatus } from './useThemePreference';

export interface ThemeContextType {
  currentTheme: ThemeId;
  theme: CrystallineTheme;
  setTheme: (themeId: ThemeId) => void;
  /** Cycle one step; pass -1 to walk the cycle backwards. */
  toggleTheme: (direction?: 1 | -1) => void;
  availableThemes: Array<{ id: ThemeId; name: string }>;
  /** True when the active theme has a light page background. */
  isLightTheme: boolean;
  /** When true the active theme tracks the OS colour scheme. */
  followSystemTheme: boolean;
  setFollowSystemTheme: (follow: boolean) => void;
  /**
   * What the OS currently asks for, independent of the active theme. Kept fresh even
   * while `followSystemTheme` is false, because the lens label renders it as current —
   * see `themeSystemPreference.test.tsx` for the measured failure when it was not.
   */
  systemPrefersDark: boolean;
  /**
   * Whether the last local write is known to have persisted. `unverified` before any
   * local write; `saved` after a write whose readback matched; `session-only` after a
   * write or readback failure. The lens renders a save notice from this — see S3.
   */
  persistenceStatus: PersistenceStatus;
  /** True only after an unsuccessful local persistence attempt. */
  pendingLocalWrite: boolean;
  /** One attempt to save the current desired preference. Never retries automatically. */
  retryThemePersistence: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useUniversalTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useUniversalTheme must be used within a UniversalThemeProvider');
  }
  return context;
};

/**
 * Hook for accessing the theme inside styled-components.
 * Usage: `const theme = useStyledTheme();`
 */
export const useStyledTheme = (): CrystallineTheme => {
  const { theme } = useUniversalTheme();
  return theme;
};
