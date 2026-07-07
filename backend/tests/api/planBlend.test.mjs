/**
 * planBlend.test.mjs — charter v3 P3 locks (combine two plans into a new one)
 * =============================================================================
 * Sean: "possibly blend and combine both of those plans to make one new plan."
 * Locks: (1) pure composition — picks pull whole weeks or specific days from
 * either source, renumbered sequentially into a NEW plan; sources are NEVER
 * mutated; (2) provenance records blendedFrom + the pick map; (3) the route is
 * trainer/admin-gated and both sources must belong to the same client.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { composeBlendedPlanData } from '../../services/planBlendService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');

const day = (n, name) => ({ dayNumber: n, dayType: 'training', exercises: [{ exerciseName: name }] });
const weekOf = (weekNumber, names) => ({ weekNumber, days: names.map((name, i) => day(i + 1, name)) });

const planA = { weeks: [weekOf(1, ['A1a', 'A1b']), weekOf(2, ['A2a', 'A2b'])] };
const planB = { weeks: [weekOf(1, ['B1a', 'B1b']), weekOf(2, ['B2a', 'B2b'])] };

describe('composeBlendedPlanData', () => {
  it('pulls whole weeks from either source and renumbers sequentially', () => {
    const blended = composeBlendedPlanData({
      sources: { A: planA, B: planB },
      picks: [
        { source: 'A', weekNumber: 1 },
        { source: 'B', weekNumber: 2 },
        { source: 'A', weekNumber: 2 },
      ],
    });
    expect(blended.weeks).toHaveLength(3);
    expect(blended.weeks.map((w) => w.weekNumber)).toEqual([1, 2, 3]);
    expect(blended.weeks[0].days[0].exercises[0].exerciseName).toBe('A1a');
    expect(blended.weeks[1].days[0].exercises[0].exerciseName).toBe('B2a');
    expect(blended.weeks[2].days[1].exercises[0].exerciseName).toBe('A2b');
  });

  it('supports day-level picks within a week', () => {
    const blended = composeBlendedPlanData({
      sources: { A: planA, B: planB },
      picks: [{ source: 'A', weekNumber: 1, dayNumbers: [2] }],
    });
    expect(blended.weeks[0].days).toHaveLength(1);
    expect(blended.weeks[0].days[0].dayNumber).toBe(1); // renumbered
    expect(blended.weeks[0].days[0].exercises[0].exerciseName).toBe('A1b');
  });

  it('never mutates the source plans', () => {
    const snapshotA = JSON.stringify(planA);
    composeBlendedPlanData({
      sources: { A: planA, B: planB },
      picks: [{ source: 'A', weekNumber: 1 }],
    });
    expect(JSON.stringify(planA)).toBe(snapshotA);
  });

  it('rejects empty or invalid picks honestly', () => {
    expect(() => composeBlendedPlanData({ sources: { A: planA, B: planB }, picks: [] })).toThrow(/at least one/i);
    expect(() =>
      composeBlendedPlanData({ sources: { A: planA, B: planB }, picks: [{ source: 'A', weekNumber: 9 }] })
    ).toThrow(/week 9/i);
  });
});

describe('wiring contracts', () => {
  const SERVICE = read('../../services/planBlendService.mjs');
  const ROUTES = read('../../routes/workoutPlanRoutes.mjs');

  it('the blend persists provenance and never mutates sources', () => {
    expect(SERVICE).toMatch(/blendedFrom/);
    expect(SERVICE).toMatch(/status: 'draft'/);
  });

  it('the blend route is trainer/admin-gated and same-client-verified', () => {
    expect(ROUTES).toMatch(/router\.post\(\s*'\/blend'/);
    const block = ROUTES.slice(ROUTES.indexOf("'/blend'") - 200, ROUTES.indexOf("'/blend'") + 600);
    expect(block).toMatch(/trainerOrAdminOnly/);
    expect(SERVICE).toMatch(/belong to the same client|same client/i);
  });
});
