import { createSwanManifest } from '../manifestFactory';

export const LUNAR_STACK_MANIFEST = createSwanManifest({
  id: 'lunar-stack', name: 'Lunar Stack',
  description: 'Layered mission plates reveal current work, evidence, and next action by depth.',
  emotionalJob: 'mission clarity', layoutSignature: 'offset-lunar-mission-plates',
  navigationRenderer: 'lunar-beacon-navigation', shellRenderer: 'lunar-stack-shell',
  recipe: 'lunar-stack-recipe', profileOffsets: [9, 1, 3],
});