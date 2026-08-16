# HANDOFF — Classroom Copilot workstream
## Arbitrated by Fable 5 (Final Decider) from four independent full-session hostile reviews. 2026-08-18.

You are taking over a two-day workstream. This file is the single entry point: the plan you
execute, the decisions you may not reopen, the traps that will eat your first session, and
where everything lives. **Supersedes `HANDOFF-PROMPT.md`** (whose primary task — the unlensed
re-run — was absorbed into rounds that already happened).

---

## 0. YOUR ROLE — READ BEFORE ANYTHING

**You are the gatekeeper of scope, not just an assistant.** The four-model review's unanimous
top finding: this workstream produced seven review rounds, a process law, two designed systems
and an architectural pivot — while the only user received *nothing* and the deadline the plan
was anchored to (school start, 2026-08-17) passed. The sponsor (O) generates new directions
faster than the plan absorbs them. **Any new direction from O gets written down and queued
behind the current gate — not executed.** He asked for this control himself by commissioning
this review. Cite this section when you invoke it.

**The leak gate.** This project involves children's records. The scan pattern lives OUTSIDE
the repo at `.ai-workflow/private/scan-patterns.local.txt` (git-invisible; verified with
`git check-ignore`). It is a secret: it contains every string it protects — an earlier
handoff revision embedded it in a committable file, and *the guard was the leak*. Gate every
outbound packet AND every published/committed artifact:

```bash
grep -qEif .ai-workflow/private/scan-patterns.local.txt "$FILE" && { echo "LEAK — ABORT"; exit 1; }
```

If the file is missing, rebuild it before any external call: teacher's surname · school ·
room label · classroom theme words · parent-app and SIS trade names · every child first name
you encounter · O's product/brand names. Refer to the teacher as **T**, children **C1..Cn**.

**Cost-of-delay ordering.** The one unrenewable resource is school days — the H0 gate counts
them and they cannot be refunded. Any open item answerable by T or by direct observation gets
a 24-hour ask-deadline before it may appear in any review round (two structural unknowns
survived multiple paid panels while being one text message each).

---

> **STATUS 2026-08-16 (agent execution pass):**
> **5(a) DONE — already on main before this pass** (CLAUDE.md:723 / AGENTS.md:726, in a
> NEWER revision than the local draft; draft marked superseded — stale-check caught it).
> **5(b) RUN — GATE FAILED:** 14B+compressed contract scored 66.7% recall (beats 53.3%)
> but ONE child-link violation → port stays dead per its own bar. Full result + no-retry
> rule: `sorter/PORT-DECISION-2026-08-16.md`. Step 9 is BLOCKED on this gate.
> **5(c) DONE:** `debatePanels` now passed into the plan-mode spend gate
> (validation-orchestrator.mjs, mirrors code mode); estimator delta proven
> ($151.59 → $10.49 on identical flat inputs); live flat run still needs Sean's Rule-16 go.
> **Step 2 minors check: ANSWERED — dormant, not live.** Code half: NO minor/guardian gate
> exists anywhere in the AI chat pipeline (aiChatRoutes.mjs:466 chain = protect +
> requireSubscription + rate-limit + PII-strip only). Empirical half (prod DB, 2026-08-16,
> counts-only probe `backend/scripts/inspect-minors-ai-exposure.mjs`): guardian-signed
> waivers = 0 · guardian-linked users = 0 · users under 18 by DOB = 0 · either-signal
> minors with AI conversations = 0. R2 denominators: 7 total users / 12 waiver records
> (tables non-empty — zeros are real), but **3 of 7 users have NULL DOB (1 of them uses AI
> chat)** — the DOB signal classifies only 4/7. **No minor is detectable by either
> available signal**, and the current population is O's handful of personally-known adult
> users, so the missing
> gate is a structural gap, not a live exposure. A gating slice is backlog, not queue-jump;
> when built it hits the Rule 50 Tier-C trigger (minor's-data path → Village review).
> **Steps 1, 3** remain O-owned; texts drafted for O in the session report.
>
> **PLAN LEDGER (R2 review demanded owners — every step, one line):**
> 1 texts-to-T: **O**, tonight, drafts ready · 2 minors check: **DONE** (dormant; probe =
> durable script) · 3 install: **O+T**, next evening, printables first · 4 freeze: everyone,
> starts when T starts · 5a: **DONE** (was already on main) · 5b: **DONE — variant-1 FAILED,
> pilot; retry gate pre-registered** · 5c: **DONE minus live paid run (O's Rule-16 go)** ·
> 6 director talk: **T** (O preps questions), post-install · 7 gate read: **O+agent**, day 5 ·
> 8 two-lanes card: **O+T**, after gate · 9 port slice: **BLOCKED** (needs 5b retry pass
> under the R2 gate) · 10 month-end + "year or month?" question: **O+T**.
> New: `89-OPTION-MEMO-FOR-O.md` — the T-facing sorting options (rules-now / retry / hybrid).

## 1. THE FORWARD PLAN — execute in this order

| # | Step | Owner | Gate | Effort |
|---|------|-------|------|--------|
| 1 | **Two text messages to T, tonight:** where is the laptop at midday rest time? what does the school's parent app already record per child per day? | O | answers in hand | 5 min |
| 2 | **Production minors check** — do guardian-signed users (waiver schema: `submittedByGuardian`, `guardianName`, `guardianTypedSignature` — verified present) exist as *active clients*, and can their records reach the AI chat pipeline? | O or you | written yes/no with file:line | ~30 min |
| 3 | **Install H0** — print the four printables FIRST (`h0-setup/`), run `SETUP-RUNBOOK.md` end-to-end **including the co-design walkthrough**: T may reword the ritual (accepted unless a safety invariant breaks), she is offered a degraded week-one mode (paper only, assistant optional), and **the 5-day gate clock starts when SHE says start** | O + T | she completes one capture→dump cycle solo within 24h | 1 evening |
| 4 | **Design freeze while the gate runs.** No new artifacts, no Desk, no port spec, no slices. O limited to a 5-min daily check-in per the watchlist | everyone | 5 school days from T's start | — |
| 5 | **Freeze-compatible mechanical work only** (touches nothing of T's): **(a)** apply Rule 82 to BOTH constitution files on `main` as **#82** (local branch ends at 73, main at 81 — apply on main only, by hand, never the mirror sync); **(b)** run the **compressed-coach-contract behavioural test**: compress the ~90-line production proposal contract to ~30 lines for a 14B, test ≥20 prompts against the held-out corpus (`sorter/heldout.mjs`) — this test IS the port decision; **(c)** Village plan-mode fix (`debatePanels` into the gate at `validation-orchestrator.mjs:2203`) | you | (a) constitution-guard passes · (b) ≥ the 53.3% rules baseline with ZERO child-link violations · (c) flat plan-mode run works | (a) 15 min · (b) one afternoon · (c) small |
| 6 | **Director conversation** — approval wording/tier for the employer-approved cloud AI (consumer vs Team/Edu = training/DPA differences), child data on personal devices, the school's own incident-form process | T (O preps questions) | answers recorded, even informally | one meeting |
| 7 | **Read the gate** — each miss classified **structural vs habit** (laptop absent / window didn't exist ≠ habit failure); pass = ≥4/5 *habit*-days; >2 structural misses → redesign the midday anchor, don't kill; week-1 results are directional-low (worst adoption week of the year) — a failed week-1 gate earns one re-run before any kill decision | O + you jointly | verdict + diagnosis recorded | one evening |
| 8 | **Ship "two lanes and a rule" as a printed decision card:** child-shaped OR cohort-identifiable circumstance → local assistant, always · everything else → the approved cloud AI freely. Add a tally habit for "named-but-ordinary" items | O + T | card in use; tally running | one printout |
| 9 | **Coach port, slice 1 — only if 5(b) passed AND the gate passed:** observation proposals ONLY, local 14B, deterministic approval layer owns all writes, **human confirms every child attribution** (strikes count post-confirmation only — the resurrection path for the wrong-child criterion). Datastore location + backup policy are spec-level requirements: outside iCloud-synced dirs, FileVault verified, Time Machine local-only | you | ≥90% structural validity on held-out corpus before any real child text | 1–2 wks part-time |
| 10 | **Month-end review** — kill-criteria trajectory · Desk build/no-build on tally data (trigger: ≥3 middle-lane items/week for 2 consecutive weeks) · T3 usage policy · **and the rudest question, put to T directly: did she want a program for the year, or relief this month? Her answer is allowed to shrink the program** | O + T | decisions recorded | 1 hour |

## 2. ARBITRATED RESOLUTIONS (Final Decider rulings on the panel's splits)

- **Install vs minors check:** both within 48h, **in parallel** — Kimi's "minors outranks
  install" was right on severity, wrong on contention: a 30-min query and an evening with T
  don't compete for the same hours. Neither blocks the other.
- **Desk — defer, not delete:** design docs stay as reference (`the-desk.html`); no build
  unless the tally trigger fires. HY3's "delete" forecloses a lane the tally can measure for
  the cost of a printed card.
- **Post-dry edit — REVERTED** (done): the Cmd+W dialog line added after R7's dry verdict was
  removed, restoring the exact bytes two parallel models cleared. The walkthrough teaches
  that dialog live anyway. Standing law: **DRY = frozen; any post-dry edit reopens review
  with two parallel independent models on identical bytes. No "just one line."**
- **Coach port — downgraded from "confirmed fit" to unverified hypothesis.** The fit was
  asserted by reading a contract — this workstream's own named error class. It is a
  *refactor* (patterns + deterministic layer), not a pivot, and it does not re-sequence
  anything. The 5(b) test is the entire decision, and note Kimi's warning: the same mind
  designed both loops, so convergence is evidence about the person, not the problem.
- **Incident proposal type:** the production contract's `incident` type would collide with
  the absolute rule below — incidents are **structure-only** (field completeness checks),
  the narrative is never generated. Ship incident support last, behind its own safety review.
- **Dictation:** on-device keyboard dictation only. Classroom audio is a new data class
  nobody has examined — no retained audio, nothing routed to O's machine, ever.
- **Rule 82:** apply now per step 5(a); Sean already directed the rule's creation. Until
  applied, cite as convention, not law.

## 3. SEALED — do not re-derive, do not reopen

1. **Sensitivity outranks capability.** Child data ceiling = T2 (her Mac, 14B). Never her→O's
   5090 (school authorised *her*), never cloud. "This is hard" routes UP locally, never out.
2. **Never AI-generate an incident narrative.** Absolute; survives every pivot; you will be
   tempted because the coach contract is elegant. It does not relax.
3. **The cohort-identifiability class is unsolvable, not unsolved.** "The little boy whose
   mum is in hospital" routes local, always. No cleverer rewrite exists — the failure is
   contextual linkage, not names.
4. **Observations expire; incidents and pinned evidence never do** (`pinned`, `expiryExempt`
   in any schema from v1).
5. **Scratchpad, not archive** — same-day flow-out into the mandated systems; any persistent
   store must live outside cloud-synced directories.
6. **Cloud coding agent for T: cut** until someone names its job. Two models, twice.
7. **O's agent is never shared** ("a credential vault with hands") — T gets model endpoints
   only. O's 5090 = **32B Q4** tier (32GB VRAM; 70B@Q4 does not fit), reachable only when
   already on (remote wake is dead — do not retry the BIOS).
8. **Separate vaults** for T and O; same architecture, separate instances; optional third
   explicitly-shared vault.
9. **Kill criteria** (with the resurrection path from §1 step 9): habit ≥3/5 by wk 2 ·
   accuracy ≥90%/20 uncorrected · wrong-child zero — two post-confirmation strikes kill the
   model path for family notes permanently.
10. **Voice-sourced environment facts are [UNVERIFIED] until checked** — five documented
    violations (iPhone, 16GB, 32GB-on-M3, 70B-on-5090, phantom toggle). Apply it to
    O-sourced claims *and to this handoff*.

## 4. THE STORY IN 60 SECONDS (context, not instructions)

T (solo preschool teacher, ~12 two-year-olds, no aide, year began 2026-08-17) asked for "an
assistant for the whole year." Two days produced: a 6-model product plan → the Switchyard
(4-tier routing + privacy gateway) → Rule 82 (full-spectrum panels, born from a lensing
error) → the **H0 package** (local Mac assistant + 4 printables; 7 hostile rounds, 13 defects
— 5 original, **8 introduced by fixes** — ending DRY on two parallel clean verdicts) → a
rules-only sorter (**53.3% held-out recall, zero child-link violations** — the only honest
number; the 100% tuned figure is self-deception) → "the Desk" redaction middleware design
(deferred) → O's coach-architecture pivot (now a gated refactor). A four-model review of the
whole program then ruled: excellent process, zero delivery — install first, freeze, verify
the port empirically, ask T what she actually wants.

## 5. FILE MAP — reading order

Everything in `docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/`:

**Execute from:** this file → `h0-setup/` (runbook, system prompt, 4 printables — DRY,
frozen) → `sorter/` (prototype + `heldout.mjs`, the port-test baseline).
**The four program reviews (read §HOSTILE FINDINGS + DISSENT only):** `81-glm-session.md` ·
`82-kimi-session.md` · `83-hy3-session.md` · `84-fable-session.md` (pre-arbitration).
**Reference only — do NOT re-read to re-decide:** packets/replies `00`–`72`,
`RULE-82-DRAFT.md` (apply this verbatim in step 5a), published artifacts
(classroom-copilot / switchyard / for-her / the-desk / triage / incident-form / command-card
/ watchlist — republish via the Artifact tool with the same file path to keep URLs).
**Superseded:** `HANDOFF-PROMPT.md`.

## 6. TOOLING (verified this session)

```bash
node scripts/consult-glm.mjs  --document X --out Y --model glm-5.3 --remit "..."          # subscription, 170–400s
node scripts/consult-kimi.mjs --document X --out Y --remit "..." --confirm-spend          # ~$0.13
node scripts/consult-hy3-design.mjs --document X --out Y --remit "..." --confirm-spend    # ~$0.006
node scripts/consult-fable.mjs --document X --seed S --out Y --remit "..."                # ~$0.33
```
Run in parallel, in the background. Every packet: Rule 82 remit (full-spectrum, no lens,
DISSENT mandatory), leak-gated first. Rotate models between confirmation rounds — a
same-model re-pass is an echo (proven in R4). Batch fixes, re-review once. AI Village is
broken in plan mode (see step 5c) — do not use until fixed. Total spend across ~19 calls in
three days: **under $2.50.**

## 7. TRAPS THAT WILL EAT YOUR FIRST SESSION

- **The 8-of-13 ratio:** fixes introduce more defects than first drafts here. Post-clearance
  edits are the highest-risk change class. Freeze means freeze.
- **A test that passes when its subject is absent is not a test** (a bare model passed the
  H0 behavioural acceptance test with the system prompt silently empty — hence the
  `ollama show` structural check). Ask this of every verification you write.
- **This branch is ~1,950 commits behind `origin/main`** and rules 74–81 exist only on main.
  Constitution work happens on main. Never run the mirror sync (it can destroy the newer
  file); never make CLAUDE.md and AGENTS.md byte-identical (AGENTS.md lines 1–45 are the
  Codex adapter).
- **O communicates by voice-to-text.** Glossary: "Gwen three point eight" = Qwen3 8B ·
  "Capernasky/Kapernathy" = Karpathy · "Efzidian/Obisidan" = Obsidian · "ChemE three / QME
  three / Kiwi three" = Kimi K3 · "high three" = HY3 · "GLM five point three" = GLM 5.3 ·
  "hostile/host style review" = hostile review · "swine coach" = the production coach
  assistant. Read through transcription noise; never make him repeat.
- **This is a side project** in the brainstorms lane. It does not consume the production
  lane without O naming it.
- T-facing capabilities must **degrade to an O-independent paper path** — O is a single
  point of failure for every tier above her Mac; paper is the availability story.

**Sanity check before you start:** if your first hour is spent reading consult replies
instead of confirming steps 1–3 happened, you are repeating the failure this review existed
to catch. The plan is the work. Go.
