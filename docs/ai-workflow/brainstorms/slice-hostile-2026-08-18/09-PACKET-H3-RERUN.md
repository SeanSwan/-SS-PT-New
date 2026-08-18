# HOSTILE ROUND H3 (RE-RUN) — full source attached

The previous H3 attempt was INVALID: I sent a summary with no source. GLM correctly refused ('summaries are not attack surface'); Qwen certified it SOUND/DRY anyway, which is a calibration fact about Qwen, not a verdict. Full source is attached below.

## FALSIFIABILITY TEST — GLM's H3 question, now answered
GLM asked: a checker validated only against the schema it was built against reports zero drift tautologically; has anyone proven it CAN fail? Nobody had. Now done, by mutating the MODEL (never the database):
- inject a nonexistent column -> MISSING_COLUMN fired, criticals 23->24, exit 1
- point tableName at a nonexistent table -> MISSING_TABLE fired, message correctly named schema 'public'
- declare BOOLEAN against a date column -> TYPE_DRIFT fired, warnings 6->7
- model restored; git status clean
STILL UNFALSIFIED: FK_TARGET_DRIFT. Creating a bad FK would require writing to the production database, which is refused. It is verified only negatively (396 FKs, 0 target lowercase users).

## Standing evidence
- guards: 21/21 tests, verified from repo root AND a foreign cwd; 0 G5 false positives across 400 real files; CRLF fixtures fire correctly.
- drift: 157 models / 2657 attrs / 23 critical / 6 warn. pg_constraint count == information_schema count == 396.
- tokens: 405 defined, 607 distinct undefined across 1786 sites.

## Attack (H1+H2 fixes are the primary surface)
1. Break any H1/H2 fix in the attached source.
2. Ambient state not yet varied: locale, git state, symlinked root, env pollution.
3. Is the falsifiability evidence above sufficient, or is it itself a weak test?
4. What do both prior rounds share as a blind spot?

Say SOUND where sound. A clean round is the expected outcome if the work is done. End with exactly one word on its own line: DRY or NOTDRY. If you list ANY finding, the verdict must be NOTDRY.

---- SOURCE ----
#!/usr/bin/env node
/**
 * schema-drift-check.mjs — deterministic Sequelize-vs-live-DB drift detector.
 *
 * WHY: schema drift is a documented recurring bug class in this repo (CLAUDE.md rule 58).
 * The model file declares one shape, the live database has another, and the mismatch only
 * surfaces at runtime when a code path actually executes — in production, on a real user.
 * A single session in 2026-05 shipped five separate drift fixes of this exact family.
 *
 * WHY THIS SCRIPT AND NOT A MODEL: every drift class below is deterministically detectable
 * by comparing two authoritative sources. No language model is needed, none is wanted, and
 * a regex-grade check that runs in CI beats a smart check that runs when someone remembers.
 *
 * WHAT IT DETECTS (rule 58's classes 1-5):
 *   MISSING_COLUMN  — the model declares an attribute the live table does not have.
 *                     This is the one that throws `column "x" does not exist` in production.
 *   MISSING_TABLE   — the model's tableName does not exist at all (often PascalCase vs
 *                     snake_case drift: "ClientTrainerAssignments" vs client_trainer_assignments).
 *   TYPE_DRIFT      — declared type family and live type family disagree (INTEGER vs STRING
 *                     is the one that silently breaks `req.user.id === row.userId`).
 *   FK_TARGET_DRIFT — a foreign key points at lowercase `users` instead of the canonical
 *                     `"Users"`. This repo has BOTH tables; pointing at the wrong one throws
 *                     a constraint violation for a user that demonstrably exists.
 *
 * NOT reported as failures (informational only): columns the DB has that no model declares.
 * Those are usually legitimate — audit columns, other services' tables, or intentional.
 *
 * READ-ONLY. It runs SELECTs against information_schema and nothing else. It cannot write,
 * migrate, or repair. Exit 0 = clean, 1 = drift found, 2 = could not run.
 *
 * Usage:
 *   node backend/scripts/schema-drift-check.mjs              # all models
 *   node backend/scripts/schema-drift-check.mjs --model User # one model
 *   node backend/scripts/schema-drift-check.mjs --json       # machine-readable
 */
import 'dotenv/config';
import sequelize from '../database.mjs';
import getModels from '../models/associations.mjs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const onlyModel = args.includes('--model') ? args[args.indexOf('--model') + 1] : null;
const outPath = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;

/** Sequelize type strings vary in shape; collapse to a comparable family. */
function typeFamily(raw) {
  const t = String(raw || '').toUpperCase();
  if (/\b(INTEGER|BIGINT|SMALLINT|SERIAL)\b/.test(t)) return 'INT';
  if (/\b(DECIMAL|NUMERIC|REAL|DOUBLE|FLOAT)\b/.test(t)) return 'FLOAT';
  if (/\b(VARCHAR|CHARACTER|TEXT|STRING|CHAR|UUID|CITEXT)\b/.test(t)) return 'TEXT';
  if (/\b(BOOLEAN|BOOL)\b/.test(t)) return 'BOOL';
  // DATEONLY is Sequelize's name for postgres `date`, and BLOB is `bytea`. Both are
  // CORRECT mappings — flagging them was a false positive in the first live run, and a
  // checker that cries wolf gets muted, which is worse than having no checker at all.
  if (/\b(TIMESTAMP|DATE|TIME)\b/.test(t) || t.startsWith('DATEONLY')) return 'DATE';
  if (/\b(BLOB|BYTEA)\b/.test(t)) return 'BINARY';
  if (/\b(JSON|JSONB)\b/.test(t)) return 'JSON';
  if (/\b(ARRAY)\b/.test(t) || t.endsWith('[]')) return 'ARRAY';
  if (/\b(ENUM|USER-DEFINED)\b/.test(t)) return 'ENUM';
  return t.split('(')[0].trim() || 'UNKNOWN';
}

/**
 * GLM H1-1.2: hardcoding table_schema='public' declared CRITICAL MISSING_TABLE for any
 * model defined with `{ schema: 'analytics' }` — a table that plainly exists. Keys are now
 * "schema.table" and every schema present in the DB is read.
 * GLM H1-1.3: information_schema reports citext/hstore/geometry/domains all as
 * 'USER-DEFINED', which the classifier bucketed as ENUM — reviving the exact
 * DATEONLY/BLOB false-positive class. udt_name disambiguates.
 */
async function liveColumns() {
  const [rows] = await sequelize.query(
    `SELECT table_schema, table_name, column_name, data_type, udt_name
       FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')`,
  );
  const byTable = new Map();
  for (const r of rows) {
    const key = `${r.table_schema}.${r.table_name}`;
    if (!byTable.has(key)) byTable.set(key, new Map());
    byTable.get(key).set(r.column_name, { dataType: r.data_type, udtName: r.udt_name });
  }
  return byTable;
}

/** Which USER-DEFINED types are genuinely enums. Everything else must not be called ENUM. */
async function enumTypeNames() {
  const [rows] = await sequelize.query(
    "SELECT typname FROM pg_type WHERE typtype = 'e'",
  );
  return new Set(rows.map((r) => r.typname));
}

/**
 * GLM H1-1.5: the information_schema join matched on (constraint_name, table_schema) only.
 * Postgres constraint names are unique per TABLE, not per schema, and ccu was joined
 * regardless of constraint type — so two FKs both named `fk_user`, or an FK colliding with
 * any PK/UNIQUE/CHECK name, produced a cartesian product including phantom rows pointing at
 * `users`. That is a FALSE CRITICAL in the one check whose whole job is catching the
 * users-vs-"Users" trap. pg_constraint is unambiguous, and regclass preserves the real
 * casing directly instead of us reconstructing it.
 */
async function foreignKeys() {
  const [rows] = await sequelize.query(
    `SELECT rel.relname       AS table_name,
            att.attname       AS column_name,
            f.relname         AS target_table
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_class f   ON f.oid   = con.confrelid
       JOIN unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
       JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
      WHERE con.contype = 'f'`,
  );
  return rows;
}

async function main() {
  await sequelize.authenticate();
  const models = await getModels();
  const live = await liveColumns();
  const fks = await foreignKeys();
  const enumTypes = await enumTypeNames();

  const findings = [];
  let modelsChecked = 0;
  let attributesChecked = 0;

  for (const [name, model] of Object.entries(models)) {
    if (!model?.getTableName || !model?.rawAttributes) continue;
    if (onlyModel && name !== onlyModel) continue;
    modelsChecked += 1;

    const tableRaw = model.getTableName();
    // Some models declare tableName as '"Users"' — quoted to force Postgres case
    // sensitivity. information_schema reports the name UNQUOTED, so comparing the raw
    // string invents a MISSING_TABLE for a table that plainly exists. Strip the quotes.
    const table = String(typeof tableRaw === 'string' ? tableRaw : tableRaw?.tableName ?? '')
      .replace(/^"(.*)"$/, '$1');
    // GLM H1-1.2: honour a model's explicit schema instead of assuming public.
    const schema = (typeof tableRaw === 'object' && tableRaw?.schema) ? tableRaw.schema : 'public';
    const cols = live.get(`${schema}.${table}`);

    if (!cols) {
      findings.push({
        severity: 'CRITICAL',
        kind: 'MISSING_TABLE',
        model: name,
        table,
        // GLM H2-6: this said "public schema" unconditionally, contradicting the
        // schema-qualified lookup installed by the H1 fix in the same file.
        detail: `model targets table "${table}" which does not exist in schema "${schema}"`,
      });
      continue;
    }

    for (const [attr, def] of Object.entries(model.rawAttributes)) {
      // VIRTUAL attributes are computed, never persisted — they appear in rawAttributes but
      // have no column, so checking them would manufacture a MISSING_COLUMN. Zero models use
      // VIRTUAL today (verified 2026-08-18); this is a defensive guard against the first one.
      // Raised by Qwen in hostile round H1.
      const typeKey = String(def.type?.key || def.type || '').toUpperCase();
      if (typeKey.includes('VIRTUAL')) continue;

      // `field` is the real column name when it differs from the JS attribute name.
      // NOTE: `underscored: true` models get `field` auto-populated by Sequelize with the
      // snake_case name (verified: submittedByUserId -> submitted_by_user_id), so this line
      // already handles them. Qwen flagged them as a false-positive risk in H1; DISPROVEN.
      const column = def.field || attr;
      attributesChecked += 1;

      if (!cols.has(column)) {
        findings.push({
          severity: 'CRITICAL',
          kind: 'MISSING_COLUMN',
          model: name,
          table,
          detail: `attribute "${attr}" maps to column "${column}" which does not exist`,
        });
        continue;
      }

      const declared = typeFamily(def.type?.key || def.type?.toString?.() || def.type);
      const liveCol = cols.get(column);
      // USER-DEFINED covers enums AND citext/hstore/geometry/domains. Only call it ENUM when
      // pg_type says so; otherwise UNKNOWN, which the skip below suppresses (GLM H1-1.3).
      const actual = liveCol.dataType === 'USER-DEFINED'
        ? (enumTypes.has(liveCol.udtName) ? 'ENUM' : 'UNKNOWN')
        : typeFamily(liveCol.dataType);
      // UNKNOWN on either side means we could not classify — do not manufacture a finding.
      // ENUM is legitimately backed by either a native pg enum or a varchar+CHECK; a model
      // declaring STRING against either is a valid, deliberate configuration, not drift.
      // Treating them as incompatible was noise (Qwen H1, accepted).
      const compatible = (a, b) => (a === b)
        || ([a, b].every((x) => x === 'ENUM' || x === 'TEXT'));

      if (declared !== 'UNKNOWN' && actual !== 'UNKNOWN' && !compatible(declared, actual)) {
        findings.push({
          severity: 'WARN',
          kind: 'TYPE_DRIFT',
          model: name,
          table,
          detail: `column "${column}": model says ${declared}, database says ${actual}`,
        });
      }
    }
  }

  // FK target drift — this repo has BOTH `users` and `"Users"`; only "Users" is canonical.
  for (const fk of fks) {
    if (fk.target_table === 'users') {
      findings.push({
        severity: 'CRITICAL',
        kind: 'FK_TARGET_DRIFT',
        model: '(constraint)',
        table: fk.table_name,
        detail: `${fk.table_name}.${fk.column_name} references lowercase "users"; canonical is "Users"`,
      });
    }
  }

  // GLM H1-1.4: `--model Users` when the key is `User` matched nothing, printed
  // "CLEAN — no drift detected" and exited 0. A check that checked NOTHING reporting
  // success is the exact silent-success class these tools exist to eliminate — and it was
  // in the tool itself. Fail loudly instead.
  if (onlyModel && modelsChecked === 0) {
    console.error(`schema-drift-check: no model named "${onlyModel}" — nothing was checked. `
      + 'Refusing to report CLEAN on an empty run.');
    await sequelize.close();
    process.exit(2);
  }

  const critical = findings.filter((f) => f.severity === 'CRITICAL');

  const payload = JSON.stringify({ modelsChecked, attributesChecked, findings }, null, 2);

  // --out writes JSON to a file. Necessary because model/dotenv startup logs to stdout,
  // so piping --json is not reliably parseable (it wasn't, on the first live run).
  if (outPath) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(outPath, payload);
    console.log(`schema-drift-check: JSON written to ${outPath}`);
  } else if (asJson) {
    console.log(payload);
  } else {
    console.log(`\nschema-drift-check — ${modelsChecked} models, ${attributesChecked} attributes\n`);
    if (findings.length === 0) {
      console.log('  CLEAN — no drift detected.\n');
    } else {
      for (const f of findings) {
        console.log(`  [${f.severity}] ${f.kind}  ${f.model} (${f.table})`);
        console.log(`           ${f.detail}`);
      }
      console.log(`\n  ${critical.length} critical, ${findings.length - critical.length} warning\n`);
    }
  }

  await sequelize.close();
  process.exit(critical.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('schema-drift-check could not run:', err.message);
  try { await sequelize.close(); } catch { /* already closed */ }
  process.exit(2);
});
#!/usr/bin/env node
/**
 * token-registry-check.mjs — the retrieval-fed filter class, minus the retrieval infra.
 *
 * WHY: the coder-brain consult (GLM, 2026-08-18) identified a category our doctrine had no
 * home for — rules checkable only against LIVE REPO STATE. `var(--token, #fallback)` is the
 * canonical example: G4 already proves the *shape* is right, but nothing checks that
 *   (a) the token actually EXISTS, or
 *   (b) the hardcoded fallback still MATCHES what the token is defined as.
 * Both fail silently. A typo'd token name renders the fallback forever — the page looks
 * almost right, so nobody files a bug. A drifted fallback means the fallback path renders a
 * stale brand color, which is the same class of harm as using a retired token outright.
 *
 * WHY NOT THE FULL INDEX: GLM's Slice 3 wants tree-sitter + Postgres tables. tree-sitter is
 * an uninstalled native dependency and the tables would be a production schema change —
 * both are Sean's calls. This delivers the token half, which needs neither: it parses CSS
 * with a regex over files already on disk, and holds the registry in memory.
 *
 * READ-ONLY. Exit 0 = clean, 1 = findings, 2 = could not run.
 *
 * Usage:
 *   node scripts/hooks/token-registry-check.mjs                 # whole frontend
 *   node scripts/hooks/token-registry-check.mjs --file <p>...    # specific files
 *   node scripts/hooks/token-registry-check.mjs --strict         # also fail on fallback drift
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const fileArgs = args.includes('--file') ? args.slice(args.indexOf('--file') + 1) : [];
const STRICT = args.includes('--strict');
const ROOT = 'frontend/src';

// Vendored/reference material defines its own token universe; including it would produce
// phantom "token exists" answers for tokens live code cannot actually see.
const VENDORED = /(^|[\\/])(dashboard-export|reference-pack|production-context|vendor|node_modules)[\\/]/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (VENDORED.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(css|tsx?|jsx?)$/.test(p)) out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

/** DEFINITIONS: `--token-name: value;` — the registry. */
const DEFINE_RE = /(^|[;{\s])(--[\w-]+)\s*:\s*([^;}]+)/g;
/**
 * DEFINITIONS set at RUNTIME from JS: `setProperty('--token', v)`.
 * Self-review H1: without this, every theme token injected imperatively reads as
 * "never defined" — a false positive on code that is behaving correctly.
 */
const RUNTIME_DEFINE_RE = /setProperty\(\s*['"`](--[\w-]+)['"`]/g;
/**
 * USES, fallback-bearing: `var(--token, fallback)`.
 * NOTE the fallback capture stops at the first `)`, so a nested `var(--a, var(--b, #fff))`
 * yields a truncated fallback. That is tolerated — the drift comparison only fires when
 * BOTH sides are literal hex, so a truncated non-hex fallback is simply skipped.
 */
const USE_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g;
/**
 * USES, existence only: every `var(--token` occurrence regardless of nesting.
 * Self-review H1 found the false negative this fixes: in `var(--a, var(--b, #fff))` the
 * regex above matches only `--a`, so `--b` was NEVER checked for existence at all — the
 * exact shape a token-fallback chain uses, and therefore the shape most worth checking.
 */
const USE_NAME_RE = /var\(\s*(--[\w-]+)/g;

function normalizeColor(v) {
  const t = String(v || '').trim().toLowerCase();
  const m = t.match(/^#([0-9a-f]{3,8})$/);
  if (!m) return t;
  const h = m[1];
  // #abc -> #aabbcc so a shorthand fallback is not reported as drift against its longhand.
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return `#${h}`;
}

function main() {
  if (!existsSync(ROOT)) {
    console.error(`token-registry-check: ${ROOT} not found — run from the repo root.`);
    process.exit(2);
  }

  const allFiles = walk(ROOT);

  // Build the registry from EVERY non-vendored file, always — a token defined in a file you
  // did not stage is still a defined token. Scoping the registry to --file would invent
  // UNKNOWN_TOKEN findings for tokens that plainly exist.
  const registry = new Map();
  for (const f of allFiles) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(DEFINE_RE)) {
      const [, , name, value] = m;
      if (!registry.has(name)) registry.set(name, { value: value.trim(), file: f });
    }
    // Imperatively-set tokens are defined too — just not statically valued.
    for (const m of text.matchAll(RUNTIME_DEFINE_RE)) {
      if (!registry.has(m[1])) registry.set(m[1], { value: '(set at runtime)', file: f });
    }
  }

  const targets = fileArgs.length
    ? fileArgs.filter((f) => existsSync(f)).map((f) => f.replace(/\\/g, '/'))
    : allFiles;

  const unknown = [];
  const drifted = [];

  for (const f of targets) {
    const text = readFileSync(f, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      // Existence is checked over EVERY var(--x, including ones nested inside another
      // var()'s fallback — those were previously invisible.
      for (const m of line.matchAll(USE_NAME_RE)) {
        if (!registry.has(m[1])) {
          unknown.push(`${f}:${i + 1} — var(${m[1]}) is never defined; the fallback will render forever`);
        }
      }
      for (const m of line.matchAll(USE_RE)) {
        const [, name, fallbackRaw] = m;
        const def = registry.get(name);
        if (!def || !fallbackRaw) continue;
        const fb = normalizeColor(fallbackRaw);
        const declared = normalizeColor(def.value);
        // Only compare when BOTH sides are literal colors. A token whose value is itself a
        // var() or a calc() is not comparable, and guessing would manufacture findings.
        if (/^#[0-9a-f]{6,8}$/.test(fb) && /^#[0-9a-f]{6,8}$/.test(declared) && fb !== declared) {
          drifted.push(
            `${f}:${i + 1} — var(${name}, ${fallbackRaw.trim()}) but ${name} is defined as `
            + `${def.value} in ${def.file}; the fallback path renders a stale color`,
          );
        }
      }
    });
  }

  console.log(`\ntoken-registry-check — ${registry.size} tokens defined, ${targets.length} files scanned\n`);
  if (unknown.length) {
    // Group by token NAME. The first full-repo run produced 1,738 individual lines, which is
    // unreadable and un-actionable; the same data collapses to a short list of distinct
    // missing tokens, each of which is one definition away from being fixed.
    const byToken = new Map();
    for (const u of unknown) {
      const name = u.match(/var\((--[\w-]+)\)/)?.[1] ?? '(unparsed)';
      if (!byToken.has(name)) byToken.set(name, []);
      byToken.get(name).push(u);
    }
    const ranked = [...byToken.entries()].sort((a, b) => b[1].length - a[1].length);
    console.log(`  UNDEFINED TOKENS — ${byToken.size} distinct names across ${unknown.length} use sites.`);
    console.log('  Each renders its fallback forever and can never respond to theming:\n');
    for (const [name, uses] of ranked.slice(0, 20)) {
      console.log(`    ${String(uses.length).padStart(4)}×  ${name}`);
      console.log(`          e.g. ${uses[0].split(' — ')[0]}`);
    }
    if (ranked.length > 20) console.log(`\n    … and ${ranked.length - 20} more distinct tokens`);
  }
  if (drifted.length) {
    console.log(`\n  FALLBACK DRIFT (${drifted.length})${STRICT ? '' : ' — advisory, use --strict to fail'}:`);
    drifted.slice(0, 25).forEach((d) => console.log(`    ${d}`));
    if (drifted.length > 25) console.log(`    … and ${drifted.length - 25} more`);
  }
  if (!unknown.length && !drifted.length) console.log('  CLEAN — every var() resolves and every literal fallback matches.\n');

  // ADVISORY by default. The first full-repo run found 1,738 use sites — this is a standing
  // backlog, not a regression, and a gate that fails on inherited debt gets disabled (Rule 34).
  // --strict makes it a gate, which is the right mode once the backlog is worked down or when
  // scoped to changed files only.
  const failing = STRICT ? unknown.length + drifted.length : 0;
  if (!STRICT && (unknown.length || drifted.length)) {
    console.log('\n  (advisory — nothing failed. Re-run with --strict to gate on these.)\n');
  }
  process.exit(failing > 0 ? 1 : 0);
}

try {
  main();
} catch (err) {
  console.error('token-registry-check could not run:', err.message);
  process.exit(2);
}
    }
  });

  if (isTestFile) continue;

  // G5 — Rule 43: a SHARED style fragment that interpolates MUST be css`` tagged.
  // A plain template string calls toString() on keyframes/helpers and bakes the generated
  // class name into the output, crashing styled-components at mount with error #12.
  // The build passes, types pass, nothing warns at dev time — it only dies in the browser.
  // Incident 2026-04-12: AdminOverviewPanel's bentoItemAnimation took down the whole
  // admin dashboard exactly this way. This is the one guard whose absence costs a
  // production outage rather than a lint nag, which is why it is worth an AST-ish check.
  //
  // NARROWED after a live false positive (CrystallizeOverlay.tsx, 2026-08-18): that file
  // deliberately exports raw CSS *text* for a test gate and interpolates a NUMBER. Rule 43's
  // hazard is not interpolation per se — it is interpolating a styled-components PRIMITIVE
  // (a keyframes/css object) whose toString() bakes the generated class name in. Interpolating
  // a number or a plain string is harmless. So: only flag when the fragment interpolates an
  // identifier that this same file defines via keyframes``/css``/styled — the shape that
  // actually crashes. Opt out on a genuine exception with `swan-guard-allow-template`.
  const PRIMITIVES = new Set(
    // GLM H1-2.2: no word boundary meant `css` matched the PREFIX of `cssValue(16)`, so a
    // plain helper's result was treated as a primitive and its consumers false-positived.
    // `\b` still matches css` because word→backtick is a boundary.
    [...text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(?:keyframes|css)\b|styled[.(])/g)]
      .map((m) => m[1]),
  );

  // FALSE NEGATIVE found by self-review 2026-08-18, and it was the WORSE one: shared
  // animations normally live in their own module and are IMPORTED, which is the most likely
  // real shape of the bug G5 exists to catch — and it sailed straight through, because
  // same-file detection cannot see it. Resolve relative imports one level and look for the
  // primitive there. Cross-file is the only way to tell `${fadeIn}` (imported keyframes,
  // bakes a class name) apart from `${SOME_Z_INDEX}` (imported number, harmless).
  for (const imp of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const names = imp[1].split(',').map((n) => n.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
    const spec = imp[2];
    const base = resolvePath(dirname(file), spec);
    const candidates = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '']
      .map((ext) => `${base}${ext}`);
    const hit = candidates.find((c) => existsSync(c) && statSync(c).isFile());
    if (!hit) continue;
    let src = '';
    try { src = readFileSync(hit, 'utf8'); } catch { continue; }
    const exported = new Set(
      [...src.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:keyframes|css|styled[.(])/g)]
        .map((m) => m[1]),
    );
    for (const n of names) if (exported.has(n)) PRIMITIVES.add(n);
  }

  // Scope deliberately narrow to keep false positives at zero: only EXPORTED module-level
  // `const NAME = ` + backtick, containing ${...}, not already css/styled/keyframes/createGlobalStyle
  // tagged. A non-exported local is not a shared fragment and is not our business.
  // GLM H1-2.3/2.4, corrected on verification. GLM's stated shape (`export const cssText =`)
  // was DISPROVEN — that matches fine. But probing around it found three REAL escapes:
  //   export const x = cssText`...`      -> tag alternation half-matched then failed: NO match
  //   export const y = keyframesFor`...` -> same
  //   export default `...`               -> never matched ^export const at all (2.4)
  // So: capture ANY tag identifier, and exempt only tags we positively recognise as safe.
  // An unknown tag gets scanned — for a rule whose failure mode is a production mount
  // crash, reviewing an unfamiliar tag is the cheaper error.
  // ANCHORED. The unanchored version matched `cssText` as a prefix and exempted the exact
  // shape this fix exists to catch — the same prefix-match bug fixed 20 lines above, made
  // twice in one file. `styled` keeps a prefix form because `styled.div` / `styled(X)` are
  // legitimately tagged.
  const SAFE_TAG = /^(?:css|keyframes|createGlobalStyle)$|^styled[.(]/;
  const SHARED_FRAGMENT = /^\s*export\s+(?:default\s*|const\s+([A-Za-z_$][\w$]*)\s*=\s*)(styled[.(][\w.$'"()]*|[A-Za-z_$][\w$]*)?\s*`/gm;
  for (const m of text.matchAll(SHARED_FRAGMENT)) {
    const [, rawName, tag] = m;
    const name = rawName || '(default export)';
    if (tag && SAFE_TAG.test(tag)) continue; // css`` / styled`` / keyframes`` — safe by construction
    // Does THIS template literal interpolate? Read to its closing backtick.
    const start = m.index + m[0].length - 1;
    let i = start + 1;
    let depth = 0;
    let braces = 0;
    let expr = '';
    const exprs = [];
    while (i < text.length) {
      const c = text[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '$' && text[i + 1] === '{') { depth += 1; i += 2; expr = ''; continue; }
      // GLM H1-2.5: a quoted `}` inside an interpolation — `${map['}']}` — desynchronised
      // the scanner and could terminate the file scan early, hiding every later fragment.
      // Skip over quoted spans while inside an interpolation.
      if (depth > 0 && (c === "'" || c === '"')) {
        const quote = c; expr += c; i += 1;
        while (i < text.length && text[i] !== quote) {
          if (text[i] === '\\') { expr += text.slice(i, i + 2); i += 2; continue; }
          expr += text[i]; i += 1;
        }
        expr += text[i] ?? ''; i += 1; continue;
      }
      // GLM H2-7: the H1-2.5 fix closed QUOTES but not BRACES. An object literal inside an
      // interpolation — `${fn({ a: 1 }) && g}` — let its own `}` close the interpolation
      // early; the scan then truncated and identifiers after the brace were never read.
      // Track nested braces so only the matching one closes the interpolation.
      if (depth > 0 && c === '{') { braces += 1; expr += c; i += 1; continue; }
      if (depth > 0 && c === '}' && braces > 0) { braces -= 1; expr += c; i += 1; continue; }
      if (depth > 0 && c === '}') { depth -= 1; if (depth === 0) exprs.push(expr); i += 1; continue; }
      if (depth > 0) { expr += c; i += 1; continue; }
      if (c === '`') break;
      i += 1;
    }
    // Only a styled-components primitive baked into a plain string causes error #12.
    const bakes = exprs.some((e) => [...e.matchAll(/[A-Za-z_$][\w$]*/g)].some((id) => PRIMITIVES.has(id[0])));
    if (!bakes) continue;
    const line = text.slice(0, m.index).split('\n').length;
    if (/swan-guard-allow-template/.test(text.split('\n').slice(Math.max(0, line - 3), line).join('\n'))) continue;
    failures.push(
      `FAIL: G5 css-helper-required (Rule 43) — ${file}:${line} — exported fragment "${name}" `
      + 'interpolates ${...} in a PLAIN template string. Wrap it with the styled-components '
