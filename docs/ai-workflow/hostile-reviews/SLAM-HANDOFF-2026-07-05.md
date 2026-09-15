# Hostile Review Slam — Handoff Prompt (2026-07-05)

> Ready-to-paste prompt for the **next AI agent** (Codex, a fresh Claude/Opus, Gemini, or the
> Village). Sean-directed: viciously hostile-review the most-recently-pushed SwanStudios work
> until there are **zero issues left**, per the Prove-or-Named / Slam protocol.

---

## PROMPT (paste this to the next agent)

You are the **hostile reviewer** for SwanStudios (repo `SeanSwan/-SS-PT-New`). Your job is to
run a **Hostile Review Slam**: viciously review the most-recently-pushed work on GitHub until
there are **zero issues remaining**, then leave every reviewed item CLEARED.

**Read first (the protocol + the lane):**
1. `docs/ai-workflow/hostile-reviews/README.md` — the Prove-or-Named rule + how to run a Slam.
2. `docs/ai-workflow/hostile-reviews/INDEX.md` — the registry. Entries `HR-005…HR-008` were just
   added for the work below; `HR-001…HR-004` are also OPEN.
3. `CLAUDE.md` / `AGENTS.md` — the rules you review against (esp. 8, 17, 20, 26–31, 41, 54, 58, 61).

**Look on GitHub for the most recent pushes** (`git fetch origin`; `gh pr list`; `git log
origin/main`; recent `origin/*` branches) and viciously hostile-review these **focus areas**
(all recently pushed by other agents — treat as unproven until you prove them clean):

1. **Marketing OS / marketing command center** — `origin/main` @ `5ce21ea0c` (+ WIP
   `origin/wip/handoff-2026-07-05` @ `80af9c3e5`). #1 acquisition surface. Attack: admin-route
   authorization, input validation, secrets, PII in campaigns (Rule 8), lead/money-path correctness.
2. **Client Command Center / trainer-clients dashboard** — `origin/main` @ `3f4808d56` + `628233f6f`.
   Attack: canonical-surface mount (Rule 26), trainer→assigned-client scoping (IDOR), chart data-truth,
   4K/mobile responsiveness (Rule 24).
3. **Dynamic session pricing / specials (MONEY PATH — highest stakes)** — WIP on
   `origin/wip/handoff-2026-07-05` @ `80af9c3e5` (locate the real branch/PR when it lands). Attack:
   price computation correctness, who can set/override price (authorization, no client-side price
   trust), rounding/currency, under/over-charge paths. Anything Stripe/billing-adjacent → flag for
   the paid-Village gate (Rule 16/50) before merge.
4. **Gamification progression fix** — `origin/main` @ `5e190ea3e` (level curve) + `3d1e636d7`
   (progress chart insight + body-composition). Attack: curve math correctness + monotonicity (no
   regression to existing users' levels), award idempotency (double-award), schema drift (Rule 58),
   chart data-truth.
5. **Everything else OPEN in `INDEX.md`** (HR-001…004 + anything Sean or another agent adds).

**How to review each item (be vicious):**
- Try to **break it**: Rule 17 dual-pass + Rule 41 Claim-to-Evidence + Rule 61 + the task-type
  Definition of Done. Security lens: IDOR/multi-tenant scoping, input validation, secrets/PII,
  fail-closed gates, rate limits, schema drift (Rule 58), canonical-surface (Rule 26–31).
- **Record your pass** under the entry in `INDEX.md` (append, never overwrite another AI's notes):
  `- [2026-07-05] <your-agent-name>: REVISE — <file:line finding + repro>`
- **FIX every issue** you find (with a failing test first where feasible), commit by explicit path
  (no `git add -A`; Rule 67), and re-review.
- Mark an entry **CLEARED only when a hostile pass finds zero issues** (prefer ≥2 independent
  concurring passes on the money path + any security-sensitive item). Move CLEARED+merged entries
  to `## Archive`.
- **Loop until the whole lane is dry** — the Slam is done only when no entry is OPEN/REVISE.

**Rules of engagement:** IDs/roles only, never PII/secrets (Rule 8). Coordinate via Rule 67
(read the other agents' lanes first; explicit-path commits). Do NOT touch another agent's live
worktree. High-stakes items (money path, auth, multi-tenant) get proposed to Sean for the
paid-Village gate before merge, not merged unilaterally.

**Definition of done for this handoff:** every focus item (1–5) and every OPEN `INDEX.md` entry is
CLEARED at zero issues, with fixes committed and pushed, and your review passes recorded in the
registry.

---

## Provenance (for the reviewer's convenience)
Identified 2026-07-05 from `origin/main` history + `gh pr list` + recent `origin/*` branches. Owner
attribution in the `INDEX.md` entries is best-effort ("confirm owner") — the Prove-or-Named rule
names the shipping agent; correct it if you know better. The pricing/specials work was only found
as an uncommitted snapshot on `wip/handoff-2026-07-05`; confirm where it truly lands before clearing.
