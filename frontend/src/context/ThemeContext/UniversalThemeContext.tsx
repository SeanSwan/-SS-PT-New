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

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { injectThemeVariables } from '../../utils/theme/themeUtils';

// === TYPOGRAPHY STACKS ===
const fonts = {
  heading: '"Plus Jakarta Sans", "Sora", sans-serif',
  drama: '"Cormorant Garamond", Georgia, serif',
  data: '"Fira Code", "Cascadia Code", monospace',
  ui: '"Sora", "Plus Jakarta Sans", sans-serif',
};

// === THEME DEFINITIONS ===

/**
 * CRYSTALLINE DEFAULT THEME
 * The flagship dark-mode Crystalline Swan — navy foundation with ice-wing accents.
 * Background: #002060 -> #003080
 * Primary accent: #60C0F0 (Ice Wing)
 * Gold accent: #C6A84B (Gilded Fern)
 */
const crystallineDefault = {
  id: 'crystalline-default' as const,
  name: 'Crystalline Swan',
  fonts,
  colors: {
    // Foundation
    deepSpace: '#002060',
    stardust: '#003080',
    void: '#001040',

    // PRIMARY HIERARCHY (Ice Wing / Arctic Cyan)
    primary: '#60C0F0',
    primaryBlue: '#50A0F0',
    primaryDeep: '#4070C0',
    primaryLight: '#90D4F8',
    primaryNeon: '#60C0F0',

    // SECONDARY HIERARCHY (Swan Lavender / Royal Depth)
    secondary: '#4070C0',
    secondaryLight: '#6090D0',
    secondaryDeep: '#003080',

    // ACCENT COLORS (Gilded Fern)
    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    // Supporting colors
    white: '#E0ECF4',
    silver: '#E0ECF4',
    muted: 'rgba(224, 236, 244, 0.7)',
    error: '#FF6B6B',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #002060, #60C0F0)',
    secondary: 'linear-gradient(135deg, #003080, #4070C0)',
    cosmic: 'linear-gradient(135deg, #002060, #50A0F0)',
    hero: 'radial-gradient(ellipse at center, #003080 0%, #002060 70%)',
    card: 'rgba(0, 48, 128, 0.4)',
    accent: 'linear-gradient(135deg, #002060, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #4070C0)',
    glass: 'linear-gradient(135deg, rgba(0, 48, 128, 0.4), rgba(96, 192, 240, 0.1))',
  },
  shadows: {
    primary: '0 0 20px rgba(96, 192, 240, 0.2)',
    secondary: '0 0 20px rgba(64, 112, 192, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(96, 192, 240, 0.2)',
    accent: '0 0 15px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.5)',
    glow: '0 0 15px currentColor',
    glass: '0 8px 32px rgba(0, 32, 96, 0.3)',
    button: '0 4px 16px rgba(96, 192, 240, 0.25)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.08)',
    elegant: 'rgba(96, 192, 240, 0.2)',
    prominent: 'rgba(80, 160, 240, 0.4)',
    glass: '1px solid rgba(96, 192, 240, 0.15)',
    card: '1px solid rgba(96, 192, 240, 0.12)',
    focus: '2px solid #60C0F0',
  },
  background: {
    primary: '#002060',
    secondary: '#003080',
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
 * CRYSTALLINE LIGHT THEME
 * Frost-white canvas with navy text and arctic-blue accents.
 * Background: #E0ECF4 -> #F5F8FC
 * Primary accent: #50A0F0 (slightly darker for contrast on white)
 * Gold accent: #C6A84B
 */
const crystallineLight = {
  id: 'crystalline-light' as const,
  name: 'Crystalline Light',
  fonts,
  colors: {
    // Foundation
    deepSpace: '#E0ECF4',
    stardust: '#F5F8FC',
    void: '#FFFFFF',

    // PRIMARY HIERARCHY (Arctic Cyan — darkened for contrast)
    primary: '#50A0F0',
    primaryBlue: '#4070C0',
    primaryDeep: '#003080',
    primaryLight: '#80C0F8',
    primaryNeon: '#50A0F0',

    // SECONDARY HIERARCHY (Swan Lavender)
    secondary: '#4070C0',
    secondaryLight: '#6090D0',
    secondaryDeep: '#002060',

    // ACCENT COLORS (Gilded Fern)
    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#A88A30',

    // Supporting colors
    white: '#FFFFFF',
    silver: '#F5F8FC',
    muted: 'rgba(0, 32, 96, 0.55)',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #50A0F0, #4070C0)',
    secondary: 'linear-gradient(135deg, #E0ECF4, #F5F8FC)',
    cosmic: 'linear-gradient(135deg, #50A0F0, #002060)',
    hero: 'radial-gradient(ellipse at center, #F5F8FC 0%, #E0ECF4 70%)',
    card: 'rgba(224, 236, 244, 0.7)',
    accent: 'linear-gradient(135deg, #C6A84B, #D8C478)',
    stellar: 'linear-gradient(45deg, #50A0F0 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #50A0F0, #4070C0)',
    glass: 'linear-gradient(135deg, rgba(224, 236, 244, 0.7), rgba(255, 255, 255, 0.5))',
  },
  shadows: {
    primary: '0 0 20px rgba(0, 32, 96, 0.08)',
    secondary: '0 0 20px rgba(64, 112, 192, 0.08)',
    cosmic: '0 8px 32px rgba(0, 32, 96, 0.12), 0 0 40px rgba(80, 160, 240, 0.06)',
    accent: '0 0 15px rgba(198, 168, 75, 0.25)',
    elevation: '0 15px 35px rgba(0, 32, 96, 0.1)',
    glow: '0 0 15px currentColor',
    glass: '0 8px 32px rgba(0, 32, 96, 0.06)',
    button: '0 4px 16px rgba(80, 160, 240, 0.2)',
  },
  borders: {
    subtle: 'rgba(64, 112, 192, 0.08)',
    elegant: 'rgba(64, 112, 192, 0.15)',
    prominent: 'rgba(64, 112, 192, 0.25)',
    glass: '1px solid rgba(64, 112, 192, 0.12)',
    card: '1px solid rgba(64, 112, 192, 0.12)',
    focus: '2px solid #50A0F0',
  },
  background: {
    primary: '#E0ECF4',
    secondary: '#F5F8FC',
    surface: '#FFFFFF',
    elevated: 'rgba(255, 255, 255, 0.9)',
  },
  text: {
    primary: '#002060',
    secondary: 'rgba(0, 32, 96, 0.75)',
    muted: 'rgba(0, 32, 96, 0.55)',
    heading: '#002060',
    subheading: 'rgba(0, 32, 96, 0.85)',
    body: 'rgba(0, 32, 96, 0.75)',
    label: 'rgba(0, 32, 96, 0.6)',
    accent: '#4070C0',
  },
};

/**
 * CRYSTALLINE DARK THEME
 * Maximum-contrast deep black with stronger ice-glow effects.
 * Background: #000A1A -> #001030
 * Primary accent: #60C0F0 (brighter glow)
 * Gold accent: #C6A84B
 */
const crystallineDark = {
  id: 'crystalline-dark' as const,
  name: 'Crystalline Dark',
  fonts,
  colors: {
    // Foundation
    deepSpace: '#000A1A',
    stardust: '#001030',
    void: '#000000',

    // PRIMARY HIERARCHY (Ice Wing — brighter for glow)
    primary: '#60C0F0',
    primaryBlue: '#50A0F0',
    primaryDeep: '#4070C0',
    primaryLight: '#A0D8FC',
    primaryNeon: '#70D0FF',

    // SECONDARY HIERARCHY (Swan Lavender)
    secondary: '#4070C0',
    secondaryLight: '#6090D0',
    secondaryDeep: '#002060',

    // ACCENT COLORS (Gilded Fern)
    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    // Supporting colors
    white: '#E0ECF4',
    silver: '#E0ECF4',
    muted: 'rgba(224, 236, 244, 0.6)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #000A1A, #60C0F0)',
    secondary: 'linear-gradient(135deg, #001030, #4070C0)',
    cosmic: 'linear-gradient(135deg, #000A1A, #50A0F0)',
    hero: 'radial-gradient(ellipse at center, #001030 0%, #000A1A 70%)',
    card: 'rgba(0, 16, 48, 0.5)',
    accent: 'linear-gradient(135deg, #000A1A, #C6A84B)',
    stellar: 'linear-gradient(45deg, #70D0FF 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #4070C0)',
    glass: 'linear-gradient(135deg, rgba(0, 16, 48, 0.6), rgba(96, 192, 240, 0.08))',
  },
  shadows: {
    primary: '0 0 20px rgba(96, 192, 240, 0.3)',
    secondary: '0 0 20px rgba(64, 112, 192, 0.3)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(96, 192, 240, 0.3)',
    accent: '0 0 15px rgba(198, 168, 75, 0.5)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 15px currentColor',
    glass: '0 8px 32px rgba(0, 10, 26, 0.5)',
    button: '0 4px 16px rgba(96, 192, 240, 0.3)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)',
    elegant: 'rgba(96, 192, 240, 0.25)',
    prominent: 'rgba(96, 192, 240, 0.45)',
    glass: '1px solid rgba(96, 192, 240, 0.2)',
    card: '1px solid rgba(96, 192, 240, 0.15)',
    focus: '2px solid #70D0FF',
  },
  background: {
    primary: '#000A1A',
    secondary: '#001030',
    surface: 'rgba(0, 16, 48, 0.8)',
    elevated: 'rgba(0, 16, 48, 0.5)',
  },
  text: {
    primary: '#E0ECF4',
    secondary: 'rgba(224, 236, 244, 0.85)',
    muted: 'rgba(224, 236, 244, 0.55)',
    heading: '#E0ECF4',
    subheading: 'rgba(224, 236, 244, 0.9)',
    body: 'rgba(224, 236, 244, 0.85)',
    label: 'rgba(224, 236, 244, 0.65)',
    accent: '#70D0FF',
  },
};

// === THEME MAPPING ===
export const themes = {
  'crystalline-default': crystallineDefault,
  'crystalline-light': crystallineLight,
  'crystalline-dark': crystallineDark,
} as const;

export type ThemeId = keyof typeof themes;

// === THEME CONTEXT ===
interface ThemeContextType {
  currentTheme: ThemeId;
  theme: typeof crystallineDefault;
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

  return (
    <ThemeContext.Provider value={contextValue}>
      <StyledThemeProvider theme={themes[currentTheme]}>
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
