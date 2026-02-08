import type { ConceptTheme } from '../shared/ConceptTypes';

export const marbleLuxuryTheme: ConceptTheme = {
  id: 3,
  name: 'Marble Professional Luxury',
  tagline: 'Where excellence meets elegance',
  fonts: {
    display: 'Cormorant Garamond',
    body: 'Montserrat',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap',
  },
  colors: {
    background: '#FAFAF8',
    surface: '#FFFFFF',
    primary: '#1A1A1A',
    secondary: '#C9A959',
    accent: '#8B7355',
    text: '#1A1A1A',
    textSecondary: '#666666',
    textOnPrimary: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(180deg, #F5F5F0 0%, #E8E4DD 100%)',
    card: 'linear-gradient(145deg, #FFFFFF, #F8F6F2)',
    cta: 'linear-gradient(135deg, #1A1A1A, #333333)',
  },
  borderRadius: '2px',
  memorableMoment:
    'A marble texture that subtly shifts its veining pattern as the user scrolls. The logo appears engraved into marble with a bevel effect.',
  rationale:
    'Positions SwanStudios as a premium, high-end fitness brand. Clean whitespace-driven design appeals to professionals. Restrained palette and serif typography signal sophistication.',
  interactionLanguage:
    'Understated. Buttons have subtle gold border transitions on hover. Cards lift with refined shadows. Page transitions are smooth fades. Typography animates with elegant tracking changes.',
};
