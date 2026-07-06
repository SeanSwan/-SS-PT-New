# Hostile Review Slam — Registry Index

> The standing list of everything awaiting a hostile review. Run a **Slam**: hostile-review
> every `OPEN` / `REVISE` entry below until zero issues remain. Protocol + rules:
> [`README.md`](./README.md). Add an entry when you ship a substantial slice — **link** the
> target, don't copy it.

**Status legend:** `OPEN` (needs review) · `IN-REVIEW` (a pass is underway) ·
`REVISE` (issues found, being fixed) · `CLEARED` (a hostile pass found zero issues) ·
`ARCHIVED` (cleared + merged; moved to Archive).

**Owner = the agent accountable for the work** (Prove-or-Named Rule, see [`README.md`](./README.md)):
work shipped without proof of a hostile-review-to-zero-errors is auto-listed here with its owning
agent named, and that agent stays named until a hostile pass CLEARS the entry.

## Summary
| ID | Target | Owner | Status | Reviews |
|----|--------|-------|--------|---------|
| HR-008 | Gamification progression fix (level curve + progress charts) | Fable | OPEN | 0 |
| HR-007 | Dynamic session pricing / specials (WIP, money path) | Fable/Codex | OPEN | 0 |
| HR-006 | Client Command Center / trainer-clients dashboard | Fable | OPEN | 0 |
| HR-005 | Marketing OS batch (marketing command center) | Fable/Codex | OPEN | 0 |
| HR-004 | Hostile Review Slam Registry (this PR) | Claude (Opus 4.8) | OPEN | 0 |
| HR-003 | PR #20 — companion pet security hardening | Claude (Opus 4.8) | OPEN | 0 |
| HR-002 | PR #19 — dormant `gamificationRoutes.mjs` deletion + Rule-48 audit | Claude (Opus 4.8) | OPEN | 0 |
| HR-001 | PR #15 — Companion V2 cleanup + branch refresh | Claude (Opus 4.8) | OPEN | 0 |

---

### HR-001 — PR #15: Companion V2 cleanup + branch refresh
- **Status:** OPEN
- **Owner:** Claude (Opus 4.8) — accountable until CLEARED
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/15 (branch `feature/companion-v2-goal-loop-2026-07-01`)
- **Added:** 2026-07-05
- **Why review:** removed the non-functional companion response-injection layer that was wired
  to the (unmounted) `gamificationRoutes.mjs`; refreshed the branch against `main`. Touches the
  points-award path. Confirm the per-user pet-state bridge still fires on the live v1 route and
  no dead wiring remains.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-002 — PR #19: dormant `gamificationRoutes.mjs` deletion + Rule-48 audit
- **Status:** OPEN
- **Owner:** Claude (Opus 4.8) — accountable until CLEARED
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/19 (branch `claude/remove-dormant-gamification-routes-20260705`)
- **Added:** 2026-07-05
- **Why review:** deletes a fully-unmounted legacy route file that carried a latent IDOR pattern,
  and rewrites its classification lock test. Confirm zero runtime consumers, no live behavior
  change, and that the rewritten test preserves the canonical-surface guard intent.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-003 — PR #20: companion pet security hardening
- **Status:** OPEN
- **Owner:** Claude (Opus 4.8) — accountable until CLEARED
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/20 (branch `claude/harden-companion-pet-input-20260705`)
- **Added:** 2026-07-05
- **Why review:** adds `sanitizePetName` at the `CompanionPetService` boundary (control/XSS-char
  stripping) + rate limits on the pet mutation routes. Attack the sanitizer for bypasses; confirm
  limiter ordering vs auth, the `/pet/activity` shared-bucket decision, and no route-contract
  regressions.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-004 — Hostile Review Slam Registry (this PR)
- **Status:** OPEN
- **Owner:** Claude (Opus 4.8) — accountable until CLEARED
- **Link:** https://github.com/SeanSwan/-SS-PT-New/pull/21 (branch `claude/hostile-review-slam-protocol-20260705`) — `docs/ai-workflow/hostile-reviews/` (README + INDEX) + the `CLAUDE.md` / `AGENTS.md` `## AI Coordination` pointer.
- **Added:** 2026-07-05
- **Why review:** new cross-agent protocol. Confirm the pointer edits to `CLAUDE.md`/`AGENTS.md`
  are additive and don't collide with a rule/section; confirm the protocol is clear enough for any
  AI to run a Slam unattended; confirm it doesn't duplicate or contradict the coordination
  review-queue.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

---

### HR-005 — Marketing OS batch (marketing command center)
- **Status:** OPEN
- **Owner:** Fable/Codex (recent `origin/main` push — confirm owner)
- **Link:** `origin/main` @ `5ce21ea0c` "feat(marketing): Marketing OS batch — campaign spine + UI + calendar link + lead filters (Slices 2/3a/3b/LCC-1)"; related WIP on `origin/wip/handoff-2026-07-05` @ `80af9c3e5`.
- **Added:** 2026-07-05 (Sean-directed handoff)
- **Why review:** the Marketing Command Center is the #1 acquisition focus. Viciously review the campaign spine, lead filters, calendar link, and lead-capture path — authorization on admin marketing routes, input validation, secrets, PII in campaigns (Rule 8), and lead/money-path correctness.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-006 — Client Command Center / trainer-clients dashboard
- **Status:** OPEN
- **Owner:** Fable (SESSION-Q) — confirm owner
- **Link:** `origin/main` @ `3f4808d56` "feat(trainer): mount the selected-client command workspace at /dashboard/trainer/clients" + `628233f6f` "SESSION-Q Client Command Center handoff + rule-48 audit record".
- **Added:** 2026-07-05 (Sean-directed handoff)
- **Why review:** recently-shipped dashboard/workspace. Confirm canonical-surface mount (Rule 26), per-user/role scoping (a trainer sees only assigned clients — IDOR), data-truth of the surfaced charts, and mobile/4K responsiveness (Rule 24).
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-007 — Dynamic session pricing / specials (WIP — money path)
- **Status:** OPEN
- **Owner:** Fable/Codex (WIP — confirm owner + the branch/PR it lands on)
- **Link:** WIP snapshot on `origin/wip/handoff-2026-07-05` @ `80af9c3e5` (marketing/specials). NOTE: not yet on a clean feature branch/main — locate the real branch/PR when it lands before clearing.
- **Added:** 2026-07-05 (Sean-directed handoff)
- **Why review:** **MONEY PATH — highest stakes (Rule 16/50).** Vicious review of price computation correctness, who can set/override pricing (authorization, no client-side price trust), rounding/currency, and any path that could under/over-charge. Flag anything Stripe/billing-adjacent for the paid-Village gate before merge.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

### HR-008 — Gamification progression fix (level curve + progress charts)
- **Status:** OPEN
- **Owner:** Fable (SESSION-M / progress) — confirm owner
- **Link:** `origin/main` @ `5e190ea3e` "fix(gamification): replace sqrt level curve with sane power curve (L25 62.5k->~12.9k)" + `3d1e636d7` "feat(progress): truthful chart insight layer + body-composition panel across admin and client grids"; handoff `8408a06cf`.
- **Added:** 2026-07-05 (Sean-directed handoff)
- **Why review:** progression/leveling curve + progress charts. Confirm the new level-curve math is correct + monotonic (no regression to existing users' displayed levels), idempotency on awards (no double-award), schema drift on progress data (Rule 58), and data-truth of the chart insight layer.
- **Review passes:**
  - _(none yet — needs a hostile pass)_

---

## Archive
_(Cleared + merged entries move here. None yet.)_
