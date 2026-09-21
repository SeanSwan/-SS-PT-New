# AI Pair-Coding Coordination Protocol (Claude ↔ Codex)

> **Created:** 2026-06-13 by Sean (CEO Orchestrator).
> **Status:** ACTIVE — this is the live coding process while two agents run in parallel, through ~mid-July 2026 (until Fable 5 returns; it was held back, so we run Claude + Codex in tandem until then).
> **Codified by:** CLAUDE.md Rule 67 + AGENTS.md mirror.
> **Runtime ledger:** `.ai-workflow/coordination/` (gitignored live files + tracked README).
> **Seats:** N seats, named **per session** — never a fixed list. See §3.
> **Complete discovery:** `node scripts/lane-at-root.mjs orientation --json` — the only uncapped view. See §5.
> **Builds on (does not replace):** the continuity bridge (`.ai-workflow/continuity/`, cross-session) and `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md` (legacy multi-AI quorum). This protocol is the *real-time, same-machine, 2-agent* layer those two lacked.
>
> **Amended 2026-09-21 (S1/S2 of `BLUEPRINT-coordination-discovery-2026-09-20`).** This file
> previously named `claude.lane.md` and `codex.lane.md` as *the* seats and told agents to prune at
> session start. Both are now wrong: seats are per-session, and startup pruning was **removed** —
> a SessionStart hook must not write. §3, §4 R1/R5, §5, §9 and §10 carry the corrections.

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

**Do not enumerate lane files by name.** Lane files are named per **session**, not per agent:
`<agent>--<worktree-slug>[-s<session-hash>].lane.md`. Measured 2026-09-21: the ledger held
**87 lane files across 5+ agent names**, so any hardcoded list is stale the moment a second
session of the same agent opens. Concrete filenames anywhere in this document are illustrations
of the naming scheme, never the way to find seats. Discover them with the command, never with a
list:

- `node scripts/lane.mjs digest` — the **capped** startup summary (fast, for orientation).
- `node scripts/lane-at-root.mjs orientation` — the **complete, uncapped** view. This is the one
  to use before editing; see §5.

Files:

- `*.lane.md` — one live claim **per session**. An agent writes **only its own**, whose exact
  path it gets from `node scripts/lane.mjs whoami` (or the `self.laneFile` field of complete
  discovery). It **reads** others'. Neither edits the other's lane file.
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

**R1 — Complete discovery before you edit.** Before editing ANY file, run
`node scripts/lane-at-root.mjs orientation` and read the response. It lists **every** lane and
**every** parsed claim, and its exit code says whether the answer can be trusted as clearance
(`0` complete · `2` valid but INCOMPLETE · `1` unproducible). If your target file is under any
seat's claim, do NOT edit it: pick another file, append a request to `review-queue.md`, or ask Sean.

> **`digest` is NOT clearance.** `digest` is a deliberately **capped** startup summary — lock
> paths per seat are capped at 5 (`lane.mjs:234-235`) and live lanes at 6 (`:237`). An agent
> asking "is my file locked?" via `digest` can be shown a **truncated** list and conclude it is
> free. `digest` also prints `agent@slug` on its `me:` line, **not a filepath** — the own-lane
> path comes from `whoami`, or from `self.laneFile` in complete discovery. Use `digest` to
> orient, `orientation` to decide. (Astra hostile review F01, 2026-09-20; closed by S2.)

**R2 — Claim on start.** When you begin a slice, overwrite your own lane file: status `in-progress`, the exact files in 🔒 EDITING NOW, fresh `Updated:` stamp. Append one line to `activity.log.md`.

**R3 — Release on finish.** When done, set status `idle`/`awaiting-review`, clear 🔒 EDITING NOW, record what changed + commit SHA.

**R4 — Never write the other agent's lane file.** You read theirs; you write only yours.

**R5 — Stale-claim safety: a warning, never a release.** If a lane's `Updated:` is **more than 30
minutes** old while its status is still `in-progress`, treat its claims as **suspect** and say so.
That is the whole of the automatic behaviour: **nothing releases a stale claim, ever.** A stale
claim is still a claim (R1). Do NOT seize the files — flag to Sean, because only Sean knows
whether that session died or is merely mid-think.

> **Two numbers, two jobs — do not conflate them.** The **30-minute** figure above is this
> protocol's *advisory* threshold, and it is what complete discovery reports
> (`staleAfterMinutes: 30`, exactly 30 minutes = fresh, beyond = stale). The **120-minute**
> figure (`FRESH_MIN` in `scripts/lib/lane-core.mjs:22`) is `digest`'s *liveness* window for
> counting "who is working right now" — a different question, deliberately more forgiving.
> A lane can be stale by R5 and still live in `digest`; that is intended, not a bug.

**R6 — Commit coordination.** Before `git add`, read the other lane. NEVER stage/commit a file in the other agent's 🔒 EDITING NOW. On shared slices, Codex coordinates commit timing (per `CODEX-PRIMARY-BUILDER-HANDOFF-2026-05-05.md`). `git add -A` is forbidden while the other agent has any file locked — stage explicit paths.

**R7 — Mutual hostile review (Sean's #1 ask).** Finishing a substantial slice → append a review request to `review-queue.md`. The other agent picks it up, runs a hostile review — rule 17 dual-pass + rule 41 closeout gate + the Business-Logic Audit in `HANDOFF-PROTOCOL.md` (race conditions, cross-function consistency, data integrity, security, FE/BE contract) — and writes back `APPROVE | REVISE | REJECT` + findings. The author fixes REVISE/REJECT items before the slice is "done."

**R8 — Lane registry.** Each agent keeps a standing "Lane (owned area)" in its lane file. Stay in your lane; if you must touch the other's area, claim it explicitly and flag it. Current split (2026-06-13):
- **Codex:** storefront purchase path (StoreV3 / ProductCard / ProductVariantPicker / cartRoutes / v2PaymentRoutes / SessionGrantService / cartCheckoutFulfillmentService / Order+OrderItem / admin order+fulfillment UI); Coach Command Center; Social/Friends.
- **Claude:** admin product/catalog UI (admin-packages-view* / ProductImageField / ProductVariantsManager); money-path safety tests; cross-cutting protocol/infra.
- **Shared (coordinate):** `adminPackageRoutes.mjs`, `CLAUDE.md`/`AGENTS.md`, this coordination dir.

## 5. Session start (every seat)

After CLAUDE.md/AGENTS.md + the continuity bridge reads:

1. `node scripts/lane.mjs digest` — the cheap summary: you, the seats holding locks right now,
   and the stale count. **Capped; not clearance.**
2. Read `review-queue.md` — any OPEN request addressed to me?
3. **Before your first edit**, `node scripts/lane-at-root.mjs orientation` — complete, uncapped,
   and it tells you whether it is trustworthy. Do not rely on step 1 for this.

**Do NOT prune at session start.** `scripts/coordination-prune.mjs` still exists and is still the
retention mechanism (§6), but it is a **write**, and a session-start hook is a **read** path. The
SessionStart hook used to invoke it; that was removed on 2026-09-21 because a read-only
orientation step must not mutate the ledger. Run pruning deliberately, by hand, when you intend to.

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

- **Cheap re-entry (the minimum):** one command plus two small files — `node scripts/lane.mjs digest` (prints you + every live lock), `review-queue.md`, and `.ai-workflow/continuity/rolling-last-done.md` (≤30 KB). That's "where are we + who's touching what + any review owed me," without re-reading debate docs, full handoffs, or the whole task history. **Not** a fixed set of lane filenames — those are per-session (§3).
- **Lane file = your own breadcrumb.** Keep `Task` / `Next intent` in your lane current; it's how *your next fresh session* picks up in seconds. Write it for a token-starved future you.
- **Before Sean starts a fresh session on meaningful work:** offer a continuity closeout (`"log this and close"` → `scripts/continuity-append.mjs`) so `rolling-last-done.md` captures the thread; then the new session is cheap + lossless.
- **General frugality (ties to CLAUDE.md "Token Optimization"):** don't reload `CLAUDE.md`/`AGENTS.md` (already in context at boot); open a specific reference doc only when a real gap needs it; prefer the tiny lane files over re-deriving state; `/clear` between unrelated tasks. The coordination ledger is intentionally small so checking it costs almost nothing.
- **Why this matters:** two agents running in parallel doubles spend; the cheapest way to stay coordinated is small, always-current scratch files read at task boundaries — not long threads that re-explain context every turn.

## 10. Harness coverage — configured is NOT executed

Rule 67 only works if the seat actually receives it. A harness may **ship with a documented manual
procedure** while its automatic hook stays **unverified** — and it must never be labelled
automatically covered. **No harness hook has ever been OBSERVED firing on this machine.**
"Configured" and "executed" are different evidence states, and only the first is in hand here.

| Harness | Instruction surface | Hook wiring | Execution status |
|---|---|---|---|
| Claude Code | `CLAUDE.md` | reported; settings source absent | UNVERIFIED |
| Codex | `AGENTS.md` | instruction references only | UNVERIFIED |
| OpenCode | `AGENTS.md` + `.opencode/SEAT.md` | instruction/seat references only | UNVERIFIED |
| WorkBuddy | `CODEBUDDY.md` | four event configurations supplied | UNVERIFIED |
| Cursor | `.cursor/rules/*.mdc` (`alwaysApply`) | none supplied | UNVERIFIED loading; no hook |
| Copilot | `.github/copilot-instructions.md` | none supplied | UNVERIFIED loading and hook capability |
| Gemini CLI | `GEMINI.md` | none supplied | UNVERIFIED contents, loading and execution |

To move a row off UNVERIFIED, capture, for that harness: version and OS; the actual command shell;
the event (startup / resume / clear / compact, where supported); the starting cwd and the resolved
checkout; the hook invocation and completion output; the effective timeout behaviour; and whether
the output reached the agent **before its first edit**. An unsupported event is recorded as
**unsupported**, never silently counted as passed.

Until a row is verified, treat orientation on that harness as **manual discipline**, and run
`node scripts/lane-at-root.mjs orientation` yourself rather than assuming a hook did it.
