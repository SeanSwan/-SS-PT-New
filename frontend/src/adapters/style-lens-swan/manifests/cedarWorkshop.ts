import { createSwanManifest } from '../manifestFactory';

export const CEDAR_WORKSHOP_MANIFEST = createSwanManifest({
  id: 'cedar-workshop', name: 'Cedar Workshop',
  description: 'Warm precision frames durable training work as a carefully built practice.',
  emotionalJob: 'grounded mastery', layoutSignature: 'cedar-bench-and-parts-wall',
  navigationRenderer: 'workshop-parts-navigation', shellRenderer: 'cedar-workshop-shell',
  recipe: 'cedar-workshop-recipe', profileOffsets: [10, 2, 4],
});