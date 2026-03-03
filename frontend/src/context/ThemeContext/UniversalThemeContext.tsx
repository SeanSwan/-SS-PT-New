/**
 * UniversalThemeContext.tsx
 * ========================
 *
 * Crystalline Swan Theme System for SwanStudios Platform
 *
 * Features:
 * - Three Crystalline Swan variants: Default, Light, Dark
 * - Palette derived from the SwanStudios swan logo
 * - Seamless theme switching with localStorage persistence
 * - WCAG AA accessibility compliance
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

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { injectThemeVariables } from '../../utils/theme/themeUtils';
import { swanStudiosTheme } from '../../core/theme';

// === TYPOGRAPHY STACKS ===
const fonts = {
  heading: '"Plus Jakarta Sans", "Sora", sans-serif',
  drama: '"Cormorant Garamond", Georgia, serif',
  data: '"Fira Code", "Cascadia Code", monospace',
  ui: '"Sora", "Plus Jakarta Sans", sans-serif',
};

// === THEME DEFINITIONS ===

/**
 * CRYSTALLINE DEFAULT THEME — "Crystalline Swan"
 * Enhanced Enchanted Navy with aurora-effect hero, glass cards, and Ice Wing glow halos.
 * Background: #001545 (deeper navy)
 * Primary accent: #60C0F0 (Ice Wing)
 * Gold accent: #C6A84B (Gilded Fern) — more prominent
 */
const crystallineDefault = {
  id: 'crystalline-default' as const,
  name: 'Crystalline Swan',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'subtle' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#001545',
    stardust: '#002060',
    void: '#000A20',

    primary: '#60C0F0',
    primaryBlue: '#50A0F0',
    primaryDeep: '#4070C0',
    primaryLight: '#90D4F8',
    primaryNeon: '#60C0F0',

    secondary: '#4070C0',
    secondaryLight: '#6090D0',
    secondaryDeep: '#003080',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    white: '#E0ECF4',
    silver: '#E0ECF4',
    muted: 'rgba(224, 236, 244, 0.7)',
    error: '#FF6B6B',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #001545, #60C0F0)',
    secondary: 'linear-gradient(135deg, #002060, #4070C0)',
    cosmic: 'linear-gradient(135deg, #001545, #50A0F0)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(96,192,240,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(198,168,75,0.1) 0%, transparent 50%), radial-gradient(ellipse at center, #002060 0%, #001545 70%)',
    card: 'linear-gradient(135deg, rgba(0, 48, 128, 0.5), rgba(96, 192, 240, 0.08))',
    accent: 'linear-gradient(135deg, #001545, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #4070C0)',
    glass: 'linear-gradient(135deg, rgba(0, 32, 96, 0.5), rgba(96, 192, 240, 0.12))',
  },
  shadows: {
    primary: '0 0 25px rgba(96, 192, 240, 0.25)',
    secondary: '0 0 20px rgba(64, 112, 192, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(96, 192, 240, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(0, 21, 69, 0.4)',
    button: '0 4px 20px rgba(96, 192, 240, 0.3)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)',
    elegant: 'rgba(96, 192, 240, 0.2)',
    prominent: 'rgba(80, 160, 240, 0.4)',
    glass: '1px solid rgba(96, 192, 240, 0.18)',
    card: '1px solid rgba(96, 192, 240, 0.15)',
    focus: '2px solid #60C0F0',
  },
  background: {
    primary: '#001545',
    secondary: '#002060',
    surface: 'rgba(0, 48, 128, 0.6)',
    elevated: 'rgba(0, 48, 128, 0.4)',
  },
  text: {
    primary: '#E0ECF4',
    secondary: 'rgba(224, 236, 244, 0.85)',
    muted: 'rgba(224, 236, 244, 0.6)',
    heading: '#E0ECF4',
    subheading: 'rgba(224, 236, 244, 0.9)',
    body: 'rgba(224, 236, 244, 0.85)',
    label: 'rgba(224, 236, 244, 0.7)',
    accent: '#60C0F0',
  },
};

/**
 * ARCTIC DAWN THEME — "Arctic Dawn"
 * Clean professional light theme. Pure white backgrounds, solid cards,
 * NO glassmorphism, NO glow effects. Dramatically different from dark themes.
 * Background: #FFFFFF / #F0F4F8
 * Primary accent: #2563EB (vivid blue)
 * Gold accent: #C6A84B
 */
const crystallineLight = {
  id: 'crystalline-light' as const,
  name: 'Arctic Dawn',
  fonts,
  effects: {
    glassmorphism: false,
    glowIntensity: 'none' as const,
    cardStyle: 'solid' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#FFFFFF',
    stardust: '#F0F4F8',
    void: '#FAFBFC',

    primary: '#2563EB',
    primaryBlue: '#3B82F6',
    primaryDeep: '#1D4ED8',
    primaryLight: '#60A5FA',
    primaryNeon: '#2563EB',

    secondary: '#4070C0',
    secondaryLight: '#6090D0',
    secondaryDeep: '#002060',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#A88A30',

    white: '#FFFFFF',
    silver: '#F0F4F8',
    muted: 'rgba(15, 23, 42, 0.5)',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #2563EB, #3B82F6)',
    secondary: 'linear-gradient(135deg, #F0F4F8, #FFFFFF)',
    cosmic: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    hero: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)',
    card: '#FFFFFF',
    accent: 'linear-gradient(135deg, #C6A84B, #D8C478)',
    stellar: 'linear-gradient(45deg, #2563EB 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #2563EB, #4070C0)',
    glass: '#FFFFFF',
  },
  shadows: {
    primary: '0 1px 3px rgba(0, 32, 96, 0.08)',
    secondary: '0 1px 3px rgba(0, 32, 96, 0.06)',
    cosmic: '0 4px 16px rgba(0, 32, 96, 0.1), 0 1px 4px rgba(0, 32, 96, 0.06)',
    accent: '0 2px 8px rgba(198, 168, 75, 0.2)',
    elevation: '0 8px 24px rgba(0, 32, 96, 0.08)',
    glow: '0 0 0 transparent',
    glass: '0 1px 4px rgba(0, 32, 96, 0.05)',
    button: '0 2px 8px rgba(37, 99, 235, 0.25)',
  },
  borders: {
    subtle: '#E2E8F0',
    elegant: '#CBD5E1',
    prominent: '#94A3B8',
    glass: '1px solid #E2E8F0',
    card: '1px solid #E2E8F0',
    focus: '2px solid #2563EB',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F0F4F8',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    heading: '#0F172A',
    subheading: '#1E293B',
    body: '#475569',
    label: '#64748B',
    accent: '#2563EB',
  },
};

/**
 * VOID CRYSTAL THEME — "Void Crystal"
 * Sci-fi neon command center. Near-black backgrounds, aggressive neon glow,
 * vivid cyan primary, purple secondary. Maximum dramatic intensity.
 * Background: #030712 (near-black)
 * Primary accent: #22D3EE (vivid cyan)
 * Secondary accent: #A78BFA (vivid purple)
 * Gold accent: #F59E0B (amber)
 */
const crystallineDark = {
  id: 'crystalline-dark' as const,
  name: 'Void Crystal',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'intense' as const,
    cardStyle: 'neon' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#030712',
    stardust: '#0F172A',
    void: '#000000',

    primary: '#22D3EE',
    primaryBlue: '#06B6D4',
    primaryDeep: '#0891B2',
    primaryLight: '#67E8F9',
    primaryNeon: '#22D3EE',

    secondary: '#A78BFA',
    secondaryLight: '#C4B5FD',
    secondaryDeep: '#7C3AED',

    accent: '#F59E0B',
    accentLight: '#FBBF24',
    accentWarm: '#D97706',

    white: '#F1F5F9',
    silver: '#F1F5F9',
    muted: 'rgba(241, 245, 249, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #030712, #22D3EE)',
    secondary: 'linear-gradient(135deg, #0F172A, #A78BFA)',
    cosmic: 'linear-gradient(135deg, #030712, #06B6D4)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(34,211,238,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(167,139,250,0.08) 0%, transparent 50%), radial-gradient(ellipse at center, #0F172A 0%, #030712 70%)',
    card: 'rgba(15, 23, 42, 0.7)',
    accent: 'linear-gradient(135deg, #030712, #F59E0B)',
    stellar: 'linear-gradient(45deg, #22D3EE 0%, #F59E0B 100%)',
    swanCosmic: 'linear-gradient(135deg, #22D3EE, #A78BFA)',
    glass: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(34, 211, 238, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(34, 211, 238, 0.3)',
    secondary: '0 0 25px rgba(167, 139, 250, 0.25)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(34, 211, 238, 0.2)',
    accent: '0 0 20px rgba(245, 158, 11, 0.5)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(3, 7, 18, 0.6)',
    button: '0 4px 20px rgba(34, 211, 238, 0.35)',
  },
  borders: {
    subtle: 'rgba(34, 211, 238, 0.12)',
    elegant: 'rgba(34, 211, 238, 0.3)',
    prominent: 'rgba(34, 211, 238, 0.5)',
    glass: '1px solid rgba(34, 211, 238, 0.25)',
    card: '1px solid rgba(34, 211, 238, 0.2)',
    focus: '2px solid #22D3EE',
  },
  background: {
    primary: '#030712',
    secondary: '#0F172A',
    surface: 'rgba(15, 23, 42, 0.8)',
    elevated: 'rgba(15, 23, 42, 0.6)',
  },
  text: {
    primary: '#F1F5F9',
    secondary: 'rgba(241, 245, 249, 0.85)',
    muted: 'rgba(241, 245, 249, 0.55)',
    heading: '#F1F5F9',
    subheading: 'rgba(241, 245, 249, 0.9)',
    body: 'rgba(241, 245, 249, 0.85)',
    label: 'rgba(241, 245, 249, 0.65)',
    accent: '#22D3EE',
  },
};

// === THEME MAPPING ===
export const themes = {
  'crystalline-default': crystallineDefault,
  'crystalline-light': crystallineLight,
  'crystalline-dark': crystallineDark,
} as const;

export type ThemeId = keyof typeof themes;

// === THEME TYPE (union of all theme variants) ===
export type CrystallineTheme = (typeof themes)[ThemeId];

// === THEME CONTEXT ===
interface ThemeContextType {
  currentTheme: ThemeId;
  theme: CrystallineTheme;
  setTheme: (themeId: ThemeId) => void;
  toggleTheme: () => void;
  availableThemes: Array<{ id: ThemeId; name: string }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// === THEME PROVIDER ===
interface UniversalThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeId;
}

export const UniversalThemeProvider: React.FC<UniversalThemeProviderProps> = ({
  children,
  defaultTheme = 'crystalline-default'
}) => {
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('swanstudios-theme') as ThemeId;
    if (savedTheme && themes[savedTheme]) {
      setCurrentThemeState(savedTheme);
      injectThemeVariables(savedTheme);
    } else {
      // Inject default theme variables
      injectThemeVariables(defaultTheme);
    }
  }, [defaultTheme]);

  // Save theme to localStorage when changed
  const setTheme = (themeId: ThemeId) => {
    setCurrentThemeState(themeId);
    localStorage.setItem('swanstudios-theme', themeId);

    // Inject CSS variables for the new theme
    injectThemeVariables(themeId);

    // Dispatch custom event for components that need to react to theme changes
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { themeId, theme: themes[themeId] }
    }));
  };

  // Cycle through themes: default -> light -> dark -> default
  const toggleTheme = () => {
    const cycle: ThemeId[] = ['crystalline-default', 'crystalline-light', 'crystalline-dark'];
    const currentIndex = cycle.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % cycle.length;
    setTheme(cycle[nextIndex]);
  };

  // Available themes list
  const availableThemes = Object.entries(themes).map(([id, theme]) => ({
    id: id as ThemeId,
    name: theme.name
  }));

  const contextValue: ThemeContextType = {
    currentTheme,
    theme: themes[currentTheme],
    setTheme,
    toggleTheme,
    availableThemes
  };

  // Merge the base swanStudiosTheme with the active Crystalline Swan theme
  // so components using old property paths (theme.typography, theme.spacing, etc.)
  // still work, while new theme values (theme.background.primary, etc.) are dynamic
  const mergedTheme = useMemo(() => ({
    ...swanStudiosTheme,
    ...themes[currentTheme],
  }), [currentTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <StyledThemeProvider theme={mergedTheme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

// === THEME HOOK ===
export const useUniversalTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useUniversalTheme must be used within a UniversalThemeProvider');
  }
  return context;
};

// === GLOW BUTTON THEME MAPPING ===
/**
 * Maps universal themes to GlowButton variants
 */
export const getGlowButtonVariant = (themeId: ThemeId): string => {
  switch (themeId) {
    case 'crystalline-default':
      return 'primary'; // Ice-wing blue glow
    case 'crystalline-light':
      return 'primary'; // Arctic cyan on frost
    case 'crystalline-dark':
      return 'cosmic'; // Deep ice glow
    default:
      return 'primary';
  }
};

// === THEME UTILITY FUNCTIONS ===
export const getThemeColors = (themeId: ThemeId) => themes[themeId].colors;
export const getThemeGradients = (themeId: ThemeId) => themes[themeId].gradients;
export const getThemeShadows = (themeId: ThemeId) => themes[themeId].shadows;

// === STYLED COMPONENTS THEME HOOK ===
/**
 * Hook for accessing theme in styled-components
 * Usage: const theme = useStyledTheme();
 */
export const useStyledTheme = () => {
  const { theme } = useUniversalTheme();
  return theme;
};

export default UniversalThemeProvider;
