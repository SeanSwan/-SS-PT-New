import { createSwanManifest } from '../manifestFactory';

export const SWAN_FLAGSHIP_MANIFEST = createSwanManifest({
  id: 'swan-flagship',
  name: 'Crystalline Swan Flagship',
  description: 'The premium SwanStudios operating environment.',
  emotionalJob: 'confident momentum',
  layoutSignature: 'crystalline-command-river',
  navigationRenderer: 'flagship-navigation',
  shellRenderer: 'flagship-shell',
  recipe: 'flagship-recipe',
  profileOffsets: [0, 1, 2],
  ambient: true,
});
