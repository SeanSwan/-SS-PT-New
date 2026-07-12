import { createSwanManifest } from '../manifestFactory';

export const TIDAL_COLUMNS_MANIFEST = createSwanManifest({
  id: 'tidal-columns', name: 'Tidal Columns',
  description: 'Offset vertical currents move orientation, work, and insight at distinct rhythms.',
  emotionalJob: 'fluid momentum',
  layoutSignature: 'offset-tidal-column-field',
  navigationRenderer: 'tidal-ribbon-navigation',
  shellRenderer: 'tidal-columns-shell',
  recipe: 'tidal-columns-recipe',
  profileOffsets: [9, 1, 3],
});