# 3-Brain Pipeline Plan — Codex Review Briefing 2026-04-19

**Task for Codex:** Read this briefing + the v3 final plan. Produce an independent review. Answer 5 open questions. Flag anything Village missed. Deliver findings in the response format at the end.

**Time budget:** ~15-20 min. Response target: 400-800 words + the question answers + any CRITICAL findings.

**Why you're being asked:** This plan came out of the same session where Claude + Sean fixed a real credential leak on GitHub. Codex independently caught a critical re-leak in the handoff doc BEFORE it was committed. That dual-AI catch is the real-world proof that this plan is worth formalizing. You're now being asked to do the same thing at the planning-doc level: find what Claude and the 15-brain Village both missed.

---

## Context — What This Plan Is

A **solo-dev operating protocol** for AI-assisted coding. Three AI brains:

1. **Claude (primary builder)** — implements code changes
2. **Codex (independent verifier)** — reviews from a cold-start, no shared state with Claude
3. **Gemini (read-only architectural reviewer)** — concurrent structural review, CANNOT write files

Goals:

- Eliminate 80%+ of permission-prompt interruptions for routine commands
- Keep the dual-AI review discipline async + file-based (so loops are debuggable + replayable)
- Prevent credential leaks like tonight's via pattern-based `Bash` denies
- Enforce SwanStudios UI constraints at the allow-list level (styled-components-only, no inline styles, no retired Galaxy-Swan tokens, etc.)
- Preserve ideas across `/clear` boundaries in per-project `SOUL.md` archives
- Work for ANY project, not just SwanStudios

## Journey — v1 to v3

### v1 (earlier this evening, Sean's draft via Hermes Telegram)

Original 4-phase plan dropped into `~/swanstudios-wiki/inbox/3-brain-prompt.md`:

- Phase 1: permission whitelist via `.claude/settings.json`
- Phase 2: Claude ↔ Codex async file loop with 5-iteration circuit breaker
- Phase 3: Gemini as read-only capstone via standalone script
- Phase 4: Token-scrubbing + `SOUL.md` archive + Telegram notifications

**v1 gaps Claude identified in self-review:**

1. `Write(*.ts, *.js, *.md)` too broad — could overwrite `CLAUDE.md`, `backend/server.mjs`, etc. without asking
2. Phase 2 stops on brittle string-match `"STATUS: 100% CONSENSUS"`
3. No test gate before consensus — both AIs could agree on broken code
4. No rollback mechanism — broken iterations leave a mess
5. `SOUL.md` extraction criteria vaporous ("creative ideas, architectural visions") — guaranteed dumping ground
6. Phase 4 re-invents Telegram handoff that already exists in `HERMES-REMOTE-CODING-BRIDGE-PLAN-2026-04-19.md`
7. Phase 2 reinvents the Opus-Codex Recursive Debate Protocol already in `CLAUDE.md`

### v2 (Claude rewrote to fix all 7 gaps)

`docs/ai-workflow/AI-HANDOFF/3-BRAIN-PIPELINE-PLAN-v2-2026-04-19.md` — addressed the 7 gaps:

- Phase 0 NEW: Pre-Flight Security Check (motivated by tonight's credential leak)
- Phase 1: directory-scoped writes + pattern-based deny on secrets in Bash
- Phase 2: structured JSON status (not string-match) + mandatory test gate + git stash rollback + escalation ladder
- Phase 3: Gemini concurrent (not sequential) + structured input (not plain text) + loop-back on HIGH severity
- Phase 4: `SOUL.md` with 5 objective extraction criteria + auto-dedup + index + weekly review
- Phase 5: explicit integration with existing Hermes bridge + Opus-Codex protocol + `consult-gemini.mjs`
- Phase 6: observability + audit log + token budget

**Village validated v2.** 11/11 validators passed. $0.49, 8.25 min.

### Village findings (from v2 review)

**CRITICAL (3):**

1. Model ID hallucination risk — v2 referenced "Gemini 3.1 Pro" / "Claude Opus 4.7" as assumed facts. Pinning required.
2. Question 6 in v2 asked about SwanStudios UI constraints but **didn't answer it**. Should be enforced at allow-list.
3. Audit log path `.ai-workflow/audit/` not in `.gitignore` deny — logs may contain sensitive finding descriptions.

**HIGH (4):**

4. Lint gate "if exists" is too weak for a mandatory consensus gate.
5. Budget overrun concerns with 3 parallel AIs.
6. Debugging complexity when AIs disagree — no structured escalation.
7. Phase 5 integration claims need verification against actual codebase paths.

**Phase 2 CTO↔CEO Debate Consensus (after 7 rounds):**

- Replace SQLite dry-run with ephemeral PostgreSQL Docker container (too heavy for solo dev)
- Daily Datadog → Slack digest (Sean has neither tool)
- Model ID pinning with `TODO: VERIFY_*` blockers (KEEP this)
- Hard $5/day spend cap with concurrency-safe SQLite tracking (soften to soft-warn)

**Phase 3 Design Debate Consensus (after 3 rounds):**

- Inline styles STRICTLY BANNED
- CSS Modules + Styled Components OK (token-based)
- Dark mode compliance via `@media (prefers-color-scheme: light)` override
- Mobile touch state via CSS `:active` compression, NOT JS events

### v3 (this is what Codex is reviewing)

`docs/ai-workflow/AI-HANDOFF/3-BRAIN-PIPELINE-PLAN-v3-FINAL-2026-04-19.md`

Absorbs the Village CRITICAL + HIGH findings. Rejects enterprise scope-creep (Datadog, Slack automation, Docker ephemeral Postgres per migration, Presidio NLP). Answers Question 6 with new **Phase 1.5 UI Compliance Gate**. Adds model ID pinning from Phase 2 consensus. Softens $5/day cap from hard kill to warning+friction.

**v3 key additions over v2:**

| v3 Addition | Source |
|---|---|
| Phase 1.5 UI Compliance Gate | Village Question 6 unanswered |
| Model ID pinning via `config/MODEL_VERSIONS.md` + `TODO: VERIFY_` blockers | Phase 2 debate critical |
| Pattern-based Bash denies for JWT, API keys, DB URLs | Tonight's real-world incident |
| Audit log in `.gitignore` deny | Village critical |
| Lint + TS + Playwright MANDATORY (not "if exists") | Village HIGH |
| Escalation with HUMAN GATE at iteration 4 (not autonomous past 3) | Village debugging-complexity |
| Daily cost summary file (not Slack/Datadog) | Rejected enterprise scope |
| Soft cap at 80% + manual confirm at 100% (no hard kill) | Village hard-kill was too strict for solo dev |
| Inline styles / MUI imports / Galaxy-Swan tokens auto-blocked in Write | Phase 3 design debate |

---

## What Codex Needs to Do

### 1. Read the v3 final plan

`docs/ai-workflow/AI-HANDOFF/3-BRAIN-PIPELINE-PLAN-v3-FINAL-2026-04-19.md`

### 2. Answer Sean's 5 open questions

**Q1 — Default daily cost cap:** Plan proposes $5/day soft cap. Too low? Too high? Right for solo dev?

**Q2 — SOUL.md max entries:** 200 per project triggers archive/prune prompt. Is that the right threshold? Should it be by age, not count? Something else?

**Q3 — Phase 1.5 soft-warn patterns:** Should `hard-coded heights`, `hard-coded widths`, `margin: Xpx`, `font-size: Xpx` become auto-deny patterns after a grace period, or stay as warnings forever?

**Q4 — Model verification cadence:** When to re-verify `config/MODEL_VERSIONS.md`? Weekly? Monthly? Only on explicit rotation? At session start?

**Q5 — Escalation iteration number:** Plan says iteration 4 = manual input required. Too early (should be 6-7)? Too late (should be 3)? Right as-is?

### 3. Find what Village missed

You have a different vantage point. Village is 11 parallel analysts + 2 debate pairs. You're one pair of fresh eyes reading the complete doc end-to-end. Look for:

- Implementation pitfalls Village skipped
- Solo-dev ergonomics the enterprise-oriented Village got wrong
- Integration gaps with existing codebase (verify file paths mentioned DO exist)
- CLAUDE.md rules that should be auto-enforced but aren't
- Security regressions subtle enough to miss
- Failure modes when any single AI is unavailable (rate limit, API down)

### 4. Verify tonight's real incident is actually addressed

The plan claims to prevent tonight's credential leak via pattern-based Bash denies. Test this mentally:

- Would the deny pattern `Bash(*PGPASSWORD=*)` block: `Bash(PGPASSWORD=[REDACTED-LOCAL-PG-ROTATED-2026-04-19] psql -U swanadmin ...)` — yes/no?
- Would `Bash(*AIza[A-Za-z0-9_-]{35}*)` block: `Bash(GEMINI_API_KEY=[REDACTED-GEMINI-KEY-PREFIX]... node scripts/consult-gemini.mjs)` — yes/no?
- Any edge cases where the pattern matcher could miss a leak? (e.g., env var set separately, token pasted inline, URL-encoded)

### 5. Deliver findings in this format

```markdown
# Codex Review — v3 3-Brain Pipeline Plan

## Verdict
[ CONSENSUS | REVISE | REJECT ]

## Answers to 5 Open Questions
**Q1 — Daily cap:** [answer + reason]
**Q2 — SOUL.md threshold:** [answer + reason]
**Q3 — Soft-warn grace period:** [answer + reason]
**Q4 — Model verification cadence:** [answer + reason]
**Q5 — Escalation iteration:** [answer + reason]

## Gaps Village Missed
[bulleted findings with severity CRITICAL/HIGH/MEDIUM/LOW]

## Pattern-Based Deny Test Results
[yes/no on the 3 test cases above, plus any edge cases]

## Specific Code/Path Verification
[file paths or references in v3 that don't actually exist in the codebase]

## Recommendations
[bulleted actionable items for Sean before Week 1 rollout]

## Status
[READY FOR ROLLOUT | NEEDS REVISION | BLOCKED BY <X>]
```

---

## Session Ground Rules for Codex

1. **Don't rewrite the plan.** Review it, critique it, find gaps. If a fix is needed, describe the fix — don't produce a v4 draft.
2. **Prioritize solo-dev pragmatism over enterprise best practices.** Sean is one person; enterprise scope creep is the wrong direction.
3. **If something is ambiguous, flag it as a question, don't assume.**
4. **Be direct.** No hedging language like "might want to consider." State findings with confidence: "This is a gap. Here's why. Here's the fix."
5. **Cite line numbers or section references** when critiquing specific parts of v3.
6. **Dispute Village findings** if you think Village got something wrong. You're not bound to agree with them.

---

## Reference Paths

- v1 draft: `~/swanstudios-wiki/inbox/3-brain-prompt.md` (on Pi, preserved for history)
- v2: `docs/ai-workflow/AI-HANDOFF/3-BRAIN-PIPELINE-PLAN-v2-2026-04-19.md`
- v3 FINAL (this is what you review): `docs/ai-workflow/AI-HANDOFF/3-BRAIN-PIPELINE-PLAN-v3-FINAL-2026-04-19.md`
- Village output: `AI-Village-Documentation/validation-prompts/latest/` (especially `fix-instructions.md` for Phase 2 consensus, `design-recommendations.md` for Phase 3)
- Tonight's security incident: `docs/ai-workflow/AI-HANDOFF/SECURITY-REMEDIATION-2026-04-19.md`
- Hermes remote coding bridge plan (Phase 5 integration): `docs/ai-workflow/AI-HANDOFF/HERMES-REMOTE-CODING-BRIDGE-PLAN-2026-04-19.md`
- Codex's own parallel runtime drift findings (separate concern): `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-RUNTIME-DRIFT-21639730.md`

---

*Prepared by Claude Opus 4.7 for Codex Round 1 review. Sean will paste the Codex response back into Claude for synthesis.*
