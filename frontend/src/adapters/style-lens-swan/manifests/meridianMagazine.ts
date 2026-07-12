import { createSwanManifest } from '../manifestFactory';

export const MERIDIAN_MAGAZINE_MANIFEST = createSwanManifest({
  id: 'meridian-magazine', name: 'Meridian Magazine',
  description: 'Editorial spreads pair decisive headlines with asymmetric working columns.',
  emotionalJob: 'editorial confidence', layoutSignature: 'asymmetric-meridian-spread',
  navigationRenderer: 'magazine-folio-navigation', shellRenderer: 'meridian-magazine-shell',
  recipe: 'meridian-magazine-recipe', profileOffsets: [8, 0, 2],
});