---
decision: Adopt IndyDevDan's validation-gate + three-actors + debate patterns into the Swan workflow as Rule 73 + two skills + closeout integration; PI/Antigravity harness switch REJECTED (and-not-or — lanes may join, the harness of record stays).
status: open
supersedes: none
---

# MASTER BUILD PROMPT — ADW Fusion Upgrade (Fable vision, worker-built)

**Authored:** 2026-07-21 by Fable (claude-fable-5), Final Decider · **Builder:** any competent agent (Codex / Sonnet / fresh Claude session) · **Linear:** SWA-32 (parent) — update it as you go
**Contract:** This document makes every decision. If you (the builder) need to ask a question, the plan has failed — file the gap as a comment on SWA-32 and STOP rather than guessing.

---

## 0. Context you must load first (in this order, nothing else)
1. `CLAUDE.md` (root) — the 72 rules. You are adding Rule 73. Read rules 15, 17, 46, 50, 61, 64, 67, 68, 70, 71, 72 closely.
2. `.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` — Rule 67 read-before-edit; claim your files in YOUR lane before editing.
3. `.claude/skills/closeout-evidence-lock/SKILL.md` — you will amend it (Slice 4).
4. `.claude/skills/ai-village-fusion/SKILL.md` + `.claude/skills/fusion-router/SKILL.md` — the fusion tiers your new skills must compose with, not duplicate.
5. `docs/ai-workflow/CATALOG.md` — grep it before inventing anything ("validation", "gate", "debate", "ADW") per Rule 72.

## 1. The vision (why — so you build it in Fable's intent)
Source: two IndyDevDan transcripts reviewed 2026-07-21 (Model Fusion harness; "loop engineering = SDLC rebrand → AI Developer Workflows"). Fable's ruling, Sean-approved:
- **Swan already runs ~80% of his system** (fusion tiers ≈ his /opinion+/fusion; Rule 68+Linear+Workflow ≈ his ADW/software-factory; Hermes local Qwen ≈ his sovereign AI). Do NOT rebuild what exists — this upgrade adds only the genuinely missing pieces.
- **The one real upgrade is the Validation Gate:** today the builder builds first and hostile-reviews itself after. The stronger mechanism: an INDEPENDENT validator writes an *executable* pass/fail gate BEFORE the build, from the acceptance criteria; the builder cannot modify the gate; failures loop back mechanically. It turns Karpathy "goal-driven execution" from discipline into machinery.
- **Three-actors cost discipline:** engineers, agents, and plain deterministic code are the three value creators; code is free/fast/deterministic and must be preferred whenever it can do the job (proof case: the 2026-07-20 catalog SHA corruption — LLM transcribed SHAs badly; `git ls-files -s` did it perfectly for free).
- **Harness ruling (permanent, cite in doctrine):** PI coding agent / Antigravity are NOT adopted as replacements. The Swan harness of record stays (72 rules, 25 skills, hooks, lanes, catalog are harness capital). A new harness may join as an additional LANE beside Codex someday — and-not-or — but the seat of government does not move.

## 2. What you are building (5 slices, in this order)

> **Slice 0 was added 2026-07-21 after a Kimi K3 hostile consult** on the Boris Cherny "domain knowledge → infra" thesis (verdict archived in the SWA-32 thread). Kimi's ruling, Fable-ratified: prose rules do not survive parallel-agent entropy; the rules that silently degrade the product (MUI, Recharts, hex colors, retired palette) must become *physically unenforceable to violate* BEFORE the larger gate framework builds — small deterministic wins first, as proof the executable-check pattern works.

### Slice 0 — Front-End Guard Pack (executable enforcement of the silent-failure design rules)
Convert the highest **cost-of-violation × silence-of-failure** prose rules into deterministic checks. All four guards:
1. **ESLint `no-restricted-imports`** in `frontend/` for `@mui/*` (Rule 1) and `recharts` (Rule 10) — with messages pointing at the CLAUDE.md rule. If the frontend ESLint config is absent/broken (check `docs/ai-workflow/references/ESLINT-SETUP.md` — install was deferred), implement these two as a grep-based check in the pre-commit hook instead, and note the ESLint migration in SWA-32; do NOT install ESLint fresh in this workstream.
2. **Hardcoded-hex check** (Rule 6): pre-commit grep over staged `frontend/src` files for hex literals outside `var(--token, #hex)` fallback position; allowlist file for the legitimate exceptions found on first run (expect some — triage, don't mass-exempt).
3. **Retired Galaxy-Swan palette gate** (identity section): pre-commit grep for `#0a0a1a`, `#00FFFF`, `#7851A9` in staged frontend files — hard fail, no allowlist.
4. Wire all of the above into the existing pre-commit hook chain (same place as the secret scan — read `scripts/` for the current hook entry point and extend it; do not create a parallel hook system).
**Explicitly deferred from this slice:** axe-core 44px/contrast runtime checks (needs browser infra — file as a Backlog Linear issue instead).
**Acceptance:** plant one violation of each class in a scratch file, stage it, show the hook rejects each with the right message, then remove the plants (Rule 38 — note them in closeout). Existing-violations sweep: run each check repo-wide once, report the count found, fix NOTHING outside staged-file enforcement (existing violations become one Backlog issue with the counts — no blind cleanup, Rule 34).

### Slice 1 — `swan-gate` skill + gate infrastructure (the centerpiece)
**New file: `.claude/skills/swan-gate/SKILL.md`** (≤300 lines, 7-star header per DOCUMENTATION-STANDARD.md). It must specify:
- **Trigger:** any substantial build slice (same bar as Rule 61); user says "gate this", "/swan-gate"; or the orchestrator routes a Workflow build stage through it. NOT for trivial edits/docs.
- **The procedure (exact):**
  1. From the slice's acceptance criteria, a **validator agent** (a SEPARATE subagent — different context from the builder; use Agent tool, `effort: high` for the validator even when the builder runs cheaper) writes `gate.mjs` to `.ai-workflow/gates/<task-slug>/gate.mjs` BEFORE any build work starts.
  2. Gate contract: plain Node ESM, **zero LLM calls, zero new dependencies, deterministic**; exits 0 on pass, 1 on fail; prints one `PASS:`/`FAIL:` line per check; every `FAIL:` line must contain enough text to be actionable feedback for the builder. Gates may run tsc/vitest/node --check/grep/file-existence/HTTP-probe — anything Tier-A.
  3. **Builder builds. The builder MUST NOT edit, rewrite, or delete the gate file.** Enforcement is structural: gate author and builder are different subagent contexts, and the orchestrator diffs `gate.mjs` (hash before/after build) — a changed hash = slice FAILS closeout automatically.
  4. Orchestrator runs the gate. On fail → full gate output goes back to the builder as the next prompt; loop until pass or **max 3 iterations**, then STOP and escalate to Sean/Fable with the last gate output (never loop forever, never silently lower the bar).
  5. On pass → gate output is pasted into the closeout as **Gate Evidence** (this feeds Slice 4).
- **Gate reuse:** before writing a new gate, validator greps `.ai-workflow/gates/` for a matching task-slug family; reusable checks get factored into `.ai-workflow/gates/_lib/` helpers over time.
- **Retention:** `.ai-workflow/gates/` is gitignored EXCEPT `_lib/` (add `.gitignore` lines: `.ai-workflow/gates/*`, `!.ai-workflow/gates/_lib/`). Old gate dirs pruned by the existing `scripts/coordination-prune.mjs` cadence — add gates dir to its sweep (30 days).
- **Workflow-tool integration section:** a ready-to-copy Workflow script pattern — `phase('Gate') → validator agent writes gate → phase('Build') → builder agent (isolation: worktree when files are mutated) → run gate via Bash stage → loop ≤3`.

**Acceptance criteria (Slice 1):**
- [ ] Skill file exists, ≤300 lines, includes all 5 procedure steps, the 3-iteration cap, the hash-diff enforcement, and the Workflow pattern.
- [ ] `.gitignore` updated with the two gates lines.
- [ ] `scripts/coordination-prune.mjs` sweeps `.ai-workflow/gates/` (30-day), verified by running it with a planted old dir (mtime-faked or documented as `[UNVERIFIED]` if faking is impractical — say which).
- [ ] **Dogfood proof:** you must build Slice 2 USING the swan-gate procedure — Slice 2's gate lives at `.ai-workflow/gates/swan-debate-skill/gate.mjs` and its passing output appears in your closeout. This is the slice's real test.

### Slice 2 — `swan-debate` skill (bounded N-round debate)
**New file: `.claude/skills/swan-debate/SKILL.md`** (≤200 lines). Specifies:
- **Trigger:** "/swan-debate", "debate this", or fusion-router escalation when a Tier-2 triangle returns CONTRADICTIONS on a decision Sean marked contested.
- **Procedure:** N rounds (default 3, max 5) between two agents (default: builder-model vs Codex lane via the existing fusion board at `.ai-workflow/fusion/` — REUSE `scripts/fusion-triangle.mjs` board conventions, do not invent a second board). Each round: position → strongest counter → concession-or-rebuttal. After N rounds, the Final Decider (Fable chain) writes the verdict using the standard synthesis contract (consensus/contradictions/unique insights/blind spots/fused recommendation).
- **Output:** one file `.ai-workflow/fusion/debates/<topic-slug>-<date>.md`, pruned by `scripts/fusion-prune.mjs` (90-day, already exists — add the debates subdir to its sweep).
- **Hard rule:** debates are ADVISORY input to the Final Decider; a debate never closes a Rule-16/50 Tier-C question by itself.

**Acceptance criteria:** skill file complete; fusion-prune sweeps debates dir; built under its swan-gate (see Slice 1 dogfood); one smoke debate run (2 rounds, trivial topic, e.g. "tabs vs spaces for gate files") with the output file produced then deleted (it's a smoke artifact — note it in closeout per Rule 38).

### Slice 3 — Rule 73 in CLAUDE.md + AGENTS.md (doctrine)
Insert after Rule 72, IDENTICAL text in both files (Rule 67: these are shared files — check Codex's lane first). The rule, verbatim-ready (adjust only if it contradicts something you find in situ — then STOP and comment on SWA-32):

> 73. **ADW Discipline — Three Actors, Validation Gates, and the Harness Ruling (MANDATORY)** — Established 2026-07-21 from the IndyDevDan model-fusion/ADW analysis (Fable verdict, Sean-approved; master prompt: `docs/ai-workflow/AI-HANDOFF/MASTER-PROMPT-ADW-FUSION-UPGRADE-2026-07-21.md`).
>     - **Three actors:** engineers, agents, and deterministic code create value; code is free, fast, and reliable. Before assigning any task to an agent, ask: *can plain code do this?* Deterministic fields (SHAs, dates, counts, IDs) must NEVER pass through an LLM (proof case: catalog SHA corruption 2026-07-20). Prefer: code > agent > human, for any step code can do.
>     - **Validation Gates:** substantial build slices route through `swan-gate` — an independent validator writes an executable `gate.mjs` BEFORE the build; the builder never edits the gate (hash-diff enforced); fail output loops back ≤3 times then escalates. Gate evidence is required in closeout (Rule 41 amendment). Trivial/doc-only slices are exempt.
>     - **Twice = codify (Boris/Kimi amendment):** a defect class any agent fixes for the SECOND time MUST produce a deterministic guard (lint rule, pre-commit check, test, gate `_lib` helper) in the same slice — not another prose rule. Bounds: the guard must target the *class*, not the instance (if only the instance is checkable, it stays prose); any guard that hasn't fired in 90 days is reviewed for retirement (dead guards masquerade as safety). New prose rules/skills must cite the observed failure they encode — never speculative.
>     - **Agent confusion = doc bug:** when a fresh agent session has to ask where something lives or gets a convention wrong that a steering file should have taught, fix the steering line IN THAT SESSION (surgical, one line) — agent clarifying-questions are failing tests for the docs.
>     - **Vocabulary:** a chained set of build/verify stages is an **ADW (AI Developer Workflow)**; the org of ADWs + board + agents is the **software factory**. Use these names in docs and handoffs.
>     - **Harness ruling (standing):** the Swan harness of record is this repo's rules+skills+hooks stack on Claude Code, with Codex as the standing second lane. New harnesses (PI coding agent, Antigravity, etc.) may be TRIALED as additional lanes with Sean's explicit approval, but replacement of the harness of record requires a Fable-tier review + Sean sign-off recorded in the catalog. And-not-or.

**Acceptance criteria:** rule present and byte-identical in both files at the same anchor (after Rule 72, before "## Dual-Pass"); no other lines touched (Karpathy surgical rule); `rg -c "^73\." CLAUDE.md AGENTS.md` returns 1 for each.

### Slice 4 — Integration: closeout gate + Linear + catalog
1. **`closeout-evidence-lock/SKILL.md` amendment:** add one checklist item — *"Gate Evidence: if the slice was substantial (Rule 73), paste the passing `gate.mjs` output (or state the exemption reason). A gate whose hash changed between authoring and closeout = automatic REVISE."* Surgical edit; do not restructure the skill.
2. **Linear:** the parent issue SWA-32 gets one comment per completed slice (what shipped, commit SHA, gate evidence link). On full completion, move SWA-32 → Done and create a follow-up Backlog issue: "Trial /swan-gate on the next 3 real product slices; report friction."
3. **Catalog frontmatter:** this master-prompt doc already carries `decision:/status:/supersedes:` frontmatter — when the workstream completes, flip its `status:` to `shipped` and run `node scripts/catalog-regen.mjs` (it will flag the doc; distill the row honestly). That regen run is part of THIS slice's acceptance.

**Acceptance criteria:** all three integrations done; `node scripts/catalog-regen.mjs --check` exits 0 at the end.

## 3. Build order & batching
Slice 0 → 1 → 2 (dogfooding 1) → 3 → 4. Slice 0 first, deliberately: it is the cheap proof that executable checks beat prose before the gate framework builds on that premise. Rule 70 batch-push: commit per slice locally (explicit paths only — Rule 67 R6), push ONCE at the end. Commit messages: `feat(adw): <slice>` / `docs(adw): rule 73`. End every commit with the standard co-author line your harness emits.

## 4. Bans (do NOT)
- Do NOT install any dependency, provision any service, or touch `backend/`/`frontend/` runtime code — this workstream is skills+docs+scripts only.
- Do NOT modify `scripts/fusion-triangle.mjs` logic (only its prune script's sweep list) or any L6/L7 surface, `wiki/`, or `docs/ai-workflow/references/` (Rule 71/72 T2 boundary).
- Do NOT put LLM calls, network calls to LLM providers, or nondeterminism inside any `gate.mjs`.
- Do NOT let the builder context author or edit its own gate — if you find yourself doing both roles in one context, you are violating the centerpiece; split via subagents.
- Do NOT auto-run the paid Village anywhere in these flows (Rule 16 stands).
- Do NOT rename existing skills/rules or "improve" adjacent text (Karpathy surgical-changes).

## 5. Verification you owe at the end (Definition of Done)
- Slice 0: planted-violation rejection evidence for all guard classes (MUI import, recharts import, raw hex, Galaxy palette) + repo-wide existing-violation counts filed as a Backlog issue.
- Both new skills load (present under `.claude/skills/`, valid frontmatter matching existing skills' format).
- Slice-2-built-under-Slice-1 gate output shown (the dogfood proof).
- `rg -n "^73\." CLAUDE.md AGENTS.md` → one hit each; diff between the two rule blocks is empty.
- `node scripts/catalog-regen.mjs --check` → exit 0.
- Rule 61 hostile review run on your own work, findings + fixes in the consolidated report; Rule 57 dual-tier summary; hermes-inbox memo (the Stop hook will demand it — write it properly: what shipped, the gate pattern, lessons).
- SWA-32 updated, Done, follow-up issue created.

## 6. Enhancement backlog discovered during authoring (do NOT build now — file each as a Linear Backlog issue in AI Operations, one line each)
- Gate library growth: promote recurring gate checks into `_lib/` helpers (after the 3-slice trial).
- `swan-gate` PreToolUse hook that hard-denies Edit/Write on `.ai-workflow/gates/**/gate.mjs` during build phases (mechanical enforcement beyond hash-diff).
- fusion-router auto-suggesting `/swan-debate` when triangle output contains CONTRADICTIONS.
- ADW metrics row in the Hermes Morning Ops Briefing (gates run/passed/looped yesterday).
- Catalog: auto-append a `gate:` column or evidence link for rows whose docs carry gate evidence.

*Privacy (Rule 8): nothing in this workstream touches client data; keep all examples IDs/roles-only.*
