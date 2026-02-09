import type { ConceptTheme } from '../shared/ConceptTypes';

/* ─── Dual-Mode Theme Interface ─── */
export interface DualModeTheme {
  dark: ConceptTheme;
  light: ConceptTheme;
}

/* ─── Dark Mode ─── */
export const etherealWildernessDarkTheme: ConceptTheme = {
  id: 'ethereal-wilderness-v1',
  version: 1,
  category: 'ethereal-wilderness',
  categoryLabel: 'Ethereal Wilderness',
  name: 'Ethereal Wilderness',
  tagline: 'Train in harmony with nature',
  fonts: {
    display: 'Cormorant Garamond',
    body: 'Source Sans 3',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap',
  },
  colors: {
    background: '#0a0a1a',
    surface: 'rgba(15, 25, 35, 0.92)',
    primary: '#00D4AA',
    secondary: '#7851A9',
    accent: '#48E8C8',
    text: '#F0F8FF',
    textSecondary: '#8AA8B8',
    textOnPrimary: '#0a0a1a',
  },
  gradients: {
    hero: 'radial-gradient(ellipse at 30% 20%, rgba(0, 212, 170, 0.12), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(120, 81, 169, 0.08), transparent 50%), linear-gradient(180deg, #0a0a1a 0%, #0d1a1a 100%)',
    card: 'linear-gradient(145deg, rgba(0, 212, 170, 0.05), rgba(120, 81, 169, 0.03))',
    cta: 'linear-gradient(135deg, #00D4AA, #00A88A)',
  },
  borderRadius: '12px',
  memorableMoment:
    'Layered mist drifts across the hero like a tropical jungle canopy. Firefly-like particles float upward through the sections. A faint holographic grid pulses beneath the organic surface. The dark/light toggle transforms every element seamlessly.',
  rationale:
    'Blends Nature Wellness organic feel with Marble Luxury polish and SwanStudios Galaxy-Swan colors. Digital nature that looks organically real — lush tropical mist, clouds, elegant typography with just a smidge of cyberpunk. Targets wealthy clients ages 16-80 who should feel polish and quality.',
  interactionLanguage:
    'Smooth mist-drift animations and floating particles. Glass-morphism cards with warm teal glow on hover. GlowButton with pointer-tracking cyan-teal radiance. Dark/light toggle transitions all elements with a 0.4s ease. Organic curves meet precise spacing.',
};

/* ─── Light Mode ─── */
export const etherealWildernessLightTheme: ConceptTheme = {
  ...etherealWildernessDarkTheme,
  id: 'ethereal-wilderness-v1-light',
  colors: {
    background: '#F5F8F5',
    surface: 'rgba(255, 255, 255, 0.95)',
    primary: '#008B72',
    secondary: '#6B4D8A',
    accent: '#00B894',
    text: '#1A2A2A',
    textSecondary: '#5A6E6E',
    textOnPrimary: '#FFFFFF',
  },
  gradients: {
    hero: 'radial-gradient(ellipse at 30% 20%, rgba(0, 139, 114, 0.08), transparent 50%), linear-gradient(180deg, #F5F8F5 0%, #EFF5F0 100%)',
    card: 'linear-gradient(145deg, rgba(0, 139, 114, 0.04), rgba(107, 77, 138, 0.02))',
    cta: 'linear-gradient(135deg, #008B72, #006B5A)',
  },
};

/* ─── Combined Export ─── */
export const etherealWildernessDualTheme: DualModeTheme = {
  dark: etherealWildernessDarkTheme,
  light: etherealWildernessLightTheme,
};

/* ─── Default export (dark) for registry ─── */
export const etherealWildernessTheme = etherealWildernessDarkTheme;
