/**
 * UniversalThemeContext.tsx
 * ========================
 *
 * Crystalline Swan Theme System for SwanStudios Platform
 *
 * Features:
 * - Four Crystalline Swan variants: Default, Light, Dark, Monochrome
 * - Palette derived from the SwanStudios swan logo
 * - Seamless theme switching with localStorage persistence
 * - WCAG AA accessibility compliance
 *
 * Master Palette â€” Preset F-Alt "Enchanted Apex: Crystalline Swan"
 * - Midnight Sapphire #002060 â€” Primary / logo deep navy
 * - Royal Depth #003080 â€” Surface / logo circle
 * - Ice Wing #60C0F0 â€” Gaming accent / wing highlight
 * - Arctic Cyan #50A0F0 â€” Secondary accent / feathers
 * - Gilded Fern #C6A84B â€” Luxury gold accent
 * - Frost White #E0ECF4 â€” Light background / head highlight
 * - Swan Lavender #4070C0 â€” Tertiary / mid-body purple-blue
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider as StyledThemeProvider, type DefaultTheme } from 'styled-components';
import { injectThemeVariables } from '../../utils/theme/themeUtils';
import { swanStudiosTheme } from '../../core/theme';
import { premiumThemeAdditions } from './UniversalThemePremiumThemes';

// === TYPOGRAPHY STACKS ===
const fonts = {
  heading: '"Plus Jakarta Sans", "Sora", sans-serif',
  drama: '"Cormorant Garamond", Georgia, serif',
  data: '"Fira Code", "Cascadia Code", monospace',
  ui: '"Sora", "Plus Jakarta Sans", sans-serif',
};

// === THEME DEFINITIONS ===

/**
 * CRYSTALLINE DEFAULT THEME â€” "Crystalline Swan"
 * Enhanced Enchanted Navy with aurora-effect hero, glass cards, and Ice Wing glow halos.
 * Background: #001545 (deeper navy)
 * Primary accent: #60C0F0 (Ice Wing)
 * Gold accent: #C6A84B (Gilded Fern) â€” more prominent
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

    wingPurple: '#8B5CF6',
    wingPurpleLight: '#A78BFA',
    wingPurpleDeep: '#7C3AED',

    white: '#E0ECF4',
    silver: '#E0ECF4',
    muted: 'rgba(224, 236, 244, 0.7)',
    error: '#FF6B6B',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    secondary: 'linear-gradient(135deg, #002060, #4070C0)',
    cosmic: 'linear-gradient(135deg, #8B5CF6, #50A0F0)',
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
    button: '0 4px 20px rgba(139, 92, 246, 0.3)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)',
    elegant: 'rgba(96, 192, 240, 0.2)',
    prominent: 'rgba(80, 160, 240, 0.4)',
    glass: '1px solid rgba(96, 192, 240, 0.18)',
    card: '1px solid rgba(96, 192, 240, 0.15)',
    focus: '2px solid #8B5CF6',
    glow: '1px solid rgba(139, 92, 246, 0.2)',
  },
  background: {
    primary: '#001545',
    secondary: '#002060',
    surface: 'rgba(0, 32, 96, 0.45)',
    elevated: 'rgba(0, 48, 128, 0.4)',
  },
  text: {
    primary: '#F8FAFC',
    secondary: 'rgba(248, 250, 252, 0.85)',
    muted: 'rgba(248, 250, 252, 0.6)',
    heading: '#F8FAFC',
    subheading: 'rgba(248, 250, 252, 0.9)',
    body: 'rgba(248, 250, 252, 0.85)',
    label: 'rgba(248, 250, 252, 0.7)',
    accent: '#60C0F0',
  },
};

/**
 * ARCTIC DAWN THEME â€” "Arctic Dawn"
 * Premium icy light theme with readable slate text and platinum glass.
 * Background: #E6EEF5 (blue-tinted platinum, not whiteout)
 * Primary accent: #0284C7 (controlled icy blue)
 * Legacy accent: #6D28D9 (Wing Purple nod to roots)
 * Gold accent: #C6A84B
 */
const crystallineLight = {
  id: 'crystalline-light' as const,
  name: 'Arctic Dawn',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'subtle' as const,
    cardStyle: 'glass' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#E6EEF5',
    stardust: '#D6E4EF',
    void: '#0B1726',

    primary: '#0284C7',
    primaryBlue: '#0369A1',
    primaryDeep: '#075985',
    primaryLight: '#38BDF8',
    primaryNeon: '#0EA5E9',

    secondary: '#345B9A',
    secondaryLight: '#5F82C4',
    secondaryDeep: '#102A56',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#8A6A1F',

    wingPurple: '#6D28D9',
    wingPurpleLight: '#8B5CF6',
    wingPurpleDeep: '#4C1D95',

    white: '#F8FBFF',
    silver: '#E6EEF5',
    muted: 'rgba(15, 23, 42, 0.68)',
    error: '#DC2626',
    success: '#15803D',
    warning: '#A16207',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #075985, #0284C7)',
    secondary: 'linear-gradient(135deg, #D6E4EF, #F8FBFF)',
    cosmic: 'linear-gradient(135deg, #6D28D9, #075985)',
    hero: 'linear-gradient(135deg, #E6EEF5 0%, #D6E4EF 48%, #C9DCEB 100%)',
    card: 'linear-gradient(135deg, rgba(248, 251, 255, 0.96), rgba(214, 228, 239, 0.74))',
    accent: 'linear-gradient(135deg, #8A6A1F, #C6A84B)',
    stellar: 'linear-gradient(45deg, #075985 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #075985, #345B9A)',
    glass: 'linear-gradient(135deg, rgba(248, 251, 255, 0.94), rgba(214, 228, 239, 0.68))',
  },
  shadows: {
    primary: '0 3px 14px rgba(2, 132, 199, 0.16)',
    secondary: '0 2px 8px rgba(16, 42, 86, 0.1)',
    cosmic: '0 14px 42px rgba(16, 42, 86, 0.16), 0 2px 10px rgba(2, 132, 199, 0.12)',
    accent: '0 3px 12px rgba(198, 168, 75, 0.24)',
    elevation: '0 14px 36px rgba(16, 42, 86, 0.14)',
    glow: '0 0 0 transparent',
    glass: '0 12px 34px rgba(16, 42, 86, 0.12)',
    button: '0 4px 18px rgba(109, 40, 217, 0.22)',
  },
  borders: {
    subtle: 'rgba(7, 89, 133, 0.18)',
    elegant: '#9AB6CA',
    prominent: '#6F94AF',
    glass: '1px solid rgba(7, 89, 133, 0.18)',
    card: '1px solid rgba(7, 89, 133, 0.16)',
    focus: '2px solid #6D28D9',
    glow: '1px solid rgba(109, 40, 217, 0.22)',
  },
  background: {
    primary: '#E6EEF5',
    secondary: '#D6E4EF',
    surface: 'rgba(248, 251, 255, 0.94)',
    elevated: 'rgba(241, 247, 252, 0.98)',
  },
  text: {
    primary: '#0B1726',
    secondary: '#243447',
    muted: '#334155',
    heading: '#0B1726',
    subheading: '#172033',
    body: '#243447',
    label: '#334155',
    accent: '#0369A1',
  },
};

/**
 * VOID CRYSTAL THEME â€” "Void Crystal"
 * Sci-fi neon command center. Near-black backgrounds, aggressive neon glow,
 * vivid cyan primary, purple secondary. Maximum dramatic intensity.
 * Background: #030712 (near-black)
 * Primary accent: #22D3EE (vivid cyan)
 * Secondary accent: #A78BFA (vivid purple)
 * Gold accent: #F59E0B (amber)
 */
const crystallineDark = {
  id: 'crystalline-dark' as const,
  name: 'Crystalline Dark',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    /* SWA-24 palette-truth repaint (Sean's ruling 2026-07-21): crystallineDark now uses
       the CLAUDE.md Active Palette trio (Obsidian #0A0A0F / Carbon #141419 / Graphite
       #1A1A24 / Frost #E0ECF4) — the prior GitHub-dark values were historic drift.
       Parity-locked with the pre-JS fallback stylesheet via the tokenDiscipline test. */
    deepSpace: '#0A0A0F',
    stardust: '#141419',
    void: '#030712',

    primary: '#60C0F0',
    primaryBlue: '#50A0F0',
    primaryDeep: '#002060',
    primaryLight: '#7DD3FC',
    primaryNeon: '#60C0F0',

    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryDeep: '#6D28D9',

    accent: '#C6A84B',
    accentLight: '#D4B85C',
    accentWarm: '#B8972E',

    wingPurple: '#8B5CF6',
    wingPurpleLight: '#A78BFA',
    wingPurpleDeep: '#6D28D9',

    white: '#E0ECF4',
    silver: '#E0ECF4',
    muted: 'rgba(224, 236, 244, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    secondary: 'linear-gradient(135deg, #141419, #8B5CF6)',
    cosmic: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(96,192,240,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #141419 0%, #0A0A0F 70%)',
    card: 'rgba(20, 20, 25, 0.7)',
    accent: 'linear-gradient(135deg, #0A0A0F, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    glass: 'linear-gradient(135deg, rgba(20, 20, 25, 0.7), rgba(96, 192, 240, 0.03))',
  },
  shadows: {
    primary: '0 0 20px rgba(96, 192, 240, 0.2)',
    secondary: '0 0 20px rgba(139, 92, 246, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(96, 192, 240, 0.1)',
    accent: '0 0 20px rgba(198, 168, 75, 0.3)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(10, 10, 15, 0.5)',
    button: '0 4px 20px rgba(139, 92, 246, 0.25)',
  },
  borders: {
    /* GitHub border-grey #30363D → same-luminance swan indigo-grey (graphite family) */
    subtle: 'rgba(46, 46, 61, 0.6)',
    elegant: 'rgba(96, 192, 240, 0.2)',
    prominent: 'rgba(96, 192, 240, 0.4)',
    glass: '1px solid rgba(46, 46, 61, 0.6)',
    card: '1px solid rgba(46, 46, 61, 0.6)',
    focus: '2px solid #8B5CF6',
    glow: '1px solid rgba(139, 92, 246, 0.2)',
  },
  background: {
    primary: '#0A0A0F',
    secondary: '#141419',
    surface: 'rgba(20, 20, 25, 0.8)',
    elevated: '#1A1A24',
  },
  text: {
    primary: '#E0ECF4',
    secondary: 'rgba(224, 236, 244, 0.8)',
    muted: 'rgba(224, 236, 244, 0.6)',
    heading: '#E0ECF4',
    subheading: 'rgba(224, 236, 244, 0.9)',
    body: 'rgba(224, 236, 244, 0.85)',
    label: 'rgba(224, 236, 244, 0.65)',
    accent: '#60C0F0',
  },
};

/**
 * MONOCHROME THEME â€” "Monochrome"
 * Minimalist black & white dark mode. Pure black backgrounds, white text,
 * NO color, NO glow, NO glassmorphism. Clean, editorial, typographic.
 * Background: #000000 (pure black)
 * Primary accent: #FFFFFF (pure white)
 * No color accents â€” grayscale only
 */
const crystallineMono = {
  id: 'crystalline-mono' as const,
  name: 'Monochrome',
  fonts: {
    heading: '"Cormorant Garamond", Georgia, serif',
    drama: '"Cormorant Garamond", Georgia, serif',
    data: '"Source Sans 3", "Source Sans Pro", sans-serif',
    ui: '"Inter", "Source Sans 3", sans-serif',
  },
  effects: {
    glassmorphism: false,
    glowIntensity: 'none' as const,
    cardStyle: 'solid' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#000000',
    stardust: '#0a0a0a',
    void: '#000000',

    primary: '#FFFFFF',
    primaryBlue: '#CCCCCC',
    primaryDeep: '#AAAAAA',
    primaryLight: '#FFFFFF',
    primaryNeon: '#FFFFFF',

    secondary: '#888888',
    secondaryLight: '#AAAAAA',
    secondaryDeep: '#666666',

    accent: '#CCCCCC',
    accentLight: '#E0E0E0',
    accentWarm: '#999999',

    wingPurple: '#CCCCCC',
    wingPurpleLight: '#E0E0E0',
    wingPurpleDeep: '#AAAAAA',

    white: '#FFFFFF',
    silver: '#E0E0E0',
    muted: 'rgba(255, 255, 255, 0.5)',
    error: '#FF4444',
    success: '#AAAAAA',
    warning: '#999999',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #000000, #1a1a1a)',
    secondary: 'linear-gradient(135deg, #0a0a0a, #141414)',
    cosmic: 'linear-gradient(135deg, #000000, #111111)',
    hero: 'linear-gradient(180deg, #000000 0%, #111111 100%)',
    card: 'linear-gradient(145deg, #0a0a0a, #141414)',
    accent: 'linear-gradient(135deg, #000000, #333333)',
    stellar: 'linear-gradient(45deg, #FFFFFF 0%, #888888 100%)',
    swanCosmic: 'linear-gradient(135deg, #FFFFFF, #666666)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
  },
  shadows: {
    primary: '0 2px 8px rgba(255,255,255,0.06)',
    secondary: '0 2px 6px rgba(255,255,255,0.04)',
    cosmic: '0 4px 16px rgba(0,0,0,0.5)',
    accent: '0 2px 8px rgba(255,255,255,0.08)',
    elevation: '0 4px 16px rgba(0,0,0,0.5)',
    glow: 'none',
    glass: '0 1px 4px rgba(255,255,255,0.04)',
    button: '0 2px 8px rgba(255,255,255,0.1)',
  },
  borders: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    elegant: 'rgba(255, 255, 255, 0.15)',
    prominent: 'rgba(255, 255, 255, 0.25)',
    glass: '1px solid rgba(255,255,255,0.06)',
    card: '1px solid rgba(255,255,255,0.1)',
    focus: '2px solid #FFFFFF',
    glow: '1px solid rgba(255, 255, 255, 0.1)',
  },
  background: {
    primary: '#000000',
    secondary: '#0a0a0a',
    surface: 'rgba(255, 255, 255, 0.05)',
    elevated: 'rgba(255, 255, 255, 0.03)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#AAAAAA',
    muted: '#666666',
    heading: '#FFFFFF',
    subheading: '#CCCCCC',
    body: '#BBBBBB',
    label: '#888888',
    accent: '#FFFFFF',
  },
};

/**
 * CINEMATIC EMBER THEME â€” "Obsidian Ember"
 * Warm cinematic dark theme. Charcoal blacks with amber/rose gold accents.
 * Inspired by luxury cinema lobbies and fireside lounges.
 * Background: #1A0F0A (deep warm black)
 * Primary accent: #F59E0B (amber gold)
 * Secondary: #E11D48 (rose)
 */
const cinematicEmber = {
  id: 'cinematic-ember' as const,
  name: 'Obsidian Ember',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'elegant' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#1A0F0A',
    stardust: '#2D1810',
    void: '#0D0705',

    primary: '#F59E0B',
    primaryBlue: '#D97706',
    primaryDeep: '#B45309',
    primaryLight: '#FBBF24',
    primaryNeon: '#FCD34D',

    secondary: '#E11D48',
    secondaryLight: '#FB7185',
    secondaryDeep: '#BE123C',

    accent: '#C6A84B',
    accentLight: '#D4B85A',
    accentWarm: '#B8860B',

    wingPurple: '#E11D48',
    wingPurpleLight: '#FB7185',
    wingPurpleDeep: '#BE123C',

    white: '#FFF5EB',
    silver: '#F5E6D3',
    muted: 'rgba(245, 230, 211, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #1A0F0A, #F59E0B)',
    secondary: 'linear-gradient(135deg, #2D1810, #E11D48)',
    cosmic: 'linear-gradient(135deg, #1A0F0A, #D97706)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(245,158,11,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(225,29,72,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #2D1810 0%, #1A0F0A 70%)',
    card: 'rgba(45, 24, 16, 0.7)',
    accent: 'linear-gradient(135deg, #1A0F0A, #C6A84B)',
    stellar: 'linear-gradient(45deg, #F59E0B 0%, #E11D48 100%)',
    swanCosmic: 'linear-gradient(135deg, #F59E0B, #E11D48)',
    glass: 'linear-gradient(135deg, rgba(45, 24, 16, 0.7), rgba(245, 158, 11, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(245, 158, 11, 0.25)',
    secondary: '0 0 25px rgba(225, 29, 72, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(245, 158, 11, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(26, 15, 10, 0.5)',
    button: '0 4px 20px rgba(245, 158, 11, 0.3)',
  },
  borders: {
    subtle: 'rgba(245, 158, 11, 0.1)',
    elegant: 'rgba(245, 158, 11, 0.25)',
    prominent: 'rgba(245, 158, 11, 0.4)',
    glass: '1px solid rgba(245, 158, 11, 0.2)',
    card: '1px solid rgba(245, 158, 11, 0.15)',
    focus: '2px solid #E11D48',
    glow: '1px solid rgba(225, 29, 72, 0.2)',
  },
  background: {
    primary: '#1A0F0A',
    secondary: '#2D1810',
    surface: 'rgba(45, 24, 16, 0.6)',
    elevated: 'rgba(45, 24, 16, 0.5)',
  },
  text: {
    primary: '#FFF5EB',
    secondary: 'rgba(245, 230, 211, 0.85)',
    muted: 'rgba(245, 230, 211, 0.55)',
    heading: '#FFF5EB',
    subheading: 'rgba(245, 230, 211, 0.9)',
    body: 'rgba(245, 230, 211, 0.85)',
    label: 'rgba(245, 230, 211, 0.65)',
    accent: '#F59E0B',
  },
};

/**
 * FROZEN AURORA THEME â€” "Frozen Aurora"
 * Cool cinematic light theme. Icy whites with northern lights accents.
 * Inspired by Scandinavian design + aurora borealis.
 * Background: #F0F4F8 (ice mist)
 * Primary accent: #6366F1 (indigo aurora)
 * Secondary: #14B8A6 (teal aurora)
 */
const frozenAurora = {
  id: 'frozen-aurora' as const,
  name: 'Frozen Aurora',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'frosted' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#060B14',
    stardust: '#0B1626',
    void: '#02050A',

    primary: '#818CF8',
    primaryBlue: '#6366F1',
    primaryDeep: '#4338CA',
    primaryLight: '#C7D2FE',
    primaryNeon: '#818CF8',

    secondary: '#2DD4BF',
    secondaryLight: '#7DF0E3',
    secondaryDeep: '#0D9488',

    accent: '#A5F3FC',
    accentLight: '#DFFBFF',
    accentWarm: '#67E8F9',

    wingPurple: '#818CF8',
    wingPurpleLight: '#C7D2FE',
    wingPurpleDeep: '#4338CA',

    white: '#EEF4FB',
    silver: '#D7E4F2',
    muted: 'rgba(238, 244, 251, 0.62)',
    error: '#FB7185',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #4338CA, #818CF8)',
    secondary: 'linear-gradient(135deg, #0B1626, #0D9488)',
    cosmic: 'linear-gradient(135deg, #2DD4BF, #818CF8)',
    hero: 'radial-gradient(ellipse at 20% 20%, rgba(129, 140, 248, 0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 75%, rgba(45, 212, 191, 0.14) 0%, transparent 52%), radial-gradient(ellipse at center, #0B1626 0%, #060B14 72%)',
    card: 'linear-gradient(135deg, rgba(67, 56, 202, 0.26), rgba(129, 140, 248, 0.08))',
    accent: 'linear-gradient(135deg, #060B14, #A5F3FC)',
    stellar: 'linear-gradient(45deg, #818CF8 0%, #2DD4BF 100%)',
    swanCosmic: 'linear-gradient(135deg, #818CF8, #2DD4BF)',
    glass: 'linear-gradient(135deg, rgba(67, 56, 202, 0.2), rgba(129, 140, 248, 0.08))',
  },
  shadows: {
    primary: '0 0 24px rgba(129, 140, 248, 0.24)',
    secondary: '0 0 22px rgba(45, 212, 191, 0.22)',
    cosmic: '0 18px 48px rgba(0, 0, 0, 0.58), 0 0 52px rgba(129, 140, 248, 0.12)',
    accent: '0 0 20px rgba(165, 243, 252, 0.26)',
    elevation: '0 18px 42px rgba(0, 0, 0, 0.56)',
    glow: '0 0 20px currentColor',
    glass: '0 10px 34px rgba(6, 11, 20, 0.54)',
    button: '0 8px 24px rgba(129, 140, 248, 0.22)',
  },
  borders: {
    subtle: 'rgba(129, 140, 248, 0.1)',
    elegant: 'rgba(129, 140, 248, 0.18)',
    prominent: 'rgba(129, 140, 248, 0.34)',
    glass: '1px solid rgba(129, 140, 248, 0.14)',
    card: '1px solid rgba(129, 140, 248, 0.12)',
    focus: '2px solid #818CF8',
    glow: '1px solid rgba(45, 212, 191, 0.2)',
  },
  background: {
    primary: '#060B14',
    secondary: '#0B1626',
    surface: 'rgba(13, 28, 48, 0.78)',
    elevated: '#10203A',
  },
  text: {
    primary: '#EEF4FB',
    secondary: 'rgba(238, 244, 251, 0.84)',
    muted: 'rgba(238, 244, 251, 0.62)',
    heading: '#EEF4FB',
    subheading: 'rgba(238, 244, 251, 0.9)',
    body: 'rgba(238, 244, 251, 0.84)',
    label: 'rgba(238, 244, 251, 0.68)',
    accent: '#818CF8',
  },
};

/**
 * OBSIDIAN BLACK THEME â€” "Obsidian Black"
 * Pure black background with minimal accents. Workout logger dark aesthetic â€”
 * mostly black/dark with subtle Wing Purple accents and Ice Wing for data only.
 * Background: #0A0A0F (Obsidian Black from CLAUDE.md)
 * Card surface: #141419 (Carbon)
 * Elevated: #1A1A24 (Graphite)
 * Primary accent: #8B5CF6 (Wing Purple) â€” minimal usage
 * Data accent: #60C0F0 (Ice Wing) â€” charts/data only
 */
const obsidianBlack = {
  id: 'obsidian-black' as const,
  name: 'Obsidian Black',
  fonts,
  effects: {
    glassmorphism: false,
    glowIntensity: 'subtle' as const,
    cardStyle: 'solid' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#0A0A0F',
    stardust: '#141419',
    void: '#050508',

    // Wing Purple as THE visible accent (this theme's own doc: "mostly black
    // with subtle Wing Purple accents"). colors.primary is the system-wide
    // accent role â€” #002060 here was 1.29:1 on the black base (invisible).
    primary: '#8B5CF6',
    primaryBlue: '#7C3AED',
    primaryDeep: '#6D28D9',
    primaryLight: '#A78BFA',
    primaryNeon: '#8B5CF6',

    // Swan Lavender as the secondary accent (visible on black, sapphire-family)
    secondary: '#4070C0',
    secondaryLight: '#6090D0',
    secondaryDeep: '#003080',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#8B5CF6',
    wingPurpleLight: '#A78BFA',
    wingPurpleDeep: '#7C3AED',

    // Ice Wing for gaming/data accents
    iceWing: '#60C0F0',

    white: '#E0ECF4',
    silver: '#E0ECF4',
    muted: 'rgba(224, 236, 244, 0.5)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    // Cosmic Nebula gradient for premium CTAs
    primary: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    secondary: 'linear-gradient(135deg, #141419, #1A1A24)',
    cosmic: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(96,192,240,0.03) 0%, transparent 50%), radial-gradient(ellipse at center, #141419 0%, #0A0A0F 70%)',
    card: 'linear-gradient(135deg, #141419, #1A1A24)',
    accent: 'linear-gradient(135deg, #0A0A0F, #C6A84B)',
    stellar: 'linear-gradient(45deg, #8B5CF6 0%, #60C0F0 100%)',
    swanCosmic: 'linear-gradient(135deg, #8B5CF6, #60C0F0)',
    glass: 'linear-gradient(135deg, rgba(20, 20, 25, 0.9), rgba(139, 92, 246, 0.03))',
  },
  shadows: {
    // Wing Purple glow on blue buttons per dual-button glow system
    primary: '0 0 20px rgba(139, 92, 246, 0.15)',
    secondary: '0 0 15px rgba(96, 192, 240, 0.1)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.08)',
    accent: '0 0 15px rgba(198, 168, 75, 0.3)',
    elevation: '0 10px 30px rgba(0, 0, 0, 0.7)',
    glow: '0 0 15px currentColor',
    glass: '0 4px 16px rgba(0, 0, 0, 0.5)',
    button: '0 4px 16px rgba(139, 92, 246, 0.25)',
  },
  borders: {
    subtle: 'rgba(139, 92, 246, 0.08)',
    elegant: 'rgba(139, 92, 246, 0.15)',
    prominent: 'rgba(139, 92, 246, 0.25)',
    glass: '1px solid rgba(139, 92, 246, 0.12)',
    card: '1px solid rgba(139, 92, 246, 0.1)',
    focus: '2px solid #60C0F0',
    glow: '1px solid rgba(139, 92, 246, 0.15)',
  },
  background: {
    primary: '#0A0A0F',
    secondary: '#141419',
    // Graphite for surfaces and elevated panels/modals
    surface: '#1A1A24',
    elevated: '#1A1A24',
  },
  text: {
    primary: '#E0ECF4',
    secondary: '#94a3b8',
    muted: 'rgba(148, 163, 184, 0.6)',
    heading: '#E0ECF4',
    subheading: 'rgba(224, 236, 244, 0.9)',
    body: '#94a3b8',
    label: 'rgba(148, 163, 184, 0.7)',
    accent: '#8B5CF6',
  },
};

/**
 * CYBERPUNK EDGERUNNERS THEME â€” "Cyberpunk Edgerunners"
 * Aggressive neon dark theme. Near-black bg with neon yellow + hot pink.
 * Inspired by Night City aesthetics â€” sharp edges, glassmorphism, high contrast.
 * Background: #0D0D0D (near-black)
 * Primary accent: #F7FF00 (neon yellow)
 * Secondary: #FF2D6A (hot pink)
 * Cyan accent: #00F0FF
 */
const cyberpunkEdgerunners = {
  id: 'cyberpunk-edgerunners' as const,
  name: 'Cyberpunk Cyan',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'intense' as const,
    cardStyle: 'neon' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0A0A14',
    stardust: '#12122A',
    void: '#050510',

    primary: '#60C0F0',
    primaryBlue: '#60C0F0',
    primaryDeep: '#50A0F0',
    primaryLight: '#8ED8F8',
    primaryNeon: '#60C0F0',

    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryDeep: '#6D28D9',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#8B5CF6',
    wingPurpleLight: '#A78BFA',
    wingPurpleDeep: '#6D28D9',

    white: '#E0F7FF',
    silver: '#C8E6F0',
    muted: 'rgba(224, 247, 255, 0.55)',
    error: '#FF4444',
    success: '#00FF88',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    secondary: 'linear-gradient(135deg, #12122A, #60C0F0)',
    cosmic: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(96,192,240,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #12122A 0%, #0A0A14 70%)',
    card: 'rgba(18, 18, 42, 0.7)',
    accent: 'linear-gradient(135deg, #0A0A14, #60C0F0)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #8B5CF6 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    glass: 'linear-gradient(135deg, rgba(18, 18, 42, 0.7), rgba(96, 192, 240, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(96, 192, 240, 0.3)',
    secondary: '0 0 25px rgba(139, 92, 246, 0.25)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(96, 192, 240, 0.15)',
    accent: '0 0 20px rgba(96, 192, 240, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(10, 10, 20, 0.6)',
    button: '0 4px 20px rgba(96, 192, 240, 0.3)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)',
    elegant: 'rgba(96, 192, 240, 0.25)',
    prominent: 'rgba(96, 192, 240, 0.45)',
    glass: '1px solid rgba(96, 192, 240, 0.2)',
    card: '1px solid rgba(96, 192, 240, 0.15)',
    focus: '2px solid #60C0F0',
    glow: '1px solid rgba(139, 92, 246, 0.25)',
  },
  background: {
    primary: '#0A0A14',
    secondary: '#12122A',
    surface: 'rgba(18, 18, 42, 0.6)',
    elevated: 'rgba(18, 18, 42, 0.5)',
  },
  text: {
    primary: '#E0F7FF',
    secondary: 'rgba(224, 247, 255, 0.85)',
    muted: 'rgba(224, 247, 255, 0.55)',
    heading: '#E0F7FF',
    subheading: 'rgba(224, 247, 255, 0.9)',
    body: 'rgba(224, 247, 255, 0.85)',
    label: 'rgba(224, 247, 255, 0.65)',
    accent: '#60C0F0',
  },
};

/**
 * OBSIDIAN BLOOM THEME â€” "Obsidian Bloom"
 * Dark Gothic Garden aesthetic. Deep violet-black backgrounds with hot pink
 * and purple accents. Inspired by midnight botanical gardens and dark florals.
 * Background: #0A0014 (deep violet-black)
 * Primary accent: #FF1493 (hot pink / gaming)
 * Secondary: #9333EA (vivid purple)
 * Gold accent: #C6A84B
 */
const obsidianBloom = {
  id: 'obsidian-bloom' as const,
  name: 'Obsidian Bloom',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'elegant' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0A0014',
    stardust: '#150020',
    void: '#050008',

    primary: '#FF1493',
    primaryBlue: '#E0117A',
    primaryDeep: '#C00062',
    primaryLight: '#FF69B4',
    primaryNeon: '#FF1493',

    secondary: '#9333EA',
    secondaryLight: '#A855F7',
    secondaryDeep: '#7E22CE',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#9333EA',
    wingPurpleLight: '#A855F7',
    wingPurpleDeep: '#7E22CE',

    white: '#F5E6FF',
    silver: '#E8D0F8',
    muted: 'rgba(245, 230, 255, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #9333EA, #FF1493)',
    secondary: 'linear-gradient(135deg, #150020, #9333EA)',
    cosmic: 'linear-gradient(135deg, #9333EA, #FF1493)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(255,20,147,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(147,51,234,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #150020 0%, #0A0014 70%)',
    card: 'rgba(21, 0, 32, 0.7)',
    accent: 'linear-gradient(135deg, #0A0014, #C6A84B)',
    stellar: 'linear-gradient(45deg, #FF1493 0%, #9333EA 100%)',
    swanCosmic: 'linear-gradient(135deg, #FF1493, #9333EA)',
    glass: 'linear-gradient(135deg, rgba(21, 0, 32, 0.7), rgba(255, 20, 147, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(255, 20, 147, 0.25)',
    secondary: '0 0 25px rgba(147, 51, 234, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(255, 20, 147, 0.12)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(10, 0, 20, 0.6)',
    button: '0 4px 20px rgba(255, 20, 147, 0.3)',
  },
  borders: {
    subtle: 'rgba(255, 20, 147, 0.1)',
    elegant: 'rgba(255, 20, 147, 0.25)',
    prominent: 'rgba(255, 20, 147, 0.4)',
    glass: '1px solid rgba(147, 51, 234, 0.2)',
    card: '1px solid rgba(255, 20, 147, 0.15)',
    focus: '2px solid #9333EA',
    glow: '1px solid rgba(147, 51, 234, 0.25)',
  },
  background: {
    primary: '#0A0014',
    secondary: '#150020',
    surface: 'rgba(21, 0, 32, 0.6)',
    elevated: 'rgba(21, 0, 32, 0.5)',
  },
  text: {
    primary: '#F5E6FF',
    secondary: 'rgba(245, 230, 255, 0.85)',
    muted: 'rgba(245, 230, 255, 0.55)',
    heading: '#F5E6FF',
    subheading: 'rgba(245, 230, 255, 0.9)',
    body: 'rgba(245, 230, 255, 0.85)',
    label: 'rgba(245, 230, 255, 0.65)',
    accent: '#FF1493',
  },
};

/**
 * FROZEN CANOPY THEME â€” "Frozen Canopy"
 * Arctic Enchanted Forest aesthetic. Deep navy-blue backgrounds with ice cyan
 * and emerald green accents. Inspired by frozen northern forests and starlight.
 * Background: #001030 (deep arctic navy)
 * Primary accent: #60C0F0 (ice cyan / gaming)
 * Secondary: #00FFA3 (emerald green)
 * Gold accent: #C6A84B
 */
const frozenCanopy = {
  id: 'frozen-canopy' as const,
  name: 'Frozen Canopy',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'frosted' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#001030',
    stardust: '#001848',
    void: '#000818',

    primary: '#60C0F0',
    primaryBlue: '#4AA8D8',
    primaryDeep: '#3890C0',
    primaryLight: '#80D4FF',
    primaryNeon: '#60C0F0',

    secondary: '#00FFA3',
    secondaryLight: '#66FFc8',
    secondaryDeep: '#00CC82',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#00FFA3',
    wingPurpleLight: '#66FFC8',
    wingPurpleDeep: '#00CC82',

    white: '#E0F0FF',
    silver: '#C8E0F4',
    muted: 'rgba(224, 240, 255, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #60C0F0, #00FFA3)',
    secondary: 'linear-gradient(135deg, #001848, #00FFA3)',
    cosmic: 'linear-gradient(135deg, #60C0F0, #00FFA3)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(96,192,240,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0,255,163,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #001848 0%, #001030 70%)',
    card: 'rgba(0, 24, 72, 0.7)',
    accent: 'linear-gradient(135deg, #001030, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #00FFA3 100%)',
    swanCosmic: 'linear-gradient(135deg, #60C0F0, #00FFA3)',
    glass: 'linear-gradient(135deg, rgba(0, 24, 72, 0.7), rgba(96, 192, 240, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(96, 192, 240, 0.25)',
    secondary: '0 0 25px rgba(0, 255, 163, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(96, 192, 240, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.7)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(0, 16, 48, 0.5)',
    button: '0 4px 20px rgba(96, 192, 240, 0.3)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)',
    elegant: 'rgba(96, 192, 240, 0.25)',
    prominent: 'rgba(0, 255, 163, 0.4)',
    glass: '1px solid rgba(96, 192, 240, 0.2)',
    card: '1px solid rgba(96, 192, 240, 0.15)',
    focus: '2px solid #00FFA3',
    glow: '1px solid rgba(0, 255, 163, 0.2)',
  },
  background: {
    primary: '#001030',
    secondary: '#001848',
    surface: 'rgba(0, 24, 72, 0.6)',
    elevated: 'rgba(0, 24, 72, 0.5)',
  },
  text: {
    primary: '#E0F0FF',
    secondary: 'rgba(224, 240, 255, 0.85)',
    muted: 'rgba(224, 240, 255, 0.55)',
    heading: '#E0F0FF',
    subheading: 'rgba(224, 240, 255, 0.9)',
    body: 'rgba(224, 240, 255, 0.85)',
    label: 'rgba(224, 240, 255, 0.65)',
    accent: '#60C0F0',
  },
};

/**
 * EMBER REALM THEME â€” "Ember Realm"
 * Warrior Forge aesthetic. Deep crimson-black backgrounds with orange fire
 * and red accents. Inspired by forges, volcanic landscapes, and battle arenas.
 * Background: #120808 (deep crimson-black)
 * Primary accent: #FF6B2C (fire orange / gaming)
 * Secondary: #DC2626 (crimson red)
 * Gold accent: #C6A84B
 */
const emberRealm = {
  id: 'ember-realm' as const,
  name: 'Ember Realm',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'intense' as const,
    cardStyle: 'elegant' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#120808',
    stardust: '#1E0E0E',
    void: '#080404',

    primary: '#FF6B2C',
    primaryBlue: '#E05A20',
    primaryDeep: '#C04A18',
    primaryLight: '#FF9966',
    primaryNeon: '#FF6B2C',

    secondary: '#DC2626',
    secondaryLight: '#EF4444',
    secondaryDeep: '#B91C1C',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#DC2626',
    wingPurpleLight: '#EF4444',
    wingPurpleDeep: '#B91C1C',

    white: '#FFF0E0',
    silver: '#F0D8C0',
    muted: 'rgba(255, 240, 224, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #FF6B2C, #DC2626)',
    secondary: 'linear-gradient(135deg, #1E0E0E, #DC2626)',
    cosmic: 'linear-gradient(135deg, #FF6B2C, #DC2626)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(255,107,44,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(220,38,38,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #1E0E0E 0%, #120808 70%)',
    card: 'rgba(30, 14, 14, 0.7)',
    accent: 'linear-gradient(135deg, #120808, #C6A84B)',
    stellar: 'linear-gradient(45deg, #FF6B2C 0%, #DC2626 100%)',
    swanCosmic: 'linear-gradient(135deg, #FF6B2C, #DC2626)',
    glass: 'linear-gradient(135deg, rgba(30, 14, 14, 0.7), rgba(255, 107, 44, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(255, 107, 44, 0.3)',
    secondary: '0 0 25px rgba(220, 38, 38, 0.25)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(255, 107, 44, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(18, 8, 8, 0.6)',
    button: '0 4px 20px rgba(255, 107, 44, 0.35)',
  },
  borders: {
    subtle: 'rgba(255, 107, 44, 0.1)',
    elegant: 'rgba(255, 107, 44, 0.25)',
    prominent: 'rgba(220, 38, 38, 0.4)',
    glass: '1px solid rgba(255, 107, 44, 0.2)',
    card: '1px solid rgba(255, 107, 44, 0.15)',
    focus: '2px solid #DC2626',
    glow: '1px solid rgba(220, 38, 38, 0.25)',
  },
  background: {
    primary: '#120808',
    secondary: '#1E0E0E',
    surface: 'rgba(30, 14, 14, 0.6)',
    elevated: 'rgba(30, 14, 14, 0.5)',
  },
  text: {
    primary: '#FFF0E0',
    secondary: 'rgba(255, 240, 224, 0.85)',
    muted: 'rgba(255, 240, 224, 0.55)',
    heading: '#FFF0E0',
    subheading: 'rgba(255, 240, 224, 0.9)',
    body: 'rgba(255, 240, 224, 0.85)',
    label: 'rgba(255, 240, 224, 0.65)',
    accent: '#FF6B2C',
  },
};

/**
 * TWILIGHT LAGOON THEME â€” "Twilight Lagoon"
 * Bioluminescent Depths aesthetic. Ultra-deep navy backgrounds with aqua green
 * and electric blue accents. Inspired by deep-sea bioluminescence and underwater caves.
 * Background: #060618 (ultra-deep navy)
 * Primary accent: #00FFB2 (bioluminescent green / gaming)
 * Secondary: #0066FF (electric blue)
 * Tertiary: #60C0F0 (bright cyan)
 */
const twilightLagoon = {
  id: 'twilight-lagoon' as const,
  name: 'Twilight Lagoon',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#060618',
    stardust: '#0A0A2E',
    void: '#030310',

    primary: '#00FFB2',
    primaryBlue: '#00DDA0',
    primaryDeep: '#00BB88',
    primaryLight: '#66FFCF',
    primaryNeon: '#00FFB2',

    secondary: '#0066FF',
    secondaryLight: '#3388FF',
    secondaryDeep: '#0044CC',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#0066FF',
    wingPurpleLight: '#3388FF',
    wingPurpleDeep: '#0044CC',

    white: '#E0FFFC',
    silver: '#C0F0EC',
    muted: 'rgba(224, 255, 252, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #00FFB2, #0066FF)',
    secondary: 'linear-gradient(135deg, #0A0A2E, #0066FF)',
    cosmic: 'linear-gradient(135deg, #00FFB2, #60C0F0)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(0,255,178,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0,102,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #0A0A2E 0%, #060618 70%)',
    card: 'rgba(10, 10, 46, 0.7)',
    accent: 'linear-gradient(135deg, #060618, #60C0F0)',
    stellar: 'linear-gradient(45deg, #00FFB2 0%, #0066FF 100%)',
    swanCosmic: 'linear-gradient(135deg, #00FFB2, #60C0F0)',
    glass: 'linear-gradient(135deg, rgba(10, 10, 46, 0.7), rgba(0, 255, 178, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(0, 255, 178, 0.25)',
    secondary: '0 0 25px rgba(0, 102, 255, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(0, 255, 178, 0.12)',
    accent: '0 0 20px rgba(0, 229, 255, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(6, 6, 24, 0.6)',
    button: '0 4px 20px rgba(0, 255, 178, 0.3)',
  },
  borders: {
    subtle: 'rgba(0, 255, 178, 0.1)',
    elegant: 'rgba(0, 255, 178, 0.25)',
    prominent: 'rgba(0, 102, 255, 0.4)',
    glass: '1px solid rgba(0, 255, 178, 0.18)',
    card: '1px solid rgba(0, 255, 178, 0.15)',
    focus: '2px solid #0066FF',
    glow: '1px solid rgba(0, 102, 255, 0.2)',
  },
  background: {
    primary: '#060618',
    secondary: '#0A0A2E',
    surface: 'rgba(10, 10, 46, 0.6)',
    elevated: 'rgba(10, 10, 46, 0.5)',
  },
  text: {
    primary: '#E0FFFC',
    secondary: 'rgba(224, 255, 252, 0.85)',
    muted: 'rgba(224, 255, 252, 0.55)',
    heading: '#E0FFFC',
    subheading: 'rgba(224, 255, 252, 0.9)',
    body: 'rgba(224, 255, 252, 0.85)',
    label: 'rgba(224, 255, 252, 0.65)',
    accent: '#00FFB2',
  },
};

/**
 * NEBULA CROWN THEME â€” "Nebula Crown"
 * Cosmic Throne aesthetic. Deep purple-black backgrounds with vivid purple,
 * pink, and indigo accents. Inspired by nebulae, crowns, and cosmic royalty.
 * Background: #0A0020 (deep cosmic purple)
 * Primary accent: #9333EA (vivid purple / gaming)
 * Secondary: #EC4899 (cosmic pink)
 * Tertiary: #6366F1 (indigo)
 */
const nebulaCrown = {
  id: 'nebula-crown' as const,
  name: 'Nebula Crown',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'intense' as const,
    cardStyle: 'neon' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0A0020',
    stardust: '#120030',
    void: '#050010',

    primary: '#9333EA',
    primaryBlue: '#7E22CE',
    primaryDeep: '#6B21A8',
    primaryLight: '#A855F7',
    primaryNeon: '#9333EA',

    secondary: '#EC4899',
    secondaryLight: '#F472B6',
    secondaryDeep: '#DB2777',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',

    wingPurple: '#EC4899',
    wingPurpleLight: '#F472B6',
    wingPurpleDeep: '#DB2777',

    white: '#F0E6FF',
    silver: '#E0D0F8',
    muted: 'rgba(240, 230, 255, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #9333EA, #EC4899)',
    secondary: 'linear-gradient(135deg, #120030, #6366F1)',
    cosmic: 'linear-gradient(135deg, #9333EA, #6366F1)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(147,51,234,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(236,72,153,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #120030 0%, #0A0020 70%)',
    card: 'rgba(18, 0, 48, 0.7)',
    accent: 'linear-gradient(135deg, #0A0020, #C6A84B)',
    stellar: 'linear-gradient(45deg, #9333EA 0%, #EC4899 100%)',
    swanCosmic: 'linear-gradient(135deg, #9333EA, #6366F1)',
    glass: 'linear-gradient(135deg, rgba(18, 0, 48, 0.7), rgba(147, 51, 234, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(147, 51, 234, 0.3)',
    secondary: '0 0 25px rgba(236, 72, 153, 0.25)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 60px rgba(147, 51, 234, 0.15)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.8)',
    glow: '0 0 25px currentColor',
    glass: '0 8px 32px rgba(10, 0, 32, 0.6)',
    button: '0 4px 20px rgba(147, 51, 234, 0.35)',
  },
  borders: {
    subtle: 'rgba(147, 51, 234, 0.1)',
    elegant: 'rgba(147, 51, 234, 0.25)',
    prominent: 'rgba(236, 72, 153, 0.4)',
    glass: '1px solid rgba(147, 51, 234, 0.2)',
    card: '1px solid rgba(147, 51, 234, 0.15)',
    focus: '2px solid #EC4899',
    glow: '1px solid rgba(236, 72, 153, 0.25)',
  },
  background: {
    primary: '#0A0020',
    secondary: '#120030',
    surface: 'rgba(18, 0, 48, 0.6)',
    elevated: 'rgba(18, 0, 48, 0.5)',
  },
  text: {
    primary: '#F0E6FF',
    secondary: 'rgba(240, 230, 255, 0.85)',
    muted: 'rgba(240, 230, 255, 0.55)',
    heading: '#F0E6FF',
    subheading: 'rgba(240, 230, 255, 0.9)',
    body: 'rgba(240, 230, 255, 0.85)',
    label: 'rgba(240, 230, 255, 0.65)',
    accent: '#9333EA',
  },
};

/**
 * ENCHANTED FOREST THEME â€” "Enchanted Forest"
 * Deep forest greens with golden sunlight filtering through canopy.
 * Organic, earthy, natural â€” inspired by ancient enchanted woodlands.
 * Background: #0A1A0A (deep forest black-green)
 * Primary accent: #4ADE80 (emerald glow)
 * Secondary: #A3E635 (lime canopy light)
 * Gold accent: #C6A84B (sunlight through leaves)
 */
const enchantedForest = {
  id: 'enchanted-forest' as const,
  name: 'Enchanted Forest',
  fonts,
  effects: {
    glassmorphism: true,
    glowIntensity: 'medium' as const,
    cardStyle: 'glass' as const,
    borderGlow: true,
  },
  colors: {
    deepSpace: '#0A1A0A',
    stardust: '#0F2A10',
    void: '#050D05',
    primary: '#4ADE80',
    primaryBlue: '#22C55E',
    primaryDeep: '#16A34A',
    primaryLight: '#86EFAC',
    primaryNeon: '#4ADE80',
    secondary: '#A3E635',
    secondaryLight: '#BEF264',
    secondaryDeep: '#84CC16',
    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#B8963A',
    wingPurple: '#A3E635',
    wingPurpleLight: '#BEF264',
    wingPurpleDeep: '#84CC16',
    white: '#E8F5E0',
    silver: '#D4ECD0',
    muted: 'rgba(232, 245, 224, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #16A34A, #4ADE80)',
    secondary: 'linear-gradient(135deg, #0F2A10, #A3E635)',
    cosmic: 'linear-gradient(135deg, #16A34A, #A3E635)',
    hero: 'radial-gradient(ellipse at 30% 40%, rgba(74,222,128,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(163,230,53,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #0F2A10 0%, #0A1A0A 70%)',
    card: 'rgba(15, 42, 16, 0.7)',
    accent: 'linear-gradient(135deg, #0A1A0A, #C6A84B)',
    stellar: 'linear-gradient(45deg, #4ADE80 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #4ADE80, #A3E635)',
    glass: 'linear-gradient(135deg, rgba(15, 42, 16, 0.7), rgba(74, 222, 128, 0.05))',
  },
  shadows: {
    primary: '0 0 25px rgba(74, 222, 128, 0.25)',
    secondary: '0 0 20px rgba(163, 230, 53, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 60px rgba(74, 222, 128, 0.12)',
    accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(10, 26, 10, 0.5)',
    button: '0 4px 20px rgba(74, 222, 128, 0.3)',
  },
  borders: {
    subtle: 'rgba(74, 222, 128, 0.1)',
    elegant: 'rgba(74, 222, 128, 0.25)',
    prominent: 'rgba(74, 222, 128, 0.4)',
    glass: '1px solid rgba(74, 222, 128, 0.2)',
    card: '1px solid rgba(74, 222, 128, 0.15)',
    focus: '2px solid #A3E635',
    glow: '1px solid rgba(163, 230, 53, 0.2)',
  },
  background: {
    primary: '#0A1A0A',
    secondary: '#0F2A10',
    surface: 'rgba(15, 42, 16, 0.6)',
    elevated: 'rgba(15, 42, 16, 0.5)',
  },
  text: {
    primary: '#E8F5E0',
    secondary: 'rgba(232, 245, 224, 0.85)',
    muted: 'rgba(232, 245, 224, 0.55)',
    heading: '#E8F5E0',
    subheading: 'rgba(232, 245, 224, 0.9)',
    body: 'rgba(232, 245, 224, 0.85)',
    label: 'rgba(232, 245, 224, 0.65)',
    accent: '#4ADE80',
  },
};

/**
 * VOID CRYSTAL THEME â€” Pure black, maximum contrast, neon accents glow intensely
 */
const voidCrystal = {
  id: 'void-crystal' as const,
  name: 'Void Crystal',
  fonts,
  effects: { glassmorphism: true, glowIntensity: 'intense' as const, cardStyle: 'neon' as const, borderGlow: true },
  colors: {
    deepSpace: '#000000', stardust: '#0A0A0A', void: '#000000',
    primary: '#60C0F0', primaryBlue: '#50A0F0', primaryDeep: '#002060', primaryLight: '#7DD3FC', primaryNeon: '#60C0F0',
    secondary: '#8B5CF6', secondaryLight: '#A78BFA', secondaryDeep: '#6D28D9',
    accent: '#C6A84B', accentLight: '#D4B85C', accentWarm: '#B8972E',
    wingPurple: '#8B5CF6', wingPurpleLight: '#A78BFA', wingPurpleDeep: '#6D28D9',
    white: '#FFFFFF', silver: '#E6EDF3', muted: 'rgba(255, 255, 255, 0.5)',
    error: '#F87171', success: '#4ADE80', warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #8B5CF6, #60C0F0)', secondary: 'linear-gradient(135deg, #0A0A0A, #8B5CF6)',
    cosmic: 'linear-gradient(135deg, #8B5CF6, #60C0F0)', hero: 'radial-gradient(ellipse at 30% 40%, rgba(96,192,240,0.1) 0%, transparent 50%), radial-gradient(ellipse at center, #0A0A0A 0%, #000000 70%)',
    card: 'rgba(10, 10, 10, 0.8)', accent: 'linear-gradient(135deg, #000000, #C6A84B)',
    stellar: 'linear-gradient(45deg, #60C0F0 0%, #C6A84B 100%)', swanCosmic: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    glass: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8), rgba(96, 192, 240, 0.03))',
  },
  shadows: {
    primary: '0 0 30px rgba(96, 192, 240, 0.35)', secondary: '0 0 25px rgba(139, 92, 246, 0.3)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.9), 0 0 60px rgba(96, 192, 240, 0.2)', accent: '0 0 20px rgba(198, 168, 75, 0.4)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.95)', glow: '0 0 30px currentColor',
    glass: '0 8px 32px rgba(0, 0, 0, 0.8)', button: '0 4px 20px rgba(139, 92, 246, 0.35)',
  },
  borders: {
    subtle: 'rgba(96, 192, 240, 0.1)', elegant: 'rgba(96, 192, 240, 0.25)', prominent: 'rgba(96, 192, 240, 0.45)',
    glass: '1px solid rgba(96, 192, 240, 0.15)', card: '1px solid rgba(96, 192, 240, 0.12)',
    focus: '2px solid #8B5CF6', glow: '1px solid rgba(139, 92, 246, 0.25)',
  },
  background: { primary: '#000000', secondary: '#0A0A0A', surface: 'rgba(10, 10, 10, 0.8)', elevated: '#111111' },
  text: {
    primary: '#FFFFFF', secondary: 'rgba(255, 255, 255, 0.85)', muted: 'rgba(255, 255, 255, 0.6)',
    heading: '#FFFFFF', subheading: 'rgba(255, 255, 255, 0.95)', body: 'rgba(255, 255, 255, 0.9)',
    label: 'rgba(255, 255, 255, 0.7)', accent: '#60C0F0',
  },
};

/**
 * DEEP OCEAN THEME â€” Navy-black with teal accents (developer portfolio inspired)
 */
const deepOcean = {
  id: 'deep-ocean' as const,
  name: 'Deep Ocean',
  fonts,
  effects: { glassmorphism: true, glowIntensity: 'subtle' as const, cardStyle: 'glass' as const, borderGlow: true },
  colors: {
    deepSpace: '#0A192F', stardust: '#112240', void: '#020C1B',
    primary: '#64FFDA', primaryBlue: '#50D8B8', primaryDeep: '#0A192F', primaryLight: '#8AFFE8', primaryNeon: '#64FFDA',
    secondary: '#8892B0', secondaryLight: '#A8B2D1', secondaryDeep: '#495670',
    accent: '#C6A84B', accentLight: '#D4B85C', accentWarm: '#B8972E',
    wingPurple: '#8892B0', wingPurpleLight: '#A8B2D1', wingPurpleDeep: '#495670',
    white: '#CCD6F6', silver: '#8892B0', muted: 'rgba(204, 214, 246, 0.5)',
    error: '#F87171', success: '#64FFDA', warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #64FFDA, #8892B0)', secondary: 'linear-gradient(135deg, #112240, #64FFDA)',
    cosmic: 'linear-gradient(135deg, #64FFDA, #0A192F)', hero: 'radial-gradient(ellipse at 30% 40%, rgba(100,255,218,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #112240 0%, #0A192F 70%)',
    card: 'rgba(17, 34, 64, 0.7)', accent: 'linear-gradient(135deg, #0A192F, #64FFDA)',
    stellar: 'linear-gradient(45deg, #64FFDA 0%, #C6A84B 100%)', swanCosmic: 'linear-gradient(135deg, #64FFDA, #8892B0)',
    glass: 'linear-gradient(135deg, rgba(17, 34, 64, 0.7), rgba(100, 255, 218, 0.03))',
  },
  shadows: {
    primary: '0 0 20px rgba(100, 255, 218, 0.15)', secondary: '0 0 20px rgba(136, 146, 176, 0.15)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(100, 255, 218, 0.1)', accent: '0 0 20px rgba(198, 168, 75, 0.3)',
    elevation: '0 15px 35px rgba(2, 12, 27, 0.7)', glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(10, 25, 47, 0.5)', button: '0 4px 20px rgba(100, 255, 218, 0.2)',
  },
  borders: {
    subtle: 'rgba(100, 255, 218, 0.08)', elegant: 'rgba(100, 255, 218, 0.15)', prominent: 'rgba(100, 255, 218, 0.3)',
    glass: '1px solid rgba(100, 255, 218, 0.1)', card: '1px solid rgba(100, 255, 218, 0.08)',
    focus: '2px solid #64FFDA', glow: '1px solid rgba(100, 255, 218, 0.15)',
  },
  background: { primary: '#0A192F', secondary: '#112240', surface: 'rgba(17, 34, 64, 0.7)', elevated: '#172A45' },
  text: {
    primary: '#CCD6F6', secondary: 'rgba(204, 214, 246, 0.8)', muted: 'rgba(136, 146, 176, 0.8)',
    heading: '#CCD6F6', subheading: '#A8B2D1', body: 'rgba(204, 214, 246, 0.85)',
    label: 'rgba(136, 146, 176, 0.8)', accent: '#64FFDA',
  },
};

/**
 * OBSIDIAN AURORA THEME â€” Near-black with shifting aurora gradient accents
 */
const obsidianAurora = {
  id: 'obsidian-aurora' as const,
  name: 'Obsidian Aurora',
  fonts,
  effects: { glassmorphism: true, glowIntensity: 'medium' as const, cardStyle: 'glass' as const, borderGlow: true },
  colors: {
    deepSpace: '#0F0F1A', stardust: '#161625', void: '#08080F',
    primary: '#7DD3FC', primaryBlue: '#38BDF8', primaryDeep: '#0369A1', primaryLight: '#BAE6FD', primaryNeon: '#7DD3FC',
    secondary: '#C084FC', secondaryLight: '#D8B4FE', secondaryDeep: '#9333EA',
    accent: '#86EFAC', accentLight: '#BBF7D0', accentWarm: '#4ADE80',
    wingPurple: '#C084FC', wingPurpleLight: '#D8B4FE', wingPurpleDeep: '#9333EA',
    white: '#F0F0FF', silver: '#D8D8F0', muted: 'rgba(240, 240, 255, 0.5)',
    error: '#F87171', success: '#86EFAC', warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #C084FC, #7DD3FC, #86EFAC)', secondary: 'linear-gradient(135deg, #161625, #C084FC)',
    cosmic: 'linear-gradient(135deg, #C084FC, #7DD3FC)', hero: 'radial-gradient(ellipse at 20% 30%, rgba(192,132,252,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(125,211,252,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #161625 0%, #0F0F1A 70%)',
    card: 'rgba(22, 22, 37, 0.7)', accent: 'linear-gradient(135deg, #0F0F1A, #86EFAC)',
    stellar: 'linear-gradient(45deg, #C084FC 0%, #7DD3FC 50%, #86EFAC 100%)', swanCosmic: 'linear-gradient(135deg, #C084FC, #7DD3FC)',
    glass: 'linear-gradient(135deg, rgba(22, 22, 37, 0.7), rgba(192, 132, 252, 0.03))',
  },
  shadows: {
    primary: '0 0 20px rgba(125, 211, 252, 0.2)', secondary: '0 0 20px rgba(192, 132, 252, 0.2)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(192, 132, 252, 0.1)', accent: '0 0 20px rgba(134, 239, 172, 0.3)',
    elevation: '0 15px 35px rgba(8, 8, 15, 0.7)', glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(15, 15, 26, 0.5)', button: '0 4px 20px rgba(192, 132, 252, 0.25)',
  },
  borders: {
    subtle: 'rgba(192, 132, 252, 0.08)', elegant: 'rgba(192, 132, 252, 0.15)', prominent: 'rgba(192, 132, 252, 0.3)',
    glass: '1px solid rgba(192, 132, 252, 0.1)', card: '1px solid rgba(192, 132, 252, 0.08)',
    focus: '2px solid #C084FC', glow: '1px solid rgba(125, 211, 252, 0.15)',
  },
  background: { primary: '#0F0F1A', secondary: '#161625', surface: 'rgba(22, 22, 37, 0.7)', elevated: '#1E1E33' },
  text: {
    primary: '#F0F0FF', secondary: 'rgba(240, 240, 255, 0.8)', muted: 'rgba(216, 216, 240, 0.6)',
    heading: '#F0F0FF', subheading: 'rgba(240, 240, 255, 0.9)', body: 'rgba(240, 240, 255, 0.85)',
    label: 'rgba(216, 216, 240, 0.65)', accent: '#7DD3FC',
  },
};

/**
 * CARBON FIBER THEME â€” Dark carbon with subtle texture feel and platinum controls.
 */
const carbonFiber = {
  id: 'carbon-fiber' as const,
  name: 'Carbon Fiber',
  fonts,
  effects: { glassmorphism: false, glowIntensity: 'subtle' as const, cardStyle: 'solid' as const, borderGlow: false },
  colors: {
    deepSpace: '#121212', stardust: '#1E1E1E', void: '#0A0A0A',
    primary: '#D8DEE6', primaryBlue: '#A7B0BC', primaryDeep: '#596574', primaryLight: '#F4F7FA', primaryNeon: '#E5EAF0',
    secondary: '#A7B0BC', secondaryLight: '#D8DEE6', secondaryDeep: '#596574',
    accent: '#C6A84B', accentLight: '#D4B85C', accentWarm: '#B8972E',
    wingPurple: '#A7B0BC', wingPurpleLight: '#D8DEE6', wingPurpleDeep: '#596574',
    white: '#F4F7FA', silver: '#D8DEE6', muted: 'rgba(216, 222, 230, 0.62)',
    error: '#F87171', success: '#4ADE80', warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #596574, #D8DEE6)', secondary: 'linear-gradient(135deg, #101010, #596574)',
    cosmic: 'linear-gradient(135deg, #A7B0BC, #F4F7FA)', hero: 'radial-gradient(ellipse at 30% 40%, rgba(216,222,230,0.08) 0%, transparent 50%), radial-gradient(ellipse at center, #1E1E1E 0%, #121212 70%)',
    card: 'rgba(30, 30, 30, 0.8)', accent: 'linear-gradient(135deg, #121212, #C6A84B)',
    stellar: 'linear-gradient(45deg, #D8DEE6 0%, #C6A84B 100%)', swanCosmic: 'linear-gradient(135deg, #D8DEE6, #A7B0BC)',
    glass: 'linear-gradient(135deg, rgba(30, 30, 30, 0.8), rgba(216, 222, 230, 0.04))',
  },
  shadows: {
    primary: '0 0 15px rgba(216, 222, 230, 0.14)', secondary: '0 0 15px rgba(167, 176, 188, 0.12)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(216, 222, 230, 0.08)', accent: '0 0 15px rgba(198, 168, 75, 0.2)',
    elevation: '0 15px 35px rgba(0, 0, 0, 0.6)', glow: '0 0 15px currentColor',
    glass: '0 8px 32px rgba(18, 18, 18, 0.5)', button: '0 4px 15px rgba(216, 222, 230, 0.14)',
  },
  borders: {
    subtle: 'rgba(192, 192, 192, 0.1)', elegant: 'rgba(192, 192, 192, 0.2)', prominent: 'rgba(192, 192, 192, 0.35)',
    glass: '1px solid rgba(192, 192, 192, 0.12)', card: '1px solid rgba(192, 192, 192, 0.1)',
    focus: '2px solid #D8DEE6', glow: '1px solid rgba(216, 222, 230, 0.16)',
  },
  background: { primary: '#121212', secondary: '#1E1E1E', surface: 'rgba(30, 30, 30, 0.8)', elevated: '#262626' },
  text: {
    primary: '#F4F7FA', secondary: 'rgba(244, 247, 250, 0.82)', muted: 'rgba(216, 222, 230, 0.62)',
    heading: '#F4F7FA', subheading: 'rgba(244, 247, 250, 0.9)', body: 'rgba(244, 247, 250, 0.85)',
    label: 'rgba(216, 222, 230, 0.68)', accent: '#D8DEE6',
  },
};

// === THEME MAPPING ===
export const themes = {
  'crystalline-default': crystallineDefault,
  'crystalline-light': crystallineLight,
  'crystalline-dark': crystallineDark,
  'crystalline-mono': crystallineMono,
  'cinematic-ember': cinematicEmber,
  'frozen-aurora': frozenAurora,
  'obsidian-black': obsidianBlack,
  'cyberpunk-edgerunners': cyberpunkEdgerunners,
  'obsidian-bloom': obsidianBloom,
  'frozen-canopy': frozenCanopy,
  'ember-realm': emberRealm,
  'twilight-lagoon': twilightLagoon,
  'nebula-crown': nebulaCrown,
  'enchanted-forest': enchantedForest,
  'void-crystal': voidCrystal,
  'deep-ocean': deepOcean,
  'obsidian-aurora': obsidianAurora,
  'carbon-fiber': carbonFiber,
  ...premiumThemeAdditions,
} as const;

export type ThemeId = keyof typeof themes;

export const themeCycle = Object.keys(themes) as ThemeId[];

// === THEME TYPE (union of all theme variants) ===
export type CrystallineTheme = (typeof themes)[ThemeId];

// === THEME CONTEXT ===
interface ThemeContextType {
  currentTheme: ThemeId;
  theme: CrystallineTheme;
  setTheme: (themeId: ThemeId) => void;
  toggleTheme: () => void;
  availableThemes: Array<{ id: ThemeId; name: string }>;
  /** Site-wide animations switch (persisted). false = collapse all motion. */
  motionEnabled: boolean;
  setMotionEnabled: (enabled: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
  const [motionEnabled, setMotionEnabledState] = useState<boolean>(
    () => (typeof window === 'undefined' ? true : localStorage.getItem('swanstudios-motion') !== 'off')
  );

  // Reflect the animations switch onto <html data-motion> so the tokens.css
  // kill-switch (and any CSS keyed on it) applies site-wide, and persist it.
  useEffect(() => {
    document.documentElement.setAttribute('data-motion', motionEnabled ? 'on' : 'off');
  }, [motionEnabled]);

  const setMotionEnabled = (enabled: boolean) => {
    setMotionEnabledState(enabled);
    localStorage.setItem('swanstudios-motion', enabled ? 'on' : 'off');
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('swanstudios-theme') as ThemeId;
    if (savedTheme && themes[savedTheme]) {
      setCurrentThemeState(savedTheme);
      injectThemeVariables(savedTheme, themes);
    } else {
      // Inject default theme variables
      injectThemeVariables(defaultTheme, themes);
    }
  }, [defaultTheme]);

  // Save theme to localStorage when changed
  const setTheme = (themeId: ThemeId) => {
    setCurrentThemeState(themeId);
    localStorage.setItem('swanstudios-theme', themeId);

    // Inject CSS variables for the new theme
    injectThemeVariables(themeId, themes);

    // Dispatch custom event for components that need to react to theme changes
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { themeId, theme: themes[themeId] }
    }));
  };

  // Cycle through all themes
  const toggleTheme = () => {
    const currentIndex = themeCycle.indexOf(currentTheme);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % themeCycle.length : 0;
    setTheme(themeCycle[nextIndex]);
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
    availableThemes,
    motionEnabled,
    setMotionEnabled
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
      <MotionConfig reducedMotion={motionEnabled ? 'user' : 'always'}>
        <StyledThemeProvider theme={mergedTheme as unknown as DefaultTheme}>
          {children}
        </StyledThemeProvider>
      </MotionConfig>
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


// === THEME UTILITY FUNCTIONS ===




// === STYLED COMPONENTS THEME HOOK ===
/**
 * Hook for accessing theme in styled-components
 * Usage: const theme = useStyledTheme();
 */


export default UniversalThemeProvider;
