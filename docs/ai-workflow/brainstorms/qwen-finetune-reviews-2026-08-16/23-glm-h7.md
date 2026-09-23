# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/22-PACKET-SLICES-H7.md
**Tokens:** 9401 in / 19592 out (reasoning: 17388) | total 28993
**Wall:** 336.2s

---

# H7 HOSTILE REVIEW — attacks on the H6 ledger

**Verdict: NOT DRY.** Four genuinely fixable defects remain: two are holes *in* the H6 fixes themselves (H6-1's recovery path, H6-2's pre-flight check), one is a fail-open in the arg surface adjacent to m3, one is the half-closed m3 class. H6-3 and m2 survived every attack I could mount — traces below, for calibration.

## A. Attacks on the H6 fixes

### H7-1 (attacks H6-2, MODERATE — silent judgeable-set corruption): the dup check sees explicit ids only; synthetic ids collide outside it

The fix dup-checks `items.map((r) => r.id).filter(Boolean)`. But the join key downstream is not "explicit id" — it's the **effective** id, and id-less rows get `item-${done + 1}` by position:

```jsonl
{"input": [...]}              ← no id  → record.id = "item-1"  (done=0)
{"id": "item-1", "input": [...]}  ← explicit → record.id = "item-1"  (done=1)
```

`explicitIds = ["item-1"]` → one occurrence → **no throw**. Both records carry id `"item-1"` into every id-keyed join the H6-2 comment itself enumerates:

- **If either arm truncates on row 0:** `truncatedIds = ["item-1"]`, and `judgeable = outputs.filter((o) => !truncatedIds.includes(o.id))` removes **both** records — the completed, non-truncated explicit row is silently erased from the sheet. `evalCount` is wrong, a judgeable win/loss vanishes, no error anywhere. This is corruption, not cost.
- **If nothing truncates:** `buildBlindedPairs`' uniqueness net fires — *after 100% of model spend*, the exact cost H6-2 was written to preempt ("must die BEFORE any model call is paid for").

Also slips past: numeric-vs-string explicit ids (`1` vs `"1"` — strict `indexOf` says no dup; `Object.fromEntries` coerces both to key `"1"`).

**Fix (one line):** dup-check effective ids — `const effIds = items.map((r, i) => String(r.id ?? \`item-${i + 1}\`));` and test `new Set(effIds).size !== effIds.length`. Closes all three collision shapes pre-spend.

### H7-2 (attacks H6-1, MINOR): the "leaves literally nothing" path is not recognized — an empty `sealed/` dead-ends `--force` with a false diagnosis

H6-1 moved `mkdirSync(sealedDir)` to first append. The recovery path it claims ("stays on the already-recoverable empty/fresh path") tests emptiness as `readdirSync(runDir).length > 0` — and an empty `sealed` directory **is** an entry.

Repro: mkdir at `done === 0` succeeds; the immediately following `appendFileSync` fails (ENOSPC, EACCES, AV file lock). Dir state: `{sealed/}` with zero files — literally no evidence. Retry with `--force`:

- length = 1 → enters force branch
- `looksLikeRunDir`: no run-card, no mapping.json, no outputs.jsonl; `superseded(runDir)` → `'sealed'.includes('.superseded-')` = false; `superseded(sealedDir)` → empty dir, false
- → **`--force refused: ... wrong --out-dir?`** — misdiagnosis, dead-end until manual `rmdir`.

This is the same crash-window class H6-1 itself was deemed fix-worthy for (crash-after-supersede was equally narrow). **Fix:** when computing "non-empty" and evidence, ignore a `sealed` entry that is itself empty (an empty `sealed/`-only dir is the fresh path).

### H6-3 (`\s*` in branch 2): SURVIVED — no counterexample found

Traced against the assembled regex:

- `border:1px solid#ccc;` → branch 2 lookbehind `d` ∈ `[\w)\]]` + `\s*`(zero); lookahead `;` → **flags** ✓ (matches the committed fixture claim).
- Selector controls: `#face,` → comma ∉ `[;})!]` → pass ✓; `#beef {` → lookahead class is `[;})!]` — `{` is **not** in it (only `}`, `)`, `!`) → pass ✓; `a#face{...}` → lookahead fails → pass ✓. The terminator guard genuinely separates the classes.
- Multiline `solid\n  #ccc;` → flags (intended; legal CSS, illegal hardcode).
- `#fffffff` (7 nibbles) → all alternations fail `\b` → no match; correct, it isn't a color.

No misfire, no new escape introduced by `\s*`. Holding.

### GLM m1 disproof: outcome CONFIRMED, mechanism in the ledger is WRONG — correct it before someone builds on it

`/^Judge: .+$/m.test('Judge: pinned-v1\r\n')` → true, as recorded. But not because "`.` consumes `\r`" — in JS, `.` excludes all line terminators **including `\r`**. The pass comes from multiline `$` asserting **before** `\r` (CR is itself a line terminator). Behavior identical, so no code change — but the ledger's stated mechanism should be fixed; a future round "repairing" the regex from the wrong model (e.g., assuming `.` eats CR) could break the gate it just proved correct.

### H6 m2 (derived profile lists): holds. `Object.keys(TRACK_PROFILE_PROMPTS)` verified; the remaining `'classroom-extract-v1'` literals in `contaminationGate` are behavior branches, not copies of the truth.

## B. New surface in the changed file

### H7-3 (MODERATE-HIGH — fail-open of two named safety controls): a dangling string flag silently disables `--train` and `--profile`

`const next = () => { i += 1; return argv[i]; };` returns `undefined` when the flag is argv's last token:

```
node scripts/compare-tuned.mjs run --base a --tuned b --train
```

- `opts.train = undefined` → `if (opts.train) contaminationGate(...)` → **the contamination gate (H1-4/F1) never runs. No warning. Full paid run proceeds.**
- Same shape: `--profile` last → unknown-profile guard skipped *and* `deterministicChecks(text, undefined)` runs zero checks — the exact "checks silently vanish" harm H2-3 was written against, entered through a missing value instead of an unknown name.
- (`--evals` dangling fails loudly-ish ("Eval file not found: undefined"); `--base/--tuned` are caught downstream; numArg flags already throw on NaN; booleans unaffected.)

**Fix:** `next()` throws when the consumed token is `undefined` or `--`-prefixed. Two lines.

### H7-4 (MINOR): m3 closed two instances; the wrong-command lull class remains open

`score --base a --evals f --profile p --train t --max-items 5` — all silently ignored; `run --allow-unpinned-judge` — silently ignored. Fix: a per-command accepted-flag set in `parseArgs` (the command is known there) throwing on foreign flags.

## C. Attacked and could not break (calibration)

- **Supersede-evidence path (H6-1):** partial supersede (renameSync throws midway) still leaves `*.superseded-*` → `--force` proceeds and the retry loop supersedes the remainder. Crash-after-supersede-before-append → superseded-only dir counts. Both windows genuinely closed.
- **Score gates:** commitment parse/match, pin-marker-vs-deleted-line pair, Result-line presence, empty-sealed ENOENT fail-closed — no new hole.
- **Write ordering:** pii gate before sheet/mapping writes; incremental outputs before card; all hold.

Residuals as previously declared (mid-list hex, quote-wrapped prose hex, `:is()`/comment/`url(" #fff")` non-findings) — unchanged, not re-litigated.

## Verdict

**NOT DRY.** H7-1 and H7-2 are input-driven holes in H6 fixes (one corruption-path, one fail-open gate); H7-2/H7-3 repairs are each ≤3 lines. All four are fixable in one pass.

## MANDATORY DISSENT

The strongest DRY case: H7-3 requires an operator typo (dangling flag), H7-4 is polish, H7-2's trigger needs mkdir-succeeds-append-fails — a near-atomic IO window — and H7-1's common path (no truncation) is caught by the second net, degrading it to wasted spend on a contrived id mix. On a "user error and vanishing IO races are out of scope" bar, all four drop and this is DRY.

Why the dissent still loses: this loop's own precedent fixes exactly this class. H6-1 was accepted as fix-worthy for a crash window no wider than H7-2's; H6-2's entire purpose was pre-spend death, which H7-1 defeats via eval-file *content* — and eval files are the doctrine's declared adversarial input (the suite hard-fails on hex-shaped CSS selectors and PENDING ideal provenance, far stranger than a mixed-id file). A bar that drops H7-1/H7-2 must also retroactively drop H6-1/H6-2 as oversensitive. The verdict is robust under both readings: even the dissent's own narrow bar keeps H7-1 (pure input, silent data loss) alive. NOT DRY.
