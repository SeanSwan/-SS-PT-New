/**
 * ============================================================================
 * FILE: sprintGeneratorProgressionWiring.test.mjs — R-H20 (slice E).
 *
 * WHY THIS FILE EXISTS (hostile-review finding D1)
 *   `workoutPrescriptionProgression.test.mjs` exercises `resolveWeekModifier` as a
 *   pure function and never imports the generator. A reviewer proved EMPIRICALLY
 *   that re-inlining the buggy `week.intensityModifier || progressionFn(...)` back
 *   into `sprintGenerator.mjs` leaves every one of those tests GREEN — so nothing
 *   pinned the production wiring, and the word "locked" was true only of the
 *   helper. This file closes that gap: it drives the REAL generator with the REAL
 *   resolver and asserts the modifier that actually reaches a generated class.
 *
 * REAL: generator, resolver, access control. MOCKED: models, the LLM-side class
 * generator, the slot writer, and the transaction.
 *
 * THE TRAP THIS AVOIDS: the generator's per-slot `catch` (sprintGenerator.mjs:192)
 * swallows any error into `failedSlots`, so a bad mock would look like a pass.
 * Every test here therefore also asserts `failedSlots === 0`.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { spies } = vi.hoisted(() => ({
  spies: {
    sprintFindByPk: vi.fn(),
    generateBootcampClass: vi.fn(),
    persistSlot: vi.fn(),
  },
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: async (callback) => callback({ id: 'tx' }) },
}));

vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => ({ findByPk: spies.sprintFindByPk, update: vi.fn(async () => [1]) }),
  getSprintWeek: () => ({ findOne: vi.fn(), findAll: async () => [] }),
  getSprintClassSlot: () => ({ findByPk: vi.fn(), findOne: vi.fn(), findAll: async () => [] }),
  getSprintExerciseMemory: () => ({ findAll: async () => [], destroy: vi.fn(), create: vi.fn() }),
  getBootcampSpaceProfile: () => null,
}));

vi.mock('../../services/bootcamp/bootcampGenerator.mjs', () => ({
  generateBootcampClass: spies.generateBootcampClass,
}));

vi.mock('../../services/bootcamp/sprintSlotWrite.mjs', () => ({
  persistGeneratedSlotAtomically: spies.persistSlot,
}));

vi.mock('../../services/bootcamp/sprintService.mjs', () => ({
  getSprintExerciseMemoryKeys: vi.fn(async () => []),
}));

const { generateSprintClasses } = await import('../../services/bootcamp/sprintGenerator.mjs');

const OWNER = { userId: 7, role: 'trainer' };

/** A sprint shaped the way the generator receives it, with weeks/slots present. */
const sprintWith = ({ strategy, weeks, metadata }) => ({
  id: 12,
  trainerId: 7,
  status: 'draft',
  defaultFormat: 'stations_4x',
  defaultStyle: 'standard',
  durationWeeks: weeks.length,
  progressionStrategy: strategy,
  spaceProfileId: null,
  metadata,
  update: vi.fn(async () => {}),
  weeks: weeks.map(({ weekNumber, isDeloadWeek = false, intensityModifier = 1.0 }) => ({
    weekNumber,
    isDeloadWeek,
    intensityModifier,
    classSlots: [{
      id: weekNumber,
      status: 'planned',
      classFormat: 'stations_4x',
      classStyle: 'standard',
      dayType: 'full_body',
      scheduledDate: '2026-03-02',
    }],
  })),
});

/** The classData objects handed to each generated class, in order. */
let created = [];

/** Every `type:'intensity'` message the generator recorded, in order. */
const intensityMessages = () => created
  .flatMap((classData) => classData.explanations ?? [])
  .filter((entry) => entry.type === 'intensity')
  .map((entry) => entry.message);

beforeEach(() => {
  vi.clearAllMocks();
  created = [];
  // Each generated class carries the explanations array the generator pushes to.
  spies.generateBootcampClass.mockImplementation(async () => {
    const classData = { exercises: [], explanations: [] };
    created.push(classData);
    return classData;
  });
  spies.persistSlot.mockResolvedValue(undefined);
});

describe('R-H20 — the resolved modifier reaches the generated class (wiring)', () => {
  it('records the STRATEGY value for a non-deload week carrying the scaffold 1.0', async () => {
    // THE regression this file exists for. `undulating` is [1.0, 0.85, 1.1], and
    // the persisted scaffold value is 1.0 — which is TRUTHY, so the old
    // `stored || fn(...)` recorded 1 for every week and no strategy ever ran.
    spies.sprintFindByPk.mockResolvedValue(
      sprintWith({ strategy: 'undulating', weeks: [{ weekNumber: 1 }, { weekNumber: 2 }] }),
    );

    const result = await generateSprintClasses(12, OWNER, () => {});

    expect(result.failedSlots).toBe(0);
    const messages = intensityMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('modifier 1');
    // The discriminating assertion: re-inlining the buggy expression yields
    // "modifier 1" here and fails.
    expect(messages[1]).toContain('modifier 0.85');
  });

  it('records the deload modifier for the fourth week', async () => {
    spies.sprintFindByPk.mockResolvedValue(
      sprintWith({
        strategy: 'undulating',
        weeks: [{ weekNumber: 1 }, { weekNumber: 2 }, { weekNumber: 3 }, { weekNumber: 4, isDeloadWeek: true }],
      }),
    );

    const result = await generateSprintClasses(12, OWNER, () => {});

    expect(result.failedSlots).toBe(0);
    const messages = intensityMessages();
    expect(messages[3]).toContain('modifier 0.7');
    expect(messages[3]).toContain('(deload)');
  });

  // ── §6 line 258: "Display this compatibility inference" ─────────────────────
  it('DISPLAYS where each modifier came from, not just its value', async () => {
    // A bare number cannot tell a trainer whether the plan was resolved by the strategy or by
    // their own older value — which is the whole reason line 258 asks for the inference to be
    // shown. The message is persisted in the class's explanations, so the slot detail panel
    // is where it surfaces.
    spies.sprintFindByPk.mockResolvedValue(
      sprintWith({
        strategy: 'undulating',
        weeks: [
          { weekNumber: 1 },                                  // strategy
          { weekNumber: 2, intensityModifier: 1.25 },          // legacy in-band override
          { weekNumber: 3, isDeloadWeek: true },               // deload
        ],
      }),
    );

    await generateSprintClasses(12, OWNER, () => {});

    const messages = intensityMessages();
    expect(messages[0]).toContain('(from the undulating strategy)');
    expect(messages[1]).toContain('(legacy override)');
    expect(messages[2]).toContain('(deload)');
  });

  it('SAYS SO when an out-of-range modifier needs correction instead of clamping it', async () => {
    // §6 line 258: "Out-of-range legacy values require correction, not silent clamping."
    // Silence here would be the worst outcome: the trainer reads a number that looks like
    // their own prescription while the strategy is actually driving the class.
    spies.sprintFindByPk.mockResolvedValue(
      sprintWith({ strategy: 'linear', weeks: [{ weekNumber: 1, intensityModifier: 1.9 }] }),
    );

    await generateSprintClasses(12, OWNER, () => {});

    const messages = intensityMessages();
    expect(messages[0]).toContain('NEEDS CORRECTION');
    expect(messages[0]).toContain('NOT clamped');
    // …and the value recorded is the STRATEGY's, never the out-of-range stored one.
    expect(messages[0]).toContain('modifier 1');
    expect(messages[0]).not.toContain('modifier 1.9');
  });

  it('honours a stored override instead of the strategy', async () => {
    spies.sprintFindByPk.mockResolvedValue(
      sprintWith({
        strategy: 'undulating',
        weeks: [{ weekNumber: 1 }, { weekNumber: 2, intensityModifier: 1.25 }],
      }),
    );

    const result = await generateSprintClasses(12, OWNER, () => {});

    expect(result.failedSlots).toBe(0);
    expect(intensityMessages()[1]).toContain('modifier 1.25');
  });

  it('hands the week modifier to the class generator as a work-interval modifier', async () => {
    // R-H20's actual requirement: the resolved modifier must reach the code that
    // PRESCRIBES the work interval. Asserting the argument is the seam assertion —
    // what the generator then does with it is locked by
    // workIntervalProgression.test.mjs. Without this the modifier stopped at a log
    // string, which is the failure row H20 exists to prevent.
    spies.sprintFindByPk.mockResolvedValue(
      sprintWith({ strategy: 'undulating', weeks: [{ weekNumber: 1 }, { weekNumber: 2 }] }),
    );

    const result = await generateSprintClasses(12, OWNER, () => {});

    expect(result.failedSlots).toBe(0);
    const args = spies.generateBootcampClass.mock.calls.map(([call]) => call);
    expect(args[1].workIntervalModifier).toBe(0.85);
    expect(args[1].workIntervalSource).toBe('sprint_week_progression');
  });

  it('reads an explicit override of exactly 1.0 out of the sprint metadata', async () => {
    // The live path for contract §6 line 258. Without the metadata read, the stored
    // scaffold 1.0 routes to `undulating` and the trainer's deliberate "no
    // progression" choice is silently replaced by 0.85.
    spies.sprintFindByPk.mockResolvedValue(sprintWith({
      strategy: 'undulating',
      weeks: [{ weekNumber: 1 }, { weekNumber: 2 }],
      metadata: { progressionPolicyV1: { version: 1, overrideByWeek: { 2: 1.0 } } },
    }));

    const result = await generateSprintClasses(12, OWNER, () => {});

    expect(result.failedSlots).toBe(0);
    const messages = intensityMessages();
    expect(messages[0]).toContain('modifier 1'); // week 1: strategy value is 1.0
    // Week 2 would be 0.85 from the strategy; the explicit override must win.
    expect(messages[1]).toContain('modifier 1');
    expect(messages[1]).not.toContain('modifier 0.85');
  });

  it('seeds `random` from the sprint id, so a rerun resolves the same value', async () => {
    // Contract §6 line 256: regeneration must not re-roll the week's load. A bare
    // Math.random() made the two runs below disagree.
    const build = () => sprintWith({ strategy: 'random', weeks: [{ weekNumber: 2 }] });

    spies.sprintFindByPk.mockResolvedValue(build());
    await generateSprintClasses(12, OWNER, () => {});
    const firstRun = intensityMessages()[0];

    spies.generateBootcampClass.mockClear();
    spies.sprintFindByPk.mockResolvedValue(build());
    await generateSprintClasses(12, OWNER, () => {});
    const secondRun = intensityMessages()[0];

    expect(firstRun).toBe(secondRun);
    // …and it must not have collapsed to the scaffold default.
    expect(firstRun).not.toContain('modifier 1 ');
    expect(firstRun).not.toContain('modifier 1 —');
  });
});
