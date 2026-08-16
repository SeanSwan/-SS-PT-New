/**
 * HELD-OUT adversarial corpus.
 *
 * Written AFTER the rules were tuned, deliberately targeting classes the rules were
 * never shaped against. The number this produces is the honest one; the tuned corpus
 * only proves the rules do what they were built to do.
 *
 * Each case names the trap it sets, so a regression tells you which capability broke.
 */

export const ROSTER = [
  { id: 'c1', name: 'Priya', nicknames: [] },
  { id: 'c2', name: 'Tomas', nicknames: ['Tommy'] },
  { id: 'c3', name: 'Zoe', nicknames: [] },
  { id: 'c4', name: 'Kai', nicknames: [] },
  { id: 'c5', name: 'Ines', nicknames: ['Inez'] },
  { id: 'c6', name: 'Rafi', nicknames: [] },
  { id: 'c7', name: 'Summer', nicknames: [] },   // name that collides with a common word
  { id: 'c8', name: 'Art', nicknames: [] },      // name that collides with a classroom noun
];

export const HELDOUT = [
  {
    id: 'negation-supply',
    trap: 'Negated need — "don\'t need" must not become a supply request',
    text: "we don't need more glue after all, the order came in",
    expect: [],
    tolerate: ['supply'],
  },
  {
    id: 'supply-inside-observation',
    trap: 'Supply noun inside a developmental observation should stay an observation',
    text: "Zoe used the glue stick all by herself today",
    expect: ['observation'],
  },
  {
    id: 'parent-inside-observation',
    trap: 'Parent noun inside an observation should not flip it to parent',
    text: "Rafi told his mum about the caterpillar completely unprompted",
    expect: ['observation'],
    tolerate: ['parent'],
  },
  {
    id: 'child-name-in-supply',
    trap: 'A child name in a supply line must NOT child-link the supply item',
    text: "need more of the dinosaur blocks Kai likes",
    expect: ['supply'],
    mustNotChildLink: true,
  },
  {
    id: 'name-word-collision',
    trap: 'A child called Summer vs the season; a child called Art vs the activity',
    text: "Summer had a hard time at nap. we did art in the afternoon",
    expect: ['child_followup'],
    tolerate: ['prep', 'idea'],
  },
  {
    id: 'no-punctuation-runon',
    trap: 'Dictation with zero punctuation — the hardest real input',
    text: "tomas cried at drop off again zoe counted to twenty need wipes priyas mum asked about the trip",
    expect: ['child_followup', 'observation', 'supply', 'parent'],
    segmentationHard: true,
  },
  {
    id: 'pure-emotion',
    trap: 'Emotional content with no actionable item — must not invent tasks',
    text: "honestly I am so tired today. I don't know how I'm going to keep this up",
    expect: [],
  },
  {
    id: 'ambiguous-dual',
    trap: 'Genuinely two types in one clause — either is defensible',
    text: "Kai bit Tomas and I need to fill in an incident form",
    expect: ['child_followup', 'admin'],
  },
  {
    id: 'past-tense-done',
    trap: 'Already-completed work should not be emitted as a future task',
    text: "already printed the newsletter and laminated the name cards",
    expect: ['prep', 'prep'],
    note: 'rules cannot detect completion; the review UI must let her mark done in one tap',
  },
  {
    id: 'question-to-self',
    trap: 'A question is not a task',
    text: "should I move nap earlier? not sure if it would help",
    expect: [],
    tolerate: ['idea'],
  },
  {
    id: 'medical-adjacent',
    trap: 'Health content must classify, not vanish — it is the highest-sensitivity class',
    text: "Ines has a rash on her arm, told her dad at pickup and wrote it in the log",
    expect: ['child_followup', 'parent'],
  },
  {
    id: 'multi-child-single-clause',
    trap: 'Two children in one clause — must not silently pick one',
    text: "Priya and Rafi both managed the stairs by themselves today",
    expect: ['observation'],
    multiChild: true,
  },
];
