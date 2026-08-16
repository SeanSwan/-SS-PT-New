/**
 * Test corpus — synthetic teacher brain-dumps.
 *
 * All names are invented for testing and appear nowhere in the source material.
 * Written to match how the input actually arrives: lowercase, run-on, unpunctuated,
 * dictation artefacts, emotional asides mixed with logistics.
 *
 * `expect` lists the types each dump should yield, order-independent. The harness
 * scores per-fragment classification, not exact segmentation — segmentation is
 * measured separately because over-splitting is a much cheaper failure than
 * mis-typing.
 */

export const ROSTER = [
  { id: 'c1', name: 'Priya', nicknames: [] },
  { id: 'c2', name: 'Tomas', nicknames: ['Tommy'] },
  { id: 'c3', name: 'Zoe', nicknames: [] },
  { id: 'c4', name: 'Kai', nicknames: [] },
  { id: 'c5', name: 'Ines', nicknames: ['Inez'] },
  { id: 'c6', name: 'Rafi', nicknames: [] },
];

export const CORPUS = [
  {
    id: 'classic-dump',
    text: "okay today was chaos lol. Tomas had a really hard time at cleanup again. Zoe counted five bears completely on her own!! need wipes and glue sticks. Kai's mum asked me about nap. apple activity tomorrow, and I forgot to print the family photos",
    expect: ['child_followup', 'observation', 'supply', 'parent', 'prep', 'prep'],
  },
  {
    id: 'supplies-heavy',
    text: "we're out of paper towels. need more construction paper and I think the glue is basically gone. also running low on wipes",
    expect: ['supply', 'supply', 'supply'],
  },
  {
    id: 'observation-run',
    text: "Priya zipped her own coat today for the first time! and Rafi stacked the blocks all by himself without help",
    expect: ['observation', 'observation'],
  },
  {
    id: 'parent-mix',
    text: "Ines dad emailed about the field trip form. Zoe's mum mentioned she didn't sleep well. one of the parents asked about sunscreen",
    expect: ['parent', 'parent', 'parent'],
  },
  {
    id: 'admin-week',
    text: "staff meeting thursday. the director wants the incident forms signed off. mandated reporter training is due friday",
    expect: ['admin', 'admin', 'admin'],
  },
  {
    id: 'behaviour',
    text: "Kai bit someone at the sand table. Tomas cried at drop off again this morning. Rafi refused to come inside",
    expect: ['child_followup', 'child_followup', 'child_followup'],
  },
  {
    id: 'ideas',
    text: "we should do a leaf collage next week. would be cute to make handprint trees. maybe we could try water beads",
    expect: ['idea', 'idea', 'idea'],
  },
  {
    id: 'prep-run',
    text: "need to laminate the name cards. print the newsletter. cut out the shapes for tomorrow",
    expect: ['prep', 'prep', 'prep'],
  },
  {
    id: 'exhausted-runon',
    text: "so tired. Zoe had a meltdown at lunch and Priya's dad asked me if she's eating enough and I still need to print the photos for the board and we're nearly out of tissues",
    expect: ['child_followup', 'parent', 'prep', 'supply'],
  },
  {
    id: 'dictation-mangled',
    text: "tomus had a hard time again at cleanup. inez counted to ten by herself",
    expect: ['child_followup', 'observation'],
    fuzzyNames: true,
  },
  {
    id: 'mixed-emotional',
    text: "honestly a good day. Rafi shared the trucks without being asked which is huge. need glue sticks. the director wants the forms by monday",
    expect: ['observation', 'supply', 'admin'],
  },
  {
    id: 'single-supply',
    text: "need more wipes",
    expect: ['supply'],
  },
  {
    id: 'incident-shape',
    text: "Kai bit Tomas at 10:40 near the sand table. I told Kai's mum at pickup",
    expect: ['child_followup', 'parent'],
  },
  {
    id: 'week-planning',
    text: "next week is the letter B. we should do bubbles. need to prep the sensory bin",
    expect: ['prep', 'idea', 'prep'],
  },
];
