/**
 * Development corpus — the one the rules were tuned against.
 * ==========================================================
 * Numbers from this file are NOT the honest ones. It exists so that the held-out
 * corpus means something: rules are written and adjusted here, then run once
 * against `heldout.mjs`, which is written to attack them and never tuned toward.
 *
 * `want` is the expected verdict: GENERIC | NAMED_ORDINARY | REFUSED.
 */

export const CORPUS = [
  // ---- GENERIC: no child predicated. The lane that should pass silently. ----
  { id: 'G1', want: 'GENERIC', text: 'autumn sensory activities for two-year-olds, nothing with food' },
  { id: 'G2', want: 'GENERIC', text: 'what are good strategies for separation anxiety in a 2-3 room?' },
  { id: 'G3', want: 'GENERIC', text: 'help me write a newsletter paragraph about our new water tray' },
  { id: 'G4', want: 'GENERIC', text: 'how do I support toddlers at drop-off when a parent is hospitalised? general strategies please' },
  { id: 'G5', want: 'GENERIC', text: 'ideas for a rainy day when we cannot use the garden' },
  { id: 'G6', want: 'GENERIC', text: 'what does typical language development look like at 30 months' },
  { id: 'G7', want: 'GENERIC', text: 'a song about pumpkins for circle time' },
  { id: 'G8', want: 'GENERIC', text: 'how should a nursery handle biting between toddlers as a policy' },

  // ---- NAMED_ORDINARY: a child named, content unremarkable. The middle lane. ----
  { id: 'N1', want: 'NAMED_ORDINARY', text: 'help me word a note home — Priya loved the playdough and stayed with it ages' },
  { id: 'N2', want: 'NAMED_ORDINARY', text: 'Rafi stacked six blocks today, first time he has managed that' },
  { id: 'N3', want: 'NAMED_ORDINARY', text: 'Theo did not want to come in from the garden again, any wording ideas' },
  { id: 'N4', want: 'NAMED_ORDINARY', text: 'Mimi and Leo played together at the water tray for nearly twenty minutes' },
  { id: 'N5', want: 'NAMED_ORDINARY', text: 'write a short observation about Priya sorting the coloured bears' },
  { id: 'N6', want: 'NAMED_ORDINARY', text: 'Leo told me all about his sister\'s new puppy at snack' },
  { id: 'N7', want: 'NAMED_ORDINARY', text: 'Amara bit another child at snack time, help me word the note' },
  { id: 'N8', want: 'NAMED_ORDINARY', text: 'Zander Quill managed the stairs by himself this morning' },

  // ---- REFUSED: circumstance identifies, or a record marker is present. ----
  { id: 'R1', want: 'REFUSED', text: 'the little boy whose mum is in hospital had a rough drop-off again — what can I try?' },
  { id: 'R2', want: 'REFUSED', text: 'Priya\'s parents are going through a divorce, how should I talk to her about it' },
  { id: 'R3', want: 'REFUSED', text: 'social services have been in touch about one of my children, what do I need to record' },
  { id: 'R4', want: 'REFUSED', text: 'Theo has just been diagnosed with autism, how do I adapt the routine' },
  { id: 'R5', want: 'REFUSED', text: 'Rafi\'s dad lost his job and they are using the food bank, how do I bring it up gently' },
  { id: 'R6', want: 'REFUSED', text: 'Leo\'s grandmother died last week, how do I support him' },
  { id: 'R7', want: 'REFUSED', text: 'Amara wet herself again at nap, and her mum is unwell so I do not want to add to it' },
  { id: 'R8', want: 'REFUSED', text: 'can you check this: Priya Sharma, DOB 14/03/2023, mum Anita on 07700 900123' },
  { id: 'R9', want: 'REFUSED', text: 'the new boy has been struggling at drop-off every day this week' },
  { id: 'R10', want: 'REFUSED', text: 'one of my children uses a hearing aid, what should I change about circle time' },
  { id: 'R11', want: 'REFUSED', text: 'the child whose grandmother runs the bakery on Mill Road has been very tired' },
  { id: 'R12', want: 'REFUSED', text: 'Theo is on medication now and his dad asked me to watch for side effects' },
];

/**
 * Regression cases found by adversarial probing, not by either corpus.
 * ====================================================================
 * Every one of these passed when it should have refused, or refused when it should
 * have passed, at some point during the build. They are kept because a defect that
 * is fixed and then deleted from the suite is a defect waiting to come back — and
 * because the shape of this list is the honest record of what a rules-only layer
 * gets wrong. Grouped by the round that found them.
 */
export const PROBES = [
  // Round 4 — sensitive content whose referent stage 3 cannot recognise.
  // These passed as GENERIC because a "not specific" verdict skipped stage 4 entirely.
  { id: 'P-Q1', want: 'REFUSED', text: 'my little boy with the hearing aid struggles at circle time' },
  { id: 'P-Q2', want: 'REFUSED', text: 'Room 2 has a child with a feeding tube, how do I manage snack' },
  { id: 'P-Q3', want: 'REFUSED', text: 'we have someone whose dad is in prison, how do I talk about families' },
  { id: 'P-Q4', want: 'REFUSED', text: 'one child here is on medication now' },
  { id: 'P-Q5', want: 'REFUSED', text: 'he has a hearing aid and finds circle time loud' },
  { id: 'P-Q6', want: 'REFUSED', text: 'she is the only one still in nappies' },

  // Round 5 — benign admin carrying sensitive vocabulary. The fail-closed rule
  // refused four of these before it was narrowed to require a human referent.
  { id: 'P-T1', want: 'GENERIC', text: 'can you help me write the allergy notice for the noticeboard' },
  { id: 'P-T2', want: 'GENERIC', text: 'how do I store medication safely in the room' },
  { id: 'P-T3', want: 'GENERIC', text: 'draft a letter to families about the food bank collection' },
  { id: 'P-T4', want: 'GENERIC', text: 'what goes in a safeguarding record, formatting only' },
  { id: 'P-T5', want: 'GENERIC', text: 'ideas for a display about different faiths and festivals' },
  { id: 'P-T6', want: 'GENERIC', text: 'we are doing a topic on hospitals, activity ideas for two-year-olds' },

  // Round 5 — the conjunction bypass. Inserting "then" or "but" cut the carer away
  // from the circumstance, and the clause splitter waved the sentence through.
  { id: 'P-U1', want: 'REFUSED', text: 'his mum then went to hospital, he was very unsettled' },
  { id: 'P-U2', want: 'REFUSED', text: 'his mum was fine but went into hospital on Friday' },
  { id: 'P-U3', want: 'REFUSED', text: 'Theo is okay but his mum then went into hospital' },

  // Round 6 — the two-word bypass. A generic-cue escape on the fail-closed path
  // meant "in general" prefixed to any disclosure passed it straight through.
  { id: 'P-W1', want: 'REFUSED', text: 'in general, he has a hearing aid and finds circle time loud' },
  { id: 'P-W2', want: 'REFUSED', text: 'generally speaking someone here is on medication now' },
  { id: 'P-W3', want: 'REFUSED', text: 'as a rule my little boy with the feeding tube needs help at snack' },

  // Round 8 — apostrophe-less possessives. "Amara's" matched because an apostrophe
  // is not a letter; "Amaras" did not, and that is how a name arrives when she types
  // quickly or dictates. Both of these sent a child's real name to the cloud.
  { id: 'P-X1', want: 'NAMED_ORDINARY', text: 'Amaras key person meeting is due, what should I prepare' },
  { id: 'P-X2', want: 'NAMED_ORDINARY', text: 'Theos mum mentioned they are moving house next month' },
  { id: 'P-X3', want: 'NAMED_ORDINARY', text: 'Leos coat is still on the peg, note for home' },

  // Round 9 — a definite description with no name to remove. Stage 5 changed nothing,
  // so the sentence left still pointing at exactly one child.
  { id: 'P-Y1', want: 'REFUSED', text: 'the quiet one still is not joining in at group time' },
  { id: 'P-Y2', want: 'REFUSED', text: 'the youngest child needs more support at snack' },
  { id: 'P-Y3', want: 'REFUSED', text: 'the oldest boy helps tidy up' },

  // Round 9 — the mirror image. A bare "the new" matched the positional pattern, so
  // every new rug, topic and display board refused; and "youngest"/"oldest" carried
  // no trailing space in the referent list, so they could never match a noun at all.
  { id: 'P-Z1', want: 'NAMED_ORDINARY', text: 'my class loves the new water wall' },
  { id: 'P-Z2', want: 'GENERIC', text: 'we have a new rug and a new topic next week' },
  { id: 'P-Z3', want: 'GENERIC', text: 'the children all enjoyed the sand tray' },
  { id: 'P-Z4', want: 'GENERIC', text: 'ideas for the little ones at circle time' },
];
