/**
 * Intake Coverage — absence must be stated, never implied
 * ======================================================
 *
 * Guards the C1 fix for the silent-degradation defect: every enrichment block
 * in aiChatService is `if (rows.length > 0) push(...)`, so an empty source
 * emitted NOTHING and Coach could not tell
 *   "screened, no compensations found"  from  "never screened".
 *
 * The contract these tests hold: a missing source is NAMED, and Coach is told
 * not to infer a normal finding from its absence.
 */
import { describe, expect, it } from 'vitest';
import {
  INTAKE_SOURCES,
  assessIntakeCoverage,
  buildIntakeCoverageBlock,
} from '../../services/ai/intakeCoverage.mjs';

const ROW = [{ id: 1 }];

/** Result sets with every source populated. */
const allPresent = () =>
  Object.fromEntries(INTAKE_SOURCES.map(({ key }) => [key, ROW]));

describe('assessIntakeCoverage', () => {
  it('reports every source missing when nothing is on file', () => {
    const { present, missing } = assessIntakeCoverage({});
    expect(present).toEqual([]);
    expect(missing).toHaveLength(INTAKE_SOURCES.length);
  });

  it('reports every source present when all are on file', () => {
    const { present, missing } = assessIntakeCoverage(allPresent());
    expect(missing).toEqual([]);
    expect(present).toHaveLength(INTAKE_SOURCES.length);
  });

  it('treats an empty array as absent, not as a clear finding', () => {
    // The exact production shape: the query ran and returned zero rows.
    const { missing } = assessIntakeCoverage({ ...allPresent(), movement: [] });
    expect(missing).toEqual(['NASM movement screen']);
  });

  it('treats a non-array (undefined/null) as absent', () => {
    for (const bad of [undefined, null, 0, '', {}]) {
      const { missing } = assessIntakeCoverage({ ...allPresent(), equipment: bad });
      expect(missing).toEqual(['Equipment availability']);
    }
  });
});

describe('buildIntakeCoverageBlock', () => {
  it('names the newly-onboarded client gap: screen + profile + equipment absent', () => {
    // Onboarding writes the questionnaire and baselines; MovementProfile and
    // EquipmentProfile come from two OTHER surfaces. This is that client.
    const block = buildIntakeCoverageBlock({
      onboarding: ROW,
      baseline: ROW,
      goals: ROW,
      painEntries: ROW,
      movement: [],
      movementProfile: [],
      equipment: [],
    });

    expect(block).toContain('NOT on file');
    expect(block).toContain('NASM movement screen');
    expect(block).toContain('Movement profile');
    expect(block).toContain('Equipment availability');
    expect(block).toContain('Onboarding questionnaire'); // listed as present
  });

  it('instructs Coach not to infer a normal finding from absence', () => {
    const block = buildIntakeCoverageBlock({ onboarding: ROW });
    expect(block).toContain('ABSENT, not empty-and-clear');
    expect(block).toMatch(/do not infer/i);
    expect(block).toMatch(/name the assessment/i);
  });

  it('says so plainly when everything is on file', () => {
    const block = buildIntakeCoverageBlock(allPresent());
    expect(block).toContain('All core intake sources are on file.');
    expect(block).not.toContain('NOT on file');
  });

  it('handles the nothing-on-file case without claiming anything is present', () => {
    const block = buildIntakeCoverageBlock({});
    expect(block).toContain('On file: nothing yet');
    expect(block).toContain('NOT on file');
  });

  it('always emits a labelled block so the section cannot vanish silently', () => {
    for (const input of [{}, allPresent(), { onboarding: ROW }]) {
      expect(buildIntakeCoverageBlock(input)).toContain('--- INTAKE COVERAGE ---');
    }
  });
});