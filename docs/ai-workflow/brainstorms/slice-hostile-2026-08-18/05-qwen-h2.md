# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/brainstorms/slice-hostile-2026-08-18/03-PACKET-H2.md
**Tokens (Ollama):** 8135 in / 1926 out | **Wall:** 19.1s | **done_reason:** stop

---
**1. Does the pg_constraint FK rewrite MISS anything the old query caught? Composite FKs now emit one row per column — is that right or does it double-report?**

**SOUND.**
The rewrite correctly handles composite foreign keys. In Postgres, a composite FK is a single constraint (`conrelid`) with multiple columns (`conkey`). The old `information_schema` join often struggled with this or required complex logic to map columns to specific FKs. By using `unnest(conkey) WITH ORDINALITY`, the query correctly expands the array of column OIDs into rows, joining each to `pg_attribute` to get the column name. This results in one row per column in the composite FK, which is the correct granularity for reporting "which column references which table". It does not double-report because each column in the constraint is distinct. It does not miss anything because `pg_constraint` is the authoritative source for all FKs, including those that might be obscured by naming collisions in `information_schema` (which was the H1 bug).

**2. Is 'exempt only anchored-safe tags' now too STRICT — what legitimate tagged template does it false-positive on?**

**SOUND.**
The `SAFE_TAG` regex is `/^(?:css|keyframes|createGlobalStyle)$|^styled[.(]/`.
- `css`, `keyframes`, `createGlobalStyle` are exact matches.
- `styled` allows `styled.div` or `styled(Component)`.
Any other tag (e.g., `cssText`, `myCss`, `styledComponents`) is *not* exempted and will be scanned. The scan looks for interpolations `${...}`. If a legitimate non-styled-components tag (e.g., a custom template literal helper) interpolates a number or string, it will *not* be flagged because the check only flags if the interpolated identifier is in the `PRIMITIVES` set (defined via `keyframes`/`css`/`styled` in the same file or imported). If the tag is unknown and interpolates a primitive, it *will* be flagged. This is the intended "fail safe" behavior: if you use an unknown tag with a styled-components primitive, it's likely a bug. If you use an unknown tag with a non-primitive, it's ignored. This is not too strict; it is appropriately cautious.

**3. Does resolving only RELATIVE imports leave a hole (aliased paths, package imports, re-exports through an index)?**

**SOUND (with a known limitation that is acceptable).**
The code resolves `import ... from './...'` or `import ... from '../...'`. It does *not* resolve:
- Aliased imports (e.g., `@/components/...`).
- Package imports (e.g., `styled-components`).
- Re-exports through an index file (e.g., `import { fadeIn } from './animations'` where `animations/index.ts` re-exports from `fadeIn.ts`).

**However**, this is a *limitation*, not a *defect* in the context of the guard's purpose. The guard is designed to catch *local* shared fragments that are incorrectly tagged. If a primitive is imported from a package or an alias, it is likely a well-known, stable primitive (like `styled-components`'s own `keyframes`), which is safe by construction (the library handles it). The danger is *local* code that *looks* like a primitive but isn't tagged correctly. Resolving relative imports covers the vast majority of local shared fragment cases. The "hole" for aliases/index re-exports means that if a local primitive is re-exported through an index and imported via an alias, it might not be detected as a primitive, leading to a *false negative* (missed bug) rather than a false positive. Given the guard's goal is to prevent production crashes, a false negative is worse, but the scope is deliberately narrow to avoid false positives. The H1 fix specifically targeted the *most common* local import shape. This is a reasonable trade-off.

**4. Does registering setProperty tokens as defined hide a real bug (a token set only on one code path)?**

**SOUND.**
`setProperty('--x', value)` is a *definition* of the token in the context of the DOM/CSSOM. If a token is set via `setProperty`, it *exists* in the runtime environment. The token registry check is about *static* analysis: does the token name appear in a definition (`--x: value`) or a runtime setter (`setProperty('--x')`)? If it does, it is considered "defined". The check does *not* verify that the token is set *before* it is used, or that it is set on *all* code paths. That is a runtime logic bug, not a static token existence bug. The static check's job is to catch typos or missing definitions. If a token is set via `setProperty`, it is not a typo. Whether it is set on all paths is a different class of bug (logic/control flow) that static analysis cannot reliably detect without full program analysis. Therefore, registering it as defined is correct for the purpose of this check.

**5. Does the name-only token existence scan now double-count or mis-locate?**

**SOUND.**
The `USE_NAME_RE` is `/var\(\s*(--[\w-]+)/g`. It matches *every* occurrence of `var(--token`, including nested ones. The check is: `if (!registry.has(m[1]))`. This is a simple set membership test. It does not double-count in the sense of reporting the same *finding* multiple times for the same token name in the same file/line, because the `unknown` array is built by pushing a string for *each* match. However, the output groups by token name: `const byToken = new Map(); for (const u of unknown) { const name = ...; if (!byToken.has(name)) byToken.set(name, []); byToken.get(name).push(u); }`. So, if `--a` is used 10 times in a file, it will be reported as *one* distinct token with 10 use sites. This is correct and desirable. It does not mis-locate because the location is captured in the string `u` (`${f}:${i + 1} — var(${m[1]})...`). The "mis-location" concern might be about whether `USE_NAME_RE` correctly identifies the token name. It captures `--[\w-]+`, which is the standard CSS custom property name format. This is correct.

**6. schema-qualified lookup: models with schema set but table created in public, or search_path effects.**

**SOUND.**
The code reads `schema` from `model.getTableName()` if it's an object, otherwise defaults to `'public'`. It then looks up `live.get(`${schema}.${table}`)`. The `live` map is built from `information_schema.columns` where `table_schema NOT IN ('pg_catalog', 'information_schema')`. This means it includes *all* non-system schemas. If a model specifies `schema: 'analytics'`, it looks for `analytics.table`. If the table is actually in `public`, it will report `MISSING_TABLE`. This is *correct* behavior: if the model says the table is in `analytics`, and it's not there, that is drift. The `search_path` effect is irrelevant because the check uses explicit schema qualification in the lookup key, not relying on the database's `search_path`. The H1 fix explicitly addressed this by reading all schemas and using `schema.table` keys. This is sound.

**7. Anything in H1 that was fixed WRONG rather than incompletely.**

**SOUND.**
- **drift: VIRTUAL skipped**: Correct. VIRTUAL attributes are not persisted.
- **ENUM<->TEXT compatible**: Correct. Enums are often backed by varchar+CHECK, and treating them as compatible with TEXT is a reasonable heuristic to avoid false positives.
- **schema-qualified lookup**: Correct.
- **USER-DEFINED classified via pg_type typtype='e' else UNKNOWN**: Correct. This prevents citext/hstore/geometry from being misclassified as ENUM.
- **FK query rewritten onto pg_constraint**: Correct. This is the authoritative source.
- **--model typo now exits 2**: Correct. Prevents silent success on empty runs.
- **G5: imported primitives resolved one level via relative import**: Correct for the scope.
- **css/keyframes given word boundaries**: Correct. Prevents prefix matches.
- **SHARED_FRAGMENT captures ANY tag and exempts only anchored-safe tags**: Correct. Fails safe.
- **export default scanned**: Correct.
- **quoted spans skipped inside interpolations**: Correct. Prevents desynchronization.
- **tokens: existence scanned via a name-only pattern**: Correct. Catches nested tokens.
- **setProperty('--x') registered as definitions**: Correct.

No H1 fix appears to be wrong. They all address the stated defects without introducing new ones.

DRY
