---
decision: Round 2 — Ox + GLM + Opus verdicts folded; the flagship slice is demoted because the learning engine has never run; plan re-ordered around a branch cut
status: open
supersedes: none
date: 2026-08-26
author: Opus 5 (claude-opus-5)
reviewers: Ox Alpha (stealth/ox-alpha) · GLM 5.3 · Opus 5 self-pass
---

# Swan Brain Console — Round 2

Packet under review: `SWAN-BRAIN-CONSOLE-BLUEPRINT-2026-08-26.md`
Panel output: `panel-swan-brain-console-2026-08-26/` (Ox `$0`, GLM `$0` — total spend **$0.0000**)

**Both seats returned REVISE.** Neither returned APPROVE, and they converged independently on
six findings. Then the Opus self-pass found something both missed that changes the plan more
than anything in either review.

---

## 1. The finding that reorders everything — [VERIFIED] this session

**The Design Brain learning engine has never been run. Not once.**

```
$ echo "SWAN_DESIGN_BRAIN_ROOT=${SWAN_DESIGN_BRAIN_ROOT:-<unset>}"
SWAN_DESIGN_BRAIN_ROOT=<unset>

$ find ~ -maxdepth 4 -name "claims.jsonl"      →  (no output)
$ find ~ -maxdepth 5 -type d -name "receipts"  →  4 hits, all Hermes/gateway/render-agent.
                                                   None is a design-brain root.
$ ls ~/design-brain                            →  does not exist
```

Zero receipts. Zero claims. Zero batches. The jailed root the engine requires
(`SWAN_DESIGN_BRAIN_ROOT`, deliberately outside any git repo) has never been created.

### Why this is the most important line in the document

My blueprint named "the wound": Sean spends **~75 minutes a week** hand-editing letters into
`BATCH-<date>.md`, and built the flagship slice (S2, the Desk) around removing it.

Ox attacked that claim as *unmeasured* (F2). GLM attacked it harder — "nobody spends 75 minutes
a week typing four letters; the time is reading" — and made it the ONE THING: *instrument two
real batches before writing `app-desk.js`.*

**Both were too generous.** The 75 minutes is not unmeasured. It is **hypothetical**. It is a
cadence *target* written into a README for a loop that has never executed. There are no batches
to instrument. There is no chore to remove. I lifted a number out of a design document and
presented it as an operating cost, and two hostile reviewers took it at face value because they
were reasoning from my prose instead of from the filesystem.

That is a Rule 51 violation of mine: an unlabelled `[HYPOTHESIS]` wearing the clothes of a
`[VERIFIED]` measurement, load-bearing for the entire slice order.

### What it does to the plan
- **S2 (Desk) cannot be the flagship.** You cannot build a fast path over a pipeline with no
  traffic. GLM's "placebo with governance write access" is right, and understated.
- **The real first job is different**: the console's genuine value is making the loop *runnable
  and visible* — because right now nobody, including Sean, can see that it has never run.
- **The `~75 min` figure is struck** from the blueprint and replaced with `[UNKNOWN] — no batch
  has ever been adjudicated; cost unmeasured because the loop has not executed`.
- Compounding: the README's own numbers are also stale (`~800 lines` / `14/14 tests`; actual
  **1,266** lines and **39/39** across four suites, verified earlier). The design-brain README is
  now **three-for-three wrong** on the facts it asserts. That is the strongest possible argument
  for the console's core discipline: **every number is generated at read time, never transcribed.**

### The second-order finding
The engine's intake is gated on **D1 (Mobbin ToS)**, which gates the agent-driven inspection
pilot. Grep finds no live D1 status anywhere except a July handoff. So the loop has never run
**and** its primary intake path is blocked pending a decision only Sean can make. Building an
adjudication UI in front of that is building a checkout counter for a shop with no stock.

---

## 2. Convergent findings — both seats, independently

| # | Finding | Ox | GLM | Ruling |
|---|---|---|---|---|
| C1 | **Branch reality is a BLOCKER, not an open question.** Every slice sits on a tree 2,285 commits behind `origin/main`; S0 would land Rule 80 somewhere it can never reach the constitution | B3 | B1 | **ACCEPTED.** Becomes slice **S−1: cut `feat/swan-brain-console` from `origin/main`** before any other work, including governance |
| C2 | **Desk must not ship first** | F3 | F3 | **ACCEPTED, and hardened** by §1 — it moves from second to sixth, and is gated on the loop having actually produced two real batches |
| C3 | **The 75-minute justification is unmeasured** | F2 | ONE THING | **ACCEPTED and escalated** — it is hypothetical, not merely unmeasured (§1) |
| C4 | **The batch file gains a second writer → clobber race** with Sean's editor | F4 | B3 | **ACCEPTED.** Once the Desk lands, the batch file is console-owned; plus mtime re-read-before-write, refuse-on-external-change, and a `--validate` pass before any write |
| C5 | **The two-console argument contradicts my own blueprint** — Library reads taste-brain renders, Ship invokes its client mode, Memory reads `CATALOG.local.md` | F1 | B5 + F1 | **ACCEPTED.** See §4 — I stated a false reason and both caught it |
| C6 | **Gap rows 7 (Insights/ROI) and 9 (Dreaming cadence) evaporate** between the audit and the plan | B1 | MISSED 4 | **ACCEPTED.** Every row now maps to a slice or a signed deferral (§5) |

## 3. Single-seat findings worth taking

**From Ox**
- **M1 — pre-spend estimate.** Gap 4's own words are "cost shown **before** you spend"; I
  delivered a retrospective meter over `ledger.jsonl`. The Fable burn was a *pre-flight* failure
  and a rear-view mirror would not have stopped it. **Every Run button carries an estimate line.**
- **M2 — bundle import.** Gap 1 says export/**import**. I shipped export only. An export format
  nothing can read back is a dead format with extra steps. **Import + a round-trip test, or the
  row is struck.**
- **F4 — the console's batch patcher is untested code sitting between Sean and a tested tool.**
  Corruption lands in the new layer, not in `adjudicate.mjs`. **The Desk imports the already-
  exported `parseDecisions` / `applyDecisions` rather than writing a second parser.**

**From GLM**
- **B2 — the seat registry fails open.** A missing or typo'd `gate` field must render a
  **stop-card, never a Run button**. This is the Ox env-var footgun re-encoded in JSON. **Adopted
  as a hard invariant with a test that asserts an unknown/absent gate is refused.**
- **B4 — loopback is not an authentication model.** A hand-rolled `node:http` server with write
  routes is driveable by any page in Sean's browser while it runs, and it writes governance files
  and reads gitignored stores. I cited the prompter as precedent; GLM is right that this is *"an
  unexploited hole, not clearance."* **Origin/Host check plus a per-session token on every write
  route.** This is the single best security catch of the round.
- **MISSED 1 — the loop itself has no surface.** A console over a brain, with no view of the
  brain's central process. **Promoted to a first-class panel** — and §1 makes it the panel that
  matters most, since the loop's true state is "never started."
- **MISSED 2 — one desk for every human decision.** Learning claims, Hermes inbox items, and
  skill-harvest proposals are all *queue → human decides*. I gave one a flagship and left the
  others as greps. **The Desk is generalised to a decision queue with pluggable sources.**
- **MISSED 3 / Ox M3 — the magic-scan contradiction.** I cited the taste brain's judged-content
  indexing as the Swan analogue while banning the mechanism under Rule 72. GLM supplies the fix I
  should have found: **a seat writes text tags at ingest, making assets greppable with zero index
  infrastructure** — Rule-72 compliant, no embeddings, no vector store. **Adopted.**
- **F5 — S8 multi-system is a tenancy retrofit disguised as a slice.** If the partner lane is
  real, system-scoping is an **S1 data-model decision**; if not, strike the row. **Adopted:
  system-scoped from S1; no retrofit.**

## 4. Ruling on open question 1 — one shell or two

I gave a false reason. I wrote that merging *"puts repo doctrine next to third-party corpus
material"* — while my own blueprint has the Library reading taste-brain renders, Ship invoking
its client mode, and Memory reading `CATALOG.local.md`. Both seats caught it. The stated reason
does not survive its own document.

**The true reason, said out loud:** SS-PT is a git repo that must never contain the Midlibrary
corpus. That is a **containment rule about writes and git**, not an argument for two HTTP
servers. Reading an external path was never the risk; committing its contents is.

**Ruling — one registry, one shell, stated cost.**
- The shell lives in SS-PT at `console/`. Sources are paths; external roots
  (`SWAN_TASTE_BRAIN_ROOT`, the vault) are read through the source registry and are **never
  writable and never copyable into the repo** — enforced by a write-jail with a test, not by
  convention.
- The taste brain's four tabs (Make · Judge · Directions · Kept) are **not migrated in v1**. The
  registry contract is designed so they can register later without a rewrite.
- **The honest cost of that deferral:** until they migrate, Sean has two URLs. I am not
  pretending otherwise, and I am not claiming the migration is free. It is a named decision with
  its own slice, not a footnote.

## 5. Revised slice plan

Every gap row now has an owner or a signed deferral.

| # | Slice | Delivers | Closes gap |
|---|---|---|---|
| **S−1** | **Branch cut** | `feat/swan-brain-console` from `origin/main`. Nothing else happens first. | C1 |
| **S0** | Governance | Rule 80 (Fable = review/blueprint only) into `CLAUDE.md` + `AGENTS.md`; `seat-relay` skill (written) | — |
| **S1** | Shell + registries | `console/serve.mjs`, tab/source/seat registries, **fail-closed seat gate**, **Origin check + per-session write token**, **write-jail**, **system-scoped data model**, tests | 3 (partial) |
| **S2** | **Pipeline** | The loop's own status: root configured y/n, receipts since packet, claims by status, packet age, D1 gate state, vault freshness. **First truth it will report: the loop has never run.** | 9 |
| **S3** | Seats | Seat rows, served-model displayed, **pre-spend estimate on every Run**, live ledger meter, Fable/ChatGPT/Codex stop-cards emitting `seat-relay` prompts | 3, 4, 7 |
| **S4** | Doctrine | All 31 files rendered + searched, live token swatches with computed contrast, mode switch. **Gated on the `design.html` diff being run first** — 1,355 hand-written lines may contain fixes not derivable from `design.md` | 1 (half) |
| **S5** | Library + Memory | Unified search; **ingest-time text tags** for assets (Rule-72 compliant magic-scan analogue) | 6, 8 |
| **S6** | **Decision queue** (was "Desk") | Generalised queue: learning claims + Hermes inbox + skill-harvest proposals. **Shadow mode for two real batches** — renders and annotates, writes stay in the editor. Imports `parseDecisions`/`applyDecisions`; console-owned batch file; mtime guard; `--validate` before write. **Blocked until the loop has produced two real batches.** | — |
| **S7** | Studio | Generate → preview → auto-QA-gate → portfolio. **Gate set limited to what we can actually prove** — one false "pass" kills trust in the badge permanently | 5 |
| **S8** | Ship + bundle | Export **and import** a system bundle with a round-trip test; repo / Linear / Hermes targets | 1 (rest), 10 |
| — | **Signed deferral** | Social publishing (Instagram/LinkedIn/TikTok). Out of scope: SwanStudios is a trainer-led B2B2C operating system, not a content channel. Revisit only as its own decision. | 10 (rest) |

**What changed:** Desk went from slice 2 of 8 to slice 6 of 8, behind a shadow-mode gate and a
precondition that may not be satisfiable this quarter. Pipeline — a panel neither I nor Ox
identified — is now slice 2, because the most valuable thing the console can do on day one is
tell Sean the truth about a loop he believes is running.

## 6. What Sean must decide (nothing below is an agent call)

1. **Is the Design Brain learning loop something you want running?** It has never executed. Two
   honest answers: (a) yes — then S2 Pipeline plus actually initialising a root is the first
   real work, and D1 needs a ruling; (b) not now — then the console is a doctrine/seats/studio
   tool and S6 leaves the plan entirely. **Neither answer is wrong; guessing is.**
2. **D1 (Mobbin ToS)** — cleared or not? It gates agent-driven inspection, which is the loop's
   only scalable intake.
3. **Taste-brain migration** — accept two URLs for now (my recommendation), or fund the merge as
   its own slice?
4. **v1 scope** — S−1 → S4 is a coherent, useful console (governance, shell, pipeline truth,
   seats with real spend control, doctrine). S5–S8 is a second program. Ship v1 at S4?

## 7. Review chain status

```
Opus 5 (author)                          ✅ blueprint + self-pass (found §1)
Ox Alpha (stealth, $0)                   ✅ REVISE — 3 blockers, 4 findings, 3 missed
GLM 5.3 (subscription, $0)               ✅ REVISE — 5 blockers, 5 findings, 4 missed
🛑 FABLE GATE                            ← Sean switches models; hostile review of THIS doc
ChatGPT GPT-5.6 Sol (filesystem access)  ← relay prompt, after Fable
Opus 5 arbitration                       ← folds all verdicts, verifies each finding
```

**Total panel spend this round: $0.0000.**
