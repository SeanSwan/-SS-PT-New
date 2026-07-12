import { createSwanManifest } from '../manifestFactory';

export const COACH_LEDGER_MANIFEST = createSwanManifest({
  id: 'coach-ledger',
  name: 'Coach Ledger',
  description: 'An editorial training ledger for dense review, notes, and decisive actions.',
  emotionalJob: 'operational trust',
  layoutSignature: 'indexed-ledger-with-annotation-margin',
  navigationRenderer: 'ledger-index-navigation',
  shellRenderer: 'coach-ledger-shell',
  recipe: 'coach-ledger-recipe',
  profileOffsets: [5, 8, 10],
});