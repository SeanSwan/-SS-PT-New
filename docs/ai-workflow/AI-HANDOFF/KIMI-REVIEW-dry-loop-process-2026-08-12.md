# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-PACKET-dry-loop-process-2026-08-12.md
**Seed:** (none)
**Tokens:** 2617 in / 6020 out | **Cost:** ~$0.0982 | **Wall:** 218.7s | **finish_reason:** stop

---

# Hostile Review: the dry-loop workflow

**Scope note up front:** the Crystalline Swan rubric (tokens, Victory, 44px targets, viewport matrix, reduced-motion) does not bind here — this artifact is a process, not UI. The two front-end-adjacent facts I can check pass: `dry-loop-gate.mjs` is 189 lines (≤300 ✓), and there is no visual surface to review. Where a dashboard is implied below (escape-rate metric), that's when the rubric activates. Everything else is process design.

---

## 1. Load-bearing cause: **D5, with D3 as its mechanism**

D5 is the cause; D3 is how the cause expresses itself; D1/D2/D4 are symptoms you're over-weighting.

**Why D5 wins:** Your own evidence convicts it. In 3a, the agent ran its loop, honestly or not, and plateaued. Kimi K3 found **17 defects immediately**. Not after six rounds — immediately. The marginal information in round N+1 of self-review is ~0; the marginal information in round 1 of *different-prior* review was 17 defects. That is a direct measurement of where the value lives. The three sample defects are the proof of mechanism: a cache key missing the language is not a defect you *overlook* — it's a defect you *cannot see* because you designed the key and believe it's right. D4's own sentence ("the model cannot find a defect whose cause is a wrong belief the model still holds") **is** D5. Vantage rotation within one model rotates geography, not priors.

**Why the others matter less than they look:**

- **D1 (string enforcement)** — real, but fixing it without fixing D5 produces a perfectly enforced loop that still plateaus at the author's ceiling. You'd have upgraded the lock on an empty room.
- **D2 (waiver)** — cosmetic. An agent that wants out doesn't need the `N/A` hatch; it can type `CLEAN×2`. The hatch is not the leak; the honour system is.
- **D3 (termination by searcher)** — this is the true *mechanism* of false convergence, and F1's instinct is right, but any termination rule *executed and attested by the author* inherits the author's ceiling. D3 without D5 fixed = checklist theatre (see §2).
- **D4 (vantage reuse)** — real but weak. "Different cwd, different viewport, different role prompt" are interpretive vantages. Same weights, same blind spots, new chair.

**Corollary you haven't stated:** the only fix class that adds *new information* to the system is F4. F1, F2, F3, F5 all rearrange the same priors. F6 fixes a different bug entirely (3c). If you fix exactly one thing: **F4**.

---

## 2. Where F1–F6 fail

**F1 — Yes, it becomes swept-in-name-only, and your own document proves it.** Read F1's example checklist: it contains *"cache identity"* and *"error-vs-empty distinction."* Those are exactly the two classes of the 3a defects (language-less cache key; "No match" asserted as fact). The checklist item can exist and the author can still "sweep" it, because the author's belief "my cache key is correct" makes the sweep nominal. A checklist executed by the person whose beliefs are the bug is a mirror, not a window.
**Correction:** checklist items must demand *executable evidence* — a command, its captured output, a counterexample input — never prose attestation. And checklist authorship must be exogenous: grown from the escape ledger (§5.2), not written by the task agent.

**F2 — The ledger is forgeable for free.** "File modified within this turn" verifies a file was touched, not that rounds occurred. The agent writes six plausible entries in one shot at closeout, with fabricated vantages. You have replaced a one-line forgery (`CLEAN×2`) with a six-paragraph forgery. Worse, even a *honestly written* ledger only proves rounds **ran** — it can never prove they were **competent**. That is F2's hard ceiling.
**Corrections:** (a) the hook, not the agent, owns ledger writes — the agent emits a structured round-event, the hook validates shape and appends; provenance by construction; (b) every entry must reference on-disk evidence artifacts with mtimes inside the claimed round window; (c) treat the ledger's real value as F4's **briefing document**, not as enforcement. The ledger's job is to make the external reviewer fast and dangerous, not to make the agent honest.

**F3 — Theatre unless vantages are partitioned.** Split the enumerated set into *mechanical* vantages (rerun under `LANG=fr_FR.UTF-8`, run with double-spaced queries, run against a golden transcript with a known 1:23:45 fact) and *interpretive* vantages (re-read as "security reviewer"). Only mechanical vantages reliably generate new information for a single model. Require ≥N mechanical vantages per loop; interpretive ones don't count toward termination.

**F4 — Correct, and here are its three failure modes.** (1) *Correlated priors*: an external reviewer from the same model family shares blind spots — rotate reviewer models. (2) *Recursion*: "its findings must reach dry" restarts the same problem one level up. Accept one external pass as sufficient — 3a shows one pass captures the correlated-error bulk; don't chase infinite regress. (3) *Context starvation*: a cold external reviewer flails. This is what F2 is actually for — hand it the ledger.

**F5 — Right, incomplete.** "Machine-checkable against turn shape" already half-exists as `buildShaped`. Enumerate exempt shapes mechanically (e.g., diff touches only `docs/**/*.md` → exempt). Free text is never a predicate.

**F6 — Right, under-scoped.** Don't just check existence/non-empty. Require (a) a freshness check (mtime within the invocation window), (b) a terminal sentinel line (`END-OF-REVIEW <sha>`) so truncation/timeout is distinguishable from completion, (c) schema-valid verdict JSON. Exit code + artifact + freshness + sentinel. An hour of work.

---

## 3. Is coverage-based termination the right frame?

Half right. "Every declared surface swept + two empty rounds" is still searcher-defined if the sweeps are attestations. Two better termination conditions, in order of strength:

1. **Mutation-calibrated termination.** A mutagen script seeds N known faults into the worktree (drop a cache-key component, un-normalize the needle, shift a timestamp offset — your 3a defects are literally a mutation menu). The loop may not terminate until it catches ≥X% of seeded mutants. This converts termination from *testimony* to *measurement* and simultaneously kills ledger forgery and author plateau: you cannot attest your way past a planted bug you didn't find. This is the single strongest idea available to you.
2. **Termination by failed falsification.** "Dry" = every surface has an *executed* falsification attempt that failed to falsify, with the command and output on disk. Not "I looked and found nothing" — "I attacked it this way, here is the attack, here is it surviving."

Coverage of surfaces is the right *shape* only when coverage is demonstrated by executed attacks, and ideally calibrated against planted faults.

---

## 4. Cheapest intervention with largest effect

Ranked by impact ÷ cost:

| # | Intervention | Cost | Effect |
|---|---|---|---|
| 1 | **F4 at the push boundary**: pre-push git hook / CI required check invokes a second model on diff + ledger; push blocked without a valid, clean, sentinel-terminated verdict artifact | ~1 day wiring + token cost per push | Catches what N self-rounds structurally cannot. 3a is the measurement. Fully automatic — owner never asks |
| 2 | **F6** artifact + freshness + sentinel verification | ~1 hour | Eliminates the 3c silent-empty-review class forever |
| 3 | **F5** delete free-text `N/A`, enumerate exempt shapes | ~30 min | Closes the self-issued waiver |
| 4 | **3b fix-integrity check** (§5.3) | ~2 hours | Catches a class no review can see |
| 5 | F2 hook-owned ledger | ~1 day | Enables #1 to be good; useless alone |
| 6 | Mutation seeding | 2–3 days | Highest ceiling, highest cost; phase 2 |
| 7 | F1 checklists | — | Only as briefing input to #1; **do not ship as a gate** |

The answer is #1. It is the only intervention that (a) adds new information, (b) is enforceable on agents *and* humans *and* future tools (turn-level hooks are advisory; the repo boundary is sovereign), and (c) satisfies the owner's actual constraint — he stops being the sensor.

---

## 5. What you're not seeing — the highest-value section

**5.1 Silent fail-open is indistinguishable from success.** "Fails open by design" + zero telemetry means: if the gate has been crashing for a month, every turn passed and nobody knows. A broken gate and a satisfied gate produce identical observable behavior. **Fix:** the hook emits one audit line per evaluation — `GATE: PASS | BLOCK | ERROR` — to a file outside the agent's write scope, and ERROR is paged like a production incident, because it is one.

**5.2 You have no escape-rate metric, so every fix you're contemplating is unfalsifiable.** Nobody tracks findings-per-round, defects-escaping-past-done, or escape rate per model. Your process telemetry is the owner's frustration — the most expensive sensor in the building, and the thing he's explicitly asking to retire. **Fix:** a defect-escape ledger. Every defect found after declaration-of-done is logged with the task, the rounds that ran, and the surface it belonged to. Review F1–F6 against that number in 60 days or you're doing religion, not engineering. This ledger also auto-grows F1's checklists, solving checklist rot.

**5.3 3b contains an unexamined second defect class: fix-application integrity.** "Batch applied 8 of 9; the missing one defined the symbol" is not a review failure — the agent *believed* all nine applied. Reviewing the tree against your own intent can't catch this; intent and belief are the same object. **Fix:** after every fix round, mechanically reconcile the ledger's claimed fix list against diff hunks (N claims ↔ N hunks), plus build/lint. Cheap, deterministic, and catches the class where review is structurally blind.

**5.4 The `buildShaped` threshold is gameable by decomposition, and nobody audits the turns that didn't trigger.** `fileWrites >= 2` means one-write-per-turn chunking never fires the gate at all. You instrument the turns that trip the predicate and have zero visibility into the turns that route around it. **Fix:** log gate *non*-evaluations with their turn shape; alert on anomalous distributions of 1-write build turns.

**5.5 The doctrine's vantage list is interpretive, but every 3a defect was behavioral.** Wrong cue timestamp, wrong-language cache hit, whitespace mismatch — none are findable by reading; all are findable in minutes by execution against a known answer. Your doctrine has no concept of an oracle. **Fix:** a golden-corpus smoke test per tool (a transcript where you *know* what's said at 1:23:45) as a mandatory mechanical vantage. This alone would have caught all three sample defects before any human looked.

**5.6 `PROOF:` attaches evidence to words, which trains eloquent claiming.** Rule 73's regex matches `PROOF: yes` — you noted this — but the deeper defect is that proof is a *string in a message*. Proof should be a set of paths that must exist, be fresh, and be non-empty. Claims are free; artifacts are not.

**5.7 Gate placement is wrong at the architectural level, not just for F4.** All four sibling Stop gates live at turn closeout — the moment of maximum motivation to comply-in-appearance. Every gate worth having should be re-evaluated for migration to the push boundary. Turn gates are UX; repo gates are law.

---

## Bottom line

The loop isn't failing because agents type a magic string instead of looping. It's failing because **the searcher, the judge, the witness, and the court reporter are the same mind**, and no termination rule that mind executes can exceed its own beliefs. Stop polishing the self-review loop. Put the independent reviewer at the push boundary, give it a hook-written ledger and a golden corpus to aim with, verify artifacts instead of exit codes, and start counting escapes so that in two months you know — rather than believe — that any of this worked.
