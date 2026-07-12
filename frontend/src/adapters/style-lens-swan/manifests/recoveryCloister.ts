import { createSwanManifest } from '../manifestFactory';

export const RECOVERY_CLOISTER_MANIFEST = createSwanManifest({
  id: 'recovery-cloister',
  name: 'Recovery Cloister',
  description: 'A quiet sanctuary layout that protects readiness and recovery signals.',
  emotionalJob: 'restorative clarity',
  layoutSignature: 'sanctuary-ring-and-lower-dock',
  navigationRenderer: 'cloister-bottom-navigation',
  shellRenderer: 'recovery-cloister-shell',
  recipe: 'recovery-cloister-recipe',
  profileOffsets: [3, 6, 8],
});