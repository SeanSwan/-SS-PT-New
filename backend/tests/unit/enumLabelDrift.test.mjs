/**
 * ENUM LABEL DRIFT GUARD — every model enum label must exist in the live database.
 * ============================================================================
 * THE BUG CLASS THIS EXISTS FOR. A model declares `DataTypes.ENUM('a','b')`; the live
 * Postgres type only has 'a'. Writing 'b' throws `invalid input value for enum`. Because
 * ~178 backend test files mock the DB layer, the model and the test agree with each other
 * and both are wrong. Real incidents this would have caught, all live in production while
 * the suite was green (2026-08-03/04 drift workstream):
 *   - UserFollow.status wrote 'active'; live labels are pending|accepted|blocked|muted.
 *     The ENTIRE follow feature was dead.
 *   - 8 session notifications wrote type:'session', absent from enum_notifications_type.
 *   - financial checkout tracking wrote 'checkout_started'; not a real label.
 *   - AdminNotification wrote 'trainer_assignment'; not a real label.
 *
 * HOW IT WORKS WITHOUT A DATABASE. Model shapes come from the real model definitions
 * (exact tableName + attribute + enum values — no regex guessing). Database truth comes
 * from a committed snapshot of pg_enum (tests/fixtures/live-enum-labels.json, regenerate
 * with scripts/dump-live-enums.mjs). A model label passes if it is in the snapshot OR is
 * added by some migration file naming that enum type — so a migration landing before the
 * snapshot is refreshed does not false-alarm.
 *
 * Generalizes tests/api/sessionStatusEnumDrift.contract.test.mjs, which guards one enum.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const snapshot = JSON.parse(readFileSync(resolve(backend, 'tests/fixtures/live-enum-labels.json'), 'utf8'));
const liveLabels = snapshot.labels;

/**
 * Migration sources, read ONCE. The first version re-read all ~345 migration files for every
 * enum attribute checked (~100+), i.e. ~34,500 reads — it took 103s and only passed on vitest's
 * retry, which is precisely the "retry masks flakiness into green" trap. Scan once, reuse.
 */
let migrationSourcesCache = null;
const migrationSources = () => {
  if (migrationSourcesCache) return migrationSourcesCache;
  const dir = resolve(backend, 'migrations');
  migrationSourcesCache = [];
  if (!existsSync(dir)) return migrationSourcesCache;
  for (const file of readdirSync(dir)) {
    if (!/\.(cjs|mjs|js)$/.test(file)) continue;
    migrationSourcesCache.push(readFileSync(resolve(dir, file), 'utf8'));
  }
  return migrationSourcesCache;
};

/** Labels any migration adds to a named enum type (covers post-snapshot migrations). */
const labelsByType = new Map();
const migrationLabelsFor = (typeName) => {
  if (labelsByType.has(typeName)) return labelsByType.get(typeName);
  const found = new Set();
  labelsByType.set(typeName, found);
  for (const src of migrationSources()) {
    if (!src.includes(typeName)) continue;
    // ADD VALUE 'x' / ADD VALUE IF NOT EXISTS 'x'
    for (const m of src.matchAll(/ADD\s+VALUE\s+(?:IF\s+NOT\s+EXISTS\s+)?'([^']+)'/gi)) found.add(m[1]);
    // CREATE TYPE ... AS ENUM ('a','b',...)
    for (const m of src.matchAll(/AS\s+ENUM\s*\(([^)]*)\)/gi)) {
      for (const l of m[1].matchAll(/'([^']+)'/g)) found.add(l[1]);
    }
    // Loop form: `const LABELS = ['a','b']` + `ADD VALUE ... '${label}'`. Without this the
    // labels live in the array, not the SQL string, and the regexes above see only the
    // interpolation placeholder — a blind spot found while writing this guard (2026-08-04).
    if (/ADD\s+VALUE[^\n]*\$\{/i.test(src)) {
      for (const arr of src.matchAll(/=\s*\[([^\]]*)\]/g)) {
        for (const l of arr[1].matchAll(/'([^']+)'/g)) found.add(l[1]);
      }
    }
  }
  return found;
};

let enumAttrs = [];

beforeAll(async () => {
  // Defining models does not open a connection — safe with no DATABASE_URL.
  const { default: getModels } = await import('../../models/associations.mjs');
  const models = await getModels();
  const { default: sequelize } = await import('../../database.mjs');

  const seen = new Set();
  const collect = (model, modelName) => {
    if (!model || typeof model.getTableName !== 'function' || !model.rawAttributes) return;
    let table = model.getTableName();
    if (typeof table === 'object') table = table?.tableName;
    if (typeof table !== 'string' || !table) return;
    table = table.replace(/"/g, '');
    for (const [attrName, attr] of Object.entries(model.rawAttributes)) {
      const values = attr.values || attr.type?.values;
      if (!Array.isArray(values) || values.length === 0) continue;
      const column = attr.field || attrName;
      const typeName = `enum_${table}_${column}`;
      const key = `${typeName}::${modelName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      enumAttrs.push({ modelName, table, attrName, column, typeName, values });
    }
  };
  for (const [name, m] of Object.entries(models)) collect(m, name);
  // Sweep models defined but never registered (9 exist — invisible to getModels()).
  for (const m of Object.values(sequelize.models)) collect(m, m.name);
}, 60_000);

describe('enum label drift: model enums vs live database', () => {
  it('found enum-typed attributes to check (guard against a silently empty sweep)', () => {
    expect(enumAttrs.length).toBeGreaterThan(20);
  });

  it('every model enum label exists in the live DB (or is added by a migration)', () => {
    const drift = [];
    for (const a of enumAttrs) {
      const live = liveLabels[a.typeName];
      // No such live type: either the table is absent (covered by modelTableGuard) or the
      // column is not enum-typed in the DB. Not this test's failure mode — skip.
      if (!Array.isArray(live)) continue;
      const allowed = new Set([...live, ...migrationLabelsFor(a.typeName)]);
      const missing = a.values.filter((v) => !allowed.has(v));
      if (missing.length > 0) {
        drift.push(`${a.modelName}.${a.attrName} (${a.typeName}): model allows [${missing.join(', ')}] — live DB has [${live.join(', ')}]`);
      }
    }
    expect(drift, `\nEnum drift — writing these values throws "invalid input value for enum" in production:\n  ${drift.join('\n  ')}\n\nFix by ADDING the label in a migration (never by editing the snapshot).\n`).toEqual([]);
  });

  it('the snapshot is present and substantial (a truncated fixture would silently pass everything)', () => {
    expect(snapshot.typeCount).toBeGreaterThan(200);
    expect(Object.keys(liveLabels).length).toBe(snapshot.typeCount);
  });
});

describe('enum label drift: known past incidents stay fixed', () => {
  const labelsOf = (t) => liveLabels[t] || [];

  it('user_follows.status has no "active" label — code must use accepted', () => {
    expect(labelsOf('enum_user_follows_status')).not.toContain('active');
    expect(labelsOf('enum_user_follows_status')).toContain('accepted');
  });

  it('notifications.type carries every label the Notification model validator allows', () => {
    const live = new Set([...labelsOf('enum_notifications_type'), ...migrationLabelsFor('enum_notifications_type')]);
    const src = readFileSync(resolve(backend, 'models/Notification.mjs'), 'utf8');
    // Both Sequelize forms: `isIn: [[...]]` and `isIn: { args: [[...]], msg }`.
    const isIn = src.match(/isIn:\s*\{[\s\S]{0,80}?args:\s*\[\[([\s\S]*?)\]\]/)
      || src.match(/isIn:\s*\[\[([\s\S]*?)\]\]/);
    expect(isIn, 'Notification.mjs must declare an isIn allowlist for `type`').toBeTruthy();
    const declared = [...isIn[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(5);
    expect(declared.filter((l) => !live.has(l))).toEqual([]);
  });

  it('PostReport status uses the hyphenated live label', () => {
    const live = labelsOf('enum_PostReports_status');
    expect(live).toContain('under-review');
    expect(live).not.toContain('under_review');
  });
});
