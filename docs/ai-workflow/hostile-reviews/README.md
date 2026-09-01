# Hostile Review Slam Registry — Protocol

A persistent, committed, **multi-AI** registry of everything in SwanStudios that is
waiting for a hostile review. Any AI (Claude, Codex, Gemini, Fable, AI Village) — or as
many as possible at once — can open this folder and run a **Hostile Review Slam**:
hostile-review every OPEN entry, one by one, until **zero issues remain**.

The more independent eyes hit an entry, the higher the confidence. This registry
*invites* redundant review — that is the point.

## The Prove-or-Named Rule (mandatory — all agents)
No work is **"done"** until a hostile review has been run to **zero remaining errors**. Doing
*a* review is not enough — you must review *enough* (Rule 17 dual-pass + Rule 41 Claim-to-Evidence
+ Rule 61 slice-internal hostile review) that, once all passes are finished, **nothing is left**.

If you ship, commit, or hand off work **without proving** that — no hostile review, or a review
that still had unresolved errors, or an unverified claim — then the work **and your agent name** go
into [`INDEX.md`](./INDEX.md) as an `OPEN` entry with **Owner = you**, automatically. If you don't
add it yourself, the next agent who notices adds it for you. You stay named on that entry until a
hostile pass **CLEARS it at zero errors**.

That is what makes this an accountability ledger, not a wish-list: unproven work never silently
escapes — it lands on the board with a name attached. Every entry therefore records:
- **Owner** — the agent accountable for the work (stays named until the entry is CLEARED).
- **Reviewers** — every agent that ran a hostile pass on it, with its verdict.

*Proven-clean* means a hostile pass (yours or another AI's) actively tried to break it, found zero
issues, and left file:line / repro / cited-rule evidence (Rule 51/54). For security-sensitive work,
prefer **≥2 independent concurring passes** before `CLEARED`. Automation may enforce auto-listing
later; until then it is a **self-enforced mandate binding every agent** — Claude, Codex, Gemini,
Fable, and the AI Village alike.

## Why this exists (vs the coordination review-queue)
- `.ai-workflow/coordination/review-queue.md` is the **live, gitignored, 2-agent** channel
  (Claude ↔ Codex hand-offs happening right now). It is ephemeral and local.
- **This registry is the durable, committed, cloud-visible** list of everything that ever
  needs a hostile bomb — it survives sessions, agents, and machines, and lives on GitHub so
  any AI or human can find it and act. Use the coordination queue for real-time hand-offs;
  use this registry for "the standing list of things to slam."

## What a "Hostile Review Slam" is
Open [`INDEX.md`](./INDEX.md). For **every** entry whose Status is `OPEN` or `REVISE`:

1. **Open the target** via its links (PR URL, file paths, commit SHA).
2. **Try to break it.** Run a genuine hostile review using the repo's own discipline:
   - Rule 17 (dual-pass: builder *and* hostile reviewer) + Rule 41 (Claim-to-Evidence Lock)
   - The Dual-Pass Fix/Review checklist + the task-type **Definition of Done** (CLAUDE.md)
   - For security-sensitive targets: IDOR/multi-tenant scoping, input validation, secrets,
     fail-closed gates, rate limits (Rule 8, OWASP A01).
3. **Record your pass** under the entry (append — never overwrite another AI's notes):
   `- [<date>] <reviewer>: <APPROVE | REVISE | REJECT> — <findings / file:line evidence>`
4. If **REVISE/REJECT**: the owner fixes → the entry stays `OPEN`/`REVISE` → re-review.
5. Mark **`CLEARED`** only when a hostile pass finds **zero** issues (ideally ≥2 independent
   AIs concur). Move fully-cleared, merged entries to the `## Archive` section.
6. **Loop until dry** — the Slam is done only when no entry is `OPEN`/`REVISE`.

## Entry lifecycle
`OPEN` → `IN-REVIEW` → (`REVISE` if issues, loop) → `CLEARED` → `ARCHIVED` (after merge).

## How to ADD an entry
When you ship a substantial slice, PR, or risky change, append a block to `INDEX.md`:
give it the next `HR-NNN` id, link the PR/files/commit, say **why** it needs a hostile
review, and set Status `OPEN`. Don't paste the whole file — **link** to where it lives so a
reviewer can find it fast (that is the whole design: an index, not a copy).

## Rules of the room
- **Additive only.** Never delete another AI's review notes; append yours beneath.
- **Evidence or it didn't happen.** Findings need file:line / repro / a cited rule (Rule 51/54).
- **Privacy (Rule 8).** IDs and roles only — never real client names, PII, or secrets in notes.
- **Redundancy is welcome.** Multiple independent hostile passes on one entry = more confidence,
  not wasted work. A Slam wants many eyes.
- **CLEARED is a high bar.** It means a reviewer actively tried to break it and could not — not
  "looks fine." Prefer ≥2 independent concurring passes before CLEARED on security-sensitive work.

## Pointer
- Registry index: [`INDEX.md`](./INDEX.md)
- Referenced from `CLAUDE.md` / `AGENTS.md` → `## AI Coordination`.
