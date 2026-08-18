# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/slice-hostile-2026-08-18/00-PACKET-FULL.md
**Tokens:** 6135 in / 22736 out (reasoning: 19327) | total 28871
**Wall:** 355.6s

---

# Hostile Review — Round H1

## Tool 1: `backend/scripts/schema-drift-check.mjs`

### 1.1 — FALSE POSITIVE, HIGH — `DataTypes.VIRTUAL` attributes are reported as CRITICAL MISSING_COLUMN
**File:** `schema-drift-check.mjs`, the `for (const [attr, def] of Object.entries(model.rawAttributes))` loop.
**Shape:** `User.init({ passwordConfirm: { type: DataTypes.VIRTUAL } }, ...)` — the canonical Sequelize docs example, plus any computed field. `rawAttributes` includes VIRTUAL attributes; Sequelize never persists them; the DB correctly lacks the column; the script emits `MISSING_COLUMN` at **CRITICAL** → exit 1, blocking, on a healthy model.
**Fix:** one line at the top of the loop: `if (def.type?.key === 'VIRTUAL') continue;`

### 1.2 — FALSE POSITIVE, HIGH — models in any non-public schema report MISSING_TABLE
**File:** `liveColumns()` / `foreignKeys()` — both hardcode `table_schema = 'public'`; the lookup uses only the tableName.
**Shape:** `sequelize.define('Event', {...}, { tableName: 'events', schema: 'analytics' })`. `getTableName()` returns `{ schema: 'analytics', tableName: 'events' }`; the code discards `.schema`, finds nothing in the public-only map, and declares CRITICAL MISSING_TABLE for a table that exists.
**Fix:** read `tableRaw?.schema`; when present and ≠ 'public', either include that schema in the `WHERE table_schema = ANY(...)` list (collect all model schemas first) or skip the model with an informational finding — not a CRITICAL.

### 1.3 — FALSE POSITIVE, MEDIUM — `USER-DEFINED` DB type buckets every Postgres extension/domain type as ENUM
**File:** `typeFamily()`.
**Shape:** model `DataTypes.CITEXT` (explicitly listed → 'TEXT') against a live citext column, which information_schema reports as `data_type = 'USER-DEFINED'` → 'ENUM'. Result: `TYPE_DRIFT: model says TEXT, database says ENUM` for a correct mapping — the exact DATEONLY/BLOB false-positive class you already fixed once, reborn. Same collision for HSTORE, GEOMETRY, RANGE types, and any domain-typed column.
**Fix:** select `udt_name` alongside `data_type`; classify `USER-DEFINED` as ENUM only when the type is actually an enum (`typtype='e'` via pg_type, or check pg_enum), otherwise return 'UNKNOWN' so the existing skip logic suppresses it.

### 1.4 — OPERATIONAL HAZARD, MEDIUM — `--model` typo exits 0 "CLEAN"
**File:** `main()`, `onlyModel` filter.
**Shape:** `node schema-drift-check.mjs --model Users` (model key is `User`). Zero models match, `modelsChecked = 0`, the script prints "CLEAN — no drift detected" and exits 0. An operator gets false assurance from a check that checked nothing.
**Fix:** `if (onlyModel && modelsChecked === 0) { console.error(...); process.exit(2); }`

### 1.5 — FALSE POSITIVE, MEDIUM — FK join on `constraint_name` alone can cross-join same-named constraints
**File:** `foreignKeys()` — joins `tc`→`kcu`→`ccu` on `(constraint_name, table_schema)` only.
**Shape:** Postgres constraint names are unique per *table*, not per schema. Two FKs both named `fk_user` on `posts` and `comments`, or an FK whose name collides with any PK/UNIQUE/CHECK name in public (ccu is joined regardless of constraint type), produces a cartesian product — including phantom rows pairing your column with `target_table = 'users'` → false CRITICAL `FK_TARGET_DRIFT`.
**Fix:** drop information_schema for this query; use `pg_constraint`:
`SELECT conrelid::regclass AS table_name, ... FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid JOIN pg_class f ON f.oid=con.confrelid WHERE contype='f'` — unambiguous, and `confrelid::regclass::text` preserves the `"Users"` casing directly.

### 1.6 — FALSE NEGATIVE, MEDIUM — model-side FK targets are never validated
The check inspects only live constraints. A model declaring `userId: { references: { model: 'users' } }` (wrong casing) while the DB constraint is correct passes silently — yet that model generates broken joins/SQL. Same drift class, opposite direction. **Fix:** also walk `def.references?.model` per attribute and compare casing against the canonical target.

### 1.7 — FALSE NEGATIVE, MEDIUM — ENUM member drift undetected
`ENUM('a','b','c')` in the model vs a live enum with only `a,b` passes. That is an insert-time crash (`invalid input value for enum`) — the same "only surfaces in production" family as MISSING_COLUMN. **Fix:** compare `def.type.values` against `pg_enum` labels for ENUM-family columns.

### 1.8 — Minor
- `ARRAY(integer[])` vs `text[]` both collapse to 'ARRAY' — element-type drift missed (one line, fold into 1.3's fix via `udt_name`).
- Quoted schema-qualified `tableName: '"Analytics"."events"'` mangles through the `^"(.*)"$` strip → MISSING_TABLE. Extend the strip to split on the final `.`.
- Header says DB-extra columns are "informational only" — the code never emits them at all. Doc drift.

### 1.9 — Operational safety: **SOUND**
Both queries are read-only catalog SELECTs: no user-table locks, AccessShare at worst, milliseconds even on a large prod catalog. The only hazard vector is the import chain: safety is contingent on `../database.mjs` having no import-time side effects (`sync()`, migration-on-boot). If that ever changes, this script inherits it silently — worth one guard comment in database.mjs. The script itself is safe; add `SET statement_timeout = 5000` after authenticate as cheap hygiene.

---

## Tool 2: `scripts/hooks/frontend-guards.mjs` (G5/G6)

### 2.1 — FALSE NEGATIVE, HIGH — imported primitives defeat G5 entirely
**File:** `PRIMITIVES` construction — `(?:const|let|var)\s+name\s*=\s*(?:keyframes|css|styled[.(])` only sees same-file definitions.
**Shape:** after the AdminOverviewPanel incident, the obvious refactor is extracting `bentoItemAnimation` to `styles/animations.ts` (`export const pulse = keyframes\`...\``) and `import { pulse } from './styles/animations'`. Now `export const frag = \`animation: ${pulse} ease\`` — the exact error-#12 shape — has an empty PRIMITIVES set and sails through. The guard goes blind precisely at the point the team starts sharing animations, which is the first thing everyone does after an incident like this. As the blocking guard for an outage-class bug, this is the worst finding in the packet.
**Fix (cheapest that keeps zero false positives):** after building local PRIMITIVES, parse import specifiers (`import {...} from '...'`, resolve `.ts/.tsx/.js/.jsx/index` one hop), read the target file, run the same primitive-regex over it, and union the *imported names* into PRIMITIVES. If a specifier can't be resolved to a file, emit a non-blocking WARN, never a FAIL — that preserves the narrowed zero-FP contract while closing the hole for the standard case.

### 2.2 — FALSE POSITIVE, MEDIUM — the primitive regex matches `css`/`keyframes` as *prefixes*
**File:** same PRIMITIVES regex — no word boundary after the alternation.
**Shape:** `const gap = cssValue(16)` → `css` matches the prefix of `cssValue` → `gap ∈ PRIMITIVES` → `export const track = \`gap: ${gap}\`` fails G5. Same for `keyframesShim`, `styledHelpers` as RHS values.
**Fix:** `(?:keyframes|css)\b|styled[.(]` — `\b` after `css` still matches `css\`` (word→backtick is a boundary).

### 2.3 — FALSE NEGATIVE, MEDIUM — exported plain templates *named* after a tag word are never scanned
**File:** `SHARED_FRAGMENT` — `=\s*(css|styled[.(]|keyframes|createGlobalStyle)?\s*\``.
**Shape:** `export const cssText = \`...${fadeIn}...\``. The tag group tries `css`, then requires `\s*\`` but finds `T`, the optional group backtracks to empty, the backtick test fails at `c` — **no match at all**. The fragment escapes G5 completely. 
**Fix:** require the tag to be immediately followed by a backtick: `(?:(?:css|keyframes|createGlobalStyle)\s*\`|styled[.(])`. Then `cssText` correctly falls into the plain-template branch.

### 2.4 — FALSE NEGATIVE, MEDIUM — `export default` templates unchecked
**Shape:** `export default \`animation: ${fadeIn} 1s\`` — module-level, exported, baked primitive, never matched by `^\s*export\s+const`. **Fix:** add an `export\s+default\s*` alternative to SHARED_FRAGMENT.

### 2.5 — FALSE NEGATIVE, LOW — the brace scanner breaks on `}` inside a string in an interpolation
**Shape:** `` export const frag = `${map['}']}` `` — the scanner treats the quoted `}` as a close, desynchronizes, and can terminate the file scan early, hiding later fragments. **Fix:** when `depth > 0`, skip over `'…'`/`"…"` spans. Related one-liner: `export const A = 1, B = \`…\`` — `B` is unscanned (multi-declarator).

### 2.6 — G6: **SOUND** as shipped
Line counting, per-file reporting, vendored exclusion, and the 3-line opt-out are all correct for an advisory. Only nit: `VENDORED` requires `/` separators — unnormalized Windows paths would leak reference-pack files into the warning list.

---

## Tool 3: `scripts/hooks/token-registry-check.mjs`

### 3.1 — REGEX FAILURE + FALSE NEGATIVE, HIGH — nested `var()` fallbacks are parsed wrong
**File:** `USE_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g`.
**Shape:** `var(--a, var(--b, #fff))`. The match consumes `var(--a, var(--b, #fff)` — `[^)]*` stops at the *first* `)` — so the fallback is captured as the malformed string `var(--b, #fff`, the outer match is otherwise fine, but **`--b` is never examined**. If `--b` is undefined or its fallback drifted, that's invisible. Every chained-fallback site (the standard theme-tiering pattern) is un-scanned.
**Fix:** change the fallback group to one-level nesting: `((?:[^()]|\([^()]*\))*)`, then recursively `matchAll(USE_RE)` over the captured fallback for inner tokens. Non-hex fallbacks like `rgba(…)` also stop parsing early today; this fixes them incidentally.

### 3.2 — FALSE POSITIVE, HIGH — tokens defined/set from JS never enter the registry
**File:** registry built solely from `DEFINE_RE`.
**Shapes:** (a) `el.style.setProperty('--panel-accent', color)`; (b) `<ThemeProvider theme={{ '--brand-accent': '#0af' }}>` / `const tokens = { '--x': '1px' }` — the preceding char is `'`/`{`... the object key `'--x':` is preceded by an apostrophe, which `(^|[;{\s])` rejects; (c) inline `style="--x: 1"` — preceded by `"`. All produce a defined token that `var(--x)` uses will report as *never defined*. This almost certainly inflates the 603/1,738 headline number.
**Fix:** add two registry patterns (existence only, no value comparison): `setProperty\(\s*['"](--[\w-]+)['"]` and `['"](--[\w-]+)['"]\s*:` in JS files.

### 3.3 — NONDETERMINISM, MEDIUM — first-definition-wins + `readdirSync` order = machine-dependent findings
**File:** registry fill (`if (!registry.has(name))`) over `walk()`, which uses unsorted `readdirSync`.
**Shape:** `--brand: #000` in `theme.css`, overridden `--brand: #fff` in a dark-mode file. Which value the registry holds depends on directory enumeration order — unsorted on Linux. A fallback matching the dark override is "drift" on one machine and clean on CI. 
**Fix:** store all definitions per token; compare fallbacks only for tokens with exactly one definition (minimal), or prefer the `:root`-scoped definition.

### 3.4 — FALSE POSITIVE/NEGATIVE, LOW-MED — definitions inside comments register phantom tokens
**Shape:** `/* --x: red; */` after a rename → `var(--x, red)` stays "defined" forever (suppressed unknown detection) or drift-reports against a dead value. **Fix:** strip `/* … */` (and `// …` in TS) before the DEFINE pass.

### 3.5 — OPERATIONAL, LOW — `--file` with a typo'd path silently checks nothing
`fileArgs.filter((f) => existsSync(f))` drops bad paths; the run exits 0 clean on zero targets. **Fix:** exit 2 if any `--file` arg doesn't exist.

### 3.6 — SOUND parts, stated explicitly
`normalizeColor` (3→6 hex expansion, lowercase) is correct; building the registry globally even under `--file` is correct; grouping unknowns by token name is the right UX; the vendored exclusion works. Regex limits that are *inherent*, not defects: case-insensitive `VAR(`, dynamic `var(--${name})`.

---

## Advisory-vs-blocking calls

- **G6 advisory: right call.** 31 pre-existing offenders + a hard gate = a hook somebody deletes. 
- **Token-check advisory-by-default: right call, but incomplete.** `--strict --file <changed files>` *already* gives you a delta gate — global registry, findings only in changed files — and no one has wired it into CI/pre-push. Until that invocation exists somewhere, the 603-token advisory prints on every run and trains people to not read the output, which is the same failure mode as a disabled gate. One line in the hook config fixes it; no code change needed.
- **G5 blocking: correct in principle (mount-crash class), wrong in practice** until 2.1 is fixed — a green G5 currently proves nothing about imported primitives.

---

**VERDICT: NOT DRY.** Tool 1's database interaction is operationally sound, but all three guards ship at least one blocking-grade false positive (1.1, 2.2) or a core-purpose false negative (1.6, 2.1, 3.1) — and G5's is the one that can take down a page in production.
