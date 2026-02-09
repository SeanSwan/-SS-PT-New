import type { ConceptTheme } from '../shared/ConceptTypes';

export const marbleLuxuryV2Theme: ConceptTheme = {
  id: 'marble-luxury-v2',
  version: 2,
  category: 'marble-luxury',
  categoryLabel: 'Marble Professional Luxury',
  name: 'Onyx & Gold',
  tagline: 'Forged in darkness, finished in gold',
  fonts: {
    display: 'Playfair Display',
    body: 'Lato',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Lato:wght@300;400;700;900&display=swap',
  },
  colors: {
    background: '#0D0D0D',
    surface: 'rgba(25, 25, 25, 0.95)',
    primary: '#D4AF37',
    secondary: '#B8860B',
    accent: '#8B7355',
    text: '#F5F0E8',
    textSecondary: '#A09880',
    textOnPrimary: '#0D0D0D',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 50%, #0D0D0D 100%)',
    card: 'linear-gradient(145deg, rgba(212, 175, 55, 0.06), rgba(184, 134, 11, 0.03))',
    cta: 'linear-gradient(135deg, #D4AF37, #B8860B)',
  },
  borderRadius: '0px',
  memorableMoment:
    'Gold veining slowly traces across the dark background like cracking marble. The logo appears as if stamped in gold foil with a subtle emboss effect. Candlelight flicker on section transitions.',
  rationale:
    'Inverts the original light marble to dark onyx, creating a dramatic evening-wear version. Gold on black is the ultimate luxury signal. Zero border radius communicates architectural precision and severity.',
  interactionLanguage:
    'Gold shimmer on hover. Buttons have foil-stamp press animations. Cards emerge with gold edge-lighting. Typography uses elegant tracking animations on scroll reveals.',
};
