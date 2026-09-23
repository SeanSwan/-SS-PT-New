# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/13-PACKET-SLICES-H4.md
**Seed:** (none)
**Tokens:** 11080 in / 11728 out | **Cost:** ~$0.2092 | **Wall:** 158.9s | **finish_reason:** stop

---

# HOSTILE REVIEW — round H4

Verdict up front: **NOT DRY.** The executed proofs land (the force-reset and fail-closed score gates are genuinely implemented this time), but the derivation fix created a new defect, one Kimi residual is partial, and the hex fix has a dead lookbehind plus a self-inflicted detection hole. Attacks below, then mandatory DISSENT.

---

## H4-K1 (headline): the "derived from contract" fix moved contract validation from use-time to **import-time**

In `compare-tuned.mjs`, module scope:

```js
const childIdBody = loadClassroomContract().attribution.childIdPattern.replace(/^\^|\$$/g, '');
const ENTITY_RES = [/demo-client-\d+/g, new RegExp(`\\b${childIdBody}\\b`, 'g')];
```

`loadClassroomContract()` **throws** on a missing file or on any version ≠ `EXPECTED_CONTRACT_VERSION`. Because this call is evaluated at module load, every single invocation of the CLI — `help`, `score`, a `--profile swan-coach-v1` run, anything — now hard-depends on the classroom contract being present and exactly version-pinned. Bump the contract JSON to review it, and the entire comparison harness bricks for all three tracks until the constant is updated. The exported `parseArgs` (used by the test suite) also acquired a silent filesystem+version dependency at import time.

Deriving the regex from the contract was correct; *where* you derive it is the defect. Your own architecture treats contract evolution as expected (provisional warnings, deliberate version bumps) — this fix makes that evolution fatal to unrelated commands.

**Fix:** make `ENTITY_RES` lazy — a memoized getter invoked inside `contaminationGate`, or construct it on first gate call. Same single source of truth, no import-time side effect. This is genuinely fixable and was introduced by an H3 ledger item, so it counts.

## H4-K2: the parser-hardening residual is partial — numeric flags in the dataset helper still accept NaN silently

The ledger hardened `compare-tuned.mjs` with `numArg` (finite check) + integer check for `--audit-seed`. The dataset helper got only the unknown-flag throw; its numeric flags remain:

```js
opts.maxExamples = Number(next);   // "--max-examples nope" → NaN, silently
opts.minAssistantChars = Number(next);
opts.count = Number(next);         // "--count abc" → NaN, then createEvalSeed(examples, NaN)
```

Silent NaN is the same silent-corruption class as the swallowed `--flags` you fixed — **the resilience gate must be symmetric to hold**, and right now one sibling is hardened while the other still silently degrades. **Fix:** route the dataset helper's numeric flags through a shared `numArg`-equivalent, or duplicate the finite check.

## H4-K3: the `(` removal created a detection hole, and the `url\(` lookbehind is dead code

The comment says url was "covered by its own lookbehind," but trace it: the positive lookbehind `(?<=[:='"`,]\s*)` no longer contains `(`, so for `url(#fade)` the positive lookbehind fails *before* the negative one matters — `(?<!url\()` is **unreachable dead code**.

Worse, dropping `(` means **any** hex immediately after any open paren is now exempt — `(#fff)` in prose rows, etc. The minimal correct fix was: *keep* `(` in the value class and let the url lookbehind exempt the url case. As implemented, the fix lost coverage while appearing to add precision. And the url lookbehind still misses the quoted form `url("#fade")` (char before `#` is `"`, which *is* in the value class → false positive anyway). The only genuinely defensible `(` removal is if no lookbehind exists — you have one; use it.

## H4-K4 (cosmetic, not counted against DRY): dead existence guard in `score`

After H3-2 throws on a missing card, the tail of `scoreRun` still reads:

```js
const runCardPath = join(opts.runDir, 'run-card.md');
if (existsSync(runCardPath)) { ... }
```

Redundant, harmless, but it signals the invariant wasn't propagated. Delete the guard or comment it.

---

## What held (checked, not attacked)

- The force branch truncates outputs and quarantines verdicts *before* any model call; everything else stale (`mapping.json`, `checks.json`, `run-card.md`, `judging-sheet.md`) is overwritten via `writeFileSync`, so no reset gap remains.
- The score gate ordering is genuinely fail-closed: missing card → throw; malformed/absent commitment → the regex failing *is itself* the throw; placeholder `<pin` vs. existence of a `Judge:` line are checked independently, and each compensates the other's malformed-spacing edge.
- The anchor-strip (`/^\^|\$$/`) and word-boundary wrap on a `^C-\d+$`-shaped contract pattern are correct for the plausible shapes; I did not claim the `(?:...)`-body edge because the actual contract pattern isn't in the packet, and I don't attack on speculation.

---

## DISSENT (mandatory)

The foreseeable counter to H4-K1: "eager contract validation is fail-closed by design — unreviewed contracts should halt everything." I reject it. Fail-closed applies to *evidentiary gates* (commitment, judge pin, contamination). The availability of `help`, of a swan-coach comparison, or of `score` is not an evidentiary gate; making every track hostage to one contract's state is fragility masquerading as posture. If the coupling were intentional it would be documented at the call site and tested; as written it is an accidental import-time side effect introduced by a celebrated fix. K1 stands. I also choose **not** to claim the provisional-warning path, the empty-`--profile` bypass of the new `H4/F1` manifest gate, or the redundant guard as headline material — downgrading my own weak findings is cheaper for the review loop than inflating them.

**NOT DRY.** K1 must land before H5.
