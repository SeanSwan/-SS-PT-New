---
decision: "Hostile review of the ENTIRE two-day workstream + a ranked forward plan, feeding a comprehensive handoff to the next agent"
status: open
sanitized: true
---

# CONSULT PACKET — FULL-SESSION HOSTILE REVIEW + FORWARD PLAN

**You are one of three reviewers reading this independently and in parallel. A fourth
(Fable 5, the project's Final Decider) reviews your three replies plus this packet and
arbitrates.** Your reply feeds a handoff document for a fresh agent who will continue the
build with zero prior context.

## RULE 82 — FULL-SPECTRUM, NO LENS
Answer across every angle: product, architecture, security, privacy, legal, UX, human
factors, operations, strategy, and program management. No assigned lane. If a thought feels
like someone else's area, that is the thought this rule exists to kill — say it.

Refer to the teacher as **T**, children as **C1..Cn**, the owner as **O**. Never invent a
real-sounding name.

---

## 1. WHAT THIS WORKSTREAM IS

O's partner **T** is a solo preschool teacher: ~12 children aged 2–3, **no aide**, school year
began 2026-08-17 (yesterday). She asked for "an assistant for the whole year." O asked for a
plan to build her one, mirroring his own local-AI operator setup.

**Her hardware:** Galaxy S24-class Android (12GB RAM). High-RAM Apple Silicon MacBook Air
(24–32GB, exact figure unconfirmed — design floor is 24GB).
**O's hardware:** a 5090 desktop (32GB VRAM), kept powered on, running a local-model stack
and O's personal operator agent. Remote wake is dead (BIOS options exhausted); it is reachable
only when already on.

**Legal frame established early:** a teacher's personal on-device notes ≈ her paper notebook;
the moment child data syncs to developer-controlled infrastructure, the developer becomes an
operator of children's records (consent/retention/breach/parental-access obligations). Her
employer has approved ChatGPT — but **tool approval ≠ data approval**; nobody approving it for
lesson plans contemplated toddler developmental records. Unresolved with her director.

---

## 2. EVERYTHING DECIDED AND BUILT, IN ORDER

### Phase 1 — Product plan (six-model panel, later found methodologically flawed)
- One v1 feature: **messy paragraph in → typed records out → one-tap correction.**
- **H0 before any app:** local assistant on her Mac + paper triage sheet + one phone capture
  habit; the app build is **gated** on her doing the ritual unprompted ≥4 of 5 school days.
- Platform: **Expo Android** (originally assumed iPhone — wrong, corrected). Phone and laptop
  do NOT sync; two tools, two jobs.
- Timing anchor: **the midday rest window** (family notes are due before pickup; an
  after-school dump delivers value after its own deadline).
- **Scratchpad, not archive:** child items auto-expire; anything the record needs flows into
  the school's mandated systems same-day. AMENDED after a reviewer caught the contradiction:
  **observations expire; incidents and pinned evidence never do** (`pinned`, `expiryExempt`
  in the v1 schema).
- Three kill criteria: habit (≥3/5 days drafting family notes by week 2), accuracy (≥90%
  extracted records accepted uncorrected over 20), **wrong-child = zero, two strikes and the
  model path dies permanently for family notes**.
- 12-slice roadmap (S1 capture core → S2 DONE list → S3 incident record → S4 triage → …).
  "If only three more slices: S2, S3, S4."
- Top absences T never mentioned: **the protective incident record** (her legal shield),
  write-once-fan-out (one observation is hand-rewritten 4–5×), attention equity ("which child
  has no notes in 9 days"), pattern view, sub/sick-day sheet, the shadow list.

### Phase 2 — The Switchyard (routing + privacy layer)
- Two axes: sensitivity (what it touches) × capability (how hard). **Sensitivity outranks
  capability** — never route outward for a better answer about a child; route UP locally.
- Tiers: T1 her Mac Qwen3-8B (always) · T2 her Mac 14B (**ceiling for child data**, fallback
  for everything) · T3 O's 5090 over encrypted mesh (child data: NO — the school authorised
  her, not O) · T4 cloud vendor: **deliberately not built in v1** (the 5090 displaces it).
- CORRECTION logged: O's 5090 (32GB VRAM) is NOT a 70B machine at Q4 (~43–45GB needed).
  Real tier: **32B Q4 (~20GB)**.
- Queue: Ollama native (`NUM_PARALLEL=1`, `MAX_QUEUE=4`) — FIFO, no priority; her long job
  can block O on his own hardware. Client-side "busy" wording needed. O's side separately
  reviewed (verdict: raw model endpoint only over Tailscale; **never share O's agent** — "a
  credential vault with hands", single identity, approvals route to O).
- Separate knowledge vaults for T and O (same architecture, separate instances; merged vault
  = retrieval bleed + permanent indexed child records on O's machine + gateway collapse).
- Hostile-review discipline ported to her stack with a fork: child-data work reviewed by the
  LOCAL 14B; child-free by cheap cloud. **Never AI-generate an incident narrative.**

### Phase 3 — Rule 82 (process law born from this workstream)
The first panel assigned each model a narrow lens. The lensed "product" model still produced
the best ARCHITECTURAL catch (laptop location at midday) and the sharpest SECURITY find
(local-model laundering) — proving lensing filters contributions before they're made.
New standing law: **full-spectrum, no lens; roles declared, not restrictive; DISSENT
mandatory; per-model-per-angle attribution in synthesis.** Drafted as Rule 82 for `main`
(branch numbering: local ends at 73, main at 81 — adding it locally would collide).
**Status: drafted, NOT yet applied to main. O has not said go.**

### Phase 4 — H0 package (BUILT, hostile-reviewed to dry, ready to install)
Contents: setup runbook (~3.2k words, 13 sections) · system prompt (rev 2) · 4 printables
(triage sheet, incident form, command card, week-one watchlist) · all published as artifacts.
**Seven adversarial rounds, three models, 13 defects found and fixed:**
- R1 (GLM, 5 blockers): stateful commands on a stateless runtime → model would FABRICATE
  child details; incident record's only home was terminal scrollback; phone capture habit
  used cloud-synced note apps; Terminal-as-UI for a non-technical user; Modelfile hand-paste
  mechanics.
- R2 (GLM, 3 blockers **introduced by R1's fixes** + capture gap): think-disable left outside
  the copy-paste block; TextEdit/.rtf silently empties the SYSTEM block — and the behavioural
  acceptance test PASSES on a bare model (test could not detect its subject's absence →
  added `ollama show` structural check); referenced printables missing from packet; pocket
  notepad added for in-the-moment capture.
- R3 (GLM): clean + 1 nit.
- R4 (Kimi, fresh eyes): scrollback-clear habit scoped only to incidents; the nightly dump is
  the larger exposure. Diagnosis: "three rounds staring at the incident form made 'incident'
  the only category of child data the reviewer could see."
- R5 (HY3): clean; dissent — two controls were habits, not fences (Ollama updates; Terminal
  window restore).
- R6 (GLM, 3 blockers **all introduced by R5's hardening**): "close window on shell exit"
  destroyed the launcher's only error surface (fix: "close if exited cleanly"); claim
  conflated restore with sleep/wake (settings don't fence a never-closed window — immediate
  screen lock + the taught habit remain load-bearing); tripwire asserted a toggle was off
  that may not exist.
- R7 (Kimi ∥ HY3, parallel, identical bytes, no edits between): **both clean. DRY.**
  Post-dry: one additive line (Cmd+W "terminate process?" dialog note) — disclosed, not
  re-reviewed.
**Defect ledger: 5 original-design defects; 8 introduced by fixes.** Also: a same-model 4th
pass is an echo, not a vantage; two parallel independent models on identical bytes is the
strongest dry signal.
**Install status: NOT yet performed. School started yesterday. The H0 gate (5 days) has not
begun.**

### Phase 5 — Rules-only sorter prototype (BUILT, measured)
Deterministic clause-splitter + rule classifier + roster fuzzy-match, with hard safety
invariants (child-linked items always flagged for review; nothing silently dropped; rules
never assert a child confidently). **Tuned corpus: 100%. Held-out adversarial corpus: 53.3%
recall, zero false positives, zero child-link violations.** Honest read: rules are a safe
floor failing toward "untyped", not a sufficient sorter; the 47-point gap is the local
model's measured job. (Also logged: tuning against a self-authored corpus and citing 100% is
self-deception; the held-out number is the only honest one.)

### Phase 6 — Redaction middleware "The Desk" (DESIGNED, not built)
Trigger: employer approved ChatGPT; O wants T to have ChatGPT + a cloud coding agent +
local, with middleware stripping PII for the cloud lanes.
Two models, parallel, unlensed. **Convergence: Shape B — a local paste-through desk tool**
(no network, no keys — "cannot exfiltrate because it cannot send"), NOT a proxy ("an
enterprise pattern missing its enterprise"; her approval attaches to the ChatGPT app, not an
API; visibility of the diff IS the control). Pipeline: deterministic scan → roster match →
specific-child test → **cohort-identifiability test** → substitute → **re-test the de-named
text** → diff or refusal. Classify-and-block primary; redaction is defence-in-depth.
**The hard case is honestly unsolvable:** "the little boy whose mum is in hospital" — in a
cohort of 12, circumstance IS identity; even generalised rewrites fail via contextual linkage
(approved account + school domain → school → child). That class is ROUTED to the local
assistant, never cleaned.
**Kimi's standing dissent:** the content T most needs help with never reaches the cloud, so
the middleware is traffic policing, not enablement — **"two lanes and a rule"** (child-shaped
→ local; everything else → ChatGPT freely) may beat building the Desk at all. Proposed
sequencing: ship the rule first, build the Desk only if the middle lane (named-but-ordinary)
proves to be significant real traffic. Both models: cut the cloud coding agent for T unless
someone names its job (highest-risk lane, least articulated use case).

### Phase 7 — Production-system verdict (advisory, split)
O's live SaaS has a mature "body-aware, identity-blind" AI privacy layer (roster-driven strip,
bidirectional scrub, fail-closed-by-withholding, history re-sanitisation, five test suites).
Both reviewers agree its KEEP list (age+gender+height+weight+injury+medical) is a
quasi-identifier bundle for small client books. **Split:** Kimi — narrow upgrade (cohort flag,
k-anonymity cap, legal reclassification), then argued against its own list citing the 8-of-13
fix-introduced-defect rate; GLM — **no structural upgrade** ("their KEEP list IS the
product"; consenting adults ≠ non-consenting toddlers) with a flip condition: if the customer
base includes minors, it becomes a rebuild conversation. **VERIFIED FACT: the production
waiver schema carries guardian fields (`submittedByGuardian`, `guardianName`,
`guardianTypedSignature`) — minors CAN be enrolled. NOT verified: whether minors are active
today and whether their records reach the AI pipeline.** That check decides which verdict is
right and has not been run.

### Phase 8 — The coach-architecture pivot (O's latest direction, NOT yet planned)
O: take the production "coach" assistant's architecture and make it T's assistant — dictation
in, structured proposals out, deterministic approval layer owns final writes. Reading the
production contract confirmed the fit: proposal blocks with `safety_flags` + `evidence_refs`
(PII banned from refs BY CONTRACT), "coach prepares drafts; deterministic services own final
writes", "ask a clarifying question instead of proposing when identity is missing" — this IS
the loop the panel designed from scratch, already hardened in production.
**What changes:** proposal types (workout_log → observation/incident/parent_note/supply/
prep/idea), roster (clients → children), deployment (server+Postgres → local+SQLite), model
(frontier cloud → local 8B/14B, optionally O's 5090 for child-free work).
**Known risk:** the production prompt contract is ~90 dense lines written for a frontier
model; small local models degrade on dense contracts (lost-in-the-middle). Needs compression
+ testing before it touches an incident record.
**Elegant consequence:** if the coach is fully local, the coach lane needs NO redaction; the
Desk shrinks to the ChatGPT lane only — strengthening "two lanes and a rule".

---

## 3. OPEN ITEMS (verified state)

1. **H0 not installed.** Everything is dry and ready; school started yesterday; every day of
   delay is a day of the gate not running.
2. **Rule 82 not applied to main** (drafted; owner go pending; must be hand-applied to BOTH
   constitution files as #82; local branch numbering would collide).
3. **Director conversation not had** (ChatGPT approval wording/tier; child data on personal
   devices; incident-form process). The middleware's posture is correct under every possible
   answer, so this gates SHIPPING cloud lanes, not designing.
4. **Laptop location at midday unknown** — structural: if it isn't in the room at rest time,
   the strongest model is where the work isn't.
5. **What the school's parent app already records** per child per day — unknown; decides gaps
   vs banned duplicates for later slices.
6. **Production minors check** (§2 Phase 7) — not run.
7. **Village plan-mode fix** (single-pass flag not wired into the plan-mode gate at
   `validation-orchestrator.mjs:2203`; estimator ~25× reality) — unclaimed.
8. **The coach-architecture port** — direction given, no spec exists.
9. **S1–S12 app slices** — all gated behind the 5-day H0 evidence gate, which has not begun.
10. **T's own hostile-review loop** (local 14B reviewing her artifacts) — designed, not built.

## 4. PROCESS FACTS A REVIEWER SHOULD WEIGH

- 13 H0 defects: 5 original, **8 introduced by fixes**. Post-clearance edits are the
  highest-risk change class in this workstream.
- The leak gate itself became a leak once: a handoff revision embedded the scan pattern —
  which contains every protected string — in a committable file. Now externalised to a
  git-invisible local file. **The guard was the leak.**
- Recurring error class (owner-side agent): stating environment facts as settled from
  unverified input (iPhone assumption; 16GB; 32GB-on-M3; "70B on a 5090"; an asserted
  auto-update toggle). A procedural rule (voice-sourced environment facts are [UNVERIFIED]
  until checked) measurably reduced recurrence late in the session.
- Total external spend across ~15 calls, three days: **well under $2.**

---

## 5. WHAT WE WANT FROM YOU

1. **HOSTILE REVIEW of the workstream as a whole.** Not the artifacts line-by-line — the
   *decisions, sequencing, and omissions*. What is wrong, over-built, under-built, or
   mis-ordered? What has everyone been too close to see? Attack the pivots too: is the Swan
   Coach port actually right, or is it O's enthusiasm for his own architecture?
2. **THE FORWARD PLAN.** A ranked, numbered sequence of what happens next — from tonight to
   roughly a month out — with a gate per step and an honest owner per step (O / T / next
   agent / her director). Resolve explicitly: install-H0-now vs anything else first; the
   two-lanes-rule vs building the Desk; when the coach-architecture port starts and what its first
   slice is; whether the production minors check is urgent or routine.
3. **WHAT THE HANDOFF MUST CONTAIN** that this packet doesn't already say — the things a
   fresh agent will get wrong without being told.

## 6. OUTPUT FORMAT (required)

```
## VERDICT
<3 sentences: the state of this workstream and the single most important next act>

## HOSTILE FINDINGS
<ranked; each: what's wrong / why it matters / the fix. Include sequencing errors.>

## FORWARD PLAN
<numbered steps, each: owner · gate · effort. Tonight → ~1 month.>

## RESOLUTIONS
<explicit rulings on: H0 install timing · two-lanes-rule vs Desk · coach-architecture port
 (yes/no + first slice) · production minors check urgency · Rule 82 application>

## HANDOFF MUSTS
<what the handoff document must say that isn't obvious from this packet>

## DISSENT
<where this packet's own framing is wrong. mandatory.>
```
