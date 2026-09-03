/**
 * Contract: LAW 5 — one celebration, one name.
 *
 * Five-surface review X1, corrected by Fable 5.1 (blueprint G1): the "Crystallize
 * primitive" a grep found is the settings/appearance theme-switch transition, not
 * the record artifact. The artifact did not exist, so an ordinary logged set
 * recorded nothing and only PR/first/streak got a burst. CrystallizeRecord is the
 * artifact; the burst stays the PR bloom ON it. Nothing else may celebrate.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/components/WorkoutLogger';
const handoff = readFileSync(resolve(process.cwd(), `${dir}/handoff/PostSaveHandoff.tsx`), 'utf8');

describe('one celebration', () => {
  it('every save records through the Crystallize artifact', () => {
    expect(handoff).toContain('CrystallizeRecord');
    expect(handoff).toMatch(/testId="crystallize-record"/);
  });

  it('the record is unconditional; only the burst is gated to PR/first/streak', () => {
    const burstAt = handoff.indexOf('<CelebrationBurst');
    const recordAt = handoff.indexOf('<CrystallizeRecord');
    expect(burstAt).toBeGreaterThan(-1);
    expect(recordAt).toBeGreaterThan(burstAt);
    // The burst sits inside a headline guard; the record does not.
    const guard = "{(headline === 'pr' || headline === 'first' || headline === 'streak') && (";
    expect(handoff).toContain(guard);
    const recordLine = handoff.slice(recordAt - 200, recordAt);
    expect(recordLine).not.toContain(guard);
  });

  it('the record reads REAL ProofSeries fields, not invented ones', () => {
    expect(handoff).toMatch(/proof\.todayE1rm/);
    expect(handoff).toMatch(/proof\.prDeltaLbs/);
    expect(handoff).not.toMatch(/proof\.deltaLabel/);
  });

  it('no second celebration exists anywhere in the logger tree', () => {
    const walk = (d: string): string[] =>
      readdirSync(resolve(process.cwd(), d), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
    const sources = walk(dir).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
    // Two files are sanctioned: CelebrationBurst (the PR bloom) and
    // CrystallizeRecord (the record artifact). Any OTHER file in the logger
    // tree that reaches for celebration vocabulary is the second celebration
    // LAW 5 forbids. Naming the sanctioned pair beats comment-stripping: a
    // contract that greps prose convicts CelebrationBurst's own source, which
    // says its particle is a "diamond facet, not confetti rectangle".
    const SANCTIONED = ['CelebrationBurst.tsx', 'CrystallizeRecord.tsx'];
    const banned = /\bconfetti\b|badge-?rain|fireworks|<CelebrationBurst/i;
    const offenders = sources
      .filter((f) => !SANCTIONED.some((ok) => f.endsWith(ok)))
      .filter((f) => f !== `${dir}/handoff/PostSaveHandoff.tsx`)
      .filter((f) => banned.test(readFileSync(resolve(process.cwd(), f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
