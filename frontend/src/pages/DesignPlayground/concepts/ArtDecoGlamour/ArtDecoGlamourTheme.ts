import type { ConceptTheme } from '../shared/ConceptTypes';

export const artDecoGlamourTheme: ConceptTheme = {
  id: 'art-deco-glamour-v1',
  version: 1,
  category: 'art-deco-glamour',
  categoryLabel: 'Art Deco Glamour',
  name: 'Art Deco Glamour',
  tagline: 'Train like the Gatsby era, live like tomorrow',
  fonts: {
    display: 'Bodoni Moda',
    body: 'Josefin Sans',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Josefin+Sans:wght@300;400;500;600;700&display=swap',
  },
  colors: {
    background: '#0A0A0A',
    surface: 'rgba(15, 15, 15, 0.95)',
    primary: '#C9A84C',
    secondary: '#2D6A4F',
    accent: '#E8D5B7',
    text: '#F5F0E0',
    textSecondary: '#A09880',
    textOnPrimary: '#0A0A0A',
  },
  gradients: {
    hero: 'linear-gradient(180deg, #0A0A0A 0%, #151515 50%, #0A0A0A 100%)',
    card: 'linear-gradient(145deg, rgba(201, 168, 76, 0.06), rgba(45, 106, 79, 0.04))',
    cta: 'linear-gradient(135deg, #C9A84C, #A08030)',
  },
  borderRadius: '0px',
  memorableMoment:
    'Geometric fan patterns expand from click points. Gold lines draw Art Deco borders around sections as they scroll into view. The hero text appears letter-by-letter in champagne gold.',
  rationale:
    'Art Deco is timeless luxury that differentiates from all other directions. Geometric precision communicates discipline. Champagne gold on black with emerald accents creates a sophisticated, memorable identity unlike any fitness site.',
  interactionLanguage:
    'Geometric expand/contract transitions. Buttons have beveled gold edges that catch light on hover. Cards emerge with fan-spread animations. Section dividers draw themselves as Art Deco patterns.',
};
