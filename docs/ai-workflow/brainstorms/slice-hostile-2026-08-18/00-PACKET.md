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
