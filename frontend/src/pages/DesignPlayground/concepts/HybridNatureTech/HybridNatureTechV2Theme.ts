import type { ConceptTheme } from '../shared/ConceptTypes';

export const hybridNatureTechV2Theme: ConceptTheme = {
  id: 'hybrid-nature-tech-v2',
  version: 2,
  category: 'hybrid-nature-tech',
  categoryLabel: 'Hybrid Nature-Tech',
  name: 'Deep Ocean',
  tagline: 'Dive deeper than you thought possible',
  fonts: {
    display: 'Inter Tight',
    body: 'IBM Plex Sans',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap',
  },
  colors: {
    background: '#040D1A',
    surface: 'rgba(10, 30, 50, 0.9)',
    primary: '#00B4D8',
    secondary: '#FF6B35',
    accent: '#48CAE4',
    text: '#CAF0F8',
    textSecondary: '#5A8AA0',
    textOnPrimary: '#040D1A',
  },
  gradients: {
    hero: 'radial-gradient(ellipse at 50% 80%, rgba(0, 180, 216, 0.2), transparent 60%), linear-gradient(180deg, #040D1A 0%, #0A1628 100%)',
    card: 'linear-gradient(145deg, rgba(0, 180, 216, 0.06), rgba(255, 107, 53, 0.03))',
    cta: 'linear-gradient(135deg, #00B4D8, #0096C7)',
  },
  borderRadius: '16px',
  memorableMoment:
    'Bioluminescent jellyfish float in the hero background, pulsing gently. Bubbles rise from CTA buttons on hover. Coral-like branching patterns grow as section dividers as the user scrolls.',
  rationale:
    'Shifts from forest/bioluminescent to deep ocean, maintaining the nature-tech fusion. Ocean blues with coral orange accents create natural warmth in a dark UI. Depth/pressure theme resonates with pushing fitness limits.',
  interactionLanguage:
    'Fluid, wave-like motion on all transitions. Cards emerge from depth with parallax. Buttons have pressure-release animations. Jellyfish-translucent hover states on interactive elements.',
};
