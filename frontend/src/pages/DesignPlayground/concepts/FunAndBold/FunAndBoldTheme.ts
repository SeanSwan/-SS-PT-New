import type { ConceptTheme } from '../shared/ConceptTypes';

export const funAndBoldTheme: ConceptTheme = {
  id: 'fun-and-bold-v1',
  version: 1,
  category: 'fun-and-bold',
  categoryLabel: 'Fun & Bold',
  name: 'Fun & Bold',
  tagline: 'Fitness should feel like this',
  fonts: {
    display: 'Syne',
    body: 'Outfit',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap',
  },
  colors: {
    background: '#FFF8F0',
    surface: '#FFFFFF',
    primary: '#FF6B35',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    text: '#2C2C2C',
    textSecondary: '#666666',
    textOnPrimary: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #FFE66D 0%, #FF6B35 50%, #4ECDC4 100%)',
    card: 'linear-gradient(145deg, #FFFFFF, #FFF8F0)',
    cta: 'linear-gradient(135deg, #FF6B35, #FF8C42)',
  },
  borderRadius: '20px',
  memorableMoment:
    'An interactive emoji-reaction bar on the hero — visitors click emojis that explode in particle animations and aggregate into a live vibe-check counter.',
  rationale:
    'Stands out from typical dark fitness sites. Warm, energetic palette signals that training here is fun, not intimidating. Asymmetric layouts and bold typography create visual interest.',
  interactionLanguage:
    'Bouncy spring animations everywhere. Buttons squash on press and spring back. Cards tilt with playful perspective. Sections slide in from alternating sides.',
};
