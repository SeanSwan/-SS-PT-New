# Design-Brain MVE — the Mobbin learning engine (D1-independent core)

Built 2026-07-20 per the Kimi Pass C "Minimum Viable Engine" ruling (`docs/ai-workflow/AI-HANDOFF/
brain-review-2026-07-19/04-…MINIMUM-VIABLE-ENGINE.md`), amended by Pass D (vault emit replaces MCP
tooling). **1,485 lines of source + ~1,900 of tests, zero dependencies, 81/81 tests.** Run them with
`npm run design-brain:test` from the repo root, or `node --test tests/*.test.mjs` from this directory —
Node 22 needs the glob; a bare `tests/` is treated as a module path and errors. **Sean is the gate** —
no broker, no coverage matrix, no unattended runs; a present human replaces the authorization machinery.

> **Hostile review, 2026-09-18 — six rounds, 24 findings, all fixed.** Round 1 executed the loop
> end-to-end and found twelve defects, four of them able to silently corrupt the ledger's meaning.
> Rounds 2–5 then reviewed **the fixes themselves** and found nine more — including **three defects
> introduced by the earlier fixes**. Regression tests sit at **two levels** — unit (`hostile-regressions`,
> `hostile-round2/3/4/5-regressions`) and process (`loop-convergence`, real CLI entrypoints, three
> cycles). The report is `docs/ai-workflow/AI-HANDOFF/design-brain-hostile-review-2026-09-18/`.
>
> The load-bearing findings: **a decided claim was re-presented as a fresh DECIDE block every cycle and
> Sean's letter on it was dropped in silence (F1)**; **byte-identical restatements of an accepted
> principle were orphaned, so the accepted claim's evidence never grew while the packet showed phantom
> products at inflated confidence (F2)**; **the novelty denominator counted a different population than
> its own documented formula, biasing the dial toward "productive" (F3)**; and **the audit ledger was
> the one write path that bypassed the data-root jail (F5)**.
>
> **Read this before changing any guard.** The two findings that cost the most were both *additions that
> were too wide*: round 2 blocked `trial` claims from corroborating (R3-1 — a silent **loss**, worse than
> the orphan it fixed), and round 3 reported never-adjudicated claims as stranded (R5-1). Both passed a
> diff read. Both were caught only by executing the *pre-fix* path for comparison. **A fix that adds a
> report can be wrong in a way a fix that adds a write cannot** — a spurious write corrupts data you can
> inspect, a spurious report corrupts the operator's attention and leaves no trace. For every new guard,
> write the test for the case it must **not** catch.
>
> **F12 is worth reading if you touch this code.** The first round of fixes shipped with 55/55 green
> tests that could not detect the fixes being reverted — the tests supplied the very argument under
> test. Mutation testing exposed it; the CLI-level tests close it. **If you change the wiring between
> steps, `loop-convergence.test.mjs` is the file that protects you, and it must stay process-level.**

## The loop (one research batch)

```bash
export SWAN_DESIGN_BRAIN_ROOT=~/design-brain          # jailed: never inside a git repo or the vault

# 1. INSPECT (agent or Sean) — one receipt per opened reference:
echo '{...receipt json...}' | node src/log-receipt.mjs --root $SWAN_DESIGN_BRAIN_ROOT
#    Vacuous receipts are REFUSED (hierarchyNotes ≥40 chars, principles ≥15). Deep links stay
#    client-side. No screenshots/HTML/tokens — denied fields hard-fail.

# 2. SYNTHESIZE — receipts → convergence claims (mechanical confidence from product count):
node src/synthesize.mjs --root $SWAN_DESIGN_BRAIN_ROOT

# 2b. CORROBORATE — fold near-verbatim re-hits into ACCEPTED claims (no letter needed), queue the
#     ambiguous ones, surface contradictions. Idempotent; safe to re-run:
node src/corroborate.mjs --root $SWAN_DESIGN_BRAIN_ROOT

# 3. PACKET — one markdown file: NOVELTY dial on top, then only claims that need a letter
#     (auto-corroborations appear as FYI, no DECIDE blank):
node src/packet.mjs --root $SWAN_DESIGN_BRAIN_ROOT

#     …and any time, "where do I point next / is a domain tapped out?":
node src/novelty.mjs --root $SWAN_DESIGN_BRAIN_ROOT

# 4. SEAN DECIDES — edit each DECIDE line in batches/BATCH-<date>.md:
#      a = accept · r = reject · t = trial · m CLM-xxx = merge   (unmarked = stays proposed)

# 5. ADJUDICATE — transcribe the letters into the ledger + regen INDEX.md:
node src/adjudicate.mjs --root $SWAN_DESIGN_BRAIN_ROOT --batch <edited file>

# 6. EMIT (WSL) — accepted claims → vault `design-claims` collection, searchable via brain_search:
node src/emit-vault.mjs --root $SWAN_DESIGN_BRAIN_ROOT --vault ~/hermes2/brain-vault --build
```

## Trust model (do not renegotiate)
- **claims.jsonl is the asset**; packet/INDEX/vault-notes are derived, regenerable views.
- Claims are **recall-tier even when accepted**. Canon lives in `config/doctrine.md` + the Design
  Brain docs, promoted only by Sean hand-editing. There is no promote script on purpose.
- Only shipped **products** corroborate. Agent text (repo-docs, memos) never counts.
- Contradictions stay visible in the ledger; scoring never resolves them.
- Single-source claims are capped `low` until a second independent product corroborates.

## Gates still owned by Sean
- **D1 (Mobbin ToS)** — gates the agent-driven PILOT, not this engine. Any inspector works,
  including Sean dictating observations. When D1 clears: the pilot = steps 1–6 against one D01
  surface across 3–4 products, ≤12 results reviewed, under the existing weekly caps.
- **D3** — deep domains default to `config/domains.json` (marketing swapped in per Pass B2 §8.4);
  revert = flip two `depth` fields.
- Weekly cadence target: ~75 min adjudication + ~15 min spot-checks. Spot-check habit: pick 2–3
  receipts, open the product yourself, confirm the flow exists and the notes aren't vacuous.

## Self-regulating learning (novelty dial + auto-corroboration)
- **Auto-corroboration** (`src/corroborate.mjs` + `src/similarity.mjs`): a near-verbatim re-hit of an
  already-ACCEPTED principle from a NEW product folds in automatically — appends the product, appends
  the receipt, recomputes confidence via `confidenceFor` ONLY — with **no letter from Sean**. Same
  product twice = confidence no-op. It never edits principle text, never accepts, never merges,
  never resolves a contradiction. Ambiguous matches (0.55–0.82) go to a merge queue with a suggested
  `m`; STRONG-negation matches surface as contradiction candidates. Every automated change is a
  `rev+1` append to `claims.jsonl` with an `autoUpdate` audit block — `grep CLM-x claims.jsonl` shows
  the whole chain. claims.jsonl stays append-authoritative; every reader folds via `loadClaims`.
- **Novelty dial** (`src/novelty.mjs`): `novelty = (fresh + contradictions) / receipts`, rolling over
  the last 3 domain-**runs**. States INSUFFICIENT DATA → PRODUCTIVE (≥0.25) → COOLING → TAPPED OUT
  (<0.10 AND ≥6 known claims AND ≥12 window receipts). Prints at the top of every packet that has
  events, and via `node src/novelty.mjs`. **Recommends, never blocks** — when a domain is
  re-confirming instead of learning, it says "stop spending here, next best domain is Dxx." The two
  floors stop a starved domain from falsely reading as mapped.
  - **What `receipts` means (corrected 2026-09-18, F3).** It is the receipts **reviewed in that run**
    — examined now and not counted by any earlier run — carried on the `receipt-count` event as
    `receiptIds` so the accounting is re-derivable from `events.jsonl` alone. Before the fix it
    counted *receipts behind undisposed claims*, so a run of 6 receipts where 5 restated a known
    principle reported a denominator of 1 and the dial read **1.0 (maximally productive)** where the
    documented formula gives **1/6 = 0.167 (cooling)**. A dial that reads "productive" for a run that
    is 83% re-confirmation cannot do its job.
  - **A run is a run, not a day (F3).** `runId` used to be the UTC date, so two runs in one day shared
    an id, their deterministic event ids collided (the second run's `receipt-count` was swallowed as a
    duplicate), and both runs collapsed into one window bucket — the dial could never leave
    INSUFFICIENT DATA within a day. `runId` is now `YYYY-MM-DDTHH:MM:SSZ`.
- **The loop converges (corrected 2026-09-18, F1).** `synthesize` regenerates every claim from
  receipts, so an already-adjudicated claim came back as `status: proposed` and was re-presented as a
  DECIDE block — and `adjudicate`'s idempotency guard then dropped Sean's letter **silently**. The
  packet now withholds any claim id present in `claims.jsonl` and names it, and `adjudicate` prints
  an `⚠ IGNORED` block and exits 5 rather than reporting a bare "imported 0".
- **Grown evidence is corroborated (corrected 2026-09-18, F2).** A receipt that restates an accepted
  principle in *byte-identical* wording regenerates the same content-derived claim id, which already
  carried a disposition event — so it was excluded from `proposed` and orphaned. Five new products
  restating an accepted principle added nothing to the ledger while the packet showed a phantom
  **high-confidence 7-product** claim against an asset that still said **medium/2 products**.
  `corroborate` now runs a second pass over claims whose receipt evidence grew; that pass can only
  **add evidence** (corroborate / merge-queue), never re-emit `fresh`, so novelty cannot be inflated.
- **Three guards around that pass, and the exact cases each must NOT catch** (rounds 2–5, 2026-09-18).
  This is the subtlest part of the engine; read all three before touching any of them:
  - **`DECISION_STANDS = {rejected, merged}`** — a claim decided *against* is never auto-corroborated;
    its new evidence is surfaced as `stale-decision-evidence` and the decision stands. **`trial` is
    deliberately NOT in the set**: trial means on-probation, so a trial claim restating an accepted
    neighbour must still strengthen that neighbour. Round 2 used `!== 'accepted'` here, which turned a
    working corroboration (2 products → 4, medium → high) into a silent no-op. See `R3-1`.
  - **`grown-unmatched`** — a *ledgered* claim whose receipts nothing absorbed is reported, with the
    merge candidate named when one exists, so the receipts are never orphaned invisibly. It requires an
    **actual ledger disposition**: a claim Sean has never adjudicated is merely *pending*, its own row
    already carries the receipt, and the packet presents it — reporting that as stranded was a false
    positive (`R5-1`). Same for a pending claim below the auto-gate.
  - **Both FYI kinds re-fire on every run while unresolved, on purpose.** They are not dispositions, so
    they are not in `accountedByClaim` — a state that needs a human decision keeps saying so rather
    than being reported once and forgotten. Cost: one event and one packet line per unresolved
    condition per run.
- **Every human-input error is named and exits 5 — in two classes, which are genuinely different.**
  (a) **A readable but unknown letter** (`DECIDE: accept` — not one of the four) skips **that line
  only**: the message is `⚠ N DECIDE line(s) could not be read`, other letters in the batch still
  apply, and the count of what landed is printed. (b) **A line that makes the batch unusable** (a bare
  `DECIDE: m` with no target, a merge target that does not exist, a merge chain) refuses the **whole
  batch** with `nothing was applied` — which is exact, because `parseDecisions` and `applyDecisions`
  are both pure and no write happens before them. Both classes exit 5. **Do not collapse them into one
  message: "nothing was applied" would be false for (a) whenever the batch also contains a valid
  letter.** `repro-6` asserts each class's own message, plus a mixed batch, for exactly this reason.
  The *only* uncaught throws left are invariant/security refusals (the data-root jail, the writer's
  symlink/binary/escape refusals, `synthesize`'s invalid-claim invariant), where a loud stack trace is
  the correct response: catching those into a tidy `⚠` would make a jail violation look like a typo.
- All thresholds live in `config/tuning.json` (retune without touching code). Vectors remain OUT
  (Pass B/C/D ruling held); true disjoint-vocabulary paraphrase lands as a fresh claim Sean merges
  with one `m` — the honest K5 residual, kept human-visible.

## Files
`src/paths.mjs` jail · `src/writer.mjs` hardened writes (binary/symlink/atomic/audit — the audit
ledger goes through the same preflight as any other write) · `src/validate.mjs` receipt/1+claim/1
contracts (schemas in `schemas/` are the documented shape; denied fields are refused at ANY depth and
unknown keys are refused per `additionalProperties: false`, **including inside `confidence`,
`swanTranslation`, `autoUpdate` and `humanDecision`**) · `src/log-receipt.mjs` ·
`src/synthesize.mjs` (content-derived stable claim ids + the `loadClaims` fold) · `src/similarity.mjs`
(deterministic lexical matcher) · `src/corroborate.mjs` (disposition engine + the grown-evidence pass)
· `src/novelty.mjs` (saturation dial) · `src/packet.mjs` (withholds already-adjudicated claims; will
not overwrite a batch that carries your letters) · `src/adjudicate.mjs` (idempotent,
merge-chain-refusing, merge-absorbs-evidence, reports ignored letters) · `src/emit-vault.mjs`
(accepted-only, vault-native, delete-and-rewrite mirror) ·
`config/tuning.json`+`stopwords.json`+`negation-cues.json` · tests: engine·similarity·corroborate·
novelty·hostile-regressions·hostile-round2/3/4/5-regressions·loop-convergence (**81 total**; run via
`npm run design-brain:test`).

## Known residuals (not defects — things the engine does not claim to do)
- **`emit-vault --build` is WSL-only, and the build itself is UNVERIFIED.** It shells to
  `python3 <vault>/tools/hermes2_brain_search.py`. The emit is portable and verified; the build has
  never been run from this environment. The *guard* is fixed and tested (`R2-4`): a missing tool or a
  failed build is now a loud warning **after** a successful emit, exit 0, instead of an uncaught throw
  that made a written collection report itself as a total failure.
- **`--vault` is not jailed.** `emit-vault` is the only destructive `rmSync` in the engine and it runs
  on a caller-supplied path (`<vault>/collections/design-claims`) with no jail, while every write is
  jailed. It is scoped to one collection name, but the asymmetry is real. **Open — make it deliberate.**
- **A pending claim below the auto-gate gets no merge suggestion.** It lands in the grown pass rather
  than `proposed`, so the `merge-queue` FYI does not reach it, and `R5-1` correctly keeps it out of
  `grown-unmatched`. The claim is visible in the packet, so nothing is hidden — the nudge is simply
  absent. Open, low value, and deliberately not fixed blind: whether a pending claim should be nudged
  toward merging is a design question, not a defect.
- **Legacy `events.jsonl` rows** carry no `receiptRefs`, so their claims read as fully accounted and the
  grown pass will not re-examine them. Conservative by design, no migration written: a pre-existing root
  needs one fresh cycle with new receipts before the grown pass helps it.
- **True disjoint-vocabulary paraphrase still needs a human `m`.** Vectors remain out by ruling.
  Merging now absorbs the merged claim's evidence, so a merge actually lifts the LOW cap.
