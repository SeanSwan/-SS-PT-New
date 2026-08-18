# HOSTILE REVIEW PACKET — three shipped guards (round H1)

Three deterministic checkers shipped today. Attack them. I want defects, not praise.

## What is under review

**1. `backend/scripts/schema-drift-check.mjs`** — compares Sequelize model attributes against
`information_schema` on the live DB. Detects MISSING_TABLE, MISSING_COLUMN, TYPE_DRIFT,
FK_TARGET_DRIFT. Read-only. Exit 0 clean / 1 drift / 2 could-not-run.
Live run: 157 models, 2,657 attributes, 23 critical + 19 warnings.
I already fixed three of my own false positives: DATEONLY-vs-date and BLOB-vs-bytea are
correct Sequelize mappings; models declaring tableName as `'"Users"'` quote it to force
Postgres case and information_schema reports it unquoted.

**2. `scripts/hooks/frontend-guards.mjs` G5/G6** — G5 flags an EXPORTED style fragment that
interpolates a styled-components PRIMITIVE inside a plain template string (Rule 43: this
crashes at mount with error #12; build and types both pass). Narrowed after a live false
positive on a file that exports raw CSS text and interpolates a number. G6 warns (never
blocks) on files over 300 lines. 13 tests.

**3. `scripts/hooks/token-registry-check.mjs`** — parses `--token: value` definitions across
frontend/src, then checks every `var(--token, fallback)` for (a) token existence and
(b) fallback-vs-definition drift. Advisory by default. Found 603 distinct token names used
but never defined, across 1,738 sites.

## Attack these specifically

- **False positives.** Each tool has already produced some. What shapes still slip through?
  Consider: Sequelize `.init()` vs `define()`, schemas other than public, models with
  `underscored: true`, computed/virtual attributes, CSS `@media`/`:root` scoping, tokens
  defined inside styled-components template literals or set at runtime via JS, `var()`
  nested inside another `var()` fallback, minified or generated CSS.
- **False NEGATIVES — the ones that matter more.** What real drift/violation does each tool
  silently miss? Is the G5 primitive-detection heuristic (identifier assigned from
  keyframes/css/styled in the SAME file) defeated by an IMPORTED primitive? Almost certainly
  yes — how bad is that, and what is the cheapest fix?
- **Correctness of the regexes.** `DEFINE_RE = /(^|[;{\s])(--[\w-]+)\s*:\s*([^;}]+)/g` and
  `USE_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g`. Break them.
- **Operational safety.** schema-drift-check connects to the PRODUCTION database (this repo's
  local dev uses prod via DATABASE_URL). Is anything about that unsafe, slow, or lock-taking?
- **The advisory-vs-blocking calls.** G6 and token-check are advisory because a gate that
  fails on inherited debt gets disabled. Is that the right call or a cop-out?

Be specific: name the file, the shape that breaks it, and the fix. If a tool is fine, say so
rather than manufacturing a finding.
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

async function liveColumns() {
  const [rows] = await sequelize.query(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'`,
  );
  const byTable = new Map();
  for (const r of rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, new Map());
    byTable.get(r.table_name).set(r.column_name, r.data_type);
  }
  return byTable;
}

async function foreignKeys() {
  const [rows] = await sequelize.query(
    `SELECT tc.table_name, kcu.column_name, ccu.table_name AS target_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`,
  );
  return rows;
}

async function main() {
  await sequelize.authenticate();
  const models = await getModels();
  const live = await liveColumns();
  const fks = await foreignKeys();

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
    const cols = live.get(table);

    if (!cols) {
      findings.push({
        severity: 'CRITICAL',
        kind: 'MISSING_TABLE',
        model: name,
        table,
        detail: `model targets table "${table}" which does not exist in public schema`,
      });
      continue;
    }

    for (const [attr, def] of Object.entries(model.rawAttributes)) {
      // `field` is the real column name when it differs from the JS attribute name.
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
      const actual = typeFamily(cols.get(column));
      // UNKNOWN on either side means we could not classify — do not manufacture a finding.
      if (declared !== 'UNKNOWN' && actual !== 'UNKNOWN' && declared !== actual) {
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
/** USES: `var(--token-name, fallback)` or `var(--token-name)`. */
const USE_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g;

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
      for (const m of line.matchAll(USE_RE)) {
        const [, name, fallbackRaw] = m;
        const def = registry.get(name);
        if (!def) {
          unknown.push(`${f}:${i + 1} — var(${name}) is never defined; the fallback will render forever`);
          continue;
        }
        if (!fallbackRaw) continue;
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
      if (leftover) failures.push(`FAIL: G4 hardcoded-hex (Rule 6) — ${loc} — "${leftover[0]}" must be var(--token, ${leftover[0]}) or line-tagged swan-guard-allow-hex <reason>`);
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
    [...text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:keyframes|css|styled[.(])/g)]
      .map((m) => m[1]),
  );

  // Scope deliberately narrow to keep false positives at zero: only EXPORTED module-level
  // `const NAME = ` + backtick, containing ${...}, not already css/styled/keyframes/createGlobalStyle
  // tagged. A non-exported local is not a shared fragment and is not our business.
  const SHARED_FRAGMENT = /^\s*export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(css|styled[.(]|keyframes|createGlobalStyle)?\s*`/gm;
  for (const m of text.matchAll(SHARED_FRAGMENT)) {
    const [, name, tag] = m;
    if (tag) continue; // already css`` / styled`` / keyframes`` — correct by construction
    // Does THIS template literal interpolate? Read to its closing backtick.
    const start = m.index + m[0].length - 1;
    let i = start + 1;
    let depth = 0;
    let expr = '';
    const exprs = [];
    while (i < text.length) {
      const c = text[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '$' && text[i + 1] === '{') { depth += 1; i += 2; expr = ''; continue; }
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
      + '`css` helper or it bakes a class name in and crashes at mount (error #12).',
    );
  }

  // G6 — Rule 4: max 300 lines per file. Reported once per file, not per line.
  // VENDORED/reference material is excluded: `assets/**/dashboard-export/**` is a copied
  // design reference pack, not live code, and linting it is pure noise (2 of 4 hits on the
  // first 250-file sample were exactly that). Legacy files you merely touched can opt out
  // with `swan-guard-allow-long-file` — Rule 34 says pre-existing debt is not a blocker you
  // inherit by editing one line of it.
  const VENDORED = /(^|\/)(dashboard-export|reference-pack|production-context|vendor|third[-_]party)\//;
  const loc300 = lines.length;
  if (!VENDORED.test(file) && !/swan-guard-allow-long-file/.test(text) && loc300 > 300) {
    // ADVISORY, not a failure. A 250-file sample found 31 pre-existing files over the cap;
