import { createSwanManifest } from '../manifestFactory';

export const MONASTIC_GRID_MANIFEST = createSwanManifest({
  id: 'monastic-grid', name: 'Monastic Grid',
  description: 'A restrained measured grid removes noise while preserving every working fact.',
  emotionalJob: 'disciplined calm',
  layoutSignature: 'measured-monastic-cells',
  navigationRenderer: 'monastic-index-navigation',
  shellRenderer: 'monastic-grid-shell',
  recipe: 'monastic-grid-recipe',
  profileOffsets: [10, 2, 4],
});