# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COMMS-LANE-KEEP-OR-DISCARD-PACKET-2026-08-13.md
**Seed:** (none)
**Tokens:** 2455 in / 5027 out | **Cost:** ~$0.0828 | **Wall:** 182.4s | **finish_reason:** stop

---

# Hostile Review: Keep/Discard/Superseded Analysis

**Verdict up front: the document's evidence-gathering is better than its conclusions. The section 5 table outruns the section 2 evidence by a wide margin, and the author knows it — section 6 is a confession that the recommendations rest on unverified premises. A recommendation table and a list of "questions I want attacked" that undermine those very recommendations should not coexist in the same document.**

---

## Finding 1 (decision-changing): The third weak-evidence-as-proof citation is the notifications "superseded" verdict

The author was caught twice today. Here is number three, and it is the load-bearing claim of the entire review:

**Section 2 declares "Notifications — YES, superseded" on the strength of (a) filename similarity, (b) a newer date, and (c) one concept grep.** That evidence proves two designs *coexist*. It does not prove main's covers the branch's. The author then converts this into "DISCARD" in section 5 — and then in section 6 Q1 admits main's read-state model "may be a *thinner* feature," i.e., admits the supersession claim is unverified, while leaving the DISCARD recommendation standing. That is exactly the pattern from the two earlier catches: a plausible proxy measurement (file exists, date is newer) cited as proof of a functional claim (the work is redundant).

The tell is internal: the author's own counter-case in Q1 — delivery ledger + audit log + retry worker vs. read-state — if true, means main solved a *smaller* problem and the recommendation throws away the larger implementation. **A DISCARD call resting on a premise the author simultaneously flags as unverified is not a recommendation; it is a coin flip with a table around it.**

### What would actually prove supersession (Q2, answered)

Not file existence, not grep, not dates. Supersession is a *behavioral coverage* claim, so:

1. **Route/surface diff.** Enumerate the branch's notification endpoints and events (`git grep` the branch's routes for the delivery model's call sites). Enumerate main's. If main exposes no equivalent of per-channel delivery status, retry, or audit, the branch feature is not covered — full stop, regardless of which model is "better."
2. **Schema expressiveness test.** Apply the branch migration to a scratch DB; attempt to represent the same states (delivery attempt, channel, status, timestamp, retry count) in main's `NotificationReadState` schema. If main's schema cannot express them, the designs are not in a subset relation and "superseded" is false.
3. **Test porting.** If the branch has notification tests, run them against a scratch checkout of main with the branch's routes grafted in. If main's own notification tests exist and cover retry/audit semantics, cite *those tests* as the supersession proof — a passing test suite is the only instrument here that measures behavior.
4. **Decision-record search.** `git log origin/main --oneline --grep=notification -i` and `git log origin/main --all-match --grep=delivery` — was the delivery-ledger design *evaluated and rejected*, or simply never seen? A rejection commit or PR message is positive proof of supersession-by-decision. Silence means the branch work was never considered, which is a different situation requiring a different call (escalate, don't discard).
5. **Deliberate-removal check (this one is cheap and was not run):** `git log origin/main --diff-filter=D -- backend/models/NotificationDelivery.mjs backend/models/Location.mjs backend/models/TrainerApplication.mjs`. If any of these paths existed on main and were *deleted*, that is direct evidence of a decision, and it flips the section 5 KEEP calls to DISCARD. The author ran forward-looking existence checks but never looked for deletions. **This single command could change two lanes' verdicts and takes ten seconds.**

---

## Finding 2 (decision-changing): Every "cherry-pick to main" call is untested against a 1,838-commit gap — and the author already archived the tool that would test it

Q4 asks "am I under-weighting the gap?" Yes, and the framing undersells it: the document promises "commands shown" for everything, shows a `git apply` archive step in section 4, and then **never runs `git apply --check` or a dry-run cherry-pick on a scratch worktree** for any of the three KEEP lanes. The instrument exists, was used once for archival, and was not pointed at the actual question.

This is decision-changing because the ordering claim ("tooling first, zero risk") is precisely the kind of assertion that dies on first contact with a 1,838-commit gap. The audit scripts were written against the June tree — they may audit a codebase that no longer exists and emit confident false results. "Lowest risk" is asserted, not measured. One `git worktree add` + `git cherry-pick --no-commit` per lane converts all three KEEP calls from vibes to data.

---

## Finding 3 (decision-changing): Section 1 uses the instrument Section 2 forbids

Section 1 declares 437 files "already on main" via `git cat-file -e origin/main:<path>` — **path existence**. Section 2 opens with "Path-existence cannot answer this." The author disqualifies an instrument and then continues to rely on the accounting it produced. The 437 number feeds the "25 landed, that work is safe" narrative, but path equality is not content equality: a file at the same path on main may be an older, newer, or divergent version. The correct check is blob-hash comparison (`git rev-parse origin/main:<path>` vs. the branch blob), which is no harder than the check that was run.

Same class of error as the two earlier catches: a cheap proxy (path exists) cited as proof of an expensive claim (content landed safely).

---

## Finding 4 (process-changing, not verdict-changing): The recommendation contradicts the governance the document itself invokes

Section 3: the stale lane "per Rule 67 R5 must not be silently seized." Section 5: "DISCARD the port." Discarding the port is a strictly stronger intervention than seizing the lane — it renders Codex's 68 files of integration deltas and the IN PROGRESS lane moot, unilaterally, while the lane owner is absent. The document cannot simultaneously claim Rule 67 R5 protection for the lane and recommend the action that kills it. Q5 ("who is allowed to close it?") is therefore not an open question to be attacked — it is a **blocker** on the comms row of the table. The comms recommendation should read "escalate to lane owner with evidence," not "discard."

Secondary contradiction: Q3 correctly notes that two weeks unlanded "might be a decision someone made" — and then the table recommends landing gym-ops and trainer economics anyway. "KEEP — cherry-pick to main" is not a keep call; it is a *land* call, which requires the decision-record evidence the author admits is missing. The honest row label is "KEEP — pending decision-record check" (see Finding 1, check 5).

---

## Finding 5 (minor): Smaller overclaims, ranked

- **"74 unpushed commits ... in the Z: bundles, so not unbacked."** No command shown, violating the document's own header promise. Bundle freshness is unverified — a bundle predating the last commit is not a backup of it. `git bundle verify` + bundle tip vs. branch tip comparison, or retract the "so not unbacked."
- **"drift-check is proving itself every session."** The hook *firing* proves the skill executes. It says nothing about whether its output is correct or acted on. Firing is uptime, not value.
- **"462 docs cost nothing."** False. Landing 462 historical ledgers onto main re-introduces stale truth into every future grep, doc search, and agent context window. The cost is confusion, not disk. The real options are keep-on-branch or curated subset; "keep cheaply" skips the analysis.
- **Section 4's "IN-HISTORY (all sampled)"** proves *paths* exist in history, not that untracked worktree content matches the committed blobs. Codex could have edited after checkout. The 68-file patch archive mitigates this, but the claim as written overreaches the probe.

---

## Ranking by decision impact

| # | Finding | Acts on it → decision changes? |
|---|---|---|
| 1 | Notifications "superseded" is unproven (third weak-evidence catch) | **Yes — flips comms from DISCARD to "functional diff, then escalate."** The behavioral-coverage checks in Finding 1 are the actual proof standard. |
| 2 | No cherry-pick/apply dry-run across a 1,838-commit gap | **Yes — all three KEEP calls are conditional until a scratch-worktree dry-run passes.** Cheap to run; the author already has the tooling warm. |
| 3 | Deliberate-removal check (`--diff-filter=D`) never run | **Yes — could flip gym-ops/economics from KEEP to DISCARD** if main deleted these paths on purpose. Ten seconds to run. |
| 4 | Section 1's path-existence accounting contradicts Section 2's own standard | Partially — recompute the 437 with blob hashes; mostly affects the "safe" narrative, not lane verdicts. |
| 5 | Discard-the-port vs. Rule 67 R5 contradiction | No verdict change, but changes *who acts*: comms row becomes an escalation, not a decision. |
| 6 | Bundle freshness, drift-check "proving itself," docs "cost nothing" | No — cleanup of overclaims. Fix the wording or show the commands. |

**Bottom line:** run the four cheap commands (dry-run cherry-picks, `--diff-filter=D`, blob-hash recount, `git bundle verify`) and the one expensive one (functional coverage diff for notifications) before anything in section 5 is acted on. As written, the table is three unverified land-calls, one unverified discard-call that contradicts the document's own governance rule, one correct trivial discard (scratch files), and one mislabeled cost assessment (docs). The author's self-diagnosis in section 6 is accurate; the error is shipping recommendations anyway.
