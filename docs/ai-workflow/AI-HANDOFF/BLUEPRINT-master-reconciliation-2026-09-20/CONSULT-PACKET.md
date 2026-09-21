# MASTER MEGA BLUEPRINT PACKET — All Lanes, Reconciliation and Build Order

**Mega Blueprint** — this packet arms Mega Blueprint mode. Produce the full nine-document
forged package under the contract in §7.

---

## 0. PREAMBLE — read before anything else

**Do not explore the repository. Do not read files. Do not list directories. Do not run
shell commands.** Everything you need is in this packet. If a fact is genuinely absent, mark
it `UNVERIFIED` — that is a correct answer, not a failure. Exploration has been measured on
this transport at ~220k tokens for zero output; on a 272k-context model that is the
difference between a package and a refusal.

**The read-only sandbox is expected and is not a blocker.** You cannot save artifacts or
file reviews. The caller saves and files. Do not report it as a limitation and do not stop
for it.

**Search is unavailable by design.** The bundled `rg.exe` is denied by the sandbox. This is
an environmental fact, not a bug to work around.

**The governing skill is inlined at §6.** It is the loaded `fable-blueprint-forge`
contract. Do not look it up; do not stop because a skill path did not resolve. The text in
§6 is the skill.

**What this is.** Eight independent blueprint lanes exist in one repository. Each has a
plan. **None has verified implementation.** Each was reviewed separately and each came back
`DEFECTS-FOUND`. This packet asks for the one thing no single-lane blueprint could produce:
a **reconciled master blueprint** that treats the eight lanes as one system, decides the
shared substrate they all sit on, and orders the build so that no lane's work is invalidated
by another's.

**What is already decided and is NOT yours to reopen** (list them as inherited constraints,
not as open questions): the per-lane architectural decisions recorded in each lane's
`00-README.md` and its adjudications. Your job is the layer *between* lanes.

---

## 1. Repository state — measured 2026-09-20, verbatim

| Fact | Value |
|---|---|
| Repo root | `C:\Users\BigotSmasher\Desktop\@Everything\quick-pt\SS-PT` |
| Branch | `creator-brains-engine-r2-20260915` |
| Commit | `382427ae6` |
| **Dirty files** | **1,235** |
| Worktrees | main + `tmp/worktrees/brain-console-salvage-20260918` (`53f93854b`, branch `swan-brain-console-v3-salvage-20260918`) + `tmp/worktrees/swan-coach-astra-owned-20260906` (`53005a6da`) |

`1235` dirty files is the single most important number in this packet. **No lane's plan is
hash-bound to a tree.** One lane says so explicitly in its own status line. Several agent
sessions are writing to this repo concurrently. Treat "source stabilization" as a first-class
workstream, not as hygiene.

---

## 2. The eight lanes

Each entry is the lane's **own verbatim status line**, then its package path and document
inventory. Do not paraphrase these into agreement; where two lanes disagree, say so.

### L1 — Cinematic Frontend
Package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-cinematic-frontend-2026-09-19/` (17 files, 241 KB)

> **Status:** Specification issued from supplied evidence. Implementation acceptance is pending. Proposed paths and interfaces below are explicitly new contracts, not claims about existing files.
>
> **Delivery**
> - **A:** Retain `HomePage.V4`, its twelve sections, its route-level V3 fallback, and existing conversion flow. Add one progressively enhanced crystalline SwanMark signature.
> - **B Stage 1:** Independently remove compatible dependency blockers while remaining on React 18.
> - **B Stage 2:** Perform a bounded React 19 migration after Stage 1, on an isolated branch with a complete dependency cohort and rollback.
> A does not depend on either B stage.
>
> **Binding decisions**
> | Concern | Decision |
> |---|---|
> | Capability authority | Existing `PerformanceTierProvider.tsx`, with detector extracted only as needed for testing/file length. |
> | Target vocabulary | `full / lean / reduced`. |
> | Existing home hook | Preserve `useAnimationTier` and `useTierFlags` names; make them provider consumers. |

Docs: `00`–`09` complete (incl. `08-decision-density-self-test.md`, `09-tests.md`), plus
`A0-INTAKE-RECEIPT.md`, `ASTRA-REPLY.md`, `ASTRA-REPLY.meta.json`, `CONSULT-PACKET.md`.

### L2 — Coach Command Center AI Harness
Package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-coach-cc-ai-harness-2026-09-20/` (17 files, 192 KB)

> **Title:** Swan Coach Command Center — AI Harness Safety and Integration Blueprint
> **Package ID:** `CC-AI-HARNESS-20260920`
> **Proposed location:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-coach-ai-harness-20260920/`
> **Status:** `PLAN DRAFT — INTEGRATION EVIDENCE REQUIRED`
> **Implementation verified:** No.
> **Deployed:** Not established.
> **Review basis:** Supplied packet at reported HEAD `ffe4f805e`; dirty-tree contents are not hash-bound.
>
> **Outcome**
> A coach's submission has one authoritative outcome: a read result, a reviewable action, an executed action with a committed receipt, an explicitly permitted chat request, or a clear non-execution/unknown state. Model prose never acquires permission to mutate application data.
>
> **Scope**
> The mounted Coach submission path, command execute/confirm/cancel, operation recovery, chat provider admission, and the boundary between generated proposals and approved actions.
> Preserve the three existing role routes. Preserve Talk, Review, and History. This is a harness upgrade with state-specific UI changes, not a replacement dashboard design.

Docs: `00`–`09` + `03b-contracts-proposed-artifacts.md`, `ADJUDICATION.md`,
`ADJUDICATION-R2.md`, `HOSTILE-REVIEW.md`.

**Note the internal contradiction to carry forward:** the package's *proposed location* line
and its *actual* directory differ (`BLUEPRINT-coach-ai-harness-20260920` vs
`BLUEPRINT-coach-cc-ai-harness-2026-09-20`). Same defect class as L4 below.

### L3 — Cortex Phase 1: Knowledge Spine
Package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-cortex-phase1-knowledge-spine-2026-07-14/` (9 files, 124 KB)

> **Forged:** 2026-07-14 · **Architect:** Fable 5 · **Baseline:** origin/main @ `eac60c638`
>
> The **knowledge spine** of the SWAN Training Cortex: the database layer that stores Sean Swan's professional knowledge sources (books, certifications, workshops — including the ~2000 NASM workshop), the operational coaching rules derived from them (with citations, versioning, conflict tracking, and Sean's approval workflow), plus the **progression/regression event log** (ratified decision 5c — it immediately feeds charts and gamification). It also extends the existing `swanCoachCortexService` to load Sean-Approved DB rules alongside the markdown doctrine vault, and ships the admin Knowledge Console UI where Sean reviews rules.
> **Brownfield law:** this repo already has a working Cortex policy loader, exercise catalog, plan …

Docs: `00`–`07` + `PACKAGE-ALL.md`. **No `08`, no `09`.** Forged 2026-07-14, two months
before the other lanes; its baseline commit `eac60c638` is far behind current HEAD
`382427ae6`. Treat its *baseline* as stale and its *intent* as live.

### L4 — Social Bridge Completion (Studio Spotlight S5–S8)
Package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/` (24 files, 632 KB)

> **Blueprint:** Social Bridge Completion — Studio Spotlight S5–S8
> **Status:** ARCHITECTURE DECIDED · G0 CLOSED · CORRECTIONS 1–7 APPLIED · S5 BUILDABLE
> **Read in this order:** `CORRECTIONS-APPLIED.md` → `G0-SOURCE-EXCERPTS.md` → this file → `05-slices.md`. **Where this package and the excerpts disagree, the excerpts win.**
>
> Earlier drafts of this line named `BLUEPRINT-studio-spotlight-completion-2026-09-19/`. The package directory on disk is `BLUEPRINT-social-bridge-completion-2026-09-19/`; that is the path above.

Docs: `00`–`09` + `03b-contracts-s6-s8-and-interfaces.md`, `ASTRA-PRO-REPLY.md` +
`.meta.json` + `.partial.md` + `.run.log`, `CORRECTIONS-APPLIED.md`,
`G0-SOURCE-EXCERPTS.md`, `VERIFICATION-NOTES.md`, `MANIFEST.md`.

**This is the most mature lane** — the only one that is `BUILDABLE`, the only one with a
source-excerpt file that overrides its own prose, and the only one with a recorded
corrections log. Its latest review (2026-09-20 02:50) is nonetheless `DEFECTS-FOUND` on R1
correctness.

### L5 — Speed-to-Lead Email Epic
Package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-speed-to-lead-email-2026-07-16/` (8 files, 68 KB)

> **Forged by:** Fable 5 (architect) · 2026-07-16
> **Builder target:** any competent AI builder with ZERO repo context beyond this package
> **Build order:** read 00 → 01 → 06 (bans) FIRST, then execute 05-slices one at a time using 02/03/04 as reference.
> ## The Builder Contract (binding)
> > You are the builder, not the architect. Follow the package to the letter. Where the package decides, you do not re-decide — even if you'd do it differently. Where the package is silent on something that matters, STOP and return the question; do not improvise. Build ONE slice at a time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl results) and WAIT for the checkpoint verdict before continuing. Never claim a criterion passed without pasting its output.

Docs: `00`–`07`. No `08`, no `09`. Forged 2026-07-16.

### L6 — Swan Brain Console V3 (Merge / Salvage)
Package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-brain-console-v3-merge-2026-09-18/` (15 files, 372 KB)

> **Status:** PACKAGE READY — **readiness BLOCKED** until slice S0 (salvage) lands.
> **Decision authority:** `MEGA-BLUEPRINT.md` (this packet) — every builder choice is pre-made there.
> **Supersedes for the *merge* question:** `SWAN-BRAIN-CONSOLE-BLUEPRINT-2026-08-26.md` is **REJECTED** (GPT-5.6 Sol — its analysis ran against a branch 2,285 commits behind `origin/main`). Do not consume it for architecture. Its *patterns* (tab/source/seat registries) are reused below with attribution, because the pattern survived even though the document did not.
> **Subject of record (all uncommitted, all in one gitignored directory):**
> - Console — `scripts/swan-brain-console/` (12 files, 2,840 lines incl. `app/`)
> - Fleet — `frontend/src/pages/HomePage/three-worlds/` (20 variants, 8 scene families)
> - Living in `tmp/worktrees/brain-console-20260913/` — 77 files in the two scopes above

Docs: `00`–`07` + `09-tests.md`, `MEGA-BLUEPRINT.md`, `DECISIONS-D14-D21.md`,
`S4-RESULTS.md`, `ASTRA-ROUND-2-REPLY.md`, `ASTRA-ROUND-2-REQUEST.md`.

**This lane contains work that exists ONLY in a gitignored directory and is uncommitted.**
That is a data-loss risk no other lane shares, and it is the reason its S0 slice is a
salvage. It also already has a document literally named `MEGA-BLUEPRINT.md` that claims
decision authority — reconcile or explicitly subordinate it; do not silently produce a
second authority.

### L7 — SwanStudios Native Mobile
Package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-native-mobile-2026-07-13/` (8 files, 64 KB)

> **Forged:** 2026-07-13 by Fable (architect). **Builder target:** Codex (isolated worktree).
> **Scope of this package:** Phase 0 (foundation + contract audit), Phase 1 (native shell), Phase 2 (client vertical slice: login → today's workout → logger → save → history → one progress chart, with minimal offline draft queue). Phases 3–6 (chart system, depth, trainer app, store submission) are roadmap-only here and get their own forged packages later.
>
> SwanStudios (sswanstudios.com) is a production personal-training SaaS: React 18 + Vite web app (`frontend/`), Express + Sequelize + PostgreSQL API (`backend/`), deployed on Render. The goal is a real App Store / Play Store app. Strategy: build a **standalone Expo/React Native client app** that consumes the EXISTING production API unchanged. The web app is never modified by mobile work.
> - New app lives at repo path `mobile/` — a standalone Expo project with its OWN `package.json` …

Docs: `00`–`07`. No `08`, no `09`. Forged 2026-07-13.

### L8 — Swan Theme Lens R6.1
Package: `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-theme-lens-2026-09-20/` (22 files, ~43 MB)

> **[PLAN] Swan Theme Lens R6.1 — correctness, measurable accessibility and bounded visual refinement**
> Owner: Sean. Builder: assigned by Sean. Reviewer: this adjudication seat for the present planning pass; future implementation checkpoints retain Sean's assigned authority.
> Status: **reviewable plan; implementation readiness blocked** by source stabilization, executable acceptance evidence and archive filing.
> Supersedes the proposed implementation package in R5. Preserve R5 and both filed reviews. This response does not overwrite or save them.
>
> **Outcome**
> Make the existing header lens reliably select, persist, restore and explain all registered themes; make keyboard focus measurable; retain Swan-specific visual character without requiring animation or WebGL.

Docs: `00`–`09` + `A0-INTAKE-RECEIPT.md`, `ASTRA-REPLY-R5.md` (+`.meta.json`),
`ASTRA-REPLY-R6.md`.

**This lane names the readiness blockers better than any other, and they are the cross-lane
blockers:** *source stabilization*, *executable acceptance evidence*, *archive filing*. It is
also the only lane that explicitly says it will not overwrite a prior review — that is the
correct behaviour and should become the cross-lane rule.

---

## 3. Cross-lane findings — this is the master blueprint's actual subject

These are measured, not inferred. Each is a premise the eight lanes depend on and none
owns.

**X1 — The mandated workflow controller does not exist.**
`MAKEER-BLUEPRINTS.canonical.md` §"Installed mechanism and usage" instructs runners to
"Read `scripts/workflow.mjs` and `scripts/workflow-policy.mjs`", and describes a controller
with `init` / `freeze` / `admit` / `review` / `pause` / `resume` / `reconcile`, a state
JSON, `scripts/workflow-hook.mjs` enrollment, and a native hook that "blocks enrolled task
writes during frozen review".

Verified 2026-09-20:
```
scripts/workflow.mjs          ABSENT
scripts/workflow-policy.mjs   ABSENT
scripts/workflow-hook.mjs     ABSENT
find scripts -maxdepth 2 -name "workflow*"   → (no results)
```

So the per-slice cycle in the mandate — "Run the required hostile reviewers in clean
contexts on that snapshot", "freeze a NEW revision and re-review it", "admit in the exact
required order" — is **specified but not implemented**. Every lane's review cadence assumes
this machinery. Decide: implement it, or amend the mandate to say it is manual. Do **not**
leave it as a third state where plans cite a controller nobody can run.

**X2 — No lane has verified implementation. All eight are plans.** Verbatim: "Implementation
acceptance is pending" (L1), "Implementation verified: No." (L2), "readiness BLOCKED" (L6),
"implementation readiness blocked" (L8). The repository has eight specifications and zero
certified builds. The master blueprint's first job is therefore **not** to write a ninth
specification — it is to say which lane's slices are executable today and what makes the
others not.

**X3 — The same four readiness blockers recur across lanes.** Source stabilization ·
hash-bound revision · executable acceptance evidence · archive filing. Three lanes name
them in almost identical words without referencing each other. That is a shared substrate
problem, and it is the strongest argument for a master blueprint existing at all.

**X4 — Package-path drift is a recurring defect.** L2's own `00-README` names a location
that is not its directory. L4 documents an earlier name (`BLUEPRINT-studio-spotlight-*`)
that no longer exists on disk and instructs readers to use the new one. L6 references a
superseded document. **Three of eight lanes have a path or supersession hazard in their own
header.** Decide one canonical resolution mechanism and apply it uniformly.

**X5 — 1,235 dirty files, no lane hash-bound.** L2 states it plainly: "dirty-tree contents
are not hash-bound." A verdict against a dirty tree is valid only for that tree, and the
tree is being written to by concurrent sessions. Any build order that assumes a stable
source is fiction until this is resolved.

**X6 — Uncommitted work living only in a gitignored directory (L6).** 77 files, including a
2,840-line console and a 20-variant 3D fleet, exist in `tmp/worktrees/brain-console-20260913/`
and in `scripts/swan-brain-console/`, all uncommitted. This is the highest-severity item in
the packet: it is a data-loss exposure, not a planning gap.

**X7 — The React 19 gate is one dependency peer range, measured from the live registry.**
Relevant to L1's "B Stage 1: remove compatible dependency blockers while remaining on React
18". Measured 2026-09-20 against `frontend/package.json` and npm:

| Package | Installed | `react` peer range | Verdict |
|---|---|---|---|
| `styled-components` | 6.1.6 | `>= 16.8.0` | open |
| `victory` | 37.3.6 | `>=16.6.0` | open |
| `react-router-dom` | 6.20.1 | `>=16.8` | open |
| `@testing-library/react` | 16.3.2 | `^18.0.0 \|\| ^19.0.0` | open |
| `framer-motion` | 10.16 | — | publishes as `motion` @ 13.4.0, peer `^18.0.0 \|\| ^19.0.0` |
| **`@tanstack/react-query`** | **5.15.5** | **`^18.0.0`** | **BLOCKED** |

Also measured: `frontend` has 4,488 TS/TSX files; `styled-components` is imported in 1,350;
`framer-motion` in 354; `victory` in 87. The code is **clean of every runtime API React 19
removes** (`ReactDOM.render`, `propTypes`, `contextTypes`, `childContextTypes`,
`createFactory`, `findDOMNode`, `react-test-renderer`, string refs — all zero).
`tsconfig.json` sets `strict: true` and then sets `noImplicitAny: false`,
`useUnknownInCatchVariables: false`, `noUnusedLocals: false`, `noUnusedParameters: false`,
neutering four of strict's checks across 4,488 files.

Carry X7 as an **inherited, dated measurement**. Do not re-derive it and do not contradict
it without a newer registry read.

---

## 4. Shared infrastructure — what every lane depends on

| Component | Path | State |
|---|---|---|
| Mega Blueprint mandate impl | `scripts/lib/mega-blueprint-mandate.mjs` (15,485 B) | present, with tests |
| Blueprint splitter | `scripts/split-astra-blueprint.mjs` (10,961 B) | present |
| Astra subscription transport | `scripts/consult-astra-subscription.mjs` | present |
| Advisory seats | `scripts/consult-glm.mjs`, `scripts/consult-ox.mjs` | present |
| Review archive tooling | `Z:\HostileReviews\new-review.mjs`, `query.mjs`, `reindex.mjs`, `relink.mjs`, `census-hostile.mjs` | present |
| Review archive corpus | `Z:\HostileReviews\*.md` | populated, active |
| Per-slice workflow controller | `scripts/workflow*.mjs` | **ABSENT — see X1** |
| Repo skills | `.claude/skills/` incl. `fable-blueprint-forge` | present |

The splitter requires, inside PART B and in order:
`00-README.md` · `01-architecture.md` · `02-wireframes.md` · `03-contracts.md` ·
`04-build-order.md` · `05-slices.md` · `06-bans.md` · `07-checkpoints.md` · `09-tests.md`.
There is deliberately no `08` in that list; the splitter emits PART C as
`08-decision-density-self-test.md`. Do not add `08` to PART B.

---

## 5. Hostile-review archive state (Rule 86)

Before reviewing, look. The archive is at `Z:\HostileReviews`. Recent verdicts relevant to
this master blueprint, all `DEFECTS-FOUND`:

- `2026-09-20-025023-social-bridge-completion-r1-correctness` — L4, R1 correctness
- `2026-09-20-012739-aftertaste-standalone-astra-round-1-mega` — Aftertaste (separate repo)
- `2026-09-20-004440-creator-brains-console-astra-mega-blueprint` — Creator Brains Console
- `2026-09-20-013205-coach-command-center-ai-harness-astra-mega` — L2
- `2026-09-20-022405-swan-brain-console-v3-round-10-a-guard-narrower` — L6, round 10
- `2026-09-20-031500-aftertaste-standalone-astra-round-2-fix-review`
- `2026-09-20-013824-swan-brain-console-v3-round-9-a-one-directional`

**Do not restate a settled finding in new words.** Where a lane has already been reviewed to
a verdict, your finding must say what is *new* or what has *changed*, or it is restatement.
L6 is at round 10 and L4 is at round 24 of a related lane — assume their obvious findings
are filed and answered.

---

## 6. The governing skill (inlined — this IS the loaded contract)

You operate under **`fable-blueprint-forge`**. Its binding content for this dispatch:

- You are the **architect**. You decide; you do not ask the builder to decide. Every choice a
  hostile builder would still have to make is either **decided** or **delegated with explicit
  bounds**.
- **Brownfield law.** This repo is not greenfield. Where an existing implementation exists,
  the package must name it and say whether it is adopted, extended, or deleted. Do not
  propose building what already exists.
- **Bans are load-bearing.** `06-bans.md` lists what a builder must NOT do. A ban that
  restates a preference is decoration; a ban that prevents a specific, named failure is the
  artifact.
- **Slices are independently verifiable.** Each slice has entry evidence, exit evidence, a
  named test command, and a stop condition.
- **No placeholder interfaces.** A type or function referenced by the package but defined
  nowhere does not earn readiness. If you cannot define it, declare it as a blocker.
- **Evidence over assertion.** "This is correct" is not evidence. A named test, a named
  command, and an observed result are.
- **Distinguish PLAN READY / IMPLEMENTATION VERIFIED / DEPLOYED.** Never promise bug-free
  software. Never claim a test passed that was not run.

---

## 7. What to produce

Answer the three mandates: (1) a documentation refresh across the six artifact classes →
the nine documents in PART B; (2) **two** hostile reviews — **A1** against the *existing*
eight lane packages summarized in §2 and the cross-lane findings in §3 (they are review
targets, not background reading), and **A2** against your own draft, ONE pass, with A2's
findings visibly changing the emitted package; (3) a decision-density self-test.

Emit, at fence depth 0 and in this exact order:

```
## PART A — HOSTILE REVIEW
## PART B — FORGED PACKAGE
## PART C — DECISION-DENSITY SELF-TEST
```

and inside PART B, exactly these level-3 headings in order:

```
### 00-README.md
### 01-architecture.md
### 02-wireframes.md
### 03-contracts.md
### 04-build-order.md
### 05-slices.md
### 06-bans.md
### 07-checkpoints.md
### 09-tests.md
```

**The master blueprint's specific obligations, beyond the generic contract:**

1. **Resolve X1** — either specify the workflow controller concretely (files, state schema,
   admission order, hook behaviour) or amend the mandate to manual and say which. A third
   state is not acceptable.
2. **Order the eight lanes into one build sequence**, with the dependency edges between
   them named. L6's salvage (X6) is a data-loss exposure and should be argued explicitly,
   not silently scheduled.
3. **Name the shared substrate** that all eight lanes sit on (X3), and decide whether it is
   built once or per-lane.
4. **Resolve X4** — one canonical package-path and supersession mechanism.
5. **Say what is executable today versus what is blocked**, per lane, with the blocker named.
   Where a lane cannot start, say so plainly.
6. **`02-wireframes.md` may be marked N/A with a reason** if the master blueprint is
   substrate-level rather than UI-level — but the reason must be concrete and per-lane
   applicability must still be stated. Do not use N/A as an escape from the section.

Where this packet is silent on something that matters, **decide it and say you decided it**.
Do not return an open question where a decision was available.
