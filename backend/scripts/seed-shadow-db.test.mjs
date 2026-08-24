/**
 * ============================================================================
 * FILE: backend/scripts/seed-shadow-db.test.mjs
 * PURPOSE: DB-free tests for the shadow seeder. The safety check is the most
 *          important test in this file. Every case from brief §5.2 is covered.
 *
 * WHY DB-FREE: the seeder's pure core (validateShadowUrl, topoSort,
 *   deterministicUuid, generateRowValues, serializeReport, normalizeModel)
 *   is exported and the module has NO side effects on import (models are
 *   lazy-imported inside main() only). So these tests run with no database,
 *   no network, no env — safe in CI and on a laptop.
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  validateShadowUrl,
  topoSort,
  deterministicUuid,
  generateRowValues,
  serializeReport,
  normalizeModel,
  SEED_EPOCH_MS,
} from './seed-shadow-db.mjs';

// A minimal fake attribute map in the exact shape normalizeModel() returns,
// so generateRowValues() is exercised against representative column types.
const fakeAttrs = {
  id:            { type: 'UUID',  pk: true,  allowNull: false, unique: false, foreignKeyTarget: null },
  legacyIntId:   { type: 'INTEGER', pk: true, allowNull: false, unique: false, foreignKeyTarget: null },
  title:         { type: 'VARCHAR(255)', pk: false, allowNull: false, unique: false, foreignKeyTarget: null },
  email:         { type: 'VARCHAR(255)', pk: false, allowNull: true,  unique: true,  foreignKeyTarget: null },
  body:          { type: 'TEXT',  pk: false, allowNull: true,  unique: false, foreignKeyTarget: null },
  isActive:      { type: 'BOOLEAN', pk: false, allowNull: false, unique: false, foreignKeyTarget: null },
  status:        { type: 'ENUM',  pk: false, allowNull: false, unique: false, foreignKeyTarget: null, enum: ['draft', 'active', 'archived'] },
  score:         { type: 'DOUBLE PRECISION', pk: false, allowNull: false, unique: false, foreignKeyTarget: null },
  amount:        { type: 'DECIMAL(10,2)', pk: false, allowNull: false, unique: false, foreignKeyTarget: null },
  qty:           { type: 'INTEGER', pk: false, allowNull: false, unique: false, foreignKeyTarget: null },
  createdAt:     { type: 'TIMESTAMP WITH TIME ZONE', pk: false, allowNull: false, unique: false, foreignKeyTarget: null },
  asOf:          { type: 'DATE',  pk: false, allowNull: true,  unique: false, foreignKeyTarget: null },
  payload:       { type: 'JSONB', pk: false, allowNull: true,  unique: false, foreignKeyTarget: null },
  // A foreign key that WILL resolve to a parent (parentIds provided in tests)
  ownerId:       { type: 'INTEGER', pk: false, allowNull: false, unique: false, foreignKeyTarget: { table: 'Users', pk: 'id' } },
  // A foreign key whose parent is NOT seeded (cycle) -> must be NULL if nullable
  cycleRefId:    { type: 'INTEGER', pk: false, allowNull: true,  unique: false, foreignKeyTarget: { table: 'SelfRef', pk: 'id' } },
};

function emailPatternHits(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
}
function looksLikeRealName(value) {
  // Two or more space-separated Title/Upper case words is a strong name signal.
  const s = String(value).trim();
  const words = s.split(/\s+/);
  return words.length >= 2 && words.every((w) => /^[A-Z][a-z]+$/.test(w));
}

describe('safety check (validateShadowUrl) — most important test', () => {
  it('REJECTS a production-looking URL (host is not loopback)', () => {
    const r = validateShadowUrl('postgres://user:pass@prod-db.example.com:5432/app');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not loopback/i);
  });

  it('REJECTS a loopback URL that does NOT contain the word shadow', () => {
    const r = validateShadowUrl('postgres://shadow:shadow@localhost:5432/swanstudios');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/shadow/i);
  });

  it('REJECTS a URL that contains "shadow" but a non-loopback host', () => {
    // Having the word is NOT a pass — the host must be loopback too.
    const r = validateShadowUrl('postgres://shadow:shadow@render-prod-5432.com:5432/shadow');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not loopback/i);
  });

  it('REJECTS an unset / empty URL', () => {
    expect(validateShadowUrl(undefined).ok).toBe(false);
    expect(validateShadowUrl('').ok).toBe(false);
    expect(validateShadowUrl('   ').ok).toBe(false);
  });

  it('REJECTS a URL that is not parseable', () => {
    expect(validateShadowUrl('not a url at all').ok).toBe(false);
  });

  it('ACCEPTS a valid localhost shadow URL', () => {
    const r = validateShadowUrl('postgres://shadow:shadow@localhost:5432/shadow');
    expect(r.ok).toBe(true);
    expect(r.host).toBe('localhost');
  });

  it('ACCEPTS a valid 127.0.0.1 shadow URL', () => {
    const r = validateShadowUrl('postgres://shadow:shadow@127.0.0.1:5432/ci_shadow');
    expect(r.ok).toBe(true);
    expect(r.host).toBe('127.0.0.1');
  });

  it('is case-insensitive on the "shadow" token but still requires loopback', () => {
    expect(validateShadowUrl('postgres://u:p@localhost:5432/SHADOW').ok).toBe(true);
  });
});

describe('topological sort (topoSort)', () => {
  it('puts parents before children', () => {
    const deps = new Map([
      ['User', new Set()],
      ['Challenge', new Set(['User'])],
      ['Participant', new Set(['User', 'Challenge'])],
    ]);
    const { order, cycle } = topoSort(deps, ['User', 'Challenge', 'Participant']);
    expect(cycle).toEqual([]);
    expect(order.indexOf('User')).toBeLessThan(order.indexOf('Challenge'));
    expect(order.indexOf('Challenge')).toBeLessThan(order.indexOf('Participant'));
  });

  it('detects a cycle and isolates it without hanging', () => {
    const deps = new Map([
      ['A', new Set(['B'])],
      ['B', new Set(['A'])],
      ['Root', new Set()],
    ]);
    const { order, cycle } = topoSort(deps, ['A', 'B', 'Root']);
    expect(cycle.sort()).toEqual(['A', 'B']);
    // Non-cyclic node is still ordered, cycle members are appended (no hang).
    expect(order.includes('Root')).toBe(true);
    expect(order).toHaveLength(3);
  });

  it('surfaces a SELF-cycle (a table FK-referencing itself)', () => {
    // The "looks right but detects nothing" trap: self-edges must count as a
    // cycle, not be silently dropped as "no dependency".
    const deps = new Map([
      ['Manager', new Set(['Manager'])],
      ['Org', new Set()],
    ]);
    const { cycle } = topoSort(deps, ['Manager', 'Org']);
    expect(cycle).toContain('Manager');
    expect(cycle).not.toContain('Org');
  });

  it('is deterministic (same input -> same order, twice)', () => {
    const deps = new Map([
      ['Z', new Set()], ['M', new Set(['Z'])], ['A', new Set(['M'])],
    ]);
    const a = topoSort(deps, ['Z', 'M', 'A']);
    const b = topoSort(deps, ['Z', 'M', 'A']);
    expect(a.order).toEqual(b.order);
  });
});

describe('determinism of generated values', () => {
  it('deterministicUuid is stable for the same input', () => {
    expect(deterministicUuid('Users.id.0')).toBe(deterministicUuid('Users.id.0'));
  });

  it('deterministicUuid differs for different inputs', () => {
    expect(deterministicUuid('Users.id.0')).not.toBe(deterministicUuid('Users.id.1'));
  });

  it('deterministicUuid has a UUID-shaped form', () => {
    expect(deterministicUuid('seed')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  // Panel ruling (R15 NEW 11) — normalizeModel driven enum coverage:
  it('normalizeModel keeps enum values off a Sequelize ENUM datatype instance', () => {
    const attrs = normalizeModel({
      rawAttributes: {
        id:   { type: 'INTEGER', primaryKey: true },
        tier: { type: { values: ['basic', 'premium'] } },
      },
    });
    expect(attrs.tier.enum).toEqual(['basic', 'premium']);
  });

  it('normalizeModel preserves attribute-level .values when present', () => {
    const attrs = normalizeModel({
      rawAttributes: {
        id:     { type: 'INTEGER', primaryKey: true },
        status: { type: 'ENUM', values: ['a', 'b'] },
      },
    });
    expect(attrs.status.enum).toEqual(['a', 'b']);
  });

  it('generateRowValues is deterministic (same input, same output, twice)', () => {
    const parentIds = { users: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    const a = generateRowValues({ tableName: 'Posts', rowIndex: 2, attrs: fakeAttrs, parentIds });
    const b = generateRowValues({ tableName: 'Posts', rowIndex: 2, attrs: fakeAttrs, parentIds });
    expect(a).toEqual(b);
  });

  it('timestamps are derived from the fixed epoch, not the clock', () => {
    const v = generateRowValues({ tableName: 'Posts', rowIndex: 1, attrs: fakeAttrs, parentIds: { users: [{ id: 1 }] } });
    expect(v.createdAt).toBe(new Date(SEED_EPOCH_MS + 1 * 3600_000).toISOString());
  });
});

describe('value generation correctness (per type)', () => {
  it('uses the first enum value', () => {
    const v = generateRowValues({ tableName: 'T', rowIndex: 0, attrs: fakeAttrs, parentIds: { users: [{ id: 1 }] } });
    expect(v.status).toBe('draft');
  });

  it('alternates booleans by row index', () => {
    const even = generateRowValues({ tableName: 'T', rowIndex: 0, attrs: fakeAttrs, parentIds: { users: [{ id: 1 }] } });
    const odd  = generateRowValues({ tableName: 'T', rowIndex: 1, attrs: fakeAttrs, parentIds: { users: [{ id: 1 }] } });
    expect(even.isActive).toBe(true);
    expect(odd.isActive).toBe(false);
  });

  it('emits sequential integers for INTEGER columns', () => {
    const v0 = generateRowValues({ tableName: 'T', rowIndex: 0, attrs: fakeAttrs, parentIds: { users: [{ id: 1 }] } });
    const v2 = generateRowValues({ tableName: 'T', rowIndex: 2, attrs: fakeAttrs, parentIds: { users: [{ id: 1 }] } });
    expect(v0.qty).toBe(1);
    expect(v2.qty).toBe(3);
  });

  it('points foreign keys at an existing parent id', () => {
    const v = generateRowValues({ tableName: 'Posts', rowIndex: 4, attrs: fakeAttrs, parentIds: { users: [{ id: 10 }, { id: 11 }, { id: 12 }] } });
    expect([10, 11, 12]).toContain(v.ownerId);
  });

  it('sets a nullable cycle FK to NULL when the parent is not seeded', () => {
    const v = generateRowValues({ tableName: 'T', rowIndex: 0, attrs: fakeAttrs, parentIds: {} });
    expect(v.cycleRefId).toBeNull();
  });

  it('emits a valid JSON object for JSONB', () => {
    const v = generateRowValues({ tableName: 'T', rowIndex: 0, attrs: fakeAttrs, parentIds: {} });
    expect(v.payload).toEqual(expect.objectContaining({ seed: true }));
  });
});

describe('PII guard (no generated string looks like a name or email)', () => {
  it('no generated string matches an email pattern', () => {
    for (let i = 0; i < 5; i++) {
      const v = generateRowValues({ tableName: 'users', rowIndex: i, attrs: fakeAttrs, parentIds: {} });
      for (const val of Object.values(v)) {
        if (typeof val === 'string') expect(emailPatternHits(val)).toBe(false);
      }
    }
  });

  it('no generated string looks like a real personal name', () => {
    for (let i = 0; i < 5; i++) {
      const v = generateRowValues({ tableName: 'people', rowIndex: i, attrs: fakeAttrs, parentIds: {} });
      for (const val of Object.values(v)) {
        if (typeof val === 'string') expect(looksLikeRealName(val)).toBe(false);
      }
    }
  });

  it('string columns are uniform seed-<table>-<n> labels', () => {
    const v = generateRowValues({ tableName: 'people', rowIndex: 3, attrs: fakeAttrs, parentIds: {} });
    expect(v.title).toMatch(/^seed-people-\d+$/);
    expect(v.body).toMatch(/^seed-people-\d+$/);
  });

  it('unique non-PK string columns vary by row (so unique constraints hold)', () => {
    const a = generateRowValues({ tableName: 'people', rowIndex: 0, attrs: fakeAttrs, parentIds: {} });
    const b = generateRowValues({ tableName: 'people', rowIndex: 1, attrs: fakeAttrs, parentIds: {} });
    expect(a.email).not.toBe(b.email);
  });
});

describe('report shape (serializeReport)', () => {
  it('prefixes the SHADOW-SEED token and carries the four keys', () => {
    const line = serializeReport({ tables: 3, rows: 12, skipped: ['X: reason'], failed: [] });
    expect(line).toMatch(/^SHADOW-SEED /);
    const json = JSON.parse(line.replace(/^SHADOW-SEED /, ''));
    expect(json).toEqual({ tables: 3, rows: 12, skipped: ['X: reason'], failed: [] });
  });

  it('defaults missing fields to zero / empty arrays', () => {
    const line = serializeReport({});
    const json = JSON.parse(line.replace(/^SHADOW-SEED /, ''));
    expect(json.tables).toBe(0);
    expect(json.rows).toBe(0);
    expect(json.skipped).toEqual([]);
    expect(json.failed).toEqual([]);
  });
});
