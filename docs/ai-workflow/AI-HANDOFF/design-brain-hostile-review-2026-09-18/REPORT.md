# Swan Design-Brain — Deep Hostile Review

- **Date:** 2026-09-18 · **Reviewer:** Sable (WorkBuddy) · **Subject:** `scripts/design-brain/` (Design-Brain MVE, the Mobbin learning engine)
- **Revision reviewed:** `creator-brains-engine-r2-20260915`, starting at `83a19d456` (988-file dirty tree)
- **Method:** every finding below was **reproduced by executing the engine**, not inferred from reading it.
  Commands are re-runnable. Anything I could not run is marked **UNVERIFIED** and is not counted as a pass.
- **Outcome:** **six review rounds, 24 findings. All 24 fixed.** Round 1 reviewed the engine (F1–F12);
  rounds 2–6 reviewed *the previous round's fixes* and found 12 more, including **three defects
  introduced by my own earlier fixes** (R2-1's guard width, R3-3's false-positive surface, R5-1),
  **one false sentence in this report** (R6-1), and **five operator-identity leaks in my own evidence
  scripts** (R6-2). Test count went 39 → 59 → 81, and every fix in every round is mutation-verified to
  go RED when reverted.
- **Two findings are about this review's own output**, and they are the most instructive in the document:
  **F12** (round 1's fixes were not protected by round 1's tests) and **R3-1** (round 2's fix was worse
  than the bug it fixed). Both are included deliberately: the failure mode the review exists to catch
  reappeared one level down, twice, and only mutation testing caught either.
- **Committed** as a labelled review candidate — see §7 for what that does and does not mean.

---

## 0. Verdict

**The engine's architecture is sound. Its bookkeeping was not.**

The design is genuinely good and I want to say that plainly before the axe: the data-root jail, the
append-authoritative ledger with a fold, content-derived claim ids, mechanical confidence that an agent
cannot inflate, contradiction detection that refuses to auto-resolve, and a novelty dial that recommends
rather than blocks — that is a coherent trust model, and most of it survives contact with a hostile reader.

What did not survive is the part that connects the derived views to the asset. `synthesize` regenerates
every claim from receipts on every run, and the rest of the pipeline treated "has a disposition event" as
"is finished" — which is true for *idempotency* and false for *convergence*. The consequence was that the
loop never closed: Sean's decisions were re-asked and then silently discarded (F1), and new evidence for an
already-accepted principle was orphaned while the packet showed him a phantom claim at inflated confidence
(F2). Both are silent. Both are in the class the engine's own documentation is most proud of defending
against.

The tests were green throughout. All 39 passed before the review and all 39 pass after. **A green suite
certified a loop that did not converge** — which is the same lesson as the two live examples already in the
project record.

**Addendum after four more rounds.** I then turned the same posture on my own fixes, four times, and the
returns did not diminish the way I expected them to. Round 2 found five defects in round 1's fixes. Round 3
found that one of round 2's fixes — the `trial`-status guard — was **worse than the bug it replaced**:
round 2 had turned a silent orphan into a silent *loss*. Round 4 found round 3's fix was **incomplete**,
covering the parse stage of a failure but not the apply stage one line below. Round 5 found round 3's new
report fired on claims it should have stayed quiet about.

That is the finding, and it is more useful than any single defect above: **the engine's failure mode is
not "silence where there should be a report", it is "a report that is not checked for the cases where it
must stay quiet, and a guard that is not checked for the cases it must not catch."** Every one of the
round-2..5 defects was found by *executing a scenario*, never by re-reading the diff. A reviewer who reads
this diff and reasons about it will conclude it is correct. It was not, four times.

---

## 1. What "the design brain" is, and the scope I reviewed

Two different things carry the name; I reviewed the executable one.

| Thing | Path | In scope |
|---|---|---|
| **Design-Brain MVE** — the engine (11 modules, 4 test files, config, schemas) | `scripts/design-brain/` | **Yes — this report** |
| Design Brain docs — the canon corpus (tokens, C1–C12, motion, archetypes, `design.md`/`design.html`) | `docs/ai-workflow/design-brain/`, `.ai-workflow/fusion/design-brain-canonical.md` | Read for contract only; not code-reviewed |

Size at review: **1,272 src + 591 test lines** pre-fix (README claimed "~800 lines"). Zero external
dependencies — verified by grepping every import in `src/`; only `node:` builtins and relative paths.
README claimed "14/14 tests"; the real count was **39**. Both stale claims are corrected in the README.

---

## 2. What holds up under hostile reading

Stated with the evidence, because a review that only lists failures is not a review.

| Claim | Verdict |
|---|---|
| Data-root jail refuses a root inside a git repo / under `collections`, `brain-vault`, `node_modules` | **Holds.** `paths.mjs:19-49`; walks every ancestor for `.git`, follows junctions to their target. |
| Writes are jailed, symlink-refused, binary-refused, atomic, and audited | **Holds for every write except the audit ledger** — see F5. The symlink refusal is real: I planted a junction and the direct write was correctly refused. |
| Content-derived claim ids make re-synthesis idempotent | **Holds.** `CLM-<sha256(domain::normalized principle)>`; same principle → same id across runs. Verified. |
| Confidence is mechanical and an agent cannot score its own homework | **Holds.** `confidenceFor` is the only writer of `confidence.level` in the auto path; 1→low, 2-3→medium, ≥4→high. Verified 2 products → medium, 7 → high. |
| Near-verbatim restatement corroborates; disjoint paraphrase does not | **Holds, and the tuning is right.** A reworded restatement scored S=0.838, O=1.0 (subset) and auto-corroborated; a genuinely different principle did not. |
| Contradictions are detected and never auto-resolved | **Holds.** `never show the rest timer inline…` vs `show the rest timer inline…` → `contradiction-candidate` + `fresh`, **0** auto-writes to the accepted claim. |
| Only shipped products corroborate; agent text never counts | **Holds by construction.** Receipts are the only input to `synthesize`; `product` comes from the receipt. |
| The append-only ledger keeps every prior state recoverable | **Holds.** `loadClaims` folds latest-rev-per-id; `grep CLM-x claims.jsonl` shows the chain. |
| One markdown file beats a UI for adjudication | **Holds, and I agree.** But see F8 — the file must not be overwritten. |

---

## 3. Findings

Severity is about *silent damage to the ledger's meaning*, not about code aesthetics.

### F1 — CRITICAL · A decided claim is re-asked every cycle, and the letter is dropped in silence

**Reproduced.** Adjudicate a batch, then re-run `synthesize` + `packet` with **no new receipts**:

```
$ node src/adjudicate.mjs --root $ROOT --batch BATCH-2026-09-19.md
imported 2 decision(s); 0 still proposed            # Sean accepted both

$ node src/synthesize.mjs --root $ROOT && node src/packet.mjs --root $ROOT
# Batch 2026-09-19 — 2 claims to adjudicate          # ← both, again, as DECIDE: _

$ node src/adjudicate.mjs --root $ROOT --batch BATCH-2026-09-19.md
imported 0 decision(s); 0 still proposed            # ← his letters, gone, no complaint
```

**Cause.** `synthesize.mjs:63-78` regenerates every claim with `status: 'proposed'`; `packet.mjs`
filtered only on `status` and the events disposition map (`renderPacket`, `disp` filter). A claim
previously marked `fresh` passes that filter (`packet.mjs:67` keeps `d === 'fresh'`), so it is re-rendered.
`adjudicate.mjs:53` then refuses to re-import it — correctly, for idempotency — and reported that as a
plain `imported 0`.

**Impact.** The loop does not converge. Sean re-judges the same claims every cycle and his answers on them
are void. "imported 0 decision(s)" reads as "nothing to do", not "your input was discarded". This is the
defect the review exists to find: a human-in-the-loop gate whose input path silently closes.

**Fixed.** `renderPacket` takes `adjudicatedIds` (claim ids present in `claims.jsonl`), withholds them, and
names them in the batch header. `applyDecisions` returns `ignoredDecisions`; `adjudicate` prints
`⚠ IGNORED n letter(s) — already adjudicated, not re-importable` and **exits 5**.

### F2 — CRITICAL · Byte-identical restatement of an accepted principle is orphaned; the packet contradicts the asset

**Reproduced** (fresh root, the exact scenario in §3 of the driver):

```
accepted claim:  rev1 CLM-76c94b34f5  products=2 [Hevy,Strong]              conf=medium
+ 5 new products restating it byte-identically + 1 new principle
                 rev1 CLM-76c94b34f5  products=2 [Hevy,Strong]  refs=2      conf=medium   ← unchanged
packet showed:   CLM-76c94b34f5  D01 · high
                 products: Hevy, Strong, Fitbod, Jefit, Liftin, Gymshark, RP     ← 7 products
ORPHANED: RCP-1001(Fitbod), RCP-1002(Jefit), RCP-1003(Liftin), RCP-1004(Gymshark), RCP-1005(RP)
```

**Cause.** A byte-identical restatement normalizes to the same principle → the same content-derived claim
id → and that id already carries a disposition event, so `corroborate.mjs:208` excluded it from `proposed`.
It was never re-examined. But `synthesize` *did* regenerate it with all seven products, and `packet` reads
`synthesize`'s output — so the derived view claimed **high / 7 products** while the asset said
**medium / 2**.

**Impact.** Three at once: (a) real evidence never reaches the ledger — a principle confirmed in 7 products
stayed capped at 2; (b) the packet presents a confidence level the asset does not support, which is exactly
the "confidence laundering" the anti-laundering design exists to prevent, arriving through a side door;
(c) five logged receipts became invisible to every derived view.

**Fixed.** `corroborateBatch` takes `grownProposed` — already-disposed claims whose `receiptRefs` include
receipts no disposition event has accounted for — and runs a second pass that can only **add evidence**
(corroborate / merge-queue). It can never re-emit `fresh`, so novelty cannot be inflated by the fix.
Verified after: `rev2 … products=7 … conf=high`, and the packet reports it as FYI
`CLM-76c94b34f5 medium→high (+Fitbod, +Jefit, +Liftin, +Gymshark, +RP)` with no DECIDE line.

### F3 — CRITICAL · The novelty dial's denominator is not the one its own formula names

**Reproduced.**

```
run 1: 2 receipts → receipt-count count=2      novelty = 2/2 = 1.000
run 2: 6 receipts reviewed (5 restatements + 1 new)
       receipt-count count=1                   novelty = 1/1 = 1.000   ← "maximally productive"
       documented formula                      novelty = 1/6 = 0.167   ← COOLING
```

**Cause, two parts.** (i) `corroborate.mjs` counted receipts referenced by *undisposed* claims, while
`novelty.mjs:7` and the README both state `(fresh + contradictions) / validReceipts`. The implementation
measured *precision of new claims*, not *yield per receipt reviewed*. (ii) `runId = nowIso.slice(0,10)` —
the UTC **date**, not a run. Two runs in one day shared a runId, so their deterministic `evId`s collided and
run 2's `receipt-count` was swallowed as a duplicate; both runs also collapsed into one window bucket, so
the dial could never leave `INSUFFICIENT_DATA` within a working day.

**Impact.** Directional and load-bearing. The dial is the engine's answer to "am I wasting Sean's money
re-confirming what I know?" A denominator that shrinks exactly when a domain stops teaching reports
PRODUCTIVE for a run that is 83% re-confirmation. It would recommend continuing to spend on a tapped-out
domain. The state machine, the two floors, and the prose recommendations are all correct — they were being
fed the wrong number.

**Fixed.** The denominator is now "receipts reviewed **in this run**": examined now, minus receipts a prior
`receipt-count` event already claimed, with the ids carried on the event (`receiptIds`) so the accounting is
re-derivable from `events.jsonl` alone. `runId` is now `YYYY-MM-DDTHH:MM:SSZ`. Verified: run 2 reports
`count=6`, `noveltyPer = [0.5, 0.167]`, rolling `0.333` PRODUCTIVE — the dial now moves toward COOLING as
re-confirmation dominates, which is the whole point of it.

### F4 — HIGH · `m` (merge) discards the merged claim's evidence

**Reproduced.** Merge claim B into claim A, then read the surviving target:

```
merged-away:  CLM-9711cbb189  products=[Hevy]   refs=[RCP-2001]  → mergedInto CLM-2c9657d1cf
SURVIVING:    CLM-2c9657d1cf  status=proposed  products=[Strong]  refs=[RCP-2002]
              conf=low  basis="single source — capped LOW until corroborated"
```

**Cause.** `applyDecisions` set `status='merged'` + `mergedInto` on the loser and nothing on the winner.

**Impact.** `m` is the documented remedy for the one residual the design admits to — "true
disjoint-vocabulary paraphrase lands as a fresh claim Sean merges with one `m` letter". The letter did not
consolidate anything: Sean merges two single-source claims and is left holding a single-source claim. The
remedy for the LOW cap did not lift the LOW cap.

**Fixed.** A merge now absorbs `products` + `receiptRefs` into the target, recomputes confidence via
`confidenceFor`, records `mergedFrom`, and bumps `rev`; the target is written back wherever it lives
(pending row rewritten in place, ledgered claim appended as rev+1). Verified: target becomes
`products=[Hevy,Strong]`, `conf=medium`, `singleSource=false`.

### F5 — HIGH · The audit ledger was the one write that bypassed the data-root jail

**Reproduced** with a positive control, so the finding is precise rather than a claim that "symlinks are
broken":

```
plant junction:  <root>/ledger  ->  C:/tmp/db-audit-escape     (outside the root)

control  safeWriteText through a junctioned parent  → REFUSED (correct)
F5       normal appendJsonl of a receipt           → succeeded, and its audit line landed at
                                                     C:\tmp\db-audit-escape\writes.jsonl
```

**Cause.** `writer.mjs` `audit()` called `mkdirSync` + `appendFileSync` directly, with no `preflight`.
`writer.mjs`'s own docstring lists symlink refusal as hardening rule 2.

**Impact.** Narrow but pointed: the audit ledger is the *tamper-evidence* mechanism. Being able to redirect
it is worse than being able to write an ordinary file — it is the record that proves what the engine did.
Requires a local actor able to plant a junction inside the data root, so not remotely reachable.

**Fixed.** The ledger path goes through the same `preflight` as every other write, and is validated
**before** the primary write so a bad ledger fails the whole operation closed rather than half-succeeding.
Verified: the junctioned-ledger write now throws `/symlink/` and nothing lands outside.

### F6 — MEDIUM · Denied fields were top-level only; `additionalProperties: false` was never enforced

**Reproduced.**

```
top-level  {"screenshot": "data:image/png;base64,AAAA"}          → REFUSED (correct, exit 3)
nested     {"meta": {"screenshot": "data:image/png;base64,AAAA"}} → LOGGED   (exit 0)
unknown    {"totallyUnexpectedField": "anything"}                 → LOGGED   (exit 0)
```

**Impact.** `validate.mjs` says denied fields are "a hard fail" and that the JSON Schemas are "the
documented contract … this module enforces the same rules by hand". One level of nesting defeated the rule
that exists to keep screenshots/HTML/tokens out of the corpus for ToS and Rule 8 reasons — and an
inspector is an *agent*, which is exactly the actor most likely to add a wrapper key.

**Fixed.** The denied scan walks the whole object graph (objects and arrays, path-reported); unknown keys are
refused against explicit allowlists that include the fields the engine itself adds (`rev`, `updatedUtc`,
`autoUpdate`, `mergedFrom`). The claim schema was updated to declare those fields, because it declared
`additionalProperties: false` while `corroborate` appended them — a contract that could never have validated
its own engine's output.

### F7 — MEDIUM · The `--batch` usage guard could never fire

`const batchPath = resolve(arg('batch') ?? '')` — `resolve('')` returns the CWD, so the guard was dead and
an omitted `--batch` died with an uncaught `EISDIR` stack. **Fixed**: guard on the raw argument before
resolving; exits 2 with usage. Verified.

### F8 — MEDIUM · Re-running `packet` destroyed an in-progress batch

The batch path was the bare date, so `packet` — which the README invites you to run "any time" — overwrote
`BATCH-<date>.md` and discarded letters Sean was mid-edit on. **Fixed**: if the existing batch carries a
letter, the new batch is written to a timestamped sibling and the console says so. Verified:
`note: BATCH-2026-09-19.md carries your letters — preserved; writing BATCH-2026-09-19-0414.md`.

### F9 — LOW · Two proposed claims corroborating one accepted claim lost the first one's evidence

Not in my original list; found while fixing F2. Two candidates can both auto-corroborate the same target in
one run; both appends derived `rev+1` from the same base, and `loadClaims` keeps the last (`>=`), so the
first candidate's added products vanished from the folded state. **Fixed** with a per-run `liveTarget` map so
a second corroboration compounds on the first.

### F10 — LOW · Dead code and stale documentation

- `corroborate.mjs` built a `byDomain` map and never read it. Removed.
- `runIdSeen` was read by `corroborate` and written by nothing. Removed from the runId path (kept in the
  schema allowlist for legacy rows).
- README: "~800 lines" (1,485), "14/14 tests" (55), "novelty prints at the top of every packet" (only when
  events exist), and `node --test tests/` — which **errors** on Node 22 (a bare directory is treated as a
  module path); the glob `tests/*.test.mjs` is required. All corrected.

### F11 — LOW · `emit-vault --build` is unguarded and WSL-only

`execFileSync('python3', …)` throws an uncaught error **after** the collection has been written, so a
`--build` run looks like a total failure while the emit actually succeeded. The emit path itself works on
Windows (verified: collection + CSV + claim docs written). **Fixed in round 2 as R2-4** — the tool is
checked for existence and a build failure is a loud warning after a successful emit, exit 0. The build
itself remains **UNVERIFIED**: it needs the real WSL vault, and I will not claim a fix I could not run.

### F12 — LOW, but the most instructive · the first round of fixes was not itself protected by its tests

**Reproduced by mutation, not by reading.** After the F1–F11 fixes were in and the suite was 55/55
green, I reverted the actual F1 fix in `packet.mjs` `main()` — dropping `adjudicatedIds` from the
`renderPacket` call — and re-ran the suite:

```
$ node --test tests/*.test.mjs          # with F1's wiring reverted
# tests 55
# pass 55
# fail 0
```

**Green.** My F1a test calls `renderPacket` directly with an `adjudicatedIds` set, so it pins the pure
function. The defect lived in the *wiring* — whether `main()` passes the set at all. Nothing tested
that. The same was true of F2: my test passed `grownProposed` in explicitly, so if `runCorroborate`
stopped deriving it, no test would notice.

**This is the original defect, one level down.** The 39 pre-existing tests were green while the loop
did not converge; my 16 replacements were green while the *fix* could be reverted. A unit test that
supplies the very argument under test cannot fail for the absence of that argument.

**Fixed** with `tests/loop-convergence.test.mjs` — four end-to-end tests that spawn the real CLI
entrypoints as separate processes and edit the batch file the way Sean does, so no internal argument
can be supplied by the test. Proven by mutation:

| Mutation | Suite before F12 fix | Suite after |
|---|---|---|
| `packet.mjs` `main()` stops passing `adjudicatedIds` (F1 wiring) | 55/55 **green** — undetected | **RED** — `CONVERGENCE: …ZERO claims` fails |
| `corroborate.mjs` stops deriving `grownProposed` (F2 wiring) | green — undetected | **RED** — 2 tests fail (CLI + denominator) |

Both mutations were reverted; suite restored to 59/59. The general lesson: **for any fix whose value
depends on a caller passing something, the regression test must enter at the caller, or at the
process boundary above it.**

---

## 3b. Rounds 2–6 — hostile review of the fixes themselves

The method changed, because the object of review changed. Round 1 read the engine. Rounds 2–6 *executed
scenarios against the fixed engine* and asked, for each fix, three questions: **does it fire when it
should, does it stay quiet when it should not, and is it wired rather than merely present?** Round 6
turned the same question on this document's own claims.

Every finding below was reproduced by running it before it was fixed, and every fix was then
mutation-verified — the fix was reverted and the suite was required to go RED.

### R2-1 — HIGH · New evidence on a claim decided *against* vanished from every surface

Round 1's grown-evidence pass only considered `accepted` claims as targets. A claim Sean had **rejected**
that later gained two more independent products produced **zero events and zero appends** — no asset
change, no packet line, no event. The rejection silently became a permanent blind spot, and the strongest
signal available (five independent products restating a principle he had said no to) was invisible.

*Reproduced:* `events: []`, `claimAppends: 0` for a rejected claim with 2 new products.
**Fixed** — a `stale-decision-evidence` event, surfaced in the packet as `NEW EVIDENCE ON DECIDED CLAIMS
(no action taken — your decision stands)`. The decision is never overridden; it is only made visible.
**Superseded in part by R3-1** — see below.

### R2-2 — a wiring no-op

`corroborateBatch` accepted `decidedById` but `runCorroborate` did not build it, so R2-1's branch could
never fire through the CLI. Found by asking the F12 question again: *is the fix wired, or does it merely
exist?* Caught by `R2-1d`, which drives the CLI.

### R2-3 — MEDIUM · An unreadable `DECIDE` line was dropped in silence

`parseDecisions` accepts only `a`/`r`/`t`/`m`. A human writing `DECIDE: accept` or `DECIDE: yes` left the
claim proposed and **said nothing** — the same silent-drop defect as F1, one input class over. The packet
prints the legend on every line, but silence is still the wrong answer to an instruction.

*Reproduced:* parsed 1 of 3 decisions, no diagnostic. **Fixed** — `unparsedDecideLines()` reports each
offending line by number and claim id, with the legend, and the CLI exits 5.

### R2-4 — LOW · A successful emit reported itself as a total failure

`emit-vault --build` called `execFileSync` unguarded, so on a machine without the WSL vault tool the
process threw **after** writing the collection — the deliverable was on disk and the exit status said the
run failed. **Fixed** — tool existence is checked, and build failure is a loud warning after a successful
emit, exit 0. This also closes the last uncaught throw on a non-`--vault` path.

### R2-5 — LOW · `additionalProperties: false` was enforced one level deep

Round 1 added top-level key allowlists; the schema also closes `confidence`, `swanTranslation`,
`autoUpdate` and `humanDecision`, and nothing checked those, so
`{"confidence":{"level":"low","basis":"x","sneaky":1}}` validated. **Fixed** — `NESTED_KEYS` +
`nestedUnknownFieldErrors`, wired into both validators. Verified by diffing the allowlists against
`claim.schema.json`: they match exactly, no drift.

### R3-1 — HIGH, and the most important finding in this document · round 2's fix was worse than the bug it fixed

R2-1's guard read `decided.status !== 'accepted'`. That sweeps in **`trial`** — and `trial` is not a
decision *against*; it means on-probation. So a trial claim restating an **accepted** neighbour had its
evidence **blocked from that neighbour**.

*Reproduced by execution, before and after:*

```
WITH  decidedById (round-2 code) => appends: 0  | events: stale-decision-evidence
WITHOUT (pre-round-2 code)       => appends: 1  target=CLM-aaaaaaaaaa
                                   products=Hevy/Strong/Fitbod/Jefit  conf=high
```

Round 2 replaced a **silent orphan** with a **silent loss**: the accepted claim stayed at 2 products /
medium where it should have reached 4 / high. **Fixed** — `DECISION_STANDS = {rejected, merged}`, with
the reasoning written into the code: `merged` is a tombstone whose evidence `adjudicate` already
absorbed, so it blocks and reports; `trial` does not block. `R3-1a` asserts the absorption as a
**positive**, so a future over-broad guard fails the test rather than passing it.

### R3-2 — LOW · `DECIDE: m` with no target crashed instead of refusing

`parseDecisions` throws on a bare `m`; `main()` did not catch it, so it escaped as a raw stack trace and
exit 1 — inconsistent with every other malformed input, and `unparsedDecideLines` (the function whose
entire job is naming unreadable `DECIDE` lines) reported nothing for it. **Fixed** — a try/catch around
the parse stage with a named `⚠`, the offending line, and "nothing was applied"; plus the bare `m` is
now reported by `unparsedDecideLines` too. **Superseded in part by R4-1.**

### R3-3 — MEDIUM (pre-existing, exposed by R2-1's own reasoning) · Receipts restating a ledgered claim were orphaned invisibly

A ledgered claim that gained receipts and matched no accepted claim had them absorbed **nowhere** and
reported **nowhere**. R2-1 fixed this for `rejected`/`merged`; `trial` and below-gate restatements were
still invisible. **Fixed** — a `grown-unmatched` event with a reason (`no-accepted-match` /
`below-auto-gate`), surfaced as `RESTATED BUT NOT CORROBORATED (nothing absorbed these receipts — your
call)`, naming the merge candidate when there is one. Nothing is written; the disposition is never
changed. **Superseded in part by R5-1.**

### R4-1 — MEDIUM · Round 3's fix was incomplete, one line below the fix

R3-2 wrapped the **parse** stage of `adjudicate`. `applyDecisions` throws for two further human-input
errors — a merge target that does not exist, and a merge chain — and those still escaped as raw stack
traces with exit 1. *Reproduced:* both, verbatim stack traces, exit 1. **Fixed** — the same try/catch
around the apply stage. `applyDecisions` is pure, so "nothing was applied" is exact rather than hopeful.

### R5-1 — MEDIUM · Round 3's new report fired on claims it should have stayed quiet about

`grown-unmatched` fired for **any** grown claim matching no accepted claim — including one with **no
ledger record at all**: a claim Sean has never adjudicated that merely gained a second receipt. That is
not an orphan. The claim is **pending**, `synthesize` has already regenerated it carrying the new
receipt, and the packet presents it for decision. The FYI said "nothing absorbed these receipts" about a
claim whose own row carried them, and printed its status as `unknown`.

*Reproduced:* `grown-unmatched | CLM-76c94b34f5 | no-accepted-match | status=unknown` for a
never-adjudicated claim. **Fixed** — the FYI requires an actual ledger disposition (`if (decided)`).

**This is the round's generalisable lesson, and it is why it has its own test file:** *a fix that adds a
**report** can be wrong in a way a fix that adds a **write** cannot.* A spurious write corrupts data you
can inspect; a spurious report corrupts the operator's attention and leaves no trace. Round 3 tested that
the FYI fires when it should. Nothing tested that it stays quiet when it shouldn't — which is exactly how
it shipped firing on every pending claim that gained a receipt.

### R6-1 — LOW, and about this report · The verification driver caught an overstatement in my own documentation

Writing `repro-6` — a driver that asserts each failure class against **its own** expected message —
immediately failed one of the four checks. Not the code: **the documentation.**

I had written, in both this report and the README, that "every human-input error fails the same way:
a named `⚠` and `nothing was applied`." That is true for three of the four classes and **false for the
fourth**. `DECIDE: accept` is *readable but unknown*: it skips **that one line**, the other letters in
the batch are still applied, and the message is `⚠ N DECIDE line(s) could not be read`. A bare
`DECIDE: m` makes the batch unparseable and refuses all of it. Those are genuinely different situations
and the engine was right to distinguish them; my summary had flattened them.

**Fixed in the documentation, not the code** — the distinction is now stated in both places, and
`repro-6` asserts each class's own message plus a **mixed batch** (one valid letter alongside one unknown
letter) so that "nothing was applied" can never be quietly applied to a case where something *was*.

This is the same lesson as R5-1, one layer further out: **a claim about behaviour is a claim, and it
needs the same hostile treatment as code.** The reason it was found is that the driver asserted the
message per class instead of asserting "exit 5" once and moving on — the weaker assertion would have
passed and left the false sentence in the report.

### R6-2 — MEDIUM, and in my own artifacts · The evidence scripts leaked operator identity

The mandatory pre-commit secret scan (`Rule 44`) — which only became able to *run* after the temp-path
problem in §7 was worked around — found **5 real hits, all `operator-identity`**, in the round-1 drivers
I wrote for this very review:

```
[SECRET FOUND: operator-identity in .../repro-1-full-loop.sh (lines: 4,5)]
[SECRET FOUND: operator-identity in .../repro-2-decided-claims-reappear.sh (lines: 4,5)]
[SECRET FOUND: operator-identity in .../repro-3-orphaned-restatements.sh (lines: 4,5)]
[SECRET FOUND: operator-identity in .../repro-4-merge-and-contradiction.sh (lines: 4,5,37)]
[SECRET FOUND: operator-identity in .../repro-5-post-fix-verification.sh (lines: 4,5)]
=== Scan summary ===  Scanned: 22 files   Hits: 5
```

Every one is a hardcoded absolute path embedding the Windows username — `NODE="C:/Users/<operator>/…"`
and a `file:///C:/Users/<operator>/…` module specifier. **The gate was right and I was wrong.** My
round-1 scripts were unportable *and* they leaked the operator's identity into a document destined for
the repo. I wrote the round-6 driver correctly (`git rev-parse --show-toplevel`, relative imports) and
never went back to the earlier five.

**Fixed** — all five now derive `REPO`/`DB` from `git rev-parse --show-toplevel`, use
`NODE="${NODE:-$(command -v node)}"`, and pass the module path via `process.env.DB`. Verified by
**re-running all five end-to-end** (exit 0 each) and confirming repro-4 still prints its contradiction
evidence — *and*, incidentally, the R2-4 guarded-build warning, which is the first real-CLI confirmation
of that fix.

Three things worth keeping:

1. **A gate that cannot run is a gate that is not protecting you.** This leak had been sitting in the
   staged set through every round of this review. It was found in the first 30 seconds the scanner
   actually completed — after five rounds of my own review had missed it, because I was reviewing the
   engine and never pointed the same hostility at my own drivers.
2. **The leak was in the *evidence*, not the code.** A hostile review that scrutinises the artifact under
   review and treats its own tooling as above suspicion has an unaudited surface exactly where the
   operator's identity and environment get embedded.
3. **Fix and then re-run the artifacts.** Removing a hardcoded path is the kind of change that silently
   breaks a script; "the grep is clean" is not evidence that the script still works. All five were
   re-executed, not just re-read.

### Rounds 2–6 mutation evidence

Every fix in every round was reverted individually and the suite was required to fail. All mutations were
reverted afterwards; no mutation residue remains (grep-verified).

| Mutation | Result |
|---|---|
| `runCorroborate` stops building `decidedById` (R2-1 wiring) | **RED** — `R2-1d` |
| `unparsedDecideLines` returns `[]` (R2-3) | **RED** — `R2-3`, `R2-3b` |
| `emit-vault` guard disabled (R2-4) | **RED** — `R2-4` |
| `nestedUnknownFieldErrors` unwired (R2-5) | **RED** — `R2-5` |
| `DECISION_STANDS` reverted to `!== 'accepted'` (R3-1) | **RED** — `R3-1a`, `R3-3a`, `R3-3c` |
| bare-`m` reporting disabled (R3-2) | **RED** — `R3-2a` |
| parse-stage catch rethrows (R3-2) | **RED** — `R3-2b` |
| `grown-unmatched` emits removed (R3-3) | **RED** — `R3-3a`, `R3-3b`, `R3-3c` |
| apply-stage catch rethrows (R4-1) | **RED** — `R4-1a`, `R4-1b` |
| `if (decided)` guards removed (R5-1) | **RED** — `R5-1a`, `R5-1b`, `R5-1c` |

**One test failure during this work was the apparatus doing its job, and is recorded rather than quietly
fixed:** `R3-3b` began failing after R5-1's guard landed. Its fixture used a claim with **no ledger
record**, so under R5-1 the FYI was correctly withheld — the fixture, not the code, was wrong. The test
now gives the claim a `trial` ledger disposition, which is the condition under which the FYI is actually
owed. A test that fails when you tighten a guard is telling you which of the two is wrong.

---

## 4. The one architectural issue behind F1 and F2

F1 and F2 are not two bugs; they are one.

`synthesize` regenerates claims from receipts, and `corroborate`'s idempotency filter treats
"already has a disposition event" as "already finished". Those two statements are compatible only while the
claim's evidence is immutable. It is not: receipts are append-only and the claim id is content-derived, so
*the same claim id keeps accumulating evidence across runs*. Whenever that happened, the pipeline had no
answer for it, and the two halves drifted:

| | derived (`claims-proposed.jsonl`) | asset (`claims.jsonl`) |
|---|---|---|
| after F2's scenario | 7 products, **high**, `proposed` | 2 products, **medium**, `accepted` |

The packet reads the derived file. So the human surface showed a claim the asset contradicted, and asked him
to decide it again.

The fix generalizes the idempotency predicate from *"has it been disposed?"* to *"has its evidence changed
since it was disposed?"* — which is what the `receiptRefs` accounting on disposition events now answers.
**The residual to watch:** any future field that makes a claim's *meaning* grow (not just its evidence) will
reopen this. The predicate is now explicit and testable, which is the durable part of the fix.

---

## 5. What I changed

All under `scripts/design-brain/`. Nothing committed.

| File | Change |
|---|---|
| `src/validate.mjs` | Recursive denied-field scan; `RECEIPT_KEYS`/`CLAIM_KEYS` allowlists enforcing `additionalProperties: false`. |
| `src/writer.mjs` | Audit ledger routed through `preflight` (jail + symlink + text), validated before the primary write. |
| `src/corroborate.mjs` | `grownProposed` pass (add-evidence-only); per-run receipt accounting on `receipt-count` (`receiptIds`); `alreadyCountedReceipts`; unique `runId`; `liveTarget` compounding (F9); disposition events carry `receiptRefs`; dead `byDomain` removed. |
| `src/adjudicate.mjs` | Dead guard fixed; merge absorbs evidence (`targetUpdates`, `mergedFrom`, rev+1); `ignoredDecisions` reported with `⚠ IGNORED` + exit 5. |
| `src/packet.mjs` | Withholds already-adjudicated claims and names them; will not overwrite a batch carrying letters. |
| `schemas/claim.schema.json` | Declares `rev`, `updatedUtc`, `autoUpdate`, `mergedFrom`, `runIdSeen` — the fields the engine already wrote. |
| `README.md` | Accurate metrics, corrected novelty semantics, convergence + grown-evidence notes, residuals section. |
| `package.json` | New `design-brain:test` script (`node --test "scripts/design-brain/tests/*.test.mjs"`). The quoted glob is deliberate: Node expands it internally, so it works under cmd.exe, sh and PowerShell alike. **Nothing ran these tests before** — no CI, no hook, no npm script — which is the same "a suite nobody runs" defect the project has hit before. |
| `tests/hostile-regressions.test.mjs` | **New**, 16 tests, one per finding, ids F1–F8 mapped to the code. Unit level. |
| `tests/loop-convergence.test.mjs` | **New**, 4 tests, spawning the real CLI entrypoints through 3 cycles. Process level — closes F12. |

### Round-2..6 changes (the fixes' own review)

| File | Change |
|---|---|
| `src/corroborate.mjs` | `decidedById` + `stale-decision-evidence` (R2-1/R2-2); **`DECISION_STANDS = {rejected, merged}` replacing the over-broad `!== 'accepted'` guard (R3-1)**; `grown-unmatched` with `reason` + candidate naming (R3-3); `if (decided)` guard so a **pending** claim is never reported as stranded (R5-1). |
| `src/adjudicate.mjs` | `unparsedDecideLines()` + `⚠ … could not be read` + exit 5 (R2-3); bare `DECIDE: m` reported as unreadable (R3-2); **try/catch around both the parse *and* the apply stage** (R3-2, R4-1) — every human-input error now fails the same named way. |
| `src/packet.mjs` | `NEW EVIDENCE ON DECIDED CLAIMS` FYI (R2-1); `RESTATED BUT NOT CORROBORATED` FYI naming the merge candidate (R3-3). |
| `src/validate.mjs` | `NESTED_KEYS` + `nestedUnknownFieldErrors`, wired into both validators (R2-5). |
| `src/emit-vault.mjs` | `--build` guarded: tool existence checked, build failure is a warning after a successful emit (R2-4). |
| `tests/hostile-round2-regressions.test.mjs` | **New**, 9 tests — R2-1…R2-5, including the CLI-level wiring test `R2-1d`. |
| `tests/hostile-round3-regressions.test.mjs` | **New**, 8 tests — R3-1…R3-3, with `R3-1a` asserting the trial absorption as a **positive**. |
| `tests/hostile-round4-regressions.test.mjs` | **New**, 2 tests — R4-1, both apply-stage throws. |
| `tests/hostile-round5-regressions.test.mjs` | **New**, 3 tests — R5-1, the FYI's *silence* cases. |

**Test evidence.** RED before the fixes (11 failing / 15), GREEN after: **81/81 passing** — the 39 original
tests unchanged and passing, plus 42 new across five rounds. Reproduce either way:

```bash
npm run design-brain:test
# or: cd scripts/design-brain && node --test tests/*.test.mjs
```

**Mutation evidence.** A green suite is only meaningful if it can go red for its own defect. **Twenty
mutations** were run — one or two per fix, each reverting the fix itself — and the suite was required to
fail for every one. The F12 table covers round 1; the R2–R5 table in §3b covers the rest. The two most
valuable: reverting round 1's F1 wiring left the suite **55/55 green** (F12), and reverting round 2's
R2-1 guard to its over-broad form turned a working corroboration into a no-op **while the suite stayed
green** (R3-1). Neither was visible by reading the diff.

The original 39 passing before *and* after is the honest headline of §3: they never covered the loop's
second cycle, which is where F1 and F2 lived.

---

## 6. Residuals and what remains UNVERIFIED

Stated plainly rather than inherited as green.

1. **The vault build itself — UNVERIFIED.** The `--build` *guard* is fixed and tested (R2-4), but the build
   needs the real WSL vault, so I have never seen `hermes2_brain_search.py build` run. The emit half is
   verified on Windows. **I am not claiming the build works.**
2. **`--vault` is not jailed.** The only destructive `rmSync` in the engine runs on a caller-supplied path
   with no jail, while every write is jailed. Scoped to `<vault>/collections/design-claims`, so blast radius
   is one collection — but the asymmetry should be a conscious decision, not an accident. **Still open.**
3. **Legacy `events.jsonl` rows** carry no `receiptRefs`, so their claims are treated as fully accounted and
   will not be re-examined by the grown pass. That is the conservative choice (preserves old behaviour on
   old data) and it means **pre-existing roots need one fresh cycle with new receipts before the grown pass
   helps them**. No data migration was written, deliberately. **Still open.**
4. **`receipt-count` semantics changed** from "receipts behind undisposed claims" to "receipts reviewed this
   run, not previously counted". On an existing root, historical novelty rows were computed under the old
   definition. `novelty.mjs` is point-in-time by design, so this is a forward-only correction — but a root
   with real history will show a discontinuity in its rolling number at the boundary. **Still open.**
5. **The two FYI kinds re-fire on every run while unresolved, deliberately.** `stale-decision-evidence` and
   `grown-unmatched` are *not* in `DISPOSITION_KINDS` and therefore not in `accountedByClaim`, so a claim
   whose receipts nothing absorbed keeps reporting until a human acts. The alternative — mark it reported
   once, then stay quiet — was **rejected on purpose**: "reported once, then silent" is precisely how an
   unresolved state gets forgotten, which is the defect R2-1 exists to fix. Cost: one event and one packet
   line per unresolved condition per run. Bounded, small, and inspectable. **A conscious trade, recorded so
   a reviewer can disagree with it.**
6. **A pending claim that gains receipts and sits below the auto-gate gets no merge suggestion.** It is in
   `grownProposed`, not `proposed`, so the `merge-queue` FYI does not reach it — while R5-1 correctly keeps
   it out of `grown-unmatched`. The claim *is* visible in the packet, so nothing is hidden; the suggestion
   is simply absent. **Open, low value, and NOT fixed blind** — it needs a judgement about whether a pending
   claim should be nudged toward merging at all, which is a design question, not a defect.
7. **Remaining uncaught throws, and why they are left that way.** After R4-1 the only throws reachable from
   a CLI that are *not* caught are: the data-root jail (`paths.mjs`), the writer's symlink / binary / escape
   refusals (`writer.mjs`), and `synthesize`'s "produced an invalid claim" invariant. These are not usage
   errors — they are invariant and security refusals, and for those a **loud stack trace is the correct
   response**; catching them into a tidy `⚠` would make a jail violation look like a typo. This is a
   deliberate line, drawn explicitly, and it is the one place where "every human error fails the same named
   way" is intentionally not the rule.
8. **Not reviewed:** the Design Brain canon corpus (`design.md`, `design.html`, `components.md`,
   `website-archetypes.md`, `cinematic-pages.md`) for internal consistency, and the Mobbin D1 ToS gate. Both
   are separate work — but see §8.6, which is the same structural defect as F2 one layer up.

---

## 7. Rule 46 status, and what the commit is (and is not)

Per the project's review chain (builder → Gemini → Codex hostile review → **Fable as Final Decider and
commit gate**), this work is a **builder pass**. Sean instructed that it be committed so a later agent can
hostile-review the committed state, and that is what the commit is for. **It is not the gate.**

- **What the commit is:** a *review candidate*. A pinned revision another agent can diff against, run
  against, and mutate — rather than a dirty tree of ~990 unrelated files where the design-brain changes
  cannot be told apart from the social-feed and hooks workstreams.
- **What the commit is not:** a claim that the work passed review. Codex's hostile review of these fixes
  remains **outstanding and is mandatory input**; Fable is the decider. The commit does not pre-empt either.
- **Scope:** staged by **explicit path only** — `scripts/design-brain/`, the review packet, and the one-line
  `package.json` test script. **No `git add -A`**, per Rule 67: two other agents' uncommitted workstreams are
  in this tree and `git add -A` would sweep them into this commit.
- **The commit is a review *target*, not a deployment.** Nothing here touches the server or the storefront.
- ⚠ **The tree moved under this review.** HEAD advanced from `83a19d456` to `9c7ffca4c` mid-session via
  two commits I did not make and that do not touch `scripts/design-brain/`:
  `25c0083bc feat(social): S1-S4 social dashboard upgrade…` and
  `9c7ffca4c perf(hooks): stop pre-commit secret scan forking a grep per pattern per file`.
  That is the Rule 67 parallel-agent situation, not a fault in this work — but the revision round 1
  *reviewed* is not the revision that was *committed*. A diff-based review should pin the range explicitly:

  ```bash
  git log --oneline -1 -- scripts/design-brain   # the commit to review
  git diff 83a19d456 -- scripts/design-brain     # round-1 baseline -> now
  ```

### ⚠ The pre-commit hook could not run, and misreported why — a separate defect, for Sean

Landing this commit hit an environment problem that will hit **every** commit in this tree, so it is
reported rather than worked around silently.

`.githooks/pre-commit` runs `scripts/scan-secrets.sh`. In this environment the scanner **died ~27–31s in,
before scanning anything**, at its own `rm -f "$tmp"` (line 337/342/359). `rm` here is a **shell
function** (`$CODEBUDDY_SAFE_DELETE_BIN_DIR/rm` → `Z:\Budd\…\genie-trash\win32-x64.exe`), and
genie-trash resolves its argument **relative to CWD**, turning the temp path into
`<repo>/C:\Users\<operator-8dot3>\AppData\Local\Temp\tmp.X` → `CanonicalizePath` fails → fail-closed → non-zero
→ the scanner's `set -e` kills it. Reproduces with `dangerouslyDisableSandbox: true`, so it is **not** a
sandbox-flag issue — the shim is injected into the shell either way.

Two consequences worth separating:

1. **The hook misreports the failure.** The scanner distinguishes internally (`scan_rc != 0` →
   *"SECRET SCAN FAILED"* vs hits → *"SECRETS DETECTED"*), but the hook prints
   **"COMMIT BLOCKED: secret-pattern detected in staged changes"** for *any* non-zero exit. So an
   environment crash is reported as a **secret detection**. That is a fail-closed gate giving a
   confidently wrong reason — and it means the first thing a reader does is hunt for a secret that does
   not exist. **Suggested fix:** have the hook branch on the scanner's exit code, or have the scanner
   return a distinct code for "scanner error" and surface that text.
2. **The scan was therefore not running at all.** Once the temp path is made canonicalizable
   (`TMPDIR=<repo>/tmp/…`), the scanner completes in ~5 minutes and **immediately found the 5 real
   `operator-identity` hits in R6-2.** So the gate is not merely noisy — it was blind, and it had been
   blind for every commit in this environment. **Suggested fix:** make the scanner use a temp location
   it can clean up (e.g. `mktemp -p "$REPO_ROOT/tmp"`, or skip the trash shim for its own temp files),
   and/or have the heartbeat assert the scanner completes rather than merely exits non-zero.

I did **not** use `git commit --no-verify`. Rule 44 makes the scan mandatory and the hook's own docs call
the bypass emergency-only; the correct move was to make the gate able to run, fix what it found, and let
it pass on its own merits. It does.


## 8. Recommended next steps

1. **Codex hostile review** of the committed revision, with the silent-failure claims (F1, F2, R2-1, R3-1,
   R5-1) as the primary target — specifically: try to make the loop diverge again, or make an FYI fire on a
   claim it should ignore. Note that the *obvious* mutations are now caught, so a reviewer must go a level
   deeper than reverting wiring. Three concrete hypotheses worth attacking, all of which the current tests
   would miss if they were wrong:
   - **Make the predicate wrong rather than absent.** Account for a claim's receipts using the wrong id, or
     widen `alreadyCountedReceipts` so the novelty denominator silently shrinks again.
   - **Attack `DECISION_STANDS` from the other side.** Is there a status that *should* block but is not in
     the set? `proposed` is unreachable in `claims.jsonl` today — prove that, or find the path that makes
     it reachable.
   - **Attack the FYI's silence again.** R5-1 fixed one false-positive class. Is there a second? The
     condition `decided && DECISION_STANDS.has(...)` and the `if (decided)` guard are two separate
     predicates over the same field; a case that satisfies one and not the other is where the next bug is.
2. ~~A convergence test at the CLI level.~~ **Done** — `tests/loop-convergence.test.mjs`, 4 tests,
   mutation-verified to go red when either round-1 fix's wiring is reverted.
3. ~~Wire the suite so it is not a suite nobody runs.~~ **Done** — `npm run design-brain:test`.
4. ~~Decide the `--build` guard.~~ **Done** — R2-4. The build itself is still UNVERIFIED (§6.1); run it
   against the real vault once and record the result.
5. **Decide the `--vault` jail question** (§6.2) — one line either way, but make it deliberate.
6. **Next review target, with a concrete hypothesis.** `docs/ai-workflow/design-brain/README.md:33` states
   that `design.md` is canonical and `design.html` "mirrors it visually for humans. **If they disagree,
   `design.md` wins** — and whoever notices updates both together in the same pass." That is the *same
   structural defect as F2*, one layer up: two views of one truth, with the reconciliation rule stated in
   prose and **enforced by nothing**. There is no test, no script, no check. Both files currently share a
   checkout mtime, which proves nothing about content. Sweeping the canon corpus (20+ files in
   `docs/ai-workflow/design-brain/`) for internal contradictions and drift against
   `SWAN-CINEMATIC-DESIGN-SYSTEM.md` is the highest-value unopened surface I found.
7. Then, and only then, the D1 pilot: steps 1–6 against one D01 surface across 3–4 products, ≤12 results.
   The engine is now trustworthy enough for that; it was not before F1 and F2.

---

## 9. The method, stated once, for whoever reviews this next

Six rounds produced 24 findings. The distribution matters more than the total:

| Round | Object of review | Findings | Found by |
|---|---|---|---|
| 1 | the engine | 12 | executing scenarios |
| 2 | round 1's fixes | 5 | executing scenarios against the fixed engine |
| 3 | round 2's fixes | 3 | executing the *pre-fix* code path for comparison |
| 4 | round 3's fixes | 1 | asking "what is one line below this fix?" |
| 5 | round 3's fixes, again | 1 | asking "when must this stay quiet?" |
| 6 | **this report's own claims and tooling** | 2 | asserting each claim separately; and finally getting the mandatory secret gate to run |

Three of the later findings were **defects I introduced while fixing the previous round**, and none of
them were visible in a diff. The four questions that found everything, in order of yield:

1. **"Does this guard catch something it must not?"** — found R3-1 (trial blocked) and R5-1 (pending claim
   reported). Both were *additions*; both were wrong in the direction of being too wide.
2. **"Is this wired, or does it merely exist?"** — found R2-2 and R4-1.
3. **"Is this sentence true for every case it covers?"** — found R6-1. It is the same question as (1),
   asked about prose instead of code, and it found a false claim in this document.
4. **"Is my own tooling above suspicion?"** — found R6-2. Five rounds reviewed the engine; the first
   30 seconds of a *working* secret scan found the leak in my own drivers. The artifacts of a review are
   part of the reviewed surface, and they are the part least likely to be pointed at.

The posture that produced **nothing** was re-reading the diff for correctness. I did that between every
round and it found zero findings. **Read the diff to find what changed; execute the engine to find what
broke; assert every claim individually, because the aggregated version is the one that lies; and turn
the hostility on your own evidence scripts, because nobody else will.**

---

## 10. How to verify any of this yourself

```bash
# the whole suite, 81 tests
npm run design-brain:test

# the consolidated rounds 2..5 driver: suite count, per-file isolation, mutation residue,
# all four error classes with their OWN messages, and the three guards in both directions
bash docs/ai-workflow/AI-HANDOFF/design-brain-hostile-review-2026-09-18/repro-6-rounds-2-5-verification.sh

# round 1's defect reproductions
bash docs/ai-workflow/AI-HANDOFF/design-brain-hostile-review-2026-09-18/repro-1-full-loop.sh
bash docs/ai-workflow/AI-HANDOFF/design-brain-hostile-review-2026-09-18/repro-3-orphaned-restatements.sh
```

Two environment traps that cost time and will cost a reviewer time again:

- **Use a Windows-form data root** (`C:/tmp/db-x`). An MSYS path (`/c/tmp/db-x`) is resolved by native
  Node as `c:\c\tmp\db-x`, and the engine then writes somewhere that *looks* like a jail bug. It is not.
- **Mutation patches must tolerate CRLF.** Patterns containing a bare `\n` silently fail to match in this
  checkout; the mutation script reported "MUTATION DID NOT APPLY" rather than a false green, which is the
  only reason it was noticed. Use a regex with `\s*` or a newline-free anchor.
