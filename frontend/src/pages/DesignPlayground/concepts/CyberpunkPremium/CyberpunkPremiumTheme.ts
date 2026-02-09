import type { ConceptTheme } from '../shared/ConceptTypes';

export const cyberpunkPremiumTheme: ConceptTheme = {
  id: 'cyberpunk-premium-v1',
  version: 1,
  category: 'cyberpunk-premium',
  categoryLabel: 'Cyberpunk Premium',
  name: 'Cyberpunk Premium',
  tagline: 'Upgrade your operating system',
  fonts: {
    display: 'Orbitron',
    body: 'Rajdhani',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap',
  },
  colors: {
    background: '#0A0A0F',
    surface: 'rgba(20, 20, 40, 0.8)',
    primary: '#00FFFF',
    secondary: '#FF00FF',
    accent: '#FFD700',
    text: '#E0E0FF',
    textSecondary: '#8888AA',
    textOnPrimary: '#0A0A0F',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A3F 50%, #0A0A0F 100%)',
    card: 'linear-gradient(145deg, rgba(0, 255, 255, 0.05), rgba(255, 0, 255, 0.05))',
    cta: 'linear-gradient(135deg, #00FFFF, #00BBFF)',
  },
  borderRadius: '4px',
  memorableMoment:
    'A glitch transition when scrolling between sections — the viewport briefly splits into RGB channels and snaps back. Hero text types itself out like a terminal.',
  rationale:
    'Evolves the existing Galaxy-Swan dark aesthetic into something more extreme and memorable. Appeals to tech-savvy, gaming-adjacent fitness audiences. Neon-on-dark creates unmistakable brand identity.',
  interactionLanguage:
    'Glitch micro-interactions on hover. Buttons have scan-line effects. Cards flip with holographic sheen. Loading states use terminal-style text.',
};
