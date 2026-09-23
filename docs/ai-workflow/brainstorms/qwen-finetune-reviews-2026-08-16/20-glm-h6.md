# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/19-PACKET-SLICES-H6.md
**Tokens:** 12213 in / 20840 out (reasoning: 18876) | total 33053
**Wall:** 365.1s

---

# HOSTILE REVIEW — round H6

## Verdict: **NOT DRY**

One genuine, fixable, H5-1-class residual survives the rebuild. Everything else I attacked held. Minors below are declared and do not hold the round on their own.

---

## H6-1 (blocker): early-failure dir — empty `sealed/`, zero artifacts — is a permanent `--force` dead end

The H5-1 fix enumerates run-dir **evidence as artifacts**: `run-card.md`, `sealed/mapping.json`, `sealed/outputs.jsonl`. But the tool creates `sealed/` **before any artifact exists**, and the first artifact lands only after **two successful model calls**. Trace the code order:

```js
mkdirSync(sealedDir, { recursive: true });   // structure created, evidence = none
...
for (const row of items) {
  base = await chatOnce(...);                // ← item 1: failure throws HERE
  tuned = await chatOnce(...);
  ...
  appendFileSync(outputsPath, ...);          // first evidence, never reached
```

Any first-item failure — endpoint typo, model not pulled, timeout abort — propagates out of `runCompare` leaving `runDir/` containing **only an empty `sealed/`**. That is not exotic: "forgot `ollama pull`" is *the* canonical fresh-setup failure, and the window is two network calls wide (up to 2× `timeoutMs`).

Recovery is then impossible through the tool:

- Without `--force`: "run dir is not empty … Use a fresh dir or `--force`" — directs the user into the dead end.
- With `--force`: non-empty (`['sealed']`), `looksLikeRunDir` false on all three checks → **"`--force refused: … none of run-card.md, sealed/mapping.json, or sealed/outputs.jsonl — wrong --out-dir?`"** — a permanent refusal that also *misdiagnoses* the situation (the dir is right; the tool made it), with no cleanup path short of `rm -rf`.

Falsifiable red test (no model needed):

```bash
rm -rf /tmp/x
node scripts/compare-tuned.mjs run --base b --tuned t --out-dir /tmp/x \
  --endpoint http://127.0.0.1:9 --max-items 1      # nothing on :9 → throw
# /tmp/x now contains ONLY an empty sealed/
node scripts/compare-tuned.mjs run --base b --tuned t --out-dir /tmp/x --force ...
# → "--force refused … wrong --out-dir?" forever
```

Why this is the H5-1 class, not a new theory: H5-1's contract was "crashed dirs recover." The fix and its smokes covered only the **late** crash window (`outputs.jsonl` present). The **pre-first-append** window produces a crashed dir the evidence enumeration cannot see. Second-order variant: rerun-with-supersede that then fails early leaves `sealed/` holding only `outputs.jsonl.superseded-*` → same refusal (checks are exact-name).

**Fix (either, both pass all five existing smokes unchanged):**
- (b, preferred) Defer `mkdirSync(sealedDir)` until immediately before the first `appendFileSync`. Early failure then leaves *nothing* — the run dir is nonexistent-or-empty, both already-proceeding paths. Zero-footprint doctrine extended through first generation; junk-dir refusal untouched.
- (a) Treat an empty or superseded-only `sealed/` as run-dir evidence. Provably lossless: those shapes cannot contain user data, so acceptance destroys nothing; junk dirs with arbitrary content stay refused.

Honest severity scoping: bites only explicit `--out-dir` reuse (default stamping self-heals). But explicit `--out-dir` is a first-class documented flag — exactly what CI jobs and runbooks pin.

---

## Minors (declared, non-blocking)

- **H6-m1 (CRLF card misrefusal).** `/^Judge: .+$/m` and `/^Result: .*$/m` use `$`, which in JS does not match before `\r`. A CRLF-rewritten card (judge edits the pin line in a CRLF-happy editor) fails the Judge-line gate as "no Judge line at all" — fail-closed but misdiagnosed. Gate ordering keeps the H5-2 silent no-op unreachable (the Judge gate fires first), so this is a wrong-message robustness item: normalize `\r\n` on read or use `\r?$`.
- **H6-m2 (profile list duplicated in error strings).** `compare-tuned` and the dataset helper both hardcode the three track names in their throw messages — third and fourth copies of the truth vs `TRACK_PROFILE_PROMPTS`, contra the repo's own "no second source of truth" doctrine (invoked for `childIdPattern` in H3). Checks use `isTrackProfile`, so drift is stale-text-only. Cosmetic.
- **H6-m3 (accepted-but-inert flags).** `run --run-dir` is silently ignored (run reads `--out-dir`); `--profile` is inert on `eval-seed`/`quickstart`; `--force` inert on `score`. The harness throws on *unknown* args but lulls on *known-wrong-command* args — inconsistent with the typo-must-throw policy of H2-3/m4. UX nit; no silent-validation loss anywhere (eval-seed never validated by profile).

## Hex boundary notes — ratified non-findings

Re-derived the full matrix mechanically: all 5 reds flag (gradient-first via branch 1 `(`; `solid #ccc;` and `url(plate.png) #fff;` via branch 2 word/paren+space+terminator; gradient-second via comma+`)`), all controls survive for the *right* reasons (`#face` lacks a terminator; `#beef` is followed by `{`, deliberately not in `[;})!]`; JSX href via lookbehind 3; quoted/spaced url and multiline `var()` via lookbehinds 1–2, `\s*` spanning newlines). Residuals I found and am **not** filing: `:is(#face, #beef)` selector lists flag via branch-1 `(` (fixable later with a `(?<!\b(?:is|where|not)\()` lookbehind if it ever appears in real rows — it hasn't); `/* #fff */` comment-internal hex escapes (no terminator); `url(" #fff")` space-after-quote escapes lookbehind 2 into branch 1. All rarer than the two **declared** accepted residuals. I do not re-litigate the mid-list gradient residual: its only fix (`,` in the terminator set) breaks the `a #face, #beef {}` control — the dissent that accepted it survives attack.

## Verification ledger — attacked and held

- Force-guard ordering, junk-dir zero footprint (guard strictly pre-mkdir; supersede renames only) ✓
- Seven-artifact supersede list matches the ledger exactly; old `.superseded-*` files persist as chain ✓
- H5-2: every card gate (existence, pin, commitment parse, commitment match, Judge line, Result line) precedes **both** writes — failed gate leaves the dir byte-identical ✓
- m3: probe marker on both Result branches, derived from the same regex the gate used ✓
- M3: fail-closed classroom / loud non-classroom degrade; contract load confined to `contaminationGate`; `--train`-less runs never touch it ✓
- m4: explicit-typo throw before any write; default profile unaffected ✓
- Multi-`Result:`-line card rewrites only the first — unreachable absent adversarial card edits, and the card carries no integrity primitive by design. Noted, not filed.

## DISSENT (mandatory)

Steelman against my own blocker: the trigger needs explicit `--out-dir` reuse *and* a first-item failure; default runs never collide; the refusal destroys nothing; the user can `rm -rf`; and H5-1's smoke list never promised the empty-sealed case. Answer: first-item failure is the most common fresh-setup failure mode there is, `--out-dir` is documented first-class, "recover by hand-deleting directories" is precisely what H4-3/H5-1 existed to end, the refusal is permanent *and* misattributed ("wrong --out-dir?" — no), and an empty `sealed/` is the tool's own residue, distinguishable from junk only by the tool recognizing it. The hole is structural: an artifacts-only evidence enumeration was always blind to state zero, which the tool's own mkdir creates. That is why this is a taxonomy gap in the fix, not a regression I invented.

**DRY bar:** with H6-1 fixed (variant (b) preferred), I would declare DRY. H6-m1..m3 are cosmetic and hold no round; hex residuals are ratified doctrine boundary, not defects.
