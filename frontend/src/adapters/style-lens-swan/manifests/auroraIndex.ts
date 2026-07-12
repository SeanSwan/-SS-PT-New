import { createSwanManifest } from '../manifestFactory';

export const AURORA_INDEX_MANIFEST = createSwanManifest({
  id: 'aurora-index', name: 'Aurora Index',
  description: 'A luminous vertical index reveals role, progress, and next action in sequence.',
  emotionalJob: 'guided discovery', layoutSignature: 'aurora-index-and-reveal-stack',
  navigationRenderer: 'aurora-index-navigation', shellRenderer: 'aurora-index-shell',
  recipe: 'aurora-index-recipe', profileOffsets: [3, 6, 8], ambient: true,
});