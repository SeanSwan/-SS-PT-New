import type { ConceptTheme } from '../shared/ConceptTypes';

export const natureWellnessV2Theme: ConceptTheme = {
  id: 'nature-wellness-v2',
  version: 2,
  category: 'nature-wellness',
  categoryLabel: 'Nature Wellness',
  name: 'Japanese Zen Garden',
  tagline: 'Stillness is strength',
  fonts: {
    display: 'Noto Serif JP',
    body: 'Zen Kaku Gothic New',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600;700;900&family=Zen+Kaku+Gothic+New:wght@300;400;500;700&display=swap',
  },
  colors: {
    background: '#1A1F1A',
    surface: 'rgba(30, 40, 30, 0.9)',
    primary: '#6B8F71',
    secondary: '#C4A35A',
    accent: '#D4A373',
    text: '#E8E4D9',
    textSecondary: '#9A9685',
    textOnPrimary: '#1A1F1A',
  },
  gradients: {
    hero: 'linear-gradient(180deg, #1A1F1A 0%, #2D3B2D 50%, #1A1F1A 100%)',
    card: 'linear-gradient(145deg, rgba(107, 143, 113, 0.08), rgba(196, 163, 90, 0.05))',
    cta: 'linear-gradient(135deg, #6B8F71, #4A6B50)',
  },
  borderRadius: '4px',
  memorableMoment:
    'A koi pond ripple effect follows the cursor across the hero. Stones appear to stack as the user scrolls, building a cairn. An ink wash stroke reveals section titles.',
  rationale:
    'Dark green/charcoal inverts the original light Nature Wellness while keeping the organic soul. Japanese design principles (ma, wabi-sabi) bring meditative calm. Stone textures and ink wash aesthetic feel premium and intentional.',
  interactionLanguage:
    'Ink brush stroke reveals. Elements fade in like mist clearing. Buttons have subtle stone-press tactile feedback. Scroll triggers gentle water ripple transitions between sections.',
};
