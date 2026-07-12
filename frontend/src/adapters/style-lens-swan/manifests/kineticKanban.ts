import { createSwanManifest } from '../manifestFactory';

export const KINETIC_KANBAN_MANIFEST = createSwanManifest({
  id: 'kinetic-kanban', name: 'Kinetic Kanban',
  description: 'Priority lanes expose the next action without hiding current training truth.',
  emotionalJob: 'visible momentum', layoutSignature: 'weighted-kinetic-swimlanes',
  navigationRenderer: 'swimlane-pulse-navigation', shellRenderer: 'kinetic-kanban-shell',
  recipe: 'kinetic-kanban-recipe', profileOffsets: [2, 5, 7],
});