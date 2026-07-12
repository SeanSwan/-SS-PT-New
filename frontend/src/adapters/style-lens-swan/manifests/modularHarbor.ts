import { createSwanManifest } from '../manifestFactory';

export const MODULAR_HARBOR_MANIFEST = createSwanManifest({
  id: 'modular-harbor', name: 'Modular Harbor',
  description: 'Docked work berths organize tools, current state, and safe next actions.',
  emotionalJob: 'secure orientation', layoutSignature: 'harbor-berths-and-command-pier',
  navigationRenderer: 'harbor-berth-navigation', shellRenderer: 'modular-harbor-shell',
  recipe: 'modular-harbor-recipe', profileOffsets: [4, 7, 9],
});