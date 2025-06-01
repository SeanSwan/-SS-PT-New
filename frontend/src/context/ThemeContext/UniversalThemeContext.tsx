/**
 * UniversalThemeContext.tsx
 * ========================
 * 
 * Revolutionary Universal Theme System for SwanStudios Platform
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Three gorgeous theme variants: Swan Galaxy, Admin Command, Dark Galaxy
 * - Seamless theme switching with persistence
 * - Award-winning color hierarchies and gradient systems
 * - Performance-optimized theme switching
 * - WCAG AA accessibility compliance
 * 
 * Master Prompt v28 Alignment:
 * - Sensational aesthetics with cosmic design philosophy
 * - Mobile-first responsive theming
 * - Universal application across all components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

// === THEME DEFINITIONS ===

/**
 * SWAN GALAXY THEME
 * Primary: Blue/Cyan (#00FFFF, #00A0E3)
 * Secondary: Purple (#7851A9)
 * Accent: Gold/Yellow (#FFD700)
 */
const swanGalaxyTheme = {
  id: 'swan-galaxy',
  name: 'Swan Galaxy',
  colors: {
    // Foundation
    deepSpace: '#0a0a1a',
    stardust: '#1e1e3f',
    void: '#000000',
    
    // PRIMARY HIERARCHY (Blue/Cyan)
    primary: '#00FFFF',        // Main cyan
    primaryBlue: '#00A0E3',    // Brand blue (favicon color)
    primaryDeep: '#0085C7',    // Deep blue
    primaryLight: '#B8E6FF',   // Light blue
    primaryNeon: '#00FFFF',    // Neon cyan
    
    // SECONDARY HIERARCHY (Purple)
    secondary: '#7851A9',      // Main purple
    secondaryLight: '#c8b6ff', // Light purple
    secondaryDeep: '#7b2cbf',  // Deep purple
    
    // ACCENT COLORS (Yellow/Gold)
    accent: '#FFD700',         // Gold accent
    accentLight: '#FFF4C4',    // Light gold
    accentWarm: '#FFE55C',     // Warm yellow
    
    // Supporting colors
    white: '#ffffff',
    silver: '#E8F0FF',
    muted: 'rgba(255, 255, 255, 0.7)',
    error: '#ff416c',
    success: '#10b981',
    warning: '#f59e0b',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #00FFFF, #00A0E3)',
    secondary: 'linear-gradient(135deg, #7851A9, #7b2cbf)',
    cosmic: 'linear-gradient(135deg, #00FFFF, #7851A9)',
    hero: 'radial-gradient(ellipse at center, #1e1e3f 0%, #0a0a1a 70%)',
    card: 'rgba(30, 30, 60, 0.4)',
    accent: 'linear-gradient(135deg, #FFD700, #FFE55C)',
    stellar: 'linear-gradient(45deg, #00FFFF 0%, #FFD700 100%)',
    swanCosmic: 'linear-gradient(135deg, #00FFFF, #7851A9)',
  },
  shadows: {
    primary: '0 0 20px rgba(0, 255, 255, 0.3)',
    secondary: '0 0 20px rgba(120, 81, 169, 0.3)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3)',
    accent: '0 0 15px rgba(255, 215, 0, 0.5)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.5)',
    glow: '0 0 15px currentColor',
  },
  borders: {
    subtle: 'rgba(255, 255, 255, 0.05)',
    elegant: 'rgba(0, 255, 255, 0.2)',
    prominent: 'rgba(0, 160, 227, 0.4)',
  },
  background: {
    primary: '#0a0a1a',
    secondary: '#1e1e3f',
    surface: 'rgba(30, 30, 60, 0.6)',
    elevated: 'rgba(50, 50, 80, 0.4)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#E8F0FF',
    muted: 'rgba(255, 255, 255, 0.7)',
  }
};

/**
 * ADMIN COMMAND THEME
 * Professional blue command center aesthetic
 * Primary: Command Blue (#3b82f6)
 * Secondary: Navy (#1e3a8a)
 * Accent: Cyan highlights
 */
const adminCommandTheme = {
  id: 'admin-command',
  name: 'Admin Command',
  colors: {
    // Foundation
    deepSpace: '#0a0a0f',
    stardust: '#1e3a8a',       // Navy blue base
    void: '#000000',
    
    // PRIMARY HIERARCHY (Professional Blue)
    primary: '#3b82f6',        // Main command blue
    primaryBlue: '#2563eb',    // Deep command blue
    primaryDeep: '#1d4ed8',    // Deepest blue
    primaryLight: '#93c5fd',   // Light command blue
    primaryNeon: '#00ffff',    // Cyan accent
    
    // SECONDARY HIERARCHY (Navy/Dark Blue)
    secondary: '#1e3a8a',      // Navy command
    secondaryLight: '#3b82f6', // Light navy
    secondaryDeep: '#1e40af',  // Deep navy
    
    // ACCENT COLORS (Cyan/Electric)
    accent: '#00ffff',         // Electric cyan
    accentLight: '#a5f3fc',    // Light cyan
    accentWarm: '#0ea5e9',     // Warm electric blue
    
    // Supporting colors
    white: '#ffffff',
    silver: '#e5e7eb',
    muted: 'rgba(255, 255, 255, 0.7)',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    secondary: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
    cosmic: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
    hero: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #00ffff 100%)',
    card: 'rgba(30, 58, 138, 0.4)',
    accent: 'linear-gradient(135deg, #00ffff, #0ea5e9)',
    stellar: 'linear-gradient(45deg, #3b82f6 0%, #00ffff 100%)',
    swanCosmic: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
  },
  shadows: {
    primary: '0 0 20px rgba(59, 130, 246, 0.3)',
    secondary: '0 0 20px rgba(30, 58, 138, 0.3)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(59, 130, 246, 0.3)',
    accent: '0 0 15px rgba(0, 255, 255, 0.5)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.6)',
    glow: '0 0 15px currentColor',
  },
  borders: {
    subtle: 'rgba(255, 255, 255, 0.05)',
    elegant: 'rgba(59, 130, 246, 0.2)',
    prominent: 'rgba(37, 99, 235, 0.4)',
  },
  background: {
    primary: '#0a0a0f',
    secondary: '#1e3a8a',
    surface: 'rgba(30, 58, 138, 0.6)',
    elevated: 'rgba(59, 130, 246, 0.2)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#e5e7eb',
    muted: 'rgba(255, 255, 255, 0.7)',
  }
};

/**
 * DARK GALAXY THEME
 * Minimalist dark aesthetic with galaxy touches
 * Primary: White/Silver
 * Secondary: Charcoal/Gray
 * Accent: Subtle cyan highlights
 */
const darkGalaxyTheme = {
  id: 'dark-galaxy',
  name: 'Dark Galaxy',
  colors: {
    // Foundation
    deepSpace: '#000000',
    stardust: '#1a1a1a',
    void: '#000000',
    
    // PRIMARY HIERARCHY (White/Silver)
    primary: '#ffffff',        // Pure white
    primaryBlue: '#f8fafc',    // Off-white
    primaryDeep: '#e2e8f0',    // Light gray
    primaryLight: '#ffffff',   // Pure white
    primaryNeon: '#00ffff',    // Cyan accent
    
    // SECONDARY HIERARCHY (Grays)
    secondary: '#4a5568',      // Medium gray
    secondaryLight: '#718096', // Light gray
    secondaryDeep: '#2d3748',  // Dark gray
    
    // ACCENT COLORS (Subtle Cyan)
    accent: '#00ffff',         // Cyan accent
    accentLight: '#e0ffff',    // Very light cyan
    accentWarm: '#40e0d0',     // Turquoise
    
    // Supporting colors
    white: '#ffffff',
    silver: '#f7fafc',
    muted: 'rgba(255, 255, 255, 0.6)',
    error: '#e53e3e',
    success: '#38a169',
    warning: '#d69e2e',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #ffffff, #f8fafc)',
    secondary: 'linear-gradient(135deg, #4a5568, #2d3748)',
    cosmic: 'linear-gradient(135deg, #ffffff, #4a5568)',
    hero: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d3748 100%)',
    card: 'rgba(26, 26, 26, 0.8)',
    accent: 'linear-gradient(135deg, #00ffff, #40e0d0)',
    stellar: 'linear-gradient(45deg, #ffffff 0%, #00ffff 100%)',
    swanCosmic: 'linear-gradient(135deg, #ffffff, #4a5568)',
  },
  shadows: {
    primary: '0 0 20px rgba(255, 255, 255, 0.2)',
    secondary: '0 0 20px rgba(74, 85, 104, 0.3)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 255, 255, 0.1)',
    accent: '0 0 15px rgba(0, 255, 255, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 15px currentColor',
  },
  borders: {
    subtle: 'rgba(255, 255, 255, 0.1)',
    elegant: 'rgba(255, 255, 255, 0.2)',
    prominent: 'rgba(0, 255, 255, 0.4)',
  },
  background: {
    primary: '#000000',
    secondary: '#1a1a1a',
    surface: 'rgba(26, 26, 26, 0.8)',
    elevated: 'rgba(74, 85, 104, 0.2)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#f7fafc',
    muted: 'rgba(255, 255, 255, 0.6)',
  }
};

// === THEME MAPPING ===
export const themes = {
  'swan-galaxy': swanGalaxyTheme,
  'admin-command': adminCommandTheme,
  'dark-galaxy': darkGalaxyTheme,
} as const;

export type ThemeId = keyof typeof themes;

// === THEME CONTEXT ===
interface ThemeContextType {
  currentTheme: ThemeId;
  theme: typeof swanGalaxyTheme;
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
  defaultTheme = 'swan-galaxy'
}) => {
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('swanstudios-theme') as ThemeId;
    if (savedTheme && themes[savedTheme]) {
      setCurrentThemeState(savedTheme);
    }
  }, []);

  // Save theme to localStorage when changed
  const setTheme = (themeId: ThemeId) => {
    setCurrentThemeState(themeId);
    localStorage.setItem('swanstudios-theme', themeId);
    
    // Dispatch custom event for components that need to react to theme changes
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { themeId, theme: themes[themeId] } 
    }));
  };

  // Cycle through themes
  const toggleTheme = () => {
    const themeIds = Object.keys(themes) as ThemeId[];
    const currentIndex = themeIds.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeIds.length;
    setTheme(themeIds[nextIndex]);
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
    case 'swan-galaxy':
      return 'primary'; // Blue/cyan glow
    case 'admin-command':
      return 'primary'; // Professional blue glow  
    case 'dark-galaxy':
      return 'cosmic'; // Minimalist white/cyan glow
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