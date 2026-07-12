import { createSwanManifest } from '../manifestFactory';

export const TEMPO_FORGE_MANIFEST = createSwanManifest({
  id: 'tempo-forge',
  name: 'Tempo Forge',
  description: 'Cadence-first bands keep tempo, rest, and dosage inside a stable safe zone.',
  emotionalJob: 'disciplined momentum',
  layoutSignature: 'cadence-strip-and-tempo-safe-zone',
  navigationRenderer: 'tempo-strip-navigation',
  shellRenderer: 'tempo-forge-shell',
  recipe: 'tempo-forge-recipe',
  profileOffsets: [4, 7, 9],
});