import type { ConceptTheme } from '../shared/ConceptTypes';

export const hybridNatureTechTheme: ConceptTheme = {
  id: 'hybrid-nature-tech-v1',
  version: 1,
  category: 'hybrid-nature-tech',
  categoryLabel: 'Hybrid Nature-Tech',
  name: 'Hybrid Nature-Tech',
  tagline: 'Where biology meets engineering',
  fonts: {
    display: 'Space Grotesk',
    body: 'DM Sans',
    googleImportUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  },
  colors: {
    background: '#0D1117',
    surface: 'rgba(22, 27, 34, 0.9)',
    primary: '#58D68D',
    secondary: '#5DADE2',
    accent: '#F7DC6F',
    text: '#E6E8EB',
    textSecondary: '#8B949E',
    textOnPrimary: '#0D1117',
  },
  gradients: {
    hero: 'radial-gradient(ellipse at 30% 50%, rgba(88, 214, 141, 0.15), transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(93, 173, 226, 0.1), transparent 40%), #0D1117',
    card: 'linear-gradient(145deg, rgba(88, 214, 141, 0.05), rgba(93, 173, 226, 0.05))',
    cta: 'linear-gradient(135deg, #58D68D, #5DADE2)',
  },
  borderRadius: '12px',
  memorableMoment:
    'An SVG organism that grows as the user scrolls — starting as a single cell at the hero, branching into a neural network, and blooming into a full tree at the CTA.',
  rationale:
    'Combines natural wellness appeal with tech-forward credibility. The bioluminescent palette feels both organic and cutting-edge. Appeals to data-driven fitness enthusiasts who also value holistic health.',
  interactionLanguage:
    'Organic motion paths. Cards emerge like growing cells. Buttons pulse with bioluminescent glow. Scroll animations follow branching patterns.',
};
