# AI Pair-Coding Coordination Protocol (Claude ↔ Codex)

> **Created:** 2026-06-13 by Sean (CEO Orchestrator).
> **Status:** ACTIVE — this is the live coding process while two agents run in parallel, through ~mid-July 2026 (until Fable 5 returns; it was held back, so we run Claude + Codex in tandem until then).
> **Codified by:** CLAUDE.md Rule 67 + AGENTS.md mirror.
> **Runtime ledger:** `.ai-workflow/coordination/` (gitignored live files + tracked README).
> **Builds on (does not replace):** the continuity bridge (`.ai-workflow/continuity/`, cross-session) and `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md` (legacy multi-AI quorum). This protocol is the *real-time, same-machine, 2-agent* layer those two lacked.

## 1. The problem

Claude (VS Code) and Codex run in the **same git working tree on Sean's machine, at the same time**. Neither can see the other's in-flight edits. Result: silent collisions — two agents edit the same file, one overwrites the other, or a commit bundles the other's half-finished work (this already happened once: a Claude commit swept in 63 of Codex's WIP files because the index had them staged). Sean's mandate: **tight, real-time communication so we don't step on each other, move faster, and hostile-review each other's work.**

## 2. The design (and the key insight)

A **Live Coordination Ledger (LCL)** of plain local files in `.ai-workflow/coordination/`. Because both agents share **one filesystem**, they see each other's state **instantly** via these files — no git, no network.

**Why gitignored, not committed:** a constantly-rewritten "what I'm editing right now" file, if committed, would generate commit churn and merge conflicts — it would *cause* the collision it's meant to prevent. So the live files are **gitignored**; only the README is tracked. This is the inverse mistake the legacy `CURRENT-TASK.md` "LOCKED FILES" approach made (committed lock file → conflict).

**Two layers, two jobs:**
| Need | Mechanism | Tracked? |
|---|---|---|
| Real-time collision avoidance (same machine, now) | LCL — this protocol | gitignored live files |
| Cross-session / cross-machine memory | continuity bridge + AI-HANDOFF docs | committed |

## 3. Files (`.ai-workflow/coordination/`)

- `claude.lane.md` — Claude's live claim. **Only Claude writes it.**
- `codex.lane.md` — Codex's live claim. **Only Codex writes it.**
- `review-queue.md` — append: review requests + verdicts. The mutual-hostile-review channel.
- `activity.log.md` — append: claim/release/commit forensics.
- `README.md` — schema (tracked).

Lane file shape:
```markdown
# <Agent> — Live Lane
Updated: <ISO-8601 UTC>
Status: in-progress | idle | awaiting-review | blocked
Task: <one line>
🔒 EDITING NOW:
- <exact file paths I am editing right now>
Lane (owned area): <my standing area of ownership>
Last commit: <sha | "none this session (Codex coordinates)">
Next intent: <files/areas next>
Notes for the other agent: <...>
```

## 4. The rules (MANDATORY)

**R1 — Read before you edit.** Before editing ANY file, read the other agent's `*.lane.md`. If your target file is in their **🔒 EDITING NOW**, do NOT edit it: pick another file, append a request to `review-queue.md`, or ask Sean.

**R2 — Claim on start.** When you begin a slice, overwrite your own lane file: status `in-progress`, the exact files in 🔒 EDITING NOW, fresh `Updated:` stamp. Append one line to `activity.log.md`.

**R3 — Release on finish.** When done, set status `idle`/`awaiting-review`, clear 🔒 EDITING NOW, record what changed + commit SHA.

**R4 — Never write the other agent's lane file.** You read theirs; you write only yours.

**R5 — Stale-claim safety.** If their lane `Updated:` is > 30 min old and status is still `in-progress`, the claim may be abandoned. Do NOT silently seize their files — flag to Sean (the agent may simply be mid-think; only Sean knows if its session died).

**R6 — Commit coordination.** Before `git add`, read the other lane. NEVER stage/commit a file in the other agent's 🔒 EDITING NOW. On shared slices, Codex coordinates commit timing (per `CODEX-PRIMARY-BUILDER-HANDOFF-2026-05-05.md`). `git add -A` is forbidden while the other agent has any file locked — stage explicit paths.

**R7 — Mutual hostile review (Sean's #1 ask).** Finishing a substantial slice → append a review request to `review-queue.md`. The other agent picks it up, runs a hostile review — rule 17 dual-pass + rule 41 closeout gate + the Business-Logic Audit in `HANDOFF-PROTOCOL.md` (race conditions, cross-function consistency, data integrity, security, FE/BE contract) — and writes back `APPROVE | REVISE | REJECT` + findings. The author fixes REVISE/REJECT items before the slice is "done."

**R8 — Lane registry.** Each agent keeps a standing "Lane (owned area)" in its lane file. Stay in your lane; if you must touch the other's area, claim it explicitly and flag it. Current split (2026-06-13):
- **Codex:** storefront purchase path (StoreV3 / ProductCard / ProductVariantPicker / cartRoutes / v2PaymentRoutes / SessionGrantService / cartCheckoutFulfillmentService / Order+OrderItem / admin order+fulfillment UI); Coach Command Center; Social/Friends.
- **Claude:** admin product/catalog UI (admin-packages-view* / ProductImageField / ProductVariantsManager); money-path safety tests; cross-cutting protocol/infra.
- **Shared (coordinate):** `adminPackageRoutes.mjs`, `CLAUDE.md`/`AGENTS.md`, this coordination dir.

## 5. Session start (both agents)

After CLAUDE.md/AGENTS.md + the continuity bridge reads:
1. Read `claude.lane.md` AND `codex.lane.md`.
2. Read `review-queue.md` — any OPEN request addressed to me?
3. `node scripts/coordination-prune.mjs` (trims append logs; safe, local).

## 6. Retention (Sean's call)

- Lane files: overwritten in place → never grow → no retention.
- `review-queue.md` + `activity.log.md`: `scripts/coordination-prune.mjs` drops entries older than **30 days** (matches the active-collaboration window), with a **256 KB** size backstop. Gitignored + local → pruning loses no git history. Bump `RETENTION_DAYS` to 60 in the script for a longer window.

## 7. What this is NOT

- Not a replacement for the committed continuity bridge (closeout memory) or the Opus-Codex debate files (per-phase deep review). Those stay.
- Not literally streaming — it's "always current, checked at every task boundary." The guarantee comes from R1 (read before edit), not from polling.
- Not a permission gate on Sean — it coordinates the two *agents*; Sean still directs.

## 8. Failure modes it prevents

- Two agents editing the same file → R1 read-before-edit.
- A commit bundling the other's WIP → R6 (no `git add -A` while locked).
- Abandoned lock blocking forever → R5 staleness + Sean.
- Work shipped without a second set of eyes → R7 mutual hostile review.
- Ledger itself causing merge conflicts → gitignored-local design.

## 9. Token efficiency & fresh sessions (Sean's standing directive)

Sean starts **new conversations to save tokens** — a long thread costs more per turn, so fresh sessions are encouraged, not avoided. This protocol is designed so a fresh session re-enters **cheaply**:

- **Cheap re-entry (the minimum):** a new session of either agent gets oriented by reading three TINY files — `claude.lane.md`, `codex.lane.md`, `review-queue.md` (a few KB total) — plus `.ai-workflow/continuity/rolling-last-done.md` (≤30 KB). That's "where are we + who's touching what + any review owed me," without re-reading debate docs, full handoffs, or the whole task history.
- **Lane file = your own breadcrumb.** Keep `Task` / `Next intent` in your lane current; it's how *your next fresh session* picks up in seconds. Write it for a token-starved future you.
- **Before Sean starts a fresh session on meaningful work:** offer a continuity closeout (`"log this and close"` → `scripts/continuity-append.mjs`) so `rolling-last-done.md` captures the thread; then the new session is cheap + lossless.
- **General frugality (ties to CLAUDE.md "Token Optimization"):** don't reload `CLAUDE.md`/`AGENTS.md` (already in context at boot); open a specific reference doc only when a real gap needs it; prefer the tiny lane files over re-deriving state; `/clear` between unrelated tasks. The coordination ledger is intentionally small so checking it costs almost nothing.
- **Why this matters:** two agents running in parallel doubles spend; the cheapest way to stay coordinated is small, always-current scratch files read at task boundaries — not long threads that re-explain context every turn.
