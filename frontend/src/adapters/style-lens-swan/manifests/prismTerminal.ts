import { createSwanManifest } from '../manifestFactory';

export const PRISM_TERMINAL_MANIFEST = createSwanManifest({
  id: 'prism-terminal', name: 'Prism Terminal',
  description: 'A faceted command surface that refracts status into decisive work zones.',
  emotionalJob: 'crystalline focus',
  layoutSignature: 'faceted-command-prism',
  navigationRenderer: 'prism-command-navigation',
  shellRenderer: 'prism-terminal-shell',
  recipe: 'prism-terminal-recipe',
  profileOffsets: [8, 0, 2],
});