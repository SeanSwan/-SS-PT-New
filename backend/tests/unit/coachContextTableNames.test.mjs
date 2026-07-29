/**
 * Table/column-name regression tests for the Coach + debate context SQL.
 *
 * WHY THIS FILE EXISTS (SWA-71, 2026-07-29):
 * Seven raw-SQL queries referenced tables and columns that DO NOT EXIST in the production
 * database. Verified by querying information_schema on the live DB, then by executing each
 * old and new query against it:
 *
 *   SQL said           reality                 old query result
 *   "PainEntries"  ->  client_pain_entries     relation "PainEntries" does not exist
 *   "bodyPart"     ->  "bodyRegion"            column does not exist
 *   "Goals"        ->  goals (lowercase)       relation "Goals" does not exist
 *   progress       ->  "progressPercentage"    column does not exist
 *
 * PostgreSQL is case-sensitive for quoted identifiers, so "Goals" and goals are different
 * tables. Every one of those queries threw at runtime — the Coach ran without pain and goal
 * context, and the debate engine started every debate with both enrichment domains empty.
 *
 * Note the drift is TWO layers deep: fixing only the table name would have moved the error
 * from "relation does not exist" to "column does not exist" — still broken, still silent.
 *
 * TWO THINGS HID THIS, and they are the transferable part:
 *
 *  1. Graceful degradation absorbed it. Each domain loads under Promise.allSettled, so a
 *     failing query degrades to [] and records {status:'degraded'} instead of taking the
 *     request down. That design is CORRECT and worth copying — but it makes a broken domain
 *     externally indistinguishable from an empty one. Resilience masked a real defect, which
 *     is why resilience and observability have to ship together.
 *
 *  2. The unit tests were pinned to the BROKEN names. The mocks matched /"Goals"/ and
 *     /PainEntries/, so they returned fixture rows for SQL that could never run in
 *     production. The suite was green the whole time. A test that asserts on the same wrong
 *     string the code uses does not verify the code — it photocopies it.
 *
 * Corroboration: services/aiChatService.mjs already queried `FROM goals`,
 * `FROM client_pain_entries`, "bodyRegion" and "progressPercentage" correctly. The Coach chat
 * path was right; the context engine and debate services had drifted away from it.
 *
 * Source-level assertions because the property under test is which identifier appears in the
 * SQL — exactly what the source shows — and because booting these modules needs a live DB.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(path.join(backendDir, rel), 'utf8');

/** Every file that reads pain or goal data with raw SQL. */
const SQL_FILES = [
  'services/ai/contextEngine/coachContextEngine.mjs',
  'services/ai/debate/debateClientContextService.mjs',
  'routes/aiDebateRoutes.mjs',
];

/** Identifiers proven absent from the production schema. */
const NONEXISTENT = [
  { pattern: /"PainEntries"/, real: 'client_pain_entries' },
  { pattern: /FROM\s+"Goals"/i, real: 'goals (lowercase, unquoted)' },
];

describe.each(SQL_FILES)('%s', (file) => {
  const source = read(file);

  it.each(NONEXISTENT)('does not reference $real by a nonexistent table name', ({ pattern }) => {
    expect(source).not.toMatch(pattern);
  });

  it('selects "bodyRegion", never a bare "bodyPart" column', () => {
    // "bodyPart" is correct as an OUTPUT alias — deIdentifier.mjs:98,
    // briefClientDispatcher.mjs:37 and workoutDebatePrompts.mjs:209 all read .bodyPart.
    // It is only wrong as a SOURCE column.
    const ok = !/client_pain_entries/.test(source) || /"bodyRegion"\s+AS\s+"bodyPart"/.test(source);
    expect(ok).toBe(true);
    expect(source).not.toMatch(/SELECT\s+"bodyPart",/);
  });

  it('selects "progressPercentage", never a bare progress column', () => {
    // The ::float cast is deliberate, not decoration: progressPercentage is NUMERIC, and
    // node-postgres returns NUMERIC as a STRING ("0.00"). Without the cast deIdentifyGoals
    // emits a string for a field named `progress`, and `g.progress || 0` keeps "0.00"
    // rather than falling through to 0. Verified against the live DB:
    //   without cast -> "0.00" (string)   with cast -> 0 (number)
    const ok = !/FROM\s+goals/.test(source)
      || /"progressPercentage"(?:::\w+)?\s+AS\s+progress/.test(source);
    expect(ok).toBe(true);
    expect(source).not.toMatch(/SELECT\s+title,\s*description,\s*progress,/);
  });
});

/**
 * Round 2 (found by hostile review of the first fix): the profile domain in these SAME files
 * was broken the same way, and the first pass missed it by fixing only what it had gone
 * looking for. "Users" has no `age`, no `nasmPhase`, and the goals column is SINGULAR.
 *
 * This one was NOT a graceful degradation. Both the aiDebateRoutes and
 * debateClientContextService profile queries are bare awaits with no .catch(), so
 * POST /api/ai/debate/start returned 500 on every request — the debate feature was dead,
 * not degraded. Verified: the old SELECT raises `column "age" does not exist`.
 */
describe.each(SQL_FILES)('%s — profile columns that exist on "Users"', (file) => {
  const source = read(file);

  it('does not select a bare `age` column', () => {
    // deIdentifyClient does: age: client.age || calculateAge(client.dateOfBirth) || null
    // so selecting "dateOfBirth" keeps the derived value working.
    expect(source).not.toMatch(/SELECT[^`]*,\s*age,\s*gender/);
  });

  it('does not select "nasmPhase" from "Users"', () => {
    // nasmPhase lives on MovementProfile / WorkoutPlan, never on "Users".
    // deIdentifyClient already falls back to enrichment.nasmPhase || null.
    expect(source).not.toMatch(/"nasmPhase"/);
  });

  it('selects the singular "fitnessGoal", aliased to the plural consumers read', () => {
    // extractGoals() reads client.fitnessGoals (plural); the DB column is fitnessGoal.
    const selectsUsers = /FROM "Users"/.test(source);
    const ok = !selectsUsers || /"fitnessGoal"\s+AS\s+"fitnessGoals"/.test(source);
    expect(ok).toBe(true);
  });
});

describe('the output contract consumers depend on', () => {
  it('still exposes bodyPart and progress as aliases', () => {
    // The fix corrected the SOURCE identifiers while keeping the OUTPUT shape byte-identical,
    // so no consumer needed to change. If a future edit drops an alias, these break:
    //   deIdentifier.mjs:98            entry.bodyPart
    //   deIdentifier.mjs:183           g.progress
    //   briefClientDispatcher.mjs:37   worst.bodyPart
    //   workoutDebatePrompts.mjs:209   p.bodyPart
    const engine = read('services/ai/contextEngine/coachContextEngine.mjs');
    expect(engine).toMatch(/"bodyRegion"\s+AS\s+"bodyPart"/);
    expect(engine).toMatch(/"progressPercentage"(?:::\w+)?\s+AS\s+progress/);
  });

  it('keeps the test mocks pointed at identifiers that actually exist', () => {
    // The original defect survived because the mocks matched the broken names. If a future
    // edit repoints a mock at a nonexistent table, the suite goes back to photocopying.
    const t = read('tests/unit/coachContextEngine.test.mjs');
    expect(t).not.toMatch(/\/"Goals"\/\.test/);
    expect(t).not.toMatch(/\/PainEntries\/\.test/);
    expect(t).toMatch(/\/FROM goals\/\.test/);
    expect(t).toMatch(/\/client_pain_entries\/\.test/);
  });
});
