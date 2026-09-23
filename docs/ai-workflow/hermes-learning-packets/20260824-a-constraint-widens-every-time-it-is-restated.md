---
title: "A constraint widens every time it is restated — and the wide version deletes real options silently"
originating_model: claude-opus-5
tier_basis: "Session model is Opus 5 (harness-stated: 'You are powered by the model named Opus 5 (1M context)', exact id claude-opus-5[1m]) — Rule 68 allowlist member by name; Sean designated Opus 5 Fable-tier 2026-08-10"
date: 2026-08-24
decision: "Delivered the radar maximize-the-machine options menu (c:\\tmp\\RADAR-MAXIMIZE-BRAINSTORM-2026-08-24.md, 317 lines). Docs-only; nothing built. Recorded the constraint-scope-drift failure that the hostile pass caught in my own draft."
status: shipped
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths in the lesson body"
surface: infrastructure / handoff-hygiene / agent-discipline
models_used:
  - model: claude-opus-5
    role: builder + own hostile reviewer (3 rounds to dry)
    did: "Read both radar handoffs, answered the four threads, wrote the ten-tier options menu with a single ranking filter, then ran three hostile rounds against my own draft — which found 7 defects including the one this packet is about."
    cost: subscription
skills_touched:
  - id: rule-73-proof-before-done
    action: applied
    motivated_by: "Hostile loop run to dry (3 rounds, round 3 found nothing new) before any completion claim; round 1 found the constraint-scope defect that would otherwise have shipped."
  - id: feedback_validate_probe_before_absence_claim
    action: applied
    motivated_by: "An empty git-log result nearly became an absence claim. The standing memory forced a control run. It held — but the memory, not habit, is what stopped it."
---

## The lesson

**A constraint gets wider every time it is retold, and nobody notices, because widening
feels like caution.**

The chain here was three links long and took one day:

1. **The evidence (narrow, true):** SS-PT's typecheck has OOM'd on boxes larger than radar.
2. **The handoff's constraints list (wider):** *"Not a build machine."*
3. **My draft (widest, and false):** *"No frontend builds. They OOM on larger boxes than this."*

Link 3 is wrong, and **the document that produced link 2 contains its own disproof**:
four sections earlier it records SwanGuard's full build running on radar — `npm run build`
exit 0, type-check passed, web dist built, **949Mi peak of 15Gi**. Measured, on that
exact machine.

So both facts sat in one file, and the wide one won. That is not an accident of
attention. **The wide version wins because it lives in the constraints list, and the
constraints list is the section an agent reads when deciding what is possible.** Evidence
sections get read when you are checking something; constraint sections get read when you
are choosing. The choosing section is where the drift does its damage.

**Why this class is nastier than a normal wrong fact:** a false constraint produces no
error. It deletes options *before* anything runs. Nothing fails, no test goes red, no
probe returns empty — a whole branch of the possibility space just never gets proposed,
and the omission looks exactly like a decision. In this case the deleted option was
"SwanGuard CI on radar," which is not merely feasible but **already proven to work on
that box.** I nearly wrote it off in a document whose entire purpose was enumerating what
the machine could do.

**Detection, cheap and mechanical:** when you inherit a constraint, go find its original
evidence and check that the scope of the claim matches the scope of the evidence. If the
evidence is *a specific command, on a specific repo, on specific hardware*, then the
constraint is about that command on that repo — not about the category the command
belongs to. "SS-PT's typecheck OOMs" does not license "builds OOM," the same way one slow
query does not license "the database is slow."

**Structural fix for whoever writes the next handoff:** constraints must carry their
evidence inline. `Not a build machine` is a rumour. `SS-PT typecheck OOMs (larger boxes);
note SwanGuard's full build runs here at 949Mi` is a constraint whose scope survives being
copied. **The scope has to travel attached to the claim, because the claim will be copied
and the evidence will not.**

**And the corollary that made this worth writing down:** I read the 949Mi line. It was in
my context. I generalised past it anyway, because I was reading the constraints section
*as* the constraints and the build section *as* history. An agent summarising a handoff is
performing exactly the compression step that causes this drift — which means the risk
peaks at precisely the moment a fresh session is getting up to speed.

## Who did what

**Opus 5 (me)** — everything in this session: read both radar handoffs, answered the four
threads, built the options menu, and ran the hostile loop. **The defect in this packet is
mine, caught by my own round-1 pass**, not by a reviewer, not by Sean, and not by a tool.
No external or paid model was consulted; no panel ran. That matters for calibration: this
is a self-caught error, so it says something about whether the dry-loop discipline works
unsupervised. It did — but only because round 1 re-read the *source*, rather than
re-reading my own draft. Re-reading your draft finds typos; re-reading the source finds
claims that never had support.

Two prior agents' handoffs supplied the raw evidence and are the reason the disproof was
even available to find — the build handoff's habit of recording measured numbers
(`949Mi of 15Gi`) rather than verdicts ("builds fine") is what let the drift be caught.
**Record the number, not the judgement.**

## Skills created or changed

No skill was created. Two existing disciplines were exercised and both earned their keep:

- **Rule 73 / proof-before-done dry-loop** — three rounds. Round 1 found the
  constraint-scope defect plus 6 others; round 2 found 3 *residual instances of the same
  defect* that round 1's fix had missed; round 3 found nothing. Without round 2 the
  document would have shipped self-contradicting, having been "fixed."
- **`feedback_validate_probe_before_absence_claim`** — an empty `git log origin/main --
  <path>` was about to become "not on main." Ran a control file known to be on main, plus
  a second method. The negative held. **The memory stopped it; habit did not.** That is a
  standing gap, not a success.

**Proposed, not built:** a handoff-authoring check that flags any constraint stated
without inline evidence. This is the second constraint-hygiene lesson in the corpus after
the fail-open probe class, and both are "the document said something true-shaped that
nothing supported."

## Mistakes I made

- **Propagated an inherited constraint at the wrong scope** — wrote "no frontend builds,
  they OOM" while holding the proof that SwanGuard builds on radar at 949Mi. Five
  instances in one document. This is the packet's subject.
- **Fixed the defect only where I noticed it.** After correcting two instances I moved on;
  a grep for the phrase class found three more elsewhere in the same file. Visual
  re-reading did not find them. **Fixing a claim where you spotted it is not fixing the
  claim** — grep the class.
- **Nearly shipped an unvalidated absence claim** (shadow-check files "not on main") from
  an empty probe result. Already-written-up class; the memory caught it, not my process.
- **Asserted an inference as recovered fact** — the prior handoff says four threads and
  labels three; I initially wrote the missing fourth as though I knew what it was. It is a
  guess and the document now says so.

## Error → fix → repeat ledger

| Error class | Instances this session | Written up before this session? | What actually stopped it |
|---|---|---|---|
| Constraint inherited/restated at wrong scope | 5 (one document) | **no** — new class | Re-read the *source handoff* for the constraint's original evidence, rather than trusting my own summary |
| Partial fix — corrected only where noticed | 3 residual | no | `grep` for the phrase class across the whole file after fixing; round-2 hostile pass |
| Absence claim from unvalidated probe | 1, caught pre-claim | **yes** — standing memory, 6 prior instances | Control run (file known present on main) + second method before believing empty output |

**The third row is the highest-signal line in this packet.** It was documented, and it
still required an explicit memory injection to stop rather than being caught by habit. A
lesson that has to fire as a reminder every time has not become a practice yet. The
correction that survives is procedural — *run a control before believing an absence* — not
resolutional. The first two rows are new and get the same treatment: **find the evidence
before repeating a constraint; grep the class after fixing an instance.**
