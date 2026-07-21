# NEXT-CHAT HANDOFF — Swan Brain program + Workout-Completion build gate
**Date:** 2026-07-21 · **From:** Fable session (2026-07-19 → 07-21) · **To:** fresh Fable session
**Read order:** this file → the two blueprint files in §7 → the decision record in §7. Nothing else needed to resume.

---

## 0. ONE-PARAGRAPH ORIENTATION
Over this session we (a) decided the Swan "brain" architecture, (b) shipped a working Mobbin→design-brain
**learning engine** end-to-end, (c) ran its **first real pilot** and Sean accepted 6 design principles into
the vault, and (d) had Kimi forge a **build blueprint** for the SwanStudios workout-completion screen from
those 6 principles. **The immediate next action is NOT to build** — it is to answer a small set of open
questions (§4) so the completion screen can be built correctly. Everything is shipped to `main` except the
completion screen, which is planned-only. Sean works least-clicks / phone-first / "do what's recommended";
he is the only canon gate; nothing outward-facing or production-UI ships without his explicit go.

---

## 1. WHAT EXISTS NOW (all shipped to main this session unless noted)

**The design-brain learning engine** — `scripts/design-brain/` (zero-dep Node ESM, ~1,600 lines, 39 tests):
- Pipeline: `log-receipt → synthesize → corroborate → packet → [Sean's letters] → adjudicate → emit-vault`.
- **Convergence claim** is the unit (one principle cited across ≥2 independent products). Confidence is
  MECHANICAL from unique product count (`confidenceFor`: ≥4 high, ≥2 medium, 1 low). Sean adjudicates a
  weekly packet with letters a/r/t/m. `claims.jsonl` is append-authoritative (rev+1 appends, `loadClaims` fold).
- **Auto-corroboration** (`corroborate.mjs`+`similarity.mjs`): a near-verbatim re-hit of an ACCEPTED principle
  from a NEW product folds in automatically (rev+1, confidence via `confidenceFor` ONLY) — NO letter. Same
  product = no-op. Never accepts/merges/edits-text/resolves-contradictions. Deterministic lexical matcher
  (Jaccard+overlap+trigram, thresholds in `config/tuning.json`); ambiguous → merge queue; strong-negation →
  contradiction candidate. Every auto change audited (`autoUpdate` block + `events.jsonl`).
- **Novelty dial** (`novelty.mjs`): `(fresh+contradictions)/receipts` rolling 3 runs; PRODUCTIVE→COOLING→
  TAPPED OUT (with claim+receipt floors); prints atop every packet + `node src/novelty.mjs`; recommends next
  domain, never blocks. README at `scripts/design-brain/README.md` has the full runbook.
- Data root JAILED at WSL `~/design-brain` (outside repo + vault); hardened writer (binary/symlink/atomic/audit).

**The Hermes brain-vault** — `~/hermes2/brain-vault` (Windows/WSL): 4,297 FTS5-indexed docs. Collections:
`books` 3094 · `desktop-c-pdfs` 441 · `repo-docs` 633 · `music-nirvana-misc` 90 · `bible` 33 · **`design-claims`
6 (Sean's accepted principles, searchable via `brain_search(collection="design-claims")`)**. `clients-private`
= 0 indexed rows (PII guard holds). MCP tools: `brain_status/brain_search/brain_open/brain_daily_brief`.
- **SWA-16 PII guard shipped:** `build --include-private` now writes ONLY to a separate `brain-vault-fts-private.sqlite`;
  the MCP server has NO path to it; interactive confirm + audit log required. (`.bak` beside the tool.)
- **Repo-corpus ingester:** `scripts/brain/ingest_repo_corpus.py` (native-format emit, hard secret-scan gate,
  derived mirror). Rerun `--apply --build` after doc-heavy pushes.

**The wiki reality:** the "Karpathy Wiki" IS the PDF vault (Sean's reframe, correct). Obsidian vault + Graphify
never existed → atticked to `docs/_attic/2026-07-wiki-mythos/` with tombstones; `docs/brain/REALITY.md` is the
canonical what-exists page. Standing rule: docs describing non-existent systems get atticked on discovery.

**Client-dictation tooling** — `scripts/hermes/clientNotes/` (parser + jailed local record writer + dry-run
ingest, 48 tests). Reads Hermes `state.db` READ-ONLY. Finding: 0 real workout dictations exist yet (all 278
msgs were dev chatter) — it's capture-forward. Contract: dictate `log client 84: goblet squat 3x12 @35lb`.

---

## 2. THE MOBBIN LEARNING LOOP — how "keep getting smarter" actually works (Sean asked)
Gets smarter **in a loop, bounded, human-gated**. Collection/corroboration/contradiction/retrieval all
compound automatically; the ONE cap is Sean's weekly letters (novelty-gated so he only judges NEW principles).
Per-domain S-curve: fast → saturates → move to next domain (the novelty dial says when). Mobbin has finite
GOOD patterns per domain; the honest ceiling is "as smart as the market has patterns for, across as many
domains as Sean adjudicates," then Mobbin becomes a refresh source. Cold-mode (Mobbin off, brain answers from
claims) is the real "did it learn" test. **D1 (Mobbin ToS) = GO, documented:** MCP is the official agent
product; rate limit 60 req/60s per user (`docs.mobbin.com/rate-limits.md`); our caps sit far below; ToS bans
AI-training/derivatives/resale, which the principles-not-pixels/no-screenshots posture already respects.

---

## 3. THE 6 ACCEPTED PRINCIPLES (the pilot result — now Swan doctrine-adjacent, in the vault)
D01 workout-logging → progress-proof → next-action, from a governed pilot (2 searches, 12 results, 4 flows):
1. **CLM-43f6 · HIGH (Hevy,Fitplan,Runna,Fitbit,Centr)** — completion = a branded shareable **proof card**, not
   a plain confirmation.
2. **CLM-b212 · MED (Centr,Strava,Hevy)** — named personalized congrats ("Smashed, Alex!"), not generic.
3. **CLM-9d9c · MED (Ladder,Open)** — streak/next-goal at the finish → converts the finish into next commitment.
4. **CLM-f54a · MED (Strava,Hevy,Tempo)** — progress = current-period truth first, then week→YTD→all-time trends.
5. **CLM-b7e2 · MED (Hevy,Tempo)** — monthly report = training balance on the body (muscle radar/heat map).
6. **CLM-92f0 · MED (Strava,Tempo)** — future insight teased but gated on logging volume.

---

## 4. ⚠ THE IMMEDIATE TASK — answer these, THEN build the completion screen
Kimi forged a build-ready blueprint (§7). It's excellent AND blocked on questions only Sean can answer plus one
canonical-surface audit. The next session's job: get these answers, run the audit, then build.

**FABLE'S VERIFICATION FINDING (must resolve first — Rule 26/27):**
- `PostWorkoutCelebration.tsx` (the XP overlay the proof card hands off from) is **DORMANT — rendered in 0 JSX
  sites**, never wired to workout-save. So the blueprint's "5-line call-site swap" is wrong; wiring is net-new.
- The repo's workout-logging surface is **trainer/admin-facing** (`WorkoutLoggerModal.tsx` under
  `admin-clients/`). The 6 principles are about the **CLIENT's** completion moment (a card THEY share).
- **THE load-bearing question: where does a CLIENT complete their OWN workout today?** Run a
  `canonical-surface-audit` of the client workout-logging path (Rule 26 receipt) to answer WHO sees the proof
  card and WHERE it mounts. If no client self-logging surface exists, this becomes a two-part build (surface +
  completion flow) — surface that to Sean before building.

**KIMI'S 5 OPEN QUESTIONS FOR SEAN (from blueprint §14):**
1. Does the backend compute **PR flags** today, or does the logger need a `previousBest` lookup? (UI degrades
   silently if `prs[]` empty.)
2. **In-app community feed** to share into, or OS share sheet only? (Blueprint ships sheet-only + copy-link.)
3. Does a **`/progress` route** exist this sprint? (If not, omit the "See progress" CTA + the P6 teaser this sprint.)
4. **Weekly streak target** source — program-defined per client, or a default? (Module hides if `weeklyTarget=0`.)
5. Is an **HTML→PNG snapshot** lib already in deps, or is share v1 text+link only?

---

## 5. THE BLUEPRINT (build-ready once §4 resolved) — summary
- **Architecture (ACCEPTED):** NEW SIBLING, orchestrated, feature-flagged. New `WorkoutCompletionFlow`
  orchestrator mounts the **untouched** `PostWorkoutCelebration` (phase 1) → on its `onDismiss` transitions to
  a new `ProofCardScreen` (phase 2). ZERO lines changed in the 321-line live component. Flag
  `VITE_COMPLETION_PROOF_CARD`; off = current prod behavior byte-identical. Correct because 321/300 makes
  fold-in a Rule-4 violation, and blast radius is zero.
- **Files (8 new, each <300 lines, in `Celebrations/Completion/`):** `completion.types.ts` · `ProofCard.tsx` +
  `.styles.ts` · `StreakNextGoalModule.tsx` · `ShareSheet.tsx` · `ProofCardScreen.tsx` ·
  `WorkoutCompletionFlow.tsx` · `EmptyNextActionCard.tsx` + tests. Plus the (net-new, per §4) integration.
- **Design:** real Crystalline Swan tokens (proof card = C12 SheenCard sapphire glass + Ice-Wing/Gilded chrome;
  success = Ice-Wing NOT green; Dual-Button Glow; Fira Code stat values; Cormorant congrats line). ONE signature
  motion (card reveal 480ms, RM-gated). Ends on the next action (B2.2 arc). Real data only; anti-clone.
- **7 slices, smallest-first,** each with an acceptance test; S5's stop condition = existing `XPCounter.test.tsx`
  passes UNMODIFIED (the did-not-break-it gate). Full detail in `01-BLUEPRINT.md`.
- **Building routes through `swan-design-router` (Rule 40) and needs Sean's explicit go** — it is production UI.

---

## 6. PENDING SEAN ITEMS (standing, not blocking §4)
- `config/doctrine.md` (design-brain) is a DRAFT wanting Sean's ~1 hour to make it his.
- Optional 2-min eyeball of `mobbin.com/terms` in his logged-in browser (page 403s unauthenticated).
- Dictation → SwanStudios `WorkoutLog` wiring (capture-target = BOTH decided; needs a scoped Hermes→SwanStudios
  auth path before build).
- The pilot proved the loop; next Mobbin domain when Sean wants it (novelty dial recommends D02/D06).

---

## 7. ARTIFACTS (durable, on main)
- **This handoff:** `docs/ai-workflow/AI-HANDOFF/NEXT-CHAT-PROMPT-brain-and-completion-2026-07-21.md`
- **Completion blueprint:** `docs/ai-workflow/AI-HANDOFF/completion-blueprint-2026-07-21/` — `00-PROMPT.md`,
  `01-BLUEPRINT.md` (the buildable spec), `02-CLAUDE-VERIFICATION-ADDENDUM.md` (the dormant-component finding).
- **Brain architecture decision + 6 Kimi passes:** `docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-ARCHITECTURE-DECISION-2026-07-19.md`
  + `brain-review-2026-07-19/`.
- **What-exists canon:** `docs/brain/REALITY.md`. **Engine runbook:** `scripts/design-brain/README.md`.
- Session pushes to main: clientNotes, brain decision, SWA-16 guard, repo ingester, MVE engine, novelty+
  auto-corroboration, one-liners+atticking. (Working tree is a drifted WIP branch; all ships went via clean
  worktrees off origin/main — do the same.)

## 8. HOW TO RESUME (fresh session, cheap) — WITH A MANDATORY FABLE REVIEW GATE
Read this file + `01-BLUEPRINT.md` + `02-...ADDENDUM.md` + `docs/brain/REALITY.md`. Then, in order:

1. **Get Sean's §4 answers** (the client-completion-surface question + Kimi's 5 open Qs).
2. **Run `canonical-surface-audit`** on the client workout-logging path (Rule 26 receipt) — prove WHERE a
   client completes their own workout and WHERE the completion flow mounts. `02-...ADDENDUM.md` found
   `PostWorkoutCelebration` is dormant (0 mount sites); do NOT trust the blueprint's "5-line swap."
3. **⚠ FABLE REVIEW GATE (Sean's explicit ask 2026-07-21) — MANDATORY BEFORE ANY BUILD.** Fable (the
   session model — or the next-best Claude if unavailable) gives its OWN review of the blueprint before a
   line is written. This is NOT rubber-stamping Kimi. Fable independently checks:
   - the architecture ruling against the REAL repo (does the new-sibling seam actually hold given the
     dormant component + the trainer-vs-client surface question?);
   - whether the props contract (§8 of the blueprint) maps to REAL `WorkoutSession`/`WorkoutLog` fields
     (verify the fields exist — Rule 58 schema-drift check);
   - the token/component choices against `design.md`/`components.md` (Rule 40 design dual-pass);
   - the "do not" list for anything the repo makes impossible or already solves;
   - and delivers a Fable verdict: BUILD-READY / REVISE (with the specific corrections) / BLOCKED (with why).
   Record the verdict in a new `03-FABLE-REVIEW-<date>.md` beside the blueprint. Only a BUILD-READY (or a
   REVISE whose corrections Fable then applies to the plan) unlocks building.
4. **Build** the blueprint slice-by-slice via `swan-design-router` (Rule 40) behind
   `VITE_COMPLETION_PROOF_CARD`, smallest slice first, S5 gate = `XPCounter.test.tsx` passes unmodified.
   Each slice: build → slice-internal hostile review (Rule 61) → verify. Ship via a clean worktree off
   origin/main (the working tree is a drifted WIP branch). Production UI → Sean's explicit go to build.
