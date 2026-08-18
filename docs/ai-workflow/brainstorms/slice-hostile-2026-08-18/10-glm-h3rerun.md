# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/slice-hostile-2026-08-18/09-PACKET-H3-RERUN.md
**Tokens:** 7983 in / 17563 out (reasoning: 16306) | total 25546
**Wall:** 249.3s

---

## Attack 1 — break an H1/H2 fix

Checked each enumerated fix against the attached source:

- **H1-1.2**: `liveColumns` keys `schema.table`, reads every non-system schema; model's `tableRaw.schema` honored, `public` only as default. Holds.
- **H1-1.3**: USER-DED → ENUM only via `pg_type.typtype='e'`; else UNKNOWN; UNKNOWN on either side suppresses. Holds. (The `ENUM|USER-DEFINED` branch in `typeFamily` is now reachable only from the declared side — harmless.)
- **H1-1.4**: `onlyModel && modelsChecked === 0` → stderr + exit 2 before any CLEAN output. Holds. (`--model` with no value degrades to all-models — a superset, safe direction.)
- **H1-1.5**: `pg_constraint` joined on `conrelid`/`confrelid` oids + `unnest(conkey)`, `contype='f'` only. No name-based join exists; the phantom-`users` cartesian is structurally gone. Holds.
- **H1-2.2**: `\b` after `keyframes|css` — `cssValue(16)` no longer registers a primitive. Holds.
- **H1-2.3/2.4**: `SHARED_FRAGMENT` is anchored, captures any identifier tag, handles `export default`; `SAFE_TAG` is exact-match for css/keyframes/createGlobalStyle with `styled[.(]` prefix. `cssText`, `keyframesFor`, and default exports all get scanned. Holds.
- **H1-2.5 / H2-7**: quote-skip and brace-depth inside interpolations both present and correct. Holds.
- **H2-6**: message interpolates the actual `schema` variable. Holds.

Residuals that are *not* breaks of the claimed fixes (below threshold, disclosed for completeness): a dotted non-styled tag (`String.raw`) escapes the identifier alternation in `SHARED_FRAGMENT`; a `}` inside a nested template literal's text truncates that fragment's scan. Both sit outside each fix's stated claim and inside the documented narrowing. Not findings.

**Attack 1: SOUND.**

## Attack 2 — ambient state

- **Locale**: no locale-sensitive operations. `toLowerCase()` uses Unicode default casing, not locale; comparisons are code-point; no date/number formatting feeds logic. SOUND.
- **Git state**: neither script reads git. SOUND.
- **Symlinked root**: drift checker resolves through the module graph (symlink-transparent); token checker fails loudly (exit 2, instructive message) when `frontend/src` is unreachable; guards' `resolvePath`/`existsSync` follow symlinks, and foreign-cwd behavior is in evidence. SOUND.
- **Env pollution**: dotenv is the intended credential channel; nothing else branches on env. A hostile `DOTENV_CONFIG_PATH` changes *which* DB is queried, and the checker then honestly reports on that DB. SOUND.
- Cosmetic, not a finding: `readdirSync` is unsorted, so equal-count ties in the token ranking can permute across filesystems; content and exit code are unaffected.

**Attack 2: SOUND.**

## Attack 3 — sufficiency of the falsifiability evidence

Sound where applied: model-side mutation, named counter deltas, exit-code assertion, restore, clean tree. That is genuine kill evidence for MISSING_COLUMN, MISSING_TABLE (schema correctly named), and TYPE_DRIFT. It is **not sufficient as a whole**:

- FK_TARGET_DRIFT has zero positive firing evidence. "396 FKs, 0 lowercase" cannot distinguish *no bad FKs* from *dead comparator* — an inverted or mis-quoted comparison produces identical output. This is exactly the tautology GLM's original question named.
- The stated blocker — creating a bad FK "would require writing to the production database" — is false as a necessity. Two zero-production-write falsifications exist: (a) point dotenv/env at a disposable postgres with one table and one lowercase-`users` FK (the checker only ever SELECTs); (b) predicate inversion in a local copy — flip `=== 'users'` to `=== 'Users'` and expect mass firing against the 396 canonical targets, proving rows, loop, and comparison are live. Minutes of work. The cheap falsification wasn't taken.

## Attack 4 — shared blind spot

Both prior rounds falsified only the side the author already controls: files and models. No round mutated *scope* or the *environment* — empty runs, dead paths, the database side. Two consequences: the silent-success-on-empty-run class was caught once, by luck, in one tool (H1-1.4) and never propagated to its siblings; and the one check whose trigger lives only on the DB side is the one still unfalsified. Both rounds attacked parsing depth; neither attacked degenerate invocation.

## Findings

**F1 (code, token-registry-check.mjs):** `--file` paths are silently dropped when they don't exist (`fileArgs.filter((f) => existsSync(f))`) with no empty-target-set guard. `token-registry-check.mjs --file typo.css --strict` prints "0 files scanned," then "CLEAN — every var() resolves," and exits 0. This is the exact H1-1.4 class — "a check that checked NOTHING reporting success" — fixed in the schema checker, alive in its sibling. Falsifiable: run the command.

**F2 (evidence, per Attack 3):** FK_TARGET_DRIFT is a CRITICAL check with no demonstrated ability to fire, and the claim that falsifying it requires production writes is disproven by the disposable-DB and predicate-inversion options above.

Findings listed, so per the standing rule:

NOTDRY
