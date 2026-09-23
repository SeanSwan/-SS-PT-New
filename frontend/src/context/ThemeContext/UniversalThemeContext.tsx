/**
 * UniversalThemeContext.tsx
 * =========================
 *
 * Crystalline Swan theme system — the provider, the context and the hooks.
 *
 * Split out of what was a single 1890-line module (Rule 4 caps a file at 300):
 * - the 28 palettes live in `themePalettes.ts` (data, no logic)
 * - persistence and first-render resolution live in `themePersistence.ts`
 * - this module is the provider and nothing else
 *
 * Everything the old module exported is still exported from here, so no importer
 * had to change. `themes` / `themeCycle` / `ThemeId` / the storage keys and
 * helpers are re-exported below.
 *
 * Master Palette — Preset F-Alt "Enchanted Apex: Crystalline Swan"
 * - Midnight Sapphire #002060 — Primary / logo deep navy
 * - Royal Depth #003080 — Surface / logo circle
 * - Ice Wing #60C0F0 — Gaming accent / wing highlight
 * - Arctic Cyan #50A0F0 — Secondary accent / feathers
 * - Gilded Fern #C6A84B — Luxury gold accent
 * - Frost White #E0ECF4 — Light background / head highlight
 * - Swan Lavender #4070C0 — Tertiary / mid-body purple-blue
 */

import React, {
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { ThemeProvider as StyledThemeProvider, type DefaultTheme } from 'styled-components';
import { injectThemeVariables } from '../../utils/theme/themeUtils';
import { swanStudiosTheme } from '../../core/theme';
import { themes, type ThemeId } from './themePalettes';
import { isLightBackground } from './themeColorMath';
import { useCrossTabThemeSync } from './useCrossTabThemeSync';
import { ThemeContext, type ThemeContextType } from './useUniversalTheme';
import { useThemePreference } from './useThemePreference';

// === RE-EXPORTS ===
// The palette table and the persistence rules moved to their own modules; these
// re-exports keep every existing import path working.
export { themes, themeCycle } from './themePalettes';
export type { ThemeId, CrystallineTheme } from './themePalettes';
export {
  FOLLOW_SYSTEM_STORAGE_KEY,
  SYSTEM_DARK_THEME,
  SYSTEM_LIGHT_THEME,
  THEME_STORAGE_KEY,
  getSystemTheme,
  isKnownThemeId,
  prefersDarkColorScheme,
  safeReadStorage,
  safeWriteStorage,
  shouldFollowSystem,
} from './themePersistence';
// Resolution moved to its own module under S1 and is re-exported here so the existing
// import path keeps working. `resolveInitialTheme` used to be DEFINED in
// `themePersistence.ts` with its own copy of the precedence rules; it now delegates to
// the shared resolver, so there is one implementation rather than two.
export {
  resolveInitialTheme,
  resolveStartupPreference,
} from './themePreferenceSnapshot';

// === THEME CONTEXT ===
// The context object, its type and the two reader hooks live in `useUniversalTheme.ts`
// (extracted under Rule 4). Re-exported here so no importer changed.
export {
  ThemeContext,
  useStyledTheme,
  useUniversalTheme,
  type ThemeContextType,
} from './useUniversalTheme';

interface UniversalThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeId;
}

export const UniversalThemeProvider: React.FC<UniversalThemeProviderProps> = ({
  children,
  defaultTheme = 'crystalline-default',
}) => {
  /*
   * All preference state, the write/retry logic and the reconciliation decision live in
   * `useThemePreference.ts` (extracted under S1). What remains in this module is
   * composition: CSS injection, the styled-theme bridge, and the memoised context value.
   */
  const {
    currentTheme,
    followSystemTheme,
    systemPrefersDark,
    persistenceStatus,
    pendingLocalWrite,
    setTheme,
    toggleTheme,
    setFollowSystemTheme,
    retryThemePersistence,
    reconcileFromStorage,
  } = useThemePreference(defaultTheme);

  /**
   * Apply the CSS variables BEFORE the browser paints. `useLayoutEffect` runs after
   * DOM mutation but ahead of paint, so there is no frame showing the previous
   * theme's variables.
   */
  useLayoutEffect(() => {
    injectThemeVariables(currentTheme);
  }, [currentTheme]);

  /*
   * Keep every open tab on the same theme. The listener decides WHEN to reconcile —
   * event filtering, `pageshow` and return-to-visible live in `useCrossTabThemeSync.ts`
   * — while the owner decides WHAT the result is. Neither trusts the event payload; see
   * that module for the measured failure where a delayed payload discarded a local pick.
   */
  useCrossTabThemeSync({ reconcile: reconcileFromStorage });

  // Memoised: these were rebuilt on every provider render, re-rendering all
  // consumers of useUniversalTheme().
  const availableThemes = useMemo(
    () => Object.entries(themes).map(([id, theme]) => ({ id: id as ThemeId, name: theme.name })),
    []
  );

  const isLightTheme = useMemo(
    () => isLightBackground(themes[currentTheme].background.primary),
    [currentTheme]
  );

  const contextValue: ThemeContextType = useMemo(
    () => ({
      currentTheme,
      theme: themes[currentTheme],
      setTheme,
      toggleTheme,
      availableThemes,
      isLightTheme,
      followSystemTheme,
      setFollowSystemTheme,
      systemPrefersDark,
      persistenceStatus,
      pendingLocalWrite,
      retryThemePersistence,
    }),
    [
      currentTheme,
      setTheme,
      toggleTheme,
      availableThemes,
      isLightTheme,
      followSystemTheme,
      setFollowSystemTheme,
      systemPrefersDark,
      persistenceStatus,
      pendingLocalWrite,
      retryThemePersistence,
    ]
  );

  // Merge the base swanStudiosTheme with the active Crystalline Swan theme
  // so components using old property paths (theme.typography, theme.spacing, etc.)
  // still work, while new theme values (theme.background.primary, etc.) are dynamic
  const mergedTheme = useMemo(() => ({
    ...swanStudiosTheme,
    ...themes[currentTheme],
  }), [currentTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <StyledThemeProvider theme={mergedTheme as unknown as DefaultTheme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

// === GLOW BUTTON / LOOKUP HELPERS ===
// The pure lookups live in themeAccessors.ts (no React, so no import cycle with
// this module); re-exported here so existing import paths keep working.
export {
  getGlowButtonVariant,
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
} from './themeAccessors';

export default UniversalThemeProvider;
