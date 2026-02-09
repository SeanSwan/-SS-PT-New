import type { ConceptTheme } from '../shared/ConceptTypes';

export const cyberpunkPremiumV2Theme: ConceptTheme = {
  id: 'cyberpunk-premium-v2',
  version: 2,
  category: 'cyberpunk-premium',
  categoryLabel: 'Cyberpunk Premium',
  name: 'Synthwave Sunset',
  tagline: 'Ride the wave to your peak',
  fonts: {
    display: 'Press Start 2P',
    body: 'Space Mono',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&display=swap',
  },
  colors: {
    background: '#1A0A2E',
    surface: 'rgba(40, 20, 60, 0.85)',
    primary: '#FF6EC7',
    secondary: '#FFB347',
    accent: '#7DF9FF',
    text: '#F0E6FF',
    textSecondary: '#A088C0',
    textOnPrimary: '#1A0A2E',
  },
  gradients: {
    hero: 'linear-gradient(180deg, #1A0A2E 0%, #2D1B69 30%, #FF6EC7 70%, #FFB347 100%)',
    card: 'linear-gradient(145deg, rgba(255, 110, 199, 0.08), rgba(255, 179, 71, 0.05))',
    cta: 'linear-gradient(135deg, #FF6EC7, #FFB347)',
  },
  borderRadius: '8px',
  memorableMoment:
    'A retro sun with horizontal scan lines dips behind a wireframe mountain range as the user scrolls. Chrome text reflects a gradient that shifts with mouse position.',
  rationale:
    'Warm purple-to-orange sunset gradients replace the cold cyan/magenta of v1. Retro-futuristic smooth aesthetic — less glitch, more chrome. Press Start 2P gives arcade nostalgia while Space Mono keeps readability.',
  interactionLanguage:
    'Smooth chrome reflections on hover. Buttons have VHS tracking distortion on click. Cards slide in like cassette tapes. Background gradient subtly shifts with scroll position.',
};
