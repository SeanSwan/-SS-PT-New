/**
 * Fixture roster — entirely fictional.
 * ====================================
 * No real child, family, setting, or street appears in this repository, and none
 * ever may. These names are the ones already used as examples in the published
 * artifacts, reused deliberately: inventing fresh names risks colliding with a real
 * one by accident, whereas these have already passed the leak gate several times.
 *
 * CANARIES. Two entries exist only to be caught:
 *   - `Zander Quill` is a canary NAME. It is a roster child like any other, so a
 *     working pipeline always substitutes it. If that string ever appears in
 *     outbound text, the pipeline is broken — regardless of what the corpus says.
 *   - The canary CIRCUMSTANCE lives in the corpora, not here: "the child whose
 *     grandmother runs the bakery on Mill Road" carries no sensitive vocabulary at
 *     all and must still be refused. It is the harder of the two by a long way.
 */

import { withPlaceholders } from './desk.mjs';

export const ROSTER = withPlaceholders([
  { id: 'c1', name: 'Priya', nicknames: ['Pri'], carers: ['Anita', 'Dev'] },
  { id: 'c2', name: 'Rafi', nicknames: [], carers: ['Yusuf'] },
  { id: 'c3', name: 'Theodore', nicknames: ['Theo', 'Teddy'], carers: ['Sarah', 'James'] },
  { id: 'c4', name: 'Amara', nicknames: ['Mimi'], carers: ['Grace'] },
  { id: 'c5', name: 'Leo', nicknames: [], carers: ['Hannah'] },
  { id: 'c6', name: 'Zander Quill', nicknames: ['Zander'], carers: ['Marguerite'] },
]);

/** Strings that must never appear in outbound text, checked independently of the corpus. */
export const CANARIES = ['Zander Quill', 'Zander', 'Marguerite', 'Mill Road'];
