---
lesson: "`node --test a.mjs b.mjs` exits 0 and prints NOTHING when b.mjs does not exist, as long as one path resolves. A typo'd path in a multi-file verification batch is completely invisible: 3 of 11 suites silently did not run and the batch reported `# pass 188, exit 0`. Assert every path exists before running the batch, and prefer the per-suite sum over the batch total. Same session: a test that used the gate's REAL state dir instead of the injectable one passed exactly once and failed every run after — green on the machine that wrote it, red on the next."
originating_model: claude-opus-5
date: 2026-09-01
surface: vs-claude
linear: SWA-218
status: durable
models_used:
  - model: claude-opus-5
    role: builder of both gates, then hostile reviewer of its own repairs
    did: "Repaired the six Codex findings (invocation-plan parser, smallest-first settlement, shared atomic-claim). Then, preparing the PR, found BOTH of its own instrument failures: a non-hermetic CODEX-6 and a batch that ran 8 of 11 suites while exiting 0. Verified the node behaviour with an explicit negative control, fixed the test, proved re-runnability across three consecutive runs, opened PR #104."
    cost: subscription
  - model: codex
    role: hostile reviewer of the two gates as a pair
    did: "Returned six findings, four of which turned out to be one defect (both gates flattening a command LINE into SCALARS). Also correctly demanded the two gates be tested TOGETHER, and demanded the atomicity fix be SHARED with the spend ledger rather than reimplemented. Every finding reproduced as RED."
    cost: subscription
skills_touched:
  - id: verification-before-completion / hostile-review-playbook — proposed addition
    change: proposed
    failure: "The playbook's 'validate the instrument' move covers browser probes and greps but not TEST RUNNERS. Nothing said `node --test`'s exit code does not certify that the files you named ran. Proposed move: before believing a multi-file batch, assert each path with `[ -f ]`, and cross-check the batch total against the sum of per-suite runs — they disagreed here by 37."
  - id: test-delta disclosure (memory law)
    change: reinforced
    failure: "A pass count is not proof if the count came from a batch whose membership was never checked. The existing law covers 'assertions you just rewrote'; this session shows the sibling case — SUITES THAT NEVER RAN."

---

## The lesson

Two failures, one family: **a result was believed without checking that the thing producing it had actually run.** Both were mine, both surfaced only because I went looking before opening a PR I was about to call green.

### 1. `node --test` exits 0 on a missing file, silently

Verified by negative control, which is the only reason I trust the claim:

```
$ node --test scripts/hooks/definitely-not-here.test.mjs
exit=1   Could not find 'scripts/hooks/definitely-not-here.test.mjs'

$ node --test scripts/lib/atomic-claim.test.mjs scripts/hooks/definitely-not-here.test.mjs
exit=0   # tests 4  # pass 4  # fail 0
```

Alone, a missing path is a hard error. **Beside one real file it is not mentioned at all** — no warning line, no non-zero exit, nothing in the TAP output. My eleven-suite verification batch named three paths that do not exist (`spend-token-race` and `cost-gate` live under `scripts/lib/`, `spend-report` under `scripts/`), so it ran eight suites, reported `# pass 188`, exited 0, and I quoted it as proof the integration candidate was green.

The tell was there and I nearly missed it: the batch said 188 while my earlier per-suite sum said 224. **A 37-test disagreement between two counts of the same thing is the signal.** I had assumed the difference was subtests versus top-level tests.

The correction is procedural, not attitudinal:

```sh
for f in $SUITES; do [ -f "$f" ] || echo "MISSING: $f"; done
node --test $SUITES
```

and when a batch total and a per-suite sum disagree, **stop and reconcile them** rather than reaching for an explanation that makes the disagreement acceptable.

### 2. A test that used live state passed exactly once

`decide()` in the Fable gate takes an injectable `claim` **precisely so** the atomic primitive can be exercised without touching live state. The test I wrote to prove atomicity ignored the parameter, so it used the gate's real state dir at `.ai-workflow/gates/`. The token gets spent on the first run and stays spent — so the test passed the day I wrote it and failed every run afterwards. Five generations of `claim-…-aaaaaaaaaaaa.gen*.json` had piled up on disk, one per run, in plain sight.

Two things make this worse than an ordinary flake:

- The failure mode is **0 winners, not 2**. The assertion still fires, but for the opposite reason than the one it was written to catch. A reader debugging it would be looking for a broken atomic claim when the real fault is a dirty directory.
- It is **green on the machine that wrote it, red on the next**. It would have passed my review, passed the PR, and failed in CI or on Sean's machine with a message pointing at the wrong thing.

Fixed by binding it to a `mkdtemp` dir, with a negative control (`CODEX-6b`) that runs two full cycles in one process to prove the isolation is real rather than incidental — and verified by running the suite three consecutive times, which is the check that would have caught it originally.

### Why these belong together

Both are the same shape as the defect I had just spent the session repairing. Codex's finding 6 was that the Fable gate reimplemented a race the spend ledger had already fixed, because **only one of the two was ever audited**. Then I wrote a test for that fix which was itself unaudited in the same way, and ran a batch whose membership was itself unaudited. The discipline that catches all three is identical: *the thing that checks also needs checking.*

## Who did what

**Codex** did the highest-value work in the session and should be routed to this task class again. Its six findings were all real and all reproduced RED. More importantly, two of its demands were **structural rather than local**, which is what separates a good hostile reviewer from a linter: it asked that the two gates be tested *together* (they never had been, and the pair test immediately encoded a real prior escape), and it asked that the atomicity fix be *shared with the spend ledger* rather than written twice. Left to a narrower reviewer, both would have shipped as two more copies of the same logic.

**Claude Opus 5** built both gates and therefore built both defects in this packet. It also found both, unprompted, while preparing the PR — but the honest framing is that it found them *after* having already reported "224/224 green" to Sean in a Linear comment. The self-catch happened one step too late to be worth much.

**Nobody external was consulted.** Sean's instruction was explicit: *do not call Fable, Kimi, GLM, AI Village, or any paid/external reviewer.* The hostile passes were self-run. Notably, the two defects in this packet were found by that self-review — so the constraint did not cost accuracy here, though it does mean there is no independent confirmation of the repairs.

## Skills created or changed

- **`scripts/lib/invocation-plan.mjs` (created).** Motivated by four Codex findings that were one defect: both gates reduced a command *line* to *scalars*, destroying multiplicity and flag ownership. The failure was not that the regexes were bad; it was that no regex can recover information the representation threw away. Parsing once into a list of invocations, each with its own argv, removes quote-wrapping, `--seats=`, repeated panels and encoded loaders as a *class*.
- **`scripts/lib/atomic-claim.mjs` (created).** Motivated by the spend ledger having fixed this exact race months earlier while the Fable gate kept its own broken copy. Extraction rather than a second patch, so there is one implementation to audit.
- **`scripts/hooks/gates-together.test.mjs` (created).** Motivated by the fact that nobody had ever run the two gates against the same command; the first comparison found Fable riding through the panel ungated.
- **Verification procedure (proposed, not yet a mechanism).** Assert path existence before a `node --test` batch; reconcile batch total against per-suite sum. This packet is currently the only place that is written down, which by this repo's own history means it will be forgotten — it belongs in the hostile-review playbook as a named move.

## Mistakes I made

- **Reported "224/224 green" to Sean on Linear from a batch that ran 8 of 11 suites.** The number itself happened to be right (I had also run each suite individually), but the *evidence I would have pointed at* was wrong, and I did not know that when I posted it.
- **Explained away a 37-test discrepancy instead of reconciling it.** Batch said 188, per-suite sum said 224. I assumed subtests. Reaching for the explanation that preserves the conclusion is exactly the move this repo keeps punishing.
- **Wrote a test that ignored the injection point I had built for it.** I added the injectable `claim` parameter to `decide()` in the same session, specifically so tests would not touch live state, then wrote the test without it.
- **Never re-ran the Fable suite a second time.** One consecutive re-run — five seconds — would have caught the non-hermetic test immediately. I ran it once, saw green, and moved on.
- **Left five generations of test artifacts in `.ai-workflow/gates/` across four separate runs without ever looking in the directory.** The evidence accumulated visibly for hours.
- **Repeated a mistake I had already written up this session.** I hit the "content with shell metacharacters must not travel through Bash" trap *again* when creating the PR body via heredoc, after having already been blocked by my own gate on exactly that earlier. The write-up had not changed the behaviour; using the Write tool did.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Shell metacharacters through Bash heredoc | 2 | **Yes** — noted after the first block | Using the Write tool. The note did not work; the tool change did. |
| Believing a green result without validating the instrument | 3 (probe under Git-Bash `/tmp`; batch with missing paths; single-run non-hermetic test) | Yes, as a memory law about *browser probes* | Explicit negative control per instrument class. The law was too narrow — it named probes, not runners. |
| Fixing one copy of a duplicated defect | 2 (Codex finding 6; the gates never compared) | Partly | Extraction into a shared module, so there is one thing to audit rather than a discipline to remember. |
| A fix creating the conditions for the next finding | 2 (per-invocation holds broke oldest-first settlement) | No | Nothing yet. This is the workstream's signature and deserves its own move: after any change to a data shape, re-derive the invariants that consumed the old shape. |

The row that matters most is the first: **a mistake I had documented, in the same session, recurred anyway.** That is the proof that write-ups are not fixes. The correction that held was procedural — change the tool — not resolutional.

## External-model calibration

No paid or external model was called this session; Sean's instruction forbade it. Recorded for the routing table anyway, from the work that was done:

- **Codex** (subscription, no marginal cost): 6 findings, **6 real** on verification, 0 disproven. Two were structural demands that a local reviewer would not have made. High value per call for *pair-level* review of security-adjacent code; route here again.
- **Claude Opus 5 self-hostile-review**: found 2 additional real defects that Codex did not (both instrument failures, both in the *verification* rather than the code under test). Cheap and worth running, but it found them late — after a completion claim had already gone out.
- **Ox Alpha**: still 404. Removed from the panel's default roster in this work. Restating for the corpus, because it invalidates old evidence: Ox **was** GLM-5.3 Flash, so any prior "Ox and GLM independently agreed" was one family voting twice and is not corroboration.
