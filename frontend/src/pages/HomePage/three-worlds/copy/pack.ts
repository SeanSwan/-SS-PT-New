/**
 * pack — all human-visible copy for the 20 front-page variants.
 * @module pages/HomePage/three-worlds/copy/pack
 *
 * TWO RULES GOVERN THIS FILE
 *
 * 1. NO INVENTED NUMBERS. Every figure resolves from `content/marketingStats.ts`,
 *    the single source of truth. That file records that `clientsTransformed`,
 *    `satisfactionPct`, `sessionsDelivered` and `lbsLostTogether` are still
 *    `[NEEDS-SEAN-NUMBER D-F]` and currently carry the CONSERVATIVE value of the
 *    two previously-shipped claims. So this pack repeats them as-is and never
 *    rounds up. If Sean supplies real numbers, they change in ONE place and the
 *    fleet follows.
 *
 * 2. NO GENERATED-SOUNDING LANGUAGE. Enforced by `antiSlop.ts` (blueprint R5/T7).
 *    The house voice is short declaratives, concrete nouns, named methods
 *    (NASM OPT, biomechanics, myofascial release), and zero intensifiers. A
 *    sentence here that could not survive being read aloud in a gym is wrong.
 *
 * The shared `headline`/`sub` are the fleet's control group: all 20 variants are
 * compared on structure, so the words are held constant unless a variant's whole
 * conceit depends on its own line (see `overrides`).
 */
import {
  MARKETING_STATS,
  YEARS_EXPERIENCE_CLAIM,
  EXERCISE_LIBRARY_CLAIM,
  CLIENTS_TRANSFORMED_CLAIM,
  SATISFACTION_CLAIM,
} from '../../../../content/marketingStats';

/** Render one verified stat as display text. Pure; no literal is typed twice. */
function statText(stat: { value: number; suffix: string; display?: string }): string {
  return stat.display ?? `${stat.value}${stat.suffix}`;
}

/** Copy shown once per fleet — the shared language every variant inherits. */
export const SHARED = {
  /** Held constant across the fleet so judgement compares structure, not words. */
  headline: 'Health First. Community Always.',
  sub: 'Personal training in Anaheim Hills. NASM-protocol coaching, biomechanics-led programming, and a community that keeps showing up.',

  ctas: [
    { id: 'join', label: 'Join the Community', to: '/signup', intent: 'primary' },
    { id: 'trainer', label: 'Find a Trainer', to: '/contact', intent: 'secondary' },
    { id: 'programs', label: 'See Programs', to: '/store', intent: 'tertiary' },
  ],

  /** Proof lines. Each traces to a marketingStats entry — none is composed here. */
  proof: [
    { id: 'years', label: 'Years coaching', value: statText(MARKETING_STATS.yearsExperience) },
    { id: 'clients', label: 'Clients trained', value: statText(MARKETING_STATS.clientsTransformed) },
    { id: 'sessions', label: 'Sessions delivered', value: statText(MARKETING_STATS.sessionsDelivered) },
    { id: 'satisfaction', label: 'Client satisfaction', value: statText(MARKETING_STATS.satisfactionPct) },
    { id: 'exercises', label: 'Exercise library', value: statText(MARKETING_STATS.exerciseLibrary) },
    { id: 'swimmers', label: 'Swimmers taught', value: statText(MARKETING_STATS.swimmersTaught) },
  ],

  /** Section labels reused by variants that keep canonical sections. */
  sections: {
    mission: 'Why we coach',
    trainers: 'Who you train with',
    arsenal: 'What we use',
    programs: 'Ways to train',
    golf: 'Golf performance',
    about: 'How this started',
    testimonials: 'What clients say',
    stats: 'The numbers',
    social: 'Beyond the gym',
    newsletter: 'Stay in the loop',
    cta: 'Start here',
  },

  /** Trust facts an athlete can verify, not adjectives. */
  trust: [
    `${YEARS_EXPERIENCE_CLAIM} years coaching in Orange County`,
    `NASM OPT model and corrective exercise protocols`,
    `${EXERCISE_LIBRARY_CLAIM} exercises in the programming library`,
    `${CLIENTS_TRANSFORMED_CLAIM} clients trained since opening`,
    `${SATISFACTION_CLAIM} of clients report they would recommend us`,
  ],
} as const;

/**
 * Per-variant copy. Only variants whose entire structural conceit changes how the
 * page speaks get an override; the rest inherit SHARED and are judged on bones.
 * Keyed by variant id — the registry asserts every key resolves.
 */
export const OVERRIDES: Record<string, { headline?: string; sub?: string; note: string }> = {
  v01: { headline: 'Twenty-six years. Same front door.', sub: 'Sean Swan has coached in Anaheim Hills since 1999. The methods changed. The standard did not.', note: 'Ledger conceit: a date-stamped record, so the headline carries a year.' },
  v02: { headline: 'Your first session is a measurement.', sub: 'We assess movement before we load it. NASM overhead squat, biomechanics, then a plan.', note: 'Timeline conceit opens on the assessment step, not the promise.' },
  v03: { headline: 'Built for the body you have.', sub: 'Every program starts from your movement assessment. Not a template, not a trend.', note: 'Portal conceit addresses the reader directly.' },
  v04: { headline: 'Three ways to train. One standard.', sub: 'Express Precision, Signature Performance, Transformation. Same coaching, different hours.', note: 'Rail conceit needs the plan count stated up front.' },
  v05: { headline: 'Small groups. Full attention.', sub: 'Group sessions capped so every rep still gets eyes on it.', note: 'Spine conceit is about proximity, so the line is about attention.' },
  v06: { headline: 'Golf is a rotation sport.', sub: 'Hip and torso power, core stability, and the mobility a full backswing needs.', note: 'Evidence conceit picks the niche vertical to prove specificity.' },
  v07: { headline: 'Train anywhere. Same coach.', sub: 'Remote programming and check-ins through the SwanStudios platform.', note: 'Rail-and-well conceit foregrounds the remote delivery model.' },
  v08: { headline: 'The gym is not the hard part.', sub: 'Accountability, scheduling, and a community that notices when you miss.', note: 'Ledger conceit: names the real failure mode.' },
  v09: { headline: 'Measure it or it did not happen.', sub: 'Every session logged. Every chart built from your real numbers.', note: 'Sheet conceit is the data-truth rule as a headline.' },
  v10: { headline: 'Coaching that changes when you do.', sub: 'Programs get rewritten as your assessment results move.', note: 'Shelf conceit: the plan is a living document.' },
  v11: { headline: 'Anaheim Hills. Since 1999.', sub: 'One studio, one standard, and a community that outlasted every fitness trend.', note: 'Spine-offset conceit leads with place and tenure.' },
  v12: { headline: 'Recovery is programmed, not optional.', sub: 'Corrective exercise, mobility work, and myofascial release built into the plan.', note: 'Band-stack conceit places recovery inside the program, not beside it.' },
  v13: { headline: 'Thirty minutes. No wasted reps.', sub: 'Express Precision for the weeks when an hour is not available.', note: 'Gutter-index conceit names the constraint.' },
  v14: { headline: 'The numbers are yours.', sub: 'Sessions, load, and progress charts built from your logged training.', note: 'Tessellated conceit: data ownership.' },
  v15: { headline: 'Nutrition is part of the program.', sub: 'Macro planning and eating strategies that survive a real schedule.', note: 'Kanban conceit folds nutrition into the plan.' },
  v16: { headline: 'Photography, video, and the work behind it.', sub: 'We document the training. The gallery is open.', note: 'Wordfall conceit is the studio auteur voice.' },
  v17: { headline: 'Not a class. Not a challenge.', sub: 'Personal training built on assessment, periodization, and follow-through.', note: 'Sheet conceit refuses the category.' },
  v18: { headline: 'This page is the last thing we build.', sub: 'A construction-trades front page, composed as an editorial spread.', note: 'Wildcard: alien archetype speaking in its own voice about the page itself.' },
  v19: { headline: 'Twenty-six years of coaching, in one room.', sub: 'Assessment, programming, nutrition, and recovery under one roof.', note: 'Orbit conceit gathers the disciplines.' },
  v20: { headline: 'Come for the training. Stay for the people.', sub: 'The community is the program. The program is why it works.', note: 'Crucible conceit states the retention truth.' },
};

/** Shape the registry and console read. */
export const COPY_PACK = {
  shared: SHARED,
  overrides: OVERRIDES,
  /** Convenience: every headline the fleet can render, for the slop + length gates. */
  allHeadlines: [
    SHARED.headline,
    ...Object.values(OVERRIDES).map((o) => o.headline).filter((h): h is string => Boolean(h)),
  ],
  /** All figures shown anywhere in the fleet, resolved from marketingStats. */
  stats: {
    yearsExperience: statText(MARKETING_STATS.yearsExperience),
    clientsTransformed: statText(MARKETING_STATS.clientsTransformed),
    satisfactionPct: statText(MARKETING_STATS.satisfactionPct),
    sessionsDelivered: statText(MARKETING_STATS.sessionsDelivered),
    exerciseLibrary: statText(MARKETING_STATS.exerciseLibrary),
    lbsLostTogether: statText(MARKETING_STATS.lbsLostTogether),
  },
} as const;

/** Resolve the copy one variant actually renders. */
export function copyFor(id: string): { headline: string; sub: string } {
  const o = OVERRIDES[id];
  return { headline: o?.headline ?? SHARED.headline, sub: o?.sub ?? SHARED.sub };
}
