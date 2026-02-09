import type { ConceptTheme } from '../shared/ConceptTypes';

export const funAndBoldV2Theme: ConceptTheme = {
  id: 'fun-and-bold-v2',
  version: 2,
  category: 'fun-and-bold',
  categoryLabel: 'Fun & Bold',
  name: 'Neon Playground',
  tagline: 'Level up your life',
  fonts: {
    display: 'Rubik',
    body: 'Nunito',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&family=Nunito:wght@300;400;500;600;700;800&display=swap',
  },
  colors: {
    background: '#0F0F1A',
    surface: 'rgba(20, 20, 40, 0.9)',
    primary: '#FF3864',
    secondary: '#2DE2E6',
    accent: '#F9C80E',
    text: '#F0F0FF',
    textSecondary: '#8888BB',
    textOnPrimary: '#0F0F1A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A35 50%, #0F0F1A 100%)',
    card: 'linear-gradient(145deg, rgba(255, 56, 100, 0.06), rgba(45, 226, 230, 0.04))',
    cta: 'linear-gradient(135deg, #FF3864, #FF6B8A)',
  },
  borderRadius: '24px',
  memorableMoment:
    'A coin-insert arcade animation on page load. Neon signs flicker on as sections scroll into view. A pixel-art confetti burst on CTA hover. Score counter ticks up showing member stats.',
  rationale:
    'Inverts the light Fun & Bold to a dark arcade background, making neon colors pop dramatically. Gaming/arcade vibes resonate with younger Gen-Z fitness audience. High contrast dark-on-neon is more striking than the warm light original.',
  interactionLanguage:
    'Bouncy spring physics with neon trail effects. Buttons squash and glow on press. Cards have joystick-tilt 3D perspective on hover. Power-up sound design suggested for interactions.',
};
