import type { ConceptTheme } from '../shared/ConceptTypes';

export const natureWellnessTheme: ConceptTheme = {
  id: 1,
  name: 'Nature Wellness',
  tagline: 'Train in harmony with nature',
  fonts: {
    display: 'Playfair Display',
    body: 'Source Sans 3',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Source+Sans+3:wght@300;400;500;600&display=swap',
  },
  colors: {
    background: '#F7F5F0',
    surface: '#FFFFFF',
    primary: '#2E7D32',
    secondary: '#5B9BD5',
    accent: '#E8998D',
    text: '#1A1A1A',
    textSecondary: '#5A5A5A',
    textOnPrimary: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(180deg, #87CEEB 0%, #F7F5F0 100%)',
    card: 'linear-gradient(145deg, #FFFFFF, #F0EDE5)',
    cta: 'linear-gradient(135deg, #2E7D32, #4CAF50)',
  },
  borderRadius: '16px',
  memorableMoment:
    'A breathing animation on the hero — a botanical silhouette slowly expands and contracts, synced with a "breathe with us" prompt.',
  rationale:
    'Evokes outdoor training, wellness retreats, and natural vitality. Light background differentiates from the current dark Galaxy theme. Appeals to wellness-focused clientele who want fitness to feel holistic.',
  interactionLanguage:
    'Soft spring-based animations. Buttons grow like unfurling petals. Sections fade in with gentle upward drift. Hover states add subtle leaf-shadow overlays.',
};
