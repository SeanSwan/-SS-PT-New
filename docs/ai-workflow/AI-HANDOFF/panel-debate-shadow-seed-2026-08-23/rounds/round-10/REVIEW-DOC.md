# DEBATE ROUND 10 / up to 20

(The per-seat remit + stance were delivered alongside this document. The shared rules, running state, and code packet are below.)

You are ONE seat in a MULTI-ROUND HOSTILE DEBATE (round 10 of up to 20) over the SS-PT shadow-database seeder code packet below. Your seat stance is stated in the remit above the document; hold THAT lens, do not drift to the other seats'.

RULES OF THIS DEBATE (binding):
1. Every finding needs file + line (or workflow step) evidence FROM THE PACKET. Unlocatable claims will be cut by other seats — make yours locatable.
2. A finding = CLAIM about a defect in the packaged code, severity MAJOR (breaks a correctness/safety/build contract) | MINOR | NOTE.
3. Round 2+: the RUNNING CONSENSUS is quoted. CONSENSUS = you adopt it verbatim except items you REJECT with evidence. DISPUTE = you carry at least one REJECT or a new MAJOR.
4. No hedging. No "should be fine" without a named verified path in the packet. Vague praise is discarded.
5. Builder claims in the packet header are TESTABLE assertions — if the code contradicts one, the contradiction is a finding; cite both sides.
6. Endorse the fixes the way an engineer applies them: WHAT, WHERE (file:line), HOW — no re-derivation needed.

END EVERY REPLY with EXACTLY this verdict block (the orchestrator parses it strictly; keep key lines on one line each, items separated by |):
=== VERDICT ===
status: CONSENSUS
confidence: 92
findings: F1=MAJOR: file.js L123: claim text | F2=MINOR: file.yml step-7: claim text
rebuttals: F1=REJECT: why the evidence is wrong | F3=AGREE          (round 1 may be: rebuttals: (none))
open: Q1=what other seats must decide
consensus_block: REQUIRED when status is CONSENSUS — the complete ruling: findings to fix with exact fixes, findings accepted as intentional, and residual risks. May be multi-line.
=== END-VERDICT ===

## RUNNING STATE (rounds answered: 9)
Unresolved findings: .github/workflows/migration-shadow-check.yml L25 `POSTGRES_PASSWORD  |  §4 insertedIds/tableNameToModel lowercase folding collapses a hypothetical "Users"+"users" model pair onto one key  |  §4 no-pk bulkCreate branch duplicates rows for PK-less tables across runs  |  .github/workflows/migration-shadow-check.yml L25  |  .github/workflows/migration-shadow-check.yml L25  |  .github/workflows/migration-shadow-check.yml L25

## CONSENSUS CANDIDATE — adopt it or REJECT parts with evidence

```
FIX ALL: (1) seed-shadow-db.mjs: hoist tableNameToModel before the section-3 deps loop; after the associations walk, add parents from normalizeModel attrs with foreignKeyTarget, mapped through tableNameToModel and kept only if registry.has(parentNm). (2) Replace pkCol=.find with pkCols=Object.keys(attrs).filter(c=>attrs[c].pk); pass pkCols to updateOnDuplicate. (3) Store full PK maps in insertedIds (values.map(v=>Object.fromEntries(pkCols.map(c=>[c,v[c]])))); generateRowValues must set out[col]=parentRow[a.foreignKeyTarget.pk] (not the whole slot); backfill must read insertedIds[targetLower][0][attrs[bf.col].foreignKeyTarget.pk] and delete the unused tPk .find. Update seed-shadow-db.test.mjs + seed-shadow-db.selftest.mjs parentIds fixtures from scalar arrays to PK maps (or the readers break). (4) .github/workflows/migration-shadow-check.yml L25: POSTGRES_PASSWORD: "shadow"; Export DATABASE_URL password must be shadow. (5) Assert step: grep '^SHADOW-SEED {' (not '^SHADOW-SEED '). (6) delete backend/vitest.config.mjs L34-L35 retry:1. (7) dedupe backfill on (table,col) before UPDATE. All seven require one real green CI run as proof — F1 means none exists with this YAML. ACCEPTED INTENTIONAL: PII guard, deterministic generation, synthetic-over-snapshot (§3), F5/F6-of-prior-rounds deferred (unit suite not this job's gate). RESIDUAL RISK: deps still miss FKs not expressed as attributes or associations — manual review of 217 models advised; skipped hard-cycle tables stay empty for migrate-2 (Assert does not fail on skipped); composite-PK paths unverified until that green run.
```

# THE PACKAGED CODE UNDER REVIEW
# HOSTILE DEBATE PACKET — SS-PT shadow-database seeder (SWA-200)

**Seats in this panel:** GLM 5.3 · Grok 4.6 (two independent seats) · DeepSeek V4 Pro · Ox Alpha (stealth — note: its provider RETAINS prompts; packet is scrubbed to the standard we send any vendor)

**Local verification already performed by the builder (trust, but check):**
- self-test: 32/32 PASS, exit 0 (`node backend/scripts/seed-shadow-db.selftest.mjs`)
- live safety gate: DATABASE_URL unset -> REFUSED exit 1; non-localhost -> REFUSED exit 1; localhost without "shadow" -> REFUSED exit 1; valid shadow URL passes gate and fails only at real DB connect (correct order)
- `grep -i "REFERENCES users"` over the seeder -> 0 matches
- workflow YAML validated by the editor linter (YAML `***` alias bug caught and quoted)
- UNPROVEN-by-necessity: end-to-end insert (no local Postgres; apt-get denied without root; no Docker — CI assertion is the production gate); vitest run blocked on a missing @rollup Linux native binary — the self-test covers the same contracts

**Your job:** find REAL defects in these files and the brief. Every claim needs file+line evidence from the packet. Speculative praise is useless to us; so is a finding we cannot locate in the text. Where the builder's local-verification claims above conflict with what the code actually does, that conflict IS the highest-value finding.

---

===================== FILE: docs/ai-workflow/AI-HANDOFF/QWEN-HANDOFF-SHADOW-DB-SEED-2026-08-23.md — THE BRIEF — rules, 8 acceptance criteria, house rules =====================

---
decision: Executable handoff for Qwen 3.8 — build a synthetic seed for the CI shadow database so the migration gate can catch destructive and data migrations, then run a 4-seat hostile panel and apply its fixes.
status: open
supersedes: none
---

# HANDOFF — synthetic shadow-database seed (for Qwen 3.8)

**You are the builder.** This document is self-contained: everything you need is here. Do not ask follow-up questions — where a decision was genuinely open it has already been made below, and where something is unknown that is stated explicitly so you can work around it.

**Read this whole document before writing a line of code.** Section 9 exists because a previous agent on this exact codebase repeatedly shipped things that looked correct and did nothing.

---

## 1. The one-sentence job

The CI migration gate runs migrations against an **empty** database, so a migration that deletes a column or rewrites data passes it and then damages production. **Put realistic rows in that database before the migrations run.**

---

## 2. Why this matters (read it, don't skim it)

`render.yaml` deploys `main` and builds with `npm run migrate:production`. Every push to main runs migrations against the production database.

PR #68 added `.github/workflows/migration-shadow-check.yml`, which runs the pushed commit's migrations against a throwaway Postgres container in CI. That catches "does this migration run at all."

It cannot catch anything else, and a five-model panel said so in almost identical words:

> **GLM 5.3:** *"The green check is a multiplier, not a floor — it substitutes for reviewer scrutiny with a signal that certifies 'syntactically applies to void.'"*

> **Grok 4.6:** *"A destructive migration — `removeColumn`, `dropTable`, `changeColumn`, or any `DELETE`/`UPDATE` data migration — goes green on the empty shadow DB, twice, idempotently. Someone merges. Production data is gone. `SequelizeMeta` says success. App boots. Nobody is paged."*

`removeColumn` on an empty table is indistinguishable from `removeColumn` on 40,000 client records. **Your job is to make those two things distinguishable.**

---

## 3. Decisions already made — do not revisit these

| Question | Decision | Why |
|---|---|---|
| Real production data in CI? | **NO. Never.** | This app holds payment and biometric data. Production PII must never enter a GitHub Actions container. If you find yourself writing code that connects to a production database, you have gone wrong. |
| Sanitised production snapshot? | **Not now.** | Needs a scrubber that must be perfect; a scrubber with a gap is a client-data leak. Deferred deliberately. |
| Synthetic generated rows? | **YES. This is the job.** | Zero privacy surface, catches most of the gap. |
| Hand-write a seed per table? | **NO.** | There are **217 models**. A hand-written seed would be wrong before it was finished. **Derive it from the models.** |
| Where does the seed run? | **CI only**, inside the shadow-check workflow, against the throwaway container. | |

---

## 4. Ground truth — verified 2026-08-23, do not re-derive

- Base branch: **`main`**. Work from a fresh branch off `origin/main`.
- **217** model files in `backend/models/*.mjs`
- **373** migration files in `backend/migrations/`
- Existing CI job: `.github/workflows/migration-shadow-check.yml` (from PR #68 — **may not be merged yet**; if absent on main, base your work on the PR #68 branch `claude/swa200-migration-rails-20260823`)
- The shadow container in that workflow uses user/password/database all named `shadow` on `localhost:5432`
- Existing seeders live in `backend/seeders/` — **read one for style, do not extend them.** They are for dev/demo data, not this.
- `scripts/schema-snapshot.mjs` **exists only on a stale branch, not on `main`.** Do not depend on it.
- `pg` is a real backend dependency (`^8.13.3`). `sequelize` is available in `backend/`.

### The trap that has already caused one silent-corruption incident

Postgres folds unquoted identifiers to lower case.

- The canonical users table is **`"Users"`** — quoted, capital U.
- A bare `users` table **also exists in production** and is a stale duplicate.
- `REFERENCES Users(id)` resolves to `users` — **the wrong table**, silently.
- Always write `REFERENCES "Users"(id)`.
- `"Users".id` is **INTEGER**, not UUID.

If your seed writes to `users` instead of `"Users"`, it will appear to work and prove nothing.

---

## 5. What to build

### 5.1 `backend/scripts/seed-shadow-db.mjs`

A script that fills an **empty** database with synthetic rows derived from the Sequelize models.

**Required behaviour:**

1. **Refuse to run against anything but a shadow database.** First thing in the file, before any connection:
   - Require `process.env.DATABASE_URL` to match `/localhost|127\.0\.0\.1/`
   - Require it to contain the word `shadow`
   - If either fails: print a loud error and `process.exit(1)`. **No environment variable may override this.** A seeder that can point at production is worse than no seeder.

2. **Load the models and read their attributes.** Use Sequelize's model definitions (`Model.rawAttributes` or `Model.getAttributes()`) to learn each table's columns, types, nullability, primary keys, and foreign keys. Do not parse the model files as text.

3. **Insert in foreign-key dependency order.** Build a dependency graph from the FK definitions and topologically sort it. **FK cycles exist in real schemas** — when you detect one, insert the row with nullable FKs set to NULL first, then UPDATE them afterwards. If a cycle has no nullable edge, skip that table and report it (see 5.3).

4. **Generate values by column type:**
   - `INTEGER`/`BIGINT` → sequential integers
   - `STRING`/`TEXT` → `'seed-' + tableName + '-' + rowIndex` (never a real-looking name or email)
   - `BOOLEAN` → alternate true/false
   - `DATE`/`DATEONLY` → fixed dates derived from the row index. **Never `new Date()`** — a seed that changes run to run makes CI failures irreproducible.
   - `ENUM` → the first value in the enum's allowed list
   - `JSON`/`JSONB` → `{}`
   - `DECIMAL`/`FLOAT` → a fixed number
   - `UUID` → a deterministic UUID derived from table + index, not random
   - Nullable columns with no obvious value → NULL
   - FK columns → an id that exists in the parent table you already inserted

5. **Default 5 rows per table**, overridable with `--rows N`.

6. **Never invent PII.** No realistic names, emails, phone numbers, addresses, or health values. `seed-user-1` is correct; `<REDACTED-EMAIL>` is not — even fake-looking PII trains people to treat the file as harmless when it is copied somewhere real.

7. **Report what it did**, machine-readably, on one line:
   `SHADOW-SEED {"tables":N,"rows":N,"skipped":[...],"failed":[...]}`
   This exists so CI can assert the seed actually ran rather than silently doing nothing.

### 5.2 `backend/scripts/seed-shadow-db.test.mjs`

Tests that run **without a database**. Export the pure functions and test them:

- The safety check **rejects** a production-looking URL, a URL without `shadow`, and a non-localhost host — and **accepts** a valid shadow URL. This is the most important test in the file.
- Topological sort produces parents before children
- A cycle is detected and handled, not hung on
- Value generation is **deterministic** — same input, same output, twice
- No generated string matches an email pattern or looks like a real name

### 5.3 Wire it into the CI workflow

In `.github/workflows/migration-shadow-check.yml`, the current order is:

```
install deps → pre-migrate-guard --check → migrate → migrate again → import entry point
```

**The seed cannot run before the migrations**, because the tables do not exist yet. The correct order is:

```
install deps → migrate (creates schema) → SEED → migrate again (idempotence, now WITH DATA) → import entry point
```

This is the point of the whole exercise: the **second** migration run now happens against a populated database, so a destructive or data migration has something to destroy.

Add a step after the seed that asserts the `SHADOW-SEED` line appeared and reported a non-zero row count. **A seed that silently seeded nothing would make the whole job green and meaningless** — that failure mode is the entire reason this document exists.

---

## 6. Explicit non-goals — do not do these

- Do not connect to, read from, or snapshot the production database.
- Do not modify `render.yaml`. It changes what runs against production and is not yours.
- Do not modify `pre-migrate-guard.mjs`, the hooks in `scripts/hooks/`, or anything in `.githooks/`.
- Do not add a way to bypass the shadow-URL safety check.
- Do not seed `SequelizeMeta` — the migration runner owns that table.

---

## 7. Acceptance criteria — you are done when ALL of these hold

- [ ] `node backend/scripts/seed-shadow-db.mjs` **exits 1** with a clear error when `DATABASE_URL` is unset, is not localhost, or does not contain `shadow`
- [ ] The test suite passes and covers every case in 5.2
- [ ] Running the seed twice in a row does not crash and does not duplicate primary keys
- [ ] The CI workflow YAML parses (`python -c "import yaml;yaml.safe_load(open('.github/workflows/migration-shadow-check.yml'))"`)
- [ ] The workflow's step order matches 5.3 — seed **between** the two migration runs
- [ ] No generated value contains an `@`, a realistic personal name, or a plausible phone number
- [ ] `grep -rn "REFERENCES users" backend/scripts/seed-shadow-db.mjs` returns **nothing** (lower-case `users` is the stale duplicate table)
- [ ] `bash scripts/scan-secrets.sh --file <each file you created>` reports CLEAN

---

## 8. The hostile review — run this when the build is done

Four seats. **Run the free ones first.** Total expected cost: **well under $0.20**.

Write your review packet to `docs/ai-workflow/AI-HANDOFF/SHADOW-SEED-REVIEW-PACKET.md`. It must contain: what you built, the exact acceptance criteria you met, the criteria you could **not** meet and why, and the specific things you want attacked.

```bash
D=docs/ai-workflow/AI-HANDOFF/SHADOW-SEED-REVIEW-PACKET.md
O=docs/ai-workflow/AI-HANDOFF/panel-shadow-seed
mkdir -p $O
R="Hostile review. Verdict (APPROVE/REVISE/REJECT) plus your single strongest objection stated plainly. Then: what fails SILENTLY — what breaks in a way nobody notices until production is already wrong. Attack the safety check that stops this seeder pointing at production, and attack whether a seeded shadow database actually catches a destructive migration or only appears to."

# FREE seats first — always
node scripts/consult-qwen.mjs --document "$D" --out "$O/QWEN-REVIEW.md" --max-tokens 4000 --remit "$R"
node scripts/consult-glm.mjs  --document "$D" --out "$O/GLM-REVIEW.md"  --max-tokens 30000 --remit "$R"

# PAID seats
SWAN_GROK_MODEL=x-ai/grok-4.6            node scripts/consult-grok.mjs --document "$D" --out "$O/GROK-REVIEW.md"     --remit "$R" --effort high
SWAN_GROK_MODEL=deepseek/deepseek-v4-pro node scripts/consult-grok.mjs --document "$D" --out "$O/DEEPSEEK-REVIEW.md" --remit "$R" --effort high
node scripts/consult-kimi.mjs --document "$D" --out "$O/KIMI-REVIEW.md" --confirm-spend --remit "$R"
```

**Known seat behaviour, so you are not surprised:**
- **GLM will return an EMPTY file if you give it too small a token budget.** It spends its entire allowance on internal reasoning and emits nothing. Use `--max-tokens 30000` and tell it to keep reasoning short. If it comes back empty, that is this bug — re-run it, do not skip it. It produced the single best finding in the last two panels.
- **Kimi requires `--confirm-spend`** and is capped. One review per topic.
- A seat returning REVISE is the normal outcome. Every panel on this work has returned mostly REVISE, and every one found something real.

---

## 9. How to handle the findings — this section is the important one

**Verify every finding before you fix it.** A model's finding is a *hypothesis*, not a fact. On this codebase, reviewers have been confidently wrong — and confidently right about things the author swore were fine. The rule is the same either way: **reproduce it, then fix it.**

For each finding:

1. **Try to reproduce it.** Write the smallest thing that demonstrates the defect.
2. **If it reproduces** — fix it, then prove the fix by re-running the reproduction.
3. **If it does NOT reproduce** — say so plainly in your report, with the command you ran and its output. Do not fix a defect you could not observe, and do not quietly drop a finding you disproved.
4. **If it is a design decision rather than a defect** (e.g. "synthetic data is weaker than a real snapshot" — yes, and that was decided in §3), record it as accepted-and-deferred with the reason. Do not silently ignore it.

### Four traps this codebase has actually fallen into. Do not repeat them.

**A signal that is always true detects nothing.** A previous fix keyed on a condition that was true in *both* states it claimed to distinguish. It passed a syntax check, it read correctly, and it detected nothing. **Before trusting any check you write, run it against real examples of both cases and confirm the results differ.**

**A mutation that changes no outcome proves nothing.** When you break your code on purpose to confirm the tests notice, make sure the break actually changes behaviour. Three separate "mutation tests" on this codebase left the suite green because the mutation was inert — and each time the green result was briefly read as *"the tests are honest."*

**A gate that reports green while inspecting the wrong surface is worse than no gate.** It buys confidence it has not earned. If your seed reports success, prove it actually inserted rows.

**Your instruments lie.** Specifically, on this machine:
- `$?` after a pipe reports the **last** command's status, not the one you care about. Redirect to a file and check `$?` on the next line.
- A too-tight timeout is indistinguishable from a real failure. One test here legitimately takes 61 seconds.
- Python strings turn `\b` into a **backspace character**. When patching a file that contains a regex, write the replacement to a file with a quoted heredoc and splice it — never patch a regex through a language whose escape rules differ from the target's.

---

## 10. Deliverable

One PR against `main` containing:

1. `backend/scripts/seed-shadow-db.mjs`
2. `backend/scripts/seed-shadow-db.test.mjs`
3. The updated `.github/workflows/migration-shadow-check.yml`
4. `docs/ai-workflow/AI-HANDOFF/SHADOW-SEED-REVIEW-PACKET.md` and the `panel-shadow-seed/` reviews

**The PR body must state:**
- What you built and what it now catches that the empty-database version did not
- Each panel finding: **reproduced / not reproduced / accepted-and-deferred**, and what you did about it
- **What you could not verify**, stated plainly rather than glossed. You cannot run a real deploy, and you cannot test against production data. Say so.

**Do not merge it.** Sean merges.

---

## 11. If you get stuck

Stop and write down what you tried and what happened. A partial PR with an honest "I could not get the topological sort to handle this cycle, here is the failing case" is far more useful than a complete-looking one that seeds nothing.

The single worst outcome is a seed that runs, reports success, inserts nothing, and turns the CI job green forever. **Everything in §9 exists to prevent exactly that.**


---

===================== FILE: backend/scripts/seed-shadow-db.mjs — DELIVERABLE 1 — the seeder =====================

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
 *     (localhost / 127.0.0.1), and the URL contains the word "shadow".
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
 *   DATABASE_URL=<REDACTED-DB-URL> \
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
    return { ok: false, reason: `DATABASE_URL is not a parseable URL: ${url}` };
  }
  const host = parsed.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return { ok: false, reason: `host "${host}" is not loopback (must be localhost or 127.0.0.1) — refusing` };
  }
  if (!/shadow/i.test(url)) {
    return { ok: false, reason: 'URL does not contain "shadow" — refusing to seed a non-shadow database' };
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
 * @param {Record<string, any[]>} [opts.parentIds]  lowerTableName -> inserted parent ids
 * @returns {Record<string, any>}
 */
export function generateRowValues(opts) {
  const { tableName, rowIndex, attrs, parentIds = {} } = opts;
  const out = {};
  const lower = tableName.toLowerCase();

  for (const [col, a] of Object.entries(attrs)) {
    const type = String(a.type || '').toUpperCase();

    // --- Foreign keys: point at a deterministic parent row, else NULL ---
    if (a.foreignKeyTarget) {
      const tLower = a.foreignKeyTarget.table.toLowerCase();
      const parents = parentIds[tLower];
      if (parents && parents.length > 0) {
        out[col] = parents[rowIndex % parents.length];
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
    if (/^ENUM/.test(type.trim()) || (Array.isArray(a.enum) && a.enum.length > 0)) {
      out[col] = Array.isArray(a.enum) && a.enum.length > 0 ? a.enum[0] : null;
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
      enum: Array.isArray(a.values) ? a.values : undefined,
      foreignKeyTarget: null,
    };
    if (a.references) {
      const assocs = model.associations || {};
      const found = Object.values(assocs).find((x) => x.foreignKey === col);
      if (found && found.target) {
        const raw = found.target.getTableName
          ? found.target.getTableName()
          : found.target.tableName || found.target.name;
        const tName = String(raw).replace(/"/g, '');
        const tAttrs = found.target.rawAttributes || (typeof found.target.getAttributes === 'function' && found.target.getAttributes()) || {};
        const pk = Object.keys(tAttrs).find((k) => tAttrs[k].primaryKey) || found.targetKey || 'id';
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
  const meta = new Map();
  const deps = new Map();
  for (const [nm, m] of registry) {
    const attrs = normalizeModel(m);
    meta.set(nm, attrs);
    const parents = new Set();
    for (const a of Object.values(m.associations || {})) {
      // Self-FKs (target === own model) ARE kept: the cycle machinery then
      // decides (nullable edge -> insert NULL + backfill row 0; otherwise
      // skip + report). Dropping them here would hide real self-cycles.
      if (a.target && a.target.name && registry.has(a.target.name)) {
        parents.add(a.target.name);
      }
    }
    deps.set(nm, parents);
  }
  const allNames = [...registry.keys()].sort();
  const { order, cycle } = topoSort(deps, allNames);
  const cycleSet = new Set(cycle);
  if (cycle.length > 0) {
    console.error(`SHADOW-SEED note: FK cycle detected, will break via nullable edges: ${cycle.join(', ')}`);
  }

  // lowercase-table-name -> model-name, used for cycle + backfill lookups.
  const tableNameToModel = new Map();
  for (const [nm, m] of registry) tableNameToModel.set(plainTable(m).toLowerCase(), nm);

  // 4) Seed, parents first.
  const skipped = [];
  const failed = [];
  const insertedIds = new Map();
  const backfill = []; // { table, col, targetLower, targetName } — cyclic FKs set to NULL
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
    const pkCol = Object.keys(attrs).find((c) => attrs[c].pk);
    const values = [];
    for (let i = 0; i < rowsPerTable; i++) {
      const v = generateRowValues({ tableName: tableName.toLowerCase(), rowIndex: i, attrs, parentIds: Object.fromEntries(insertedIds) });
      // Cycle-break bookkeeping: an FK whose parent isn't seeded yet -> NULL now, backfill later.
      for (const c of fkColsOf(nm)) {
        const tLower = attrs[c].foreignKeyTarget.table.toLowerCase();
        if (v[c] === null && !insertedIds.has(tLower)) {
          if (attrs[c].allowNull) backfill.push({ table: plainTable(m), col: c, targetLower: tLower, targetName: nm, row: i });
        }
      }
      values.push(v);
    }

    try {
      let inserted;
      if (pkCol) {
        try {
          inserted = await m.bulkCreate(values, { updateOnDuplicate: [pkCol], individualHooks: false });
        } catch (conflictErr) {
          // Some dialects/tables reject the conflict target; fall back to a
          // plain insert and let a PK clash surface as a per-table report.
          inserted = await m.bulkCreate(values, { individualHooks: false });
        }
      } else {
        inserted = await m.bulkCreate(values, { individualHooks: false });
      }
      // Remember deterministic primary-key values (from our input, not the DB).
      const ids = pkCol ? values.map((v) => v[pkCol]).filter((x) => x != null) : [];
      insertedIds.set(tableName.toLowerCase(), ids);
      seededNames.add(nm);
      console.log(`SHADOW-SEED OK ${tableName} rows=${inserted.length}`);
    } catch (e) {
      failed.push({ table: nm, error: String(e.message || e).slice(0, 200) });
      console.error(`SHADOW-SEED FAIL ${tableName}: ${e.message}`);
    }
  }

  // 4b) Backfill cyclic FKs that were set NULL (nullable edge) — point them
  //     at the parent's row 0 (the id we generated deterministically).
  let backfilled = 0;
  for (const bf of backfill) {
    const tModel = [...registry.values()].find((t2) => plainTable(t2).toLowerCase() === bf.targetLower);
    if (!tModel) continue;
    const tAttrs = meta.get(tModel.name);
    const tPk = Object.keys(tAttrs).find((c) => tAttrs[c].pk);
    if (!tPk) continue;
    const targetId = insertedIds.get(bf.targetLower)?.[0];
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
  if (backfill.length > 0) console.log(`SHADOW-SEED cycle-backfill rows=${backfilled} of ${backfill.length}`);

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


---

===================== FILE: backend/scripts/seed-shadow-db.test.mjs — DELIVERABLE 2 — vitest suite (DB-free) =====================

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
    const r = validateShadowUrl('<REDACTED-DB-URL>');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not loopback/i);
  });

  it('REJECTS a loopback URL that does NOT contain the word shadow', () => {
    const r = validateShadowUrl('<REDACTED-DB-URL>');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/shadow/i);
  });

  it('REJECTS a URL that contains "shadow" but a non-loopback host', () => {
    // Having the word is NOT a pass — the host must be loopback too.
    const r = validateShadowUrl('<REDACTED-DB-URL>');
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
    const r = validateShadowUrl('<REDACTED-DB-URL>');
    expect(r.ok).toBe(true);
    expect(r.host).toBe('localhost');
  });

  it('ACCEPTS a valid 127.0.0.1 shadow URL', () => {
    const r = validateShadowUrl('<REDACTED-DB-URL>');
    expect(r.ok).toBe(true);
    expect(r.host).toBe('127.0.0.1');
  });

  it('is case-insensitive on the "shadow" token but still requires loopback', () => {
    expect(validateShadowUrl('<REDACTED-DB-URL>').ok).toBe(true);
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

  it('generateRowValues is deterministic (same input, same output, twice)', () => {
    const parentIds = { users: [1, 2, 3] };
    const a = generateRowValues({ tableName: 'Posts', rowIndex: 2, attrs: fakeAttrs, parentIds });
    const b = generateRowValues({ tableName: 'Posts', rowIndex: 2, attrs: fakeAttrs, parentIds });
    expect(a).toEqual(b);
  });

  it('timestamps are derived from the fixed epoch, not the clock', () => {
    const v = generateRowValues({ tableName: 'Posts', rowIndex: 1, attrs: fakeAttrs, parentIds: { users: [1] } });
    expect(v.createdAt).toBe(new Date(SEED_EPOCH_MS + 1 * 3600_000).toISOString());
  });
});

describe('value generation correctness (per type)', () => {
  it('uses the first enum value', () => {
    const v = generateRowValues({ tableName: 'T', rowIndex: 0, attrs: fakeAttrs, parentIds: { users: [1] } });
    expect(v.status).toBe('draft');
  });

  it('alternates booleans by row index', () => {
    const even = generateRowValues({ tableName: 'T', rowIndex: 0, attrs: fakeAttrs, parentIds: { users: [1] } });
    const odd  = generateRowValues({ tableName: 'T', rowIndex: 1, attrs: fakeAttrs, parentIds: { users: [1] } });
    expect(even.isActive).toBe(true);
    expect(odd.isActive).toBe(false);
  });

  it('emits sequential integers for INTEGER columns', () => {
    const v0 = generateRowValues({ tableName: 'T', rowIndex: 0, attrs: fakeAttrs, parentIds: { users: [1] } });
    const v2 = generateRowValues({ tableName: 'T', rowIndex: 2, attrs: fakeAttrs, parentIds: { users: [1] } });
    expect(v0.qty).toBe(1);
    expect(v2.qty).toBe(3);
  });

  it('points foreign keys at an existing parent id', () => {
    const v = generateRowValues({ tableName: 'Posts', rowIndex: 4, attrs: fakeAttrs, parentIds: { users: [10, 11, 12] } });
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


---

===================== FILE: backend/scripts/seed-shadow-db.selftest.mjs — DELIVERABLE 3 — dependency-free self-test =====================

#!/usr/bin/env node
// Temporary dependency-free self-test for the shadow seeder's DB-free core.
// Runs under plain Node (no vitest/rollup -> no native binary needed), so the
// safety-gate + determinism + report contracts can be verified locally even
// where vitest cannot boot. NOT a deliverable; the vitest file is the CI test.
import * as m from './seed-shadow-db.mjs';

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; } else { fail++; console.error('  FAIL', msg); } };
const section = (t) => console.log('\n== ' + t + ' ==');

section('validateShadowUrl — the non-negotiable gate');
const VS = m.validateShadowUrl;
ok(VS('<REDACTED-DB-URL>').ok === true, 'loopback+shadow accepted');
ok(VS('<REDACTED-DB-URL>').ok === true, '127.0.0.1 + shadow accepted');
ok(VS('<REDACTED-DB-URL>').ok === false, 'loopback WITHOUT "shadow" REFUSED (key gate)');
ok(VS('<REDACTED-DB-URL>').ok === false, 'NON-loopback prod REFUSED even with word shadow');
ok(VS('<REDACTED-DB-URL>').ok === false, 'non-loopback refused');
ok((VS(undefined) || {}).ok === false, 'undefined refused');
ok((VS('') || {}).ok === false, 'empty refused');
ok((VS('not a url') || {}).ok === false, 'garbage refused');

section('topoSort — parents before children, cycle-tolerant, never hangs');
{
  const d = new Map([['c', new Set(['b'])], ['b', new Set(['a'])], ['a', new Set()]]);
  const r = m.topoSort(d, ['c', 'b', 'a']);
  ok(r.order.indexOf('a') < r.order.indexOf('b') && r.order.indexOf('b') < r.order.indexOf('c') && r.cycle.length === 0, 'chain a<b<c, no cycle');
}
{
  const d = new Map([['x', new Set(['y'])], ['y', new Set(['x'])], ['z', new Set()]]);
  const r = m.topoSort(d, ['x', 'y', 'z']);
  ok(r.cycle.length === 2 && r.order.length === 3, '2-cycle flagged, nothing dropped');
}
{
  const d = new Map([['s', new Set(['s'])]]);
  const r = m.topoSort(d, ['s']);
  ok(r.cycle.length === 1 && r.cycle[0] === 's', 'self-cycle caught (no infinite loop)');
}
{
  const d = new Map([['a', new Set(['ghost'])]]);
  const r = m.topoSort(d, ['a']);
  ok(r.order[0] === 'a' && r.cycle.length === 0, 'unknown parent filtered, no hang');
}

section('deterministicUuid — same input/same out, shape-stable, parent-distinct');
const u = m.deterministicUuid;
ok(u('users.id.0') === u('users.id.0'), 'deterministic');
ok(u('users.id.0') !== u('users.id.1'), 'row-sensitive');
ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(u('x')), 'uuidv4-ish shape');
const p0 = u('p0'), p1 = u('p1');
ok(p0 !== p1, 'distinct parents give distinct ids (FK target integrity)');

section('serializeReport — CI-assertable, silent no-op must be visible');
{
  const line = m.serializeReport({ tables: 3, rows: 12, skipped: [{ table: 'A', reason: 'cycle' }], failed: [] });
  ok(line.startsWith('SHADOW-SEED '), 'prefix present: ' + line);
  const p = JSON.parse(line.slice('SHADOW-SEED '.length));
  ok(p.rows === 12 && p.tables === 3, 'rows/tables decode');
  ok(p.skipped[0].includes('cycle'), 'skipped reason survives');
}
{
  const p = JSON.parse(m.serializeReport({ rows: 0, failed: ['Boom: bad col'] }).slice('SHADOW-SEED '.length));
  ok(p.rows === 0, 'STILL rows:0 -> a silent no-op is NOT green');
  ok(p.failed[0].includes('bad col'), 'failed reason survives');
}

section('generateRowValues — PK/FK/enum/unique/email-guard/determinism');
{
  const attrs = {
    id: { type: 'UUID', pk: true, allowNull: false, unique: false },
    email: { type: 'STRING', pk: false, allowNull: false, unique: true },
    status: { type: 'ENUM', allowNull: false, enum: ['active', 'paused'] },
    flag: { type: 'BOOLEAN', allowNull: false },
    notes: { type: 'STRING', allowNull: true },
    ownerId: { type: 'STRING', pk: false, allowNull: false, foreignKeyTarget: { table: 'Users', pk: 'id' } },
  };
  const a0 = m.generateRowValues({ tableName: 'members', rowIndex: 0, attrs, parentIds: { users: [p0, p1] } });
  const a1 = m.generateRowValues({ tableName: 'members', rowIndex: 1, attrs, parentIds: { users: [p0, p1] } });
  ok(typeof a0.id === 'string' && a0.id.length === 36, 'UUID pk emitted');
  ok(a0.ownerId === p0 && a1.ownerId === p1, 'FK cycles across parent rows (0->p0, 1->p1)');
  ok(a0.status === 'active', 'enum -> first allowed value');
  ok(a0.email !== a1.email, 'unique col distinct per row (no collision)');
  ok(m.generateRowValues({ tableName: 'members', rowIndex: 0, attrs })[Object.keys(attrs)[0]] === a0.id, 'deterministic across two invocations');
  let threw = false;
  try {
    m.generateRowValues({ tableName: 't', rowIndex: 0, attrs: { e: { type: 'STRING', enum: ['<REDACTED-EMAIL>', 'x'] } } });
  } catch (e) { threw = /email/i.test(String(e.message)); }
  ok(threw, 'email-looking value is REFUSED (PII guard)');
}

section('value-type mirror (bool/int/json/date) + name guard');
{
  const attrs = {
    id: { type: 'UUID', pk: true, allowNull: false, unique: false },
    b: { type: 'BOOLEAN', pk: false, allowNull: false, unique: false },
    n: { type: 'INTEGER', pk: false, allowNull: false, unique: false },
    j: { type: 'JSONB', pk: false, allowNull: true, unique: false },
    d: { type: 'DATE', pk: false, allowNull: false, unique: false },
  };
  const v0 = m.generateRowValues({ tableName: 't', rowIndex: 0, attrs, parentIds: {} });
  const v1 = m.generateRowValues({ tableName: 't', rowIndex: 1, attrs, parentIds: {} });
  ok(v0.b === true && v1.b === false, 'booleans alternate by row');
  ok(v0.n === 1 && v1.n === 2, 'integers sequential');
  ok(typeof v0.j === 'object' && v0.j.seed === true, 'JSON object emitted');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(v0.d), 'DATEONLY is a fixed date: ' + v0.d);
  const nameLike = Object.values(v0).some((v) =>
    typeof v === 'string' && v.split(/\s+/).length >= 2 &&
    v.split(/\s+/).every((w) => /^[A-Z][a-z]+$/.test(w)));
  ok(!nameLike, 'no value looks like a personal name');
}

console.log('\n' + (pass + fail) + ' checks: ' + pass + ' passed, ' + fail + ' failed');
if (fail === 0) console.log('SELF-TEST: all local (DB-free) contracts PASS');
process.exit(fail === 0 ? 0 : 1);


---

===================== FILE: backend/vitest.config.mjs — DELIVERABLE 4 — vitest config (suite wiring) =====================

/**
 * Vitest Configuration for Backend API Tests
 * Phase 3: Operations-Ready Test Suite
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Node environment for backend testing
    environment: 'node',

    // Global test functions (describe, it, expect)
    globals: true,

    // Test file patterns
    include: ['__tests__/**/*.test.{js,mjs}', 'tests/**/*.test.{js,mjs}', 'scripts/**/seed-shadow-db.test.mjs'],
    exclude: ['node_modules', 'dist', 'tests/integration/**'],

    // Setup file for test environment
    setupFiles: ['./tests/setup.mjs'],

    // Timeout for async operations
    testTimeout: 30000,
    hookTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['routes/**/*.mjs', 'middleware/**/*.mjs', 'services/**/*.mjs'],
      exclude: ['node_modules', 'tests', '__tests__', 'scripts']
    },

    // Retry failed tests once
    retry: 1,

    // Reporter for CI
    reporters: ['default'],
  },
});


---

===================== FILE: .github/workflows/migration-shadow-check.yml — DELIVERABLE 5 — CI workflow =====================

name: Migration Shadow Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  migration-shadow-check:
    runs-on: ubuntu-latest
    name: Migrations Against Populated Shadow Database

    # Throwaway Postgres ONLY. The user/password/database are all the literal
    # word "shadow" so the URL the seeder requires is impossible to confuse
    # with anything else. The seeder's own safety gate (seed-shadow-db.mjs)
    # independently refuses any host that is not loopback or any URL that
    # lacks the word "shadow" — no override exists for that gate.
    services:
      shadow-postgres:
        image: postgres:16
        env:
          POSTGRES_USER: shadow
          POSTGRES_PASSWORD: "***"
          POSTGRES_DB: shadow
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U shadow -d shadow"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - name: Install backend dependencies
        working-directory: backend
        run: npm ci

      # Point every database access in this job at the throwaway container.
      # This is what makes the seeder's shadow gate pass by design, and the
      # reason this job can reach no other database.
      - name: Export shadow database URL
        shell: bash
        run: |
          echo "DATABASE_URL=<REDACTED-DB-URL>" >> "$GITHUB_ENV"

      - name: Pre-migrate guard
        working-directory: backend
        run: node scripts/pre-migrate-guard.mjs --check

      # MIGRATION RUN 1 — against the EMPTY database.
      # Catches: a migration that fails to run at all.
      - name: Migrate (first run — empty database)
        working-directory: backend
        run: npm run migrate

      # SEED — the point of this job. After this step, the migration run
      # below executes against real row data. A destructive or data migration
      # (removeColumn, dropTable, changeColumn, UPDATE/DELETE rewrites) that
      # went green on an empty table now has something to break against.
      # Two independent no-op guards, per the handoff brief:
      #   1. the seeder exits non-zero when its DB-counted row total is 0;
      #   2. the next step asserts the SHADOW-SEED line and rows > 0.
      - name: Seed synthetic rows (shadow-only by internal gate)
        working-directory: backend
        run: node scripts/seed-shadow-db.mjs --rows 5 > seed-shadow.log

      - name: Assert seed actually inserted rows (SHADOW-SEED rows > 0)
        shell: bash
        working-directory: backend
        run: |
          if [ ! -f seed-shadow.log ]; then
            echo "FATAL: seed-shadow.log is missing — the seed step did not run"
            exit 1
          fi
          line=$(grep '^SHADOW-SEED ' seed-shadow.log | tail -1)
          if [ -z "$line" ]; then
            echo "FATAL: no SHADOW-SEED report line found — silent no-op seed"
            exit 1
          fi
          echo "Report line: $line"
          rows=$(printf '%s' "$line" | grep -o '"rows":[0-9]*' | head -1 | cut -d: -f2)
          if ! [[ "$rows" =~ ^[0-9]+$ ]] || [ "$rows" -eq 0 ]; then
            echo "FATAL: seed reported ${rows:-<none>} rows — the seed is a no-op"
            exit 1
          fi
          echo "OK: seed inserted $rows rows across the shadow database"

      # MIGRATION RUN 2 — against the POPULATED database (idempotence check,
      # now carrying real rows). This is the check the empty-database version
      # of this job could never provide.
      - name: Migrate (second run — idempotence, WITH DATA)
        working-directory: backend
        run: npm run migrate

      - name: Import entry point (boot check against populated schema)
        working-directory: backend
        run: node --input-type=module -e "import('./server.mjs').then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); })"

      - name: Upload seed report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: shadow-seed-log
          path: backend/seed-shadow.log
          retention-days: 30


---
