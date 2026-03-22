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
 * ARCTIC DAWN THEME — "Arctic Dawn"
 * Icy professional light theme with subtle glass effects.
 * Background: #F4F7FB (icy off-white, not pure white — preserves glass effect)
 * Primary accent: #00B4D8 (brighter, icier cyan)
 * Legacy accent: #7851A9 (Cosmic Purple nod to roots)
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
    deepSpace: '#F4F7FB',
    stardust: '#EDF1F7',
    void: '#FAFBFC',

    primary: '#00B4D8',
    primaryBlue: '#0EA5E9',
    primaryDeep: '#0284C7',
    primaryLight: '#38BDF8',
    primaryNeon: '#00B4D8',

    secondary: '#4070C0',
    secondaryLight: '#6090D0',
    secondaryDeep: '#002060',

    accent: '#C6A84B',
    accentLight: '#D8C478',
    accentWarm: '#A88A30',

    wingPurple: '#7C3AED',
    wingPurpleLight: '#8B5CF6',
    wingPurpleDeep: '#6D28D9',

    white: '#FFFFFF',
    silver: '#F0F4F8',
    muted: 'rgba(15, 23, 42, 0.5)',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #7C3AED, #00B4D8)',
    secondary: 'linear-gradient(135deg, #F4F7FB, #FFFFFF)',
    cosmic: 'linear-gradient(135deg, #7C3AED, #0284C7)',
    hero: 'linear-gradient(135deg, #00B4D8 0%, #0EA5E9 50%, #38BDF8 100%)',
    card: 'rgba(255, 255, 255, 0.7)',
    accent: 'linear-gradient(135deg, #C6A84B, #D8C478)',
    stellar: 'linear-gradient(45deg, #00B4D8 0%, #C6A84B 100%)',
    swanCosmic: 'linear-gradient(135deg, #00B4D8, #4070C0)',
    glass: 'rgba(255, 255, 255, 0.7)',
  },
  shadows: {
    primary: '0 2px 8px rgba(0, 180, 216, 0.12)',
    secondary: '0 1px 3px rgba(0, 32, 96, 0.06)',
    cosmic: '0 4px 16px rgba(0, 32, 96, 0.1), 0 1px 4px rgba(0, 180, 216, 0.08)',
    accent: '0 2px 8px rgba(198, 168, 75, 0.2)',
    elevation: '0 8px 24px rgba(0, 32, 96, 0.08)',
    glow: '0 0 0 transparent',
    glass: '0 8px 32px rgba(0, 0, 0, 0.06)',
    button: '0 2px 12px rgba(124, 58, 237, 0.3)',
  },
  borders: {
    subtle: 'rgba(0, 180, 216, 0.1)',
    elegant: '#CBD5E1',
    prominent: '#94A3B8',
    glass: '1px solid rgba(255, 255, 255, 0.8)',
    card: '1px solid rgba(255, 255, 255, 0.8)',
    focus: '2px solid #7C3AED',
    glow: '1px solid rgba(124, 58, 237, 0.2)',
  },
  background: {
    primary: '#F4F7FB',
    secondary: '#EDF1F7',
    surface: 'rgba(255, 255, 255, 0.7)',
    elevated: 'rgba(255, 255, 255, 0.85)',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    heading: '#0F172A',
    subheading: '#1E293B',
    body: '#475569',
    label: '#64748B',
    accent: '#00B4D8',
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

    wingPurple: '#A78BFA',
    wingPurpleLight: '#C4B5FD',
    wingPurpleDeep: '#7C3AED',

    white: '#F1F5F9',
    silver: '#F1F5F9',
    muted: 'rgba(241, 245, 249, 0.55)',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #A78BFA, #22D3EE)',
    secondary: 'linear-gradient(135deg, #0F172A, #A78BFA)',
    cosmic: 'linear-gradient(135deg, #A78BFA, #06B6D4)',
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
    button: '0 4px 20px rgba(167, 139, 250, 0.35)',
  },
  borders: {
    subtle: 'rgba(34, 211, 238, 0.12)',
    elegant: 'rgba(34, 211, 238, 0.3)',
    prominent: 'rgba(34, 211, 238, 0.5)',
    glass: '1px solid rgba(34, 211, 238, 0.25)',
    card: '1px solid rgba(34, 211, 238, 0.2)',
    focus: '2px solid #A78BFA',
    glow: '1px solid rgba(167, 139, 250, 0.25)',
  },
  background: {
    primary: '#030712',
    secondary: '#0F172A',
    surface: 'rgba(17, 24, 39, 0.6)',
    elevated: 'rgba(15, 23, 42, 0.5)',
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

/**
 * MONOCHROME THEME — "Monochrome"
 * Minimalist black & white dark mode. Pure black backgrounds, white text,
 * NO color, NO glow, NO glassmorphism. Clean, editorial, typographic.
 * Background: #000000 (pure black)
 * Primary accent: #FFFFFF (pure white)
 * No color accents — grayscale only
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
 * CINEMATIC EMBER THEME — "Obsidian Ember"
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
 * FROZEN AURORA THEME — "Frozen Aurora"
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
    glowIntensity: 'subtle' as const,
    cardStyle: 'frosted' as const,
    borderGlow: false,
  },
  colors: {
    deepSpace: '#F0F4F8',
    stardust: '#E2E8F0',
    void: '#F8FAFC',

    primary: '#6366F1',
    primaryBlue: '#818CF8',
    primaryDeep: '#4F46E5',
    primaryLight: '#A5B4FC',
    primaryNeon: '#6366F1',

    secondary: '#14B8A6',
    secondaryLight: '#2DD4BF',
    secondaryDeep: '#0D9488',

    accent: '#C6A84B',
    accentLight: '#D4B85A',
    accentWarm: '#B8860B',

    wingPurple: '#6366F1',
    wingPurpleLight: '#818CF8',
    wingPurpleDeep: '#4F46E5',

    white: '#1E293B',
    silver: '#334155',
    muted: 'rgba(30, 41, 59, 0.45)',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #F0F4F8, #6366F1)',
    secondary: 'linear-gradient(135deg, #E2E8F0, #14B8A6)',
    cosmic: 'linear-gradient(135deg, #F0F4F8, #818CF8)',
    hero: 'radial-gradient(ellipse at 20% 30%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(20,184,166,0.06) 0%, transparent 50%), radial-gradient(ellipse at center, #E2E8F0 0%, #F0F4F8 70%)',
    card: 'rgba(255, 255, 255, 0.7)',
    accent: 'linear-gradient(135deg, #F0F4F8, #C6A84B)',
    stellar: 'linear-gradient(45deg, #6366F1 0%, #14B8A6 100%)',
    swanCosmic: 'linear-gradient(135deg, #6366F1, #14B8A6)',
    glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(99, 102, 241, 0.05))',
  },
  shadows: {
    primary: '0 0 30px rgba(99, 102, 241, 0.15)',
    secondary: '0 0 25px rgba(20, 184, 166, 0.12)',
    cosmic: '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 60px rgba(99, 102, 241, 0.08)',
    accent: '0 0 20px rgba(198, 168, 75, 0.2)',
    elevation: '0 10px 30px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px currentColor',
    glass: '0 8px 32px rgba(0, 0, 0, 0.06)',
    button: '0 4px 20px rgba(99, 102, 241, 0.2)',
  },
  borders: {
    subtle: 'rgba(99, 102, 241, 0.1)',
    elegant: 'rgba(99, 102, 241, 0.2)',
    prominent: 'rgba(99, 102, 241, 0.35)',
    glass: '1px solid rgba(99, 102, 241, 0.15)',
    card: '1px solid rgba(99, 102, 241, 0.1)',
    focus: '2px solid #6366F1',
    glow: '1px solid rgba(99, 102, 241, 0.15)',
  },
  background: {
    primary: '#F0F4F8',
    secondary: '#E2E8F0',
    surface: 'rgba(255, 255, 255, 0.6)',
    elevated: 'rgba(255, 255, 255, 0.8)',
  },
  text: {
    primary: '#1E293B',
    secondary: 'rgba(30, 41, 59, 0.75)',
    muted: 'rgba(30, 41, 59, 0.45)',
    heading: '#0F172A',
    subheading: '#1E293B',
    body: 'rgba(30, 41, 59, 0.75)',
    label: 'rgba(30, 41, 59, 0.55)',
    accent: '#6366F1',
  },
};

/**
 * OBSIDIAN BLACK THEME — "Obsidian Black"
 * Pure black background with minimal accents. Workout logger dark aesthetic —
 * mostly black/dark with subtle Wing Purple accents and Ice Wing for data only.
 * Background: #0A0A0F (Obsidian Black from CLAUDE.md)
 * Card surface: #141419 (Carbon)
 * Elevated: #1A1A24 (Graphite)
 * Primary accent: #8B5CF6 (Wing Purple) — minimal usage
 * Data accent: #60C0F0 (Ice Wing) — charts/data only
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

    // Midnight Sapphire as primary button color per CLAUDE.md
    primary: '#002060',
    primaryBlue: '#003080',
    primaryDeep: '#001840',
    primaryLight: '#004090',
    primaryNeon: '#002060',

    // Wing Purple as secondary accent
    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryDeep: '#7C3AED',

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

// === THEME MAPPING ===
export const themes = {
  'crystalline-default': crystallineDefault,
  'crystalline-light': crystallineLight,
  'crystalline-dark': crystallineDark,
  'crystalline-mono': crystallineMono,
  'cinematic-ember': cinematicEmber,
  'frozen-aurora': frozenAurora,
  'obsidian-black': obsidianBlack,
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

  // Cycle through all themes
  const toggleTheme = () => {
    const cycle: ThemeId[] = [
      'crystalline-default', 'crystalline-light', 'crystalline-dark',
      'crystalline-mono', 'cinematic-ember', 'frozen-aurora', 'obsidian-black',
    ];
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
    case 'crystalline-mono':
      return 'ghost'; // Thin white border, no gradient
    case 'obsidian-black':
      return 'cosmic'; // Subtle purple glow
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
