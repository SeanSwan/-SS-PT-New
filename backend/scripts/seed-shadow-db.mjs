#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: backend/scripts/seed-shadow-db.mjs
 * PURPOSE: Seed the CI *shadow* Postgres with synthetic, deterministic rows so
 *          the migration gate's SECOND migration run executes against a
 *          populated database. A destructive or data-dependent migration then
 *          has something to break against.
 *
 * SECURITY CONTRACT (non-negotiable, no override):
 *   - REFUSES unless DATABASE_URL parses, its host is loopback
 *     (localhost / 127.0.0.1), and its DATABASE NAME contains "shadow".
 *     The name specifically — matching the whole URL let credentials
 *     satisfy the check (see validateShadowUrl).
 *   - The gate runs BEFORE any database import. A seeder that can point at
 *     production is worse than no seeder.
 *   - Synthetic values only: `seed-<table>-<n>`. Never a real-looking name,
 *     email, phone, address, or health value.
 *
 * DETERMINISM: no new Date() for row values, no Math.random/uuid-v4.
 *   Same input -> same output, run to run. (A fixed UTC epoch + row index.)
 *
 * IDEMPOTENCE: primary keys are deterministic, so a second run inserts
 *   nothing new (explicit PK + `updateOnDuplicate: [pk]` leaves values,
 *   including backfilled cycle edges, untouched when the row exists).
 *
 * CYCLE TOLERANCE: FK cycles are detected (Kahn), the table is inserted with
 *   the cyclic FK set to NULL (nullable edge), then the nullable FK column
 *   is backfilled to the parent's row 0 — self-cycle and 2-cycle both
 *   handled. A cycle with NO nullable edge: table is skipped and reported.
 *
 * REPORT: exactly one machine-readable line for CI to assert:
 *   SHADOW-SEED {"tables":N,"rows":N,"skipped":[...],"failed":[...]}
 *   `rows` is counted from the database after seeding (SELECT count), not
 *   from the insert return value — a silent no-op must not look green.
 *   Exit code 0 requires rows > 0 and no table failures.
 *
 * USAGE:
 *   DATABASE_URL=postgres://shadow:shadow@localhost:5432/shadow \
 *     node backend/scripts/seed-shadow-db.mjs [--rows 5]
 *
 * NOTE: loading the models (models/associations.mjs) connects via
 *   database.mjs, which honours NODE_ENV/DATABASE_URL exactly like the app.
 *   In CI the workflow keeps it on the development profile pointed at the
 *   shadow container. In dev mode with NO DATABASE_URL, database.mjs falls
 *   back to in-memory SQLite — seeding that is harmless but pointless; the
 *   report will still be honest about what it did.
 * ============================================================================
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Pure, DB-free core (unit-tested without a database)
// ---------------------------------------------------------------------------

/**
 * Validate that a DATABASE_URL is safe for this seeder. No override exists.
 * @param {string|undefined} url
 * @returns {{ok:boolean, reason?:string, host?:string}}
 */
export function validateShadowUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') {
    return { ok: false, reason: 'DATABASE_URL is unset or empty — refusing to run' };
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    // Ox final review F3 + operator privacy law: NEVER echo the raw URL
    // into the reason — a malformed URL may embed credentials, and the
    // reason is printed to stdout/CI logs. The gate still refuses loudly.
    return {
      ok: false,
      reason:
        'DATABASE_URL is not a parseable URL — refusing to run (value redacted; fix the URL shape)',
    };
  }
  const host = parsed.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return { ok: false, reason: `host "${host}" is not loopback (must be localhost or 127.0.0.1) — refusing` };
  }
  // THE DATABASE NAME, not the whole URL string.
  //
  // Testing the whole URL matched the word anywhere in it — including the CREDENTIALS. So
  // `postgres://shadow:shadow@localhost:5432/swanstudios` passed a gate whose stated
  // contract is that it "structurally cannot point at production", and the seeder would have
  // written synthetic rows into a local swanstudios database. The suite already encoded the
  // correct contract and the assertion had been failing (30/31) before anyone read it —
  // found 2026-08-24 by running the tests rather than trusting the self-test, which does not
  // cover this case.
  if (!/shadow/i.test(parsed.pathname)) {
    return { ok: false, reason: `database "${parsed.pathname.slice(1)}" does not contain "shadow" — refusing to seed a non-shadow database` };
  }
  return { ok: true, host };
}

/**
 * Topologically sort model names so FK parents come before children.
 * Uses Kahn's algorithm; nodes stuck in an FK cycle are returned separately
 * in `cycle` (deterministically sorted) — the caller decides how to break
 * or skip them. Never hangs.
 *
 * @param {Map<string, Set<string>>} deps  name -> set of parent names it depends on
 * @param {string[]} allNames
 * @returns {{order:string[], cycle:string[]}}
 */
export function topoSort(deps, allNames) {
  const nameSet = new Set(allNames);
  const parents = new Map();
  for (const n of allNames) {
    // Unknown parents are filtered, but SELF-edges are NOT: a model that
    // depends on itself is still a cycle and must surface in `cycle` —
    // silently dropping self-edges is exactly the "detected nothing" trap.
    parents.set(n, [...(deps.get(n) || new Set())].filter((p) => nameSet.has(p)));
  }
  const placed = new Set();
  const ordered = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const n of allNames) {
      if (placed.has(n)) continue;
      if (parents.get(n).every((p) => placed.has(p))) {
        ordered.push(n);
        placed.add(n);
        progress = true;
      }
    }
  }
  const cycle = allNames.filter((n) => !placed.has(n)).sort();
  return { order: [...ordered, ...cycle], cycle };
}

/**
 * Deterministic UUIDv5-shaped value derived from a string (FNV-1a based).
 * Same input -> same output, always. Not random, never changes run to run.
 * @param {string} text
 * @returns {string}
 */
export function deterministicUuid(text) {
  const hex = '0123456789abcdef';
  let h = 2166136261 >>> 0;
  const out = [];
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  for (let block = 0; block < 4; block++) {
    // mix in a per-block salt so all 128 bits depend on the input
    h = Math.imul(h ^ (0x9e3779b1 ^ (block * 0x85ebca6b)), 16777619) >>> 0;
    for (let b = 0; b < 4; b++) {
      const byte = (h >>> (b * 8)) & 0xff;
      out.push(hex[(byte >>> 4) & 0xf], hex[byte & 0xf]);
      h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    }
  }
  const full = out.join('');
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}-${full.slice(16, 20)}-${full.slice(20, 32)}`;
}

/** Fixed UTC epoch: 2026-01-02T00:00:00Z. Row dates derive from this. */
export const SEED_EPOCH_MS = Date.UTC(2026, 0, 2);

function looksLikeEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Generate one synthetic row's values for a table.
 *
 * @param {object} opts
 * @param {string} opts.tableName  plain lower-case table name (no quotes)
 * @param {number} opts.rowIndex   0-based row index
 * @param {Record<string, object>} opts.attrs  normalizeModel() output
 * @param {Record<string, {table:string,pk:string}>|undefined} [opts.unresolvedTargets]
 *   map lowerColumn -> target metadata, used only to choose NULL for FKs
 *   whose parent has not been seeded yet (cycle case).
 * @param {Record<string, Record<string, any>[]>} [opts.parentIds]
 *   lowerTableName -> array of parent PK maps ({ pkCol: value }).
 *   Panel ruling (R15, item 3): full tuples, so any PK column shape works.
 * @returns {Record<string, any>}
 */
export function generateRowValues(opts) {
  const { tableName, rowIndex, attrs, parentIds = {} } = opts;
  const out = {};
  const lower = tableName.toLowerCase();

  for (const [col, a] of Object.entries(attrs)) {
    const type = String(a.type || '').toUpperCase();

    // --- Foreign keys: point at a deterministic parent row, else NULL ---
    // Panel ruling (R15, item 3): each parent entry is a FULL PK MAP —
    // read the tuple element this FK column actually points at
    // (parentRow[fkTarget.pk]). The old positional read only worked for
    // single-column parents and silently returned the wrong key otherwise.
    if (a.foreignKeyTarget) {
      const tLower = a.foreignKeyTarget.table.toLowerCase();
      const parents = parentIds[tLower];
      if (parents && parents.length > 0) {
        const parentRow = parents[rowIndex % parents.length];
        out[col] = (parentRow && typeof parentRow === 'object') ? parentRow[a.foreignKeyTarget.pk] : parentRow;
      } else if (a.allowNull) {
        out[col] = null; // parent not (yet) seeded — cycle-break, backfilled later
      } else {
        out[col] = null; // will fail the insert; reported per-table
      }
      continue;
    }

    // --- Primary keys ---
    if (a.pk) {
      if (/UUID/.test(type)) {
        out[col] = deterministicUuid(`${lower}.${col}.${rowIndex}`);
      } else {
        out[col] = rowIndex + 1;
      }
      continue;
    }

    // --- Enums: first allowed value ---
    // Panel ruling (R15 NEW 11): also parse the "ENUM('a','b')" type STRING
    // as a fallback (covers attrs whose `values` were captured as string),
    // so NULL is only emitted when no value is recoverable at all. Parse
    // from the ORIGINAL (un-uppercased) type string so value casing is kept.
    const rawType = String(a.type || '');
    let enumFromTypeString = null;
    {
      const m = /^\s*ENUM\((.*)\)\s*$/i.exec(rawType.trim());
      if (m) {
        const vals = [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
        if (vals.length > 0) enumFromTypeString = vals;
      }
    }
    if (/^ENUM/.test(type.trim()) || (Array.isArray(a.enum) && a.enum.length > 0)) {
      const vals = (Array.isArray(a.enum) && a.enum.length > 0) ? a.enum : null;
      out[col] = (vals && vals.length > 0) ? vals[0] : (enumFromTypeString ? enumFromTypeString[0] : null);
      continue;
    }

    // --- Booleans: alternate ---
    if (/BOOLEA|BOOL/.test(type)) {
      out[col] = rowIndex % 2 === 0;
      continue;
    }

    // --- Numeric ---
    if (/DECIMAL|NUMERIC/.test(type)) out[col] = rowIndex + 1;
    else if (/DOUBLE|REAL|FLOAT/.test(type)) out[col] = Math.round((rowIndex + 1) * 1.5 * 100) / 100;
    else if (/INT(eger)?|BIGINT|SMALLINT/.test(type)) out[col] = rowIndex + 1;
    else if (/TIMESTAMP/.test(type)) out[col] = new Date(SEED_EPOCH_MS + rowIndex * 3600_000).toISOString();
    else if (/^DATE/.test(type.trim()) || /DATEONLY/.test(type)) out[col] = new Date(SEED_EPOCH_MS + rowIndex * 86_400_000).toISOString().slice(0, 10);
    else if (/^JSON/.test(type.trim())) out[col] = { seed: true, table: lower, row: rowIndex };
    else if (/UUID/.test(type)) out[col] = deterministicUuid(`${lower}.${col}.${rowIndex}`);
    else if (/BYTEA/.test(type)) out[col] = Buffer.from([0x73, 0x65, rowIndex & 0xff]);
    else if (/STRING|TEXT|CITEXT|CHAR|BINARY|VARBINARY/.test(type)) {
      // Uniform synthetic label. PII-free by construction:
      // `seed-<table>-<n>`, or per-column for unique non-PK columns so that
      // unique constraints never see a repeated value across rows.
      out[col] = a.unique ? `seed-${lower}-${col}-${rowIndex + 1}` : `seed-${lower}-${rowIndex + 1}`;
    } else {
      // Anything unrecognized: NULL if allowed, else the generic label.
      out[col] = a.allowNull ? null : `seed-${lower}-${rowIndex + 1}`;
    }
  }

  // Belt-and-braces PII guard: refuse anything that reads like an email.
  for (const [col, v] of Object.entries(out)) {
    if (looksLikeEmail(v)) {
      throw new Error(`refusing to emit an email-looking value for ${tableName}.${col}`);
    }
  }
  return out;
}

/**
 * Serialize the single CI-assertable report line.
 * @param {{tables?:number,rows?:number,skipped?:any[],failed?:any[]}} r
 * @returns {string}  `SHADOW-SEED {"tables":N,"rows":N,"skipped":[...],"failed":[...]}`
 */
export function serializeReport(r) {
  const clean = {
    tables: r.tables ?? 0,
    rows: r.rows ?? 0,
    skipped: (r.skipped || []).map((x) => (typeof x === 'string' ? x : `${x.table}: ${x.reason || 'skipped'}`)),
    failed: (r.failed || []).map((x) => (typeof x === 'string' ? x : `${x.table}: ${x.error || 'insert failed'}`)),
  };
  return `SHADOW-SEED ${JSON.stringify(clean)}`;
}

/**
 * Normalize a Sequelize model's attribute set into the metadata the
 * generator needs. Resolution of FK targets uses the model's associations
 * (the authoritative FK map) and falls back to attribute-level references.
 * @param {object} model
 * @returns {Record<string, object>}
 */
export function normalizeModel(model) {
  const attrs = model.rawAttributes || (typeof model.getAttributes === 'function' && model.getAttributes()) || {};
  const out = {};
  for (const [col, a] of Object.entries(attrs)) {
    const entry = {
      type: String(a.type || 'STRING'),
      pk: !!a.primaryKey,
      allowNull: a.allowNull !== false,
      unique: a.unique === true || typeof a.unique === 'string',
      // Panel ruling (R15 NEW 11): Sequelize stores enum values on the
      // DATATYPE instance (`DataTypes.ENUM(...)` -> a.type.values), not on
      // the attribute. The attribute-level `a.values` is rare; accept both.
      // All 273 enum columns in models/ use `DataTypes.ENUM(...)` — reading
      // only a.values silently generated NULL for every one of them.
      enum: Array.isArray(a.values) ? a.values
        : (a.type && Array.isArray(a.type.values)) ? a.type.values.map(String)
        : undefined,
      foreignKeyTarget: null,
    };
    if (a.references) {
      const assocs = model.associations || {};
      // Panel ruling (R15, item 1a): only BELONGS-TO associations are
      // authoritative FK maps. HasMany/HasOne create the inverse-side
      // reference and must not resolve as this table's parent.
      const found = Object.values(assocs).find((x) => x.associationType === 'BelongsTo' && x.foreignKey === col);
      if (found && found.target) {
        const raw = found.target.getTableName
          ? found.target.getTableName()
          : found.target.tableName || found.target.name;
        const tName = String(raw).replace(/"/g, '');
        // Panel ruling (1a): prefer the association's explicit targetKey over
        // a first-pk guess — a target whose PK is NOT the column the FK
        // points at must still resolve to the right value.
        const tAttrs = found.target.rawAttributes || (typeof found.target.getAttributes === 'function' && found.target.getAttributes()) || {};
        const pk = found.targetKey || Object.keys(tAttrs).find((k) => tAttrs[k].primaryKey) || 'id';
        entry.foreignKeyTarget = { table: tName, pk };
      } else if (a.references.model) {
        entry.foreignKeyTarget = {
          table: String(a.references.model).replace(/"/g, ''),
          pk: a.references.key || 'id',
        };
      }
    }
    out[col] = entry;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Execution (direct-run only; importing this module has no side effects)
// ---------------------------------------------------------------------------

function parseRowsArg(argv) {
  const i = argv.indexOf('--rows');
  if (i !== -1 && argv[i + 1] !== undefined) {
    const n = Number(argv[i + 1]);
    if (Number.isInteger(n) && n >= 1 && n <= 1000) return n;
    console.error(`SHADOW-SEED: ignoring bad --rows value "${argv[i + 1]}" (need integer 1..1000)`);
  }
  return 5;
}

const plainTable = (m) => {
  const raw = m.getTableName ? m.getTableName() : m.tableName || m.name;
  return String(raw).replace(/"/g, '').trim();
};

async function countRows(sequelize, table) {
  // Portable count (no `::int` cast — that syntax is Postgres-only and this
  // query is used against whatever dialect the app boots). pg returns the
  // count as a string; Number() normalises it.
  const [res] = await sequelize.query(
    `SELECT count(*) AS n FROM "${table.replace(/"/g, '')}"`
  );
  const first = Array.isArray(res) ? res[0] : res;
  if (!first) return 0;
  const v = first.n !== undefined ? first.n : Object.values(first)[0];
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  // 1) SAFETY GATE — first thing, before any database import. No override.
  const verdict = validateShadowUrl(process.env.DATABASE_URL);
  if (!verdict.ok) {
    console.error(`SHADOW-SEED REFUSED: ${verdict.reason}`);
    process.exit(1);
  }

  const rowsPerTable = parseRowsArg(process.argv.slice(2));

  // 2) Load models (this pulls in database.mjs; honours DATABASE_URL).
  let models;
  try {
    const mod = await import(pathToFileURL(path.join(__dirname, '..', 'models', 'associations.mjs')).href);
    models = await mod.default();
  } catch (e) {
    console.error(`SHADOW-SEED FAILED loading models: ${e.message}`);
    process.exit(1);
  }

  const sample = models && models['User'] ? models['User'] : Object.values(models)[0];
  const sequelize = sample ? sample.sequelize : undefined;
  if (!sequelize) {
    console.error('SHADOW-SEED FAILED: no Sequelize instance on loaded models');
    process.exit(1);
  }

  // Authoritative registry: every model Sequelize has seen (models dir + any
  // defined later), with real table names and associations.
  const registry = new Map(Object.values(sequelize.models).map((m) => [m.name, m]));

  // 3) Metadata + FK dependency graph.
  // Panel ruling (R15, item 1): deps are built SOLELY from attribute-level
  // foreignKeyTarget (normalizeModel's BelongsTo-filtered resolution). The
  // old associations walk added HasMany/HasOne inverse edges, which seeded
  // children BEFORE their parents — fatal for required FKs. `tableNameToModel`
  // is resolved ahead of the loop now (it used to be defined after it).
  const meta = new Map();
  const deps = new Map();
  const tableNameToModel = new Map();
  for (const [nm, m] of registry) tableNameToModel.set(plainTable(m).toLowerCase(), nm);
  for (const [nm, m] of registry) {
    const attrs = normalizeModel(m);
    meta.set(nm, attrs);
    const parents = new Set();
    for (const a of Object.values(attrs)) {
      if (!a.foreignKeyTarget) continue;
      const tLower = a.foreignKeyTarget.table.toLowerCase();
      const parentName = tableNameToModel.get(tLower);
      // Self-targets are KEPT: the cycle machinery then decides (nullable
      // edge -> NULL + backfill; otherwise skip + report).
      if (parentName) parents.add(parentName);
    }
    deps.set(nm, parents);
  }
  const allNames = [...registry.keys()].sort();
  const { order, cycle } = topoSort(deps, allNames);
  const cycleSet = new Set(cycle);
  if (cycle.length > 0) {
    console.error(`SHADOW-SEED note: FK cycle detected, will break via nullable edges: ${cycle.join(', ')}`);
  }

  // 4) Seed, parents first.
  const skipped = [];
  const failed = [];
  const insertedIds = new Map();
  const backfill = []; // { table, col, targetLower, targetName } — cyclic FKs set to NULL
  const backfillSeenBeforePush = new Set(); // (table,col) dedupe — Panel ruling (7)
  const seededNames = new Set();

  const fkColsOf = (nm) => Object.entries(meta.get(nm)).filter(([, a]) => a.foreignKeyTarget).map(([c]) => c);

  for (const nm of order) {
    const m = registry.get(nm);
    const tableName = plainTable(m);
    const attrs = meta.get(nm);

    // Skip tables the migration runner owns.
    if (/^sequelize_meta$/i.test(tableName)) continue;

    // Cycle handling: a table whose cyclic parent(s) have NOTHING nullable
    // can't be inserted with valid values -> skip + report (honest failure).
    if (cycleSet.has(nm)) {
      const cyclicFks = fkColsOf(nm).filter((c) =>
        cycleSet.has(tableNameToModel.get((attrs[c].foreignKeyTarget || {}).table?.toLowerCase()) || '')
      );
      const allBlocked = cyclicFks.length > 0 && cyclicFks.every((c) => !attrs[c].allowNull);
      if (allBlocked) {
        skipped.push({ table: nm, reason: `FK cycle with no nullable edge (${cyclicFks.join(', ')})` });
        console.error(`SHADOW-SEED SKIP ${nm}: ${skipped[skipped.length - 1].reason}`);
        continue;
      }
    }

    // Idempotency: if we already put rows here this run or in a previous
    // run (same deterministic PKs), DO-NOTHING via conflict target = pk.
    // Panel ruling (R15, item 2): ALL PK columns (composite-aware) become
    // the conflict target — a single `.find(pk)` silently drops the rest.
    const pkCols = Object.keys(attrs).filter((c) => attrs[c].pk);
    const values = [];
    for (let i = 0; i < rowsPerTable; i++) {
      const v = generateRowValues({ tableName: tableName.toLowerCase(), rowIndex: i, attrs, parentIds: Object.fromEntries(insertedIds) });
      // Cycle-break bookkeeping: an FK whose parent isn't seeded yet -> NULL now, backfill later.
      // Panel ruling (R15 (3)-refinement + 7): the push guard keys on the
      // parent row-map list being ABSENT or EMPTY (a present-but-empty list
      // still means nothing to backfill to), and we dedupe on (table, col)
      // BEFORE push — the later UPDATE is WHERE col IS NULL -> row 0 anyway.
      for (const c of fkColsOf(nm)) {
        const tLower = attrs[c].foreignKeyTarget.table.toLowerCase();
        const parentList = insertedIds.get(tLower);
        if (v[c] === null && (!parentList || parentList.length === 0)) {
          if (attrs[c].allowNull) {
            const bfKey = `${plainTable(m).toLowerCase()}::${c}`;
            if (!backfillSeenBeforePush.has(bfKey)) {
              backfillSeenBeforePush.add(bfKey);
              backfill.push({ table: plainTable(m), col: c, targetLower: tLower, targetName: nm, row: i });
            }
          }
        }
      }
      values.push(v);
    }

    try {
      let inserted;
      if (pkCols.length > 0) {
        try {
          inserted = await m.bulkCreate(values, { updateOnDuplicate: pkCols, individualHooks: false });
        } catch (conflictErr) {
          // Some dialects/tables reject the conflict target; fall back to a
          // plain insert and let a PK clash surface as a per-table report.
          inserted = await m.bulkCreate(values, { individualHooks: false });
        }
      } else {
        inserted = await m.bulkCreate(values, { individualHooks: false });
      }
      // Remember the parent rows we just inserted (deterministic values from
      // our input, not the DB). Panel ruling (R15, item 3): store FULL ROW
      // OBJECTS as-is — the FK generator and the cycle backfill each read the
      // element their column points at (parentRow[fkTarget.pk]).
      insertedIds.set(tableName.toLowerCase(), values);
      seededNames.add(nm);
      console.log(`SHADOW-SEED OK ${tableName} rows=${inserted.length}`);
    } catch (e) {
      failed.push({ table: nm, error: String(e.message || e).slice(0, 200) });
      console.error(`SHADOW-SEED FAIL ${tableName}: ${e.message}`);
    }
  }

  // 4b) Backfill cyclic FKs that were set NULL (nullable edge) — point them
  //     at the parent's row 0 (the id we generated deterministically).
  // Panel ruling (R15, items 3 + 7): the parent entry is a FULL PK MAP, so
  // read the tuple element this FK column points at (the old `?.[0]` read
  // the whole object), and emit ONE update per (table, col) — the previous
  // per-row push produced the same UPDATE rowsPerTable times per column.
  let backfilled = 0;
  const backfillSeen = new Set();
  for (const bf of backfill) {
    const bfKey = `${bf.table.toLowerCase()}::${bf.col}`;
    if (backfillSeen.has(bfKey)) continue;
    backfillSeen.add(bfKey);
    const fkPk = meta.get(bf.targetName)?.[bf.col]?.foreignKeyTarget?.pk || 'id';
    const parentRow0 = insertedIds.get(bf.targetLower)?.[0];
    const targetId = (parentRow0 && typeof parentRow0 === 'object') ? parentRow0[fkPk] : parentRow0;
    if (targetId == null) continue;
    const model = registry.get(tableNameToModel.get(bf.table.toLowerCase()) || '');
    if (!model) continue;
    try {
      const r = await model.update({ [bf.col]: targetId }, { where: { [bf.col]: null }, individualHooks: false });
      backfilled += Array.isArray(r) ? r[0] : 0;
    } catch (e) {
      failed.push({ table: model.name, error: `cycle backfill ${bf.col}: ${String(e.message).slice(0, 120)}` });
    }
  }
  if (backfillSeen.size > 0) console.log(`SHADOW-SEED cycle-backfill rows=${backfilled} pairs=${backfillSeen.size}`);

  // 5) Count what is ACTUALLY in the database (the honest number).
  let dbRows = 0;
  let dbTables = 0;
  for (const nm of [...seededNames].sort()) {
    try {
      const n = await countRows(sequelize, plainTable(registry.get(nm)));
      if (n > 0) dbTables += 1;
      dbRows += n;
    } catch {
      /* table vanished? ignore for counting; failures already recorded */
    }
  }

  // 6) Report.
  const line = serializeReport({ tables: dbTables, rows: dbRows, skipped, failed });
  console.log(line);

  if (dbRows === 0 || failed.length > 0) {
    process.exitCode = 1;
  }
  // Close the pool so the process exits cleanly.
  try {
    await sequelize.close();
  } catch {
    /* already closed */
  }
}

// Direct-run guard: importing this module (tests, `node -e`, bundlers) must
// have NO side effects. Only `node seed-shadow-db.mjs` where that file IS
// argv[1] is a real run. `import.meta.url` is undefined under `node -e`, so
// the argv[1] check alone (returning false) is what keeps imports safe.
const isDirectRun = (() => {
  try {
    if (!process.argv[1]) return false; // -e / REPL / dynamic import: never a direct run
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main().catch((e) => {
    console.error(`SHADOW-SEED CRASH: ${e.stack || e.message}`);
    process.exit(1);
  });
}
