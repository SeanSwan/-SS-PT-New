import { createSwanManifest } from '../manifestFactory';

export const ORBIT_ATLAS_MANIFEST = createSwanManifest({
  id: 'orbit-atlas', name: 'Orbit Atlas',
  description: 'Concentric planning paths place current work inside its longer training horizon.',
  emotionalJob: 'strategic orientation',
  layoutSignature: 'concentric-orbit-atlas',
  navigationRenderer: 'orbital-map-navigation',
  shellRenderer: 'orbit-atlas-shell',
  recipe: 'orbit-atlas-recipe',
  profileOffsets: [0, 3, 5],
});