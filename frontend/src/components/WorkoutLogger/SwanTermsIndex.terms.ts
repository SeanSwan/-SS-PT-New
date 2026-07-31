/**
 * Swan Terms Index — the plain-English meaning of every abbreviation the
 * logger puts on screen. Sean, 2026-07-31: "we use PR and RPE all the
 * time… there should be an index somewhere that explains what it means."
 *
 * TRAILHEAD-TRUTH (rule 75): every entry describes what the app ACTUALLY
 * does today. Where the number feeds a calculation or a gate, the entry
 * says so — no aspirational copy.
 *
 * RPE/1RM wording is reused from NASMEducationContent (the definitions
 * already existed there with ZERO consumers — this index is what finally
 * surfaces them).
 */
import { RPE_EDUCATION, ONE_RM_EDUCATION } from './NASMEducationContent';

export interface SwanTerm {
  /** What the trainer sees on screen. */
  term: string;
  /** Spelled out — the thing Sean wanted written down. */
  expands: string;
  /** One-line plain-English meaning. */
  meaning: string;
  /** How to read/use the number in a real session. */
  howToUse?: string;
  group: 'Set logging' | 'Progress' | 'Programming' | 'Safety';
}

export const SWAN_TERMS: readonly SwanTerm[] = Object.freeze([
  {
    term: 'PR',
    expands: 'Personal Record',
    meaning: "The client's best-ever result on an exercise — heaviest weight, most reps, or biggest single-set volume.",
    howToUse: 'Swan flags a PR automatically after you save, by comparing this session against every prior logged session for that exercise. It is the moment worth celebrating with the client.',
    group: 'Progress',
  },
  {
    term: 'RPE',
    expands: RPE_EDUCATION.title, // 'Rate of Perceived Exertion'
    meaning: RPE_EDUCATION.tip,
    howToUse: 'Ask "how hard was that, 1 to 10?" right after the set. Rising RPE at the same weight = fatigue; falling RPE = the load is ready to go up.',
    group: 'Set logging',
  },
  {
    term: '1RM',
    expands: ONE_RM_EDUCATION.title, // 'Estimated 1RM (Brzycki)'
    meaning: ONE_RM_EDUCATION.tip,
    howToUse: 'You never have to test a true one-rep max — Swan estimates it from a normal working set.',
    group: 'Progress',
  },
  {
    term: 'Tempo',
    expands: 'Lifting speed, in seconds per phase',
    meaning: 'Three numbers such as 3-1-1: how many seconds the lowering phase, the pause, and the lifting phase each take.',
    howToUse: 'Read left to right as ecc-iso-con (below). Slowing the eccentric is the cheapest way to make a light weight hard.',
    group: 'Set logging',
  },
  {
    term: 'ecc',
    expands: 'Eccentric — the lowering phase',
    meaning: 'The muscle lengthens under load (lowering the bar, sitting into the squat).',
    howToUse: 'The phase that drives the most soreness and the most strength per rep. This is the first number in the tempo.',
    group: 'Set logging',
  },
  {
    term: 'iso',
    expands: 'Isometric — the pause',
    meaning: 'A hold with no movement, usually at the hardest point of the rep.',
    howToUse: 'The middle tempo number. A 1-2s pause kills bouncing and proves the client owns the position.',
    group: 'Set logging',
  },
  {
    term: 'con',
    expands: 'Concentric — the lifting phase',
    meaning: 'The muscle shortens under load (pressing the bar up, standing out of the squat).',
    howToUse: 'The last tempo number. Intent to move fast here is what builds power, even when the bar is slow.',
    group: 'Set logging',
  },
  {
    term: 'Reps',
    expands: 'Repetitions',
    meaning: 'How many times the exercise was performed in that set.',
    howToUse: 'Swan treats a set as LOGGED once reps is greater than zero — that is what fills the progress rail and the session meter.',
    group: 'Set logging',
  },
  {
    term: 'Form rating',
    expands: 'Movement quality, 1-5',
    meaning: 'Your coaching judgment of how well the rep was executed — 5 is textbook, 1 is breaking down.',
    howToUse: 'Rate honestly and low scores become the trend that justifies a regression or a corrective. Leave it untouched and nothing is recorded.',
    group: 'Safety',
  },
  {
    term: 'Pain level',
    expands: 'Reported pain, 0-10',
    meaning: "The client's reported pain during the exercise — 0 is none, 10 is the worst imaginable.",
    howToUse: 'This is a safety signal, not an effort signal. Anything the client calls sharp, or a rising trend across sessions, means stop and reassess — do not train through it.',
    group: 'Safety',
  },
  {
    term: 'Rest',
    expands: 'Rest between sets, in seconds',
    meaning: 'The recovery window before the next set. Swan starts the countdown automatically when you log a set.',
    howToUse: 'Short rest (30-60s) drives conditioning and endurance; long rest (2-5 min) preserves strength and power output.',
    group: 'Set logging',
  },
  {
    term: 'Superset',
    expands: 'Two exercises back-to-back',
    meaning: 'Paired exercises performed with no rest between them; the rest comes after the pair.',
    howToUse: 'Linked exercises show a chain mark on the rail. Great for saving time and for pairing opposing muscle groups.',
    group: 'Programming',
  },
  {
    term: 'Drop set',
    expands: 'Reduce the weight, keep going',
    meaning: 'Reaching near-failure, immediately cutting the load, and continuing without rest.',
    howToUse: 'Log each drop as its own set so the volume and the weight history stay truthful.',
    group: 'Programming',
  },
  {
    term: 'OPT phase',
    expands: 'Optimum Performance Training phase (NASM), 1-5',
    meaning: 'The NASM model of training stages: 1 stabilization, 2 strength endurance, 3 hypertrophy, 4 maximal strength, 5 power.',
    howToUse: "The phase sets the rep, tempo and rest targets Swan suggests. Change it from the plan chip when the client's block changes.",
    group: 'Programming',
  },
  {
    term: 'Volume',
    expands: 'Total work done',
    meaning: 'Weight multiplied by reps, added up across the session.',
    howToUse: 'The single best week-to-week progress number — more volume at the same form rating means real progress.',
    group: 'Progress',
  },
  {
    term: 'Corrective',
    expands: 'Corrective exercise',
    meaning: 'A drill chosen to fix a movement compensation rather than to build strength.',
    howToUse: 'Lives in the Warmup & Corrective band so it happens before the working sets, when it actually changes the session.',
    group: 'Safety',
  },
]);

export const TERM_GROUPS: readonly SwanTerm['group'][] = Object.freeze([
  'Set logging', 'Progress', 'Programming', 'Safety',
]);
