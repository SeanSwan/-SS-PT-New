import { createSwanManifest } from '../manifestFactory';

export const CRYSTALLINE_CATHEDRAL_MANIFEST = createSwanManifest({
  id: 'crystalline-cathedral', name: 'Crystalline Cathedral',
  description: 'The flagship structural world joins vaulted focus, crystalline light, and decisive action.',
  emotionalJob: 'awe with orientation', layoutSignature: 'vaulted-crystalline-nave',
  navigationRenderer: 'cathedral-apse-navigation', shellRenderer: 'crystalline-cathedral-shell',
  recipe: 'crystalline-cathedral-recipe', profileOffsets: [0, 3, 5], ambient: true,
});