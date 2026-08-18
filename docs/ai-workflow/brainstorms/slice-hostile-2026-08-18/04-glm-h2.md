# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/slice-hostile-2026-08-18/03-PACKET-H2.md
**Tokens:** 7634 in / 16195 out (reasoning: 14483) | total 23829
**Wall:** 244.0s

---

## Round H2 — verification + hunt

**Attack surface note:** the G5 excerpt is a fragment with no filename in what I was given; I'll call it "G5 guard". Audited against the code as shown, not the comments' claims about it.

### 1. pg_constraint FK rewrite — SOUND
No miss. The old information_schema join's extra reach was exactly its defect (phantom cartesian rows); `pg_constraint` with `contype='f'` is a superset of what the old query legitimately caught, and the verified 396 == 396 confirms parity. Composite FKs emitting one row per column is **correct, not double-reporting**: each row names a distinct `(table_name, column_name)`, and the consumer only acts on `target_table === 'users'` (verified 0), so no finding is emitted twice for the same column. Two cosmetic notes only: (a) PG11+ partition inheritance replicates an FK as one `pg_constraint` row per partition — if this ever fires, dedupe on `con.oid`; (b) `WITH ORDINALITY ... ord` is selected-into-nothing — dead, harmless.

### 2. Anchored-safe-tag exemption — SOUND (with named residual class)
The two-gate design (unknown tag **AND** interpolates a known primitive) means a false positive requires a tag that safely handles a styled-components primitive but isn't `css|keyframes|createGlobalStyle|styled[.(]`. The styled-components public API contains no such tag; the only members of the class are the legacy `injectGlobal` alias or a repo-local css-returning wrapper used as a tag — neither present (0 hard-failures / 400 files), and `swan-guard-allow-template` covers the exception case. The inverse is a benign false negative: `css`/`keyframes` are trusted lexically, so a local helper *named* `css` that isn't styled-components' would be exempted — wrong direction to worry about. Adjacent pre-existing residual (not introduced by H1): a documentation *string* containing a line that lexically resembles `export const x = \`…\${fadeIn}\`` matches `SHARED_FRAGMENT` — regex-grade, pre-dates these fixes, no instance found.

### 3. Relative-only import resolution — **FINDING (the real gap)**
- **File:** G5 guard, import-resolution block.
- **Breaking shape:** idiomatic barrel re-export. `shared/index.ts` contains `export { fadeIn } from './fadeIn';`. Consumer: `import { fadeIn } from '../shared'` then `export const panel = \`…\${fadeIn}…\``. The resolver reads `shared/index.ts`, finds no `export const fadeIn = keyframes…` (re-export files have no `export const`), so `fadeIn` never enters `PRIMITIVES` — the exact cross-file crash shape the H1 fix exists for sails through. Aliased (`@/`, `~/`) and bare-package imports are also unresolved, same false-negative direction.
- **Minimal fix:** in the resolved module, additionally match `export\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]` and `export\s*\*\s*from\s*['"](\.[^'"]+)['"]`, follow that **one** more relative hop, and union the `export const … = keyframes|css|styled` names found there. (Better shape if this grows: precompute one repo-wide primitive-export map instead of per-import reads.)

### 4. `setProperty` tokens registered as defined — SOUND
The hidden shape is real but not statically catchable at this grade: `if (cond) el.style.setProperty('--x', v)` leaves the other branch's `var(--x)` on fallback forever, and element-scoped `setProperty` is registered as globally defined. But the pre-fix behavior was a *guaranteed* false positive ("never defined") on correctly-behaving code; the fix trades a certain FP for an unverifiable potential FN — the right direction for an existence check. Not a defect. Optional advisory (not a fix): list tokens whose *only* definition is `setProperty`, for human scope-eyeballing.

### 5. Name-only existence scan — SOUND
No double-count: each `USE_NAME_RE` match is a distinct occurrence of a distinct use site; `var(--a, var(--b))` yields two sites because it *is* two uses; `var(--a, var(--a))` counts twice accurately. The 607-distinct/1786-sites figures are occurrence-accurate. No mis-location: `matchAll` runs per-`line` with `i + 1` — exact. Unchanged pre-existing limits (multi-line `var(`, uses inside string literals/comments) existed before the fix and are not regressions.

### 6. Schema-qualified lookup — **one concrete defect, one conditional residual**
- **FINDING (concrete).** File: `backend/scripts/schema-drift-check.mjs`, MISSING_TABLE push. Shape: model with `{ schema: 'analytics' }` whose table is absent → detail reads `…does not exist in public schema` — hardcoded, contradicts the schema-qualified lookup the same fix installed; the 8 current MISSING_TABLE reports for any non-public model name the wrong schema. **Minimal fix:** `` detail: `model targets table "${table}" which does not exist in schema "${schema}"` ``.
- **Residual (conditional — flagging, not manufacturing):** a model with *no* schema whose table lives only in a non-public schema on `search_path` reports MISSING_TABLE while the app works. The code's default-`'public'` assumption is provably in the source; whether it bites depends on deployment shape the verified numbers don't exhibit. **Minimal fix if wanted:** on a miss, `[...live.keys()].filter(k => k.endsWith('.' + table))` — adopt the hit only if exactly one, annotate the finding.

### 7. Fixed wrong rather than incompletely — **one finding**
- **FINDING.** File: G5 guard, interpolation scanner (the H1-2.5 "quoted `}`" fix). Shape: an **unquoted brace** inside an interpolation still desynchronises depth: `` export const t = `${fn({ a: 1 }) && g`x`}` `` — the object literal's `}` closes interpolation depth early; the later backtick (`g`x``) then hits the top-level `` ` ``→`break` and truncates the fragment scan, so identifiers after the brace (`g`, if it's the imported primitive) are never read. False negative only — no false positive: `${` unconditionally re-opens depth, and identifiers before the cut stay whole in the captured expr (verified by trace: `${fadeIn && fn({a:1})}` still captures `fadeIn`). The fix closed quotes; it did not close braces. **Minimal fix:** inside `depth > 0`, count `{`/`}`: increment on `{`, and on `}` decrement the counter and append before treating it as the interpolation-closer.
- Everything else re-attacked held: `--model` exit-2 placement, VIRTUAL skip (skips before `attributesChecked`), ENUM↔TEXT compatibility (suppression direction only), `\b` on `css`/`keyframes` (backtick is a boundary; `cssValue` no longer matches), anchored `SAFE_TAG` (`cssValue` captured whole, fails `^css$`, gets scanned), `export default` capture, registry first-wins, FK parity. SOUND.

**Verdict:** three findings (G5 barrel-resolution FN, G5 brace-desync FN, drift-check hardcoded "public schema" message), one conditional residual (search_path fallback), four attacks came back SOUND with no new defect introduced by any H1 fix. No duplication defect found anywhere probed — composites don't double-report, tokens don't double-count, findings don't restate H1.

DRY
