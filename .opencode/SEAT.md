# OpenCode Seat — SwanStudios startup contract

This file is injected into every OpenCode session in this repo. It tells the
OpenCode seat how to enter the workflow that Claude, Codex, GLM and Hermes
already share. It is **not** a second rulebook: `AGENTS.md` (the full
SwanStudios rulebook) is loaded alongside this file and stays authoritative.

## 1. What this seat is

OpenCode is a **full coding seat** in the SS-PT fleet, on the same footing as
Claude Code and Codex. Every obligation `AGENTS.md` assigns to "Claude" or
"Codex" applies to this seat unless the sentence is explicitly historical or
names a file/path. Read "Claude must…" as "this seat must…".

## 2. Session start — do this before the first action

1. **Rules:** `AGENTS.md` is already in context. Do not re-read it.
2. **Continuity:** read `.ai-workflow/continuity/rolling-last-done.md`.
3. **Lanes (Rule 67 — MANDATORY, parallel agents share this working tree):**
   run **`node scripts/lane.mjs digest`** — it prints you (your own resolved lane
   file), every seat holding a lock right now, and the stale count — then read
   `.ai-workflow/coordination/review-queue.md`. **Never enumerate lane files by
   name:** seats are per-session (`claude.lane.md`, `workbuddy.lane.md`,
   `vs-claude--main-<hash>.lane.md`, …) and a hardcoded list misses live seats
   (2026-09-20: it missed `workbuddy`, which held a lock on
   `backend/routes/bridge/bridgeIngestRoutes.mjs`).
4. **Orient ledger:** `.ai-workflow/orientation/` — pick the ledger whose
   `now:`/`next:` matches the work in front of you. Several exits here; do not
   adopt another session's ledger.
5. **Context budget:** `AGENTS.md` is large. Do not pre-emptively read the rule
   docs it references — open them only when a rule is actually in play.

## 3. During the session

- **Read-before-edit:** before editing ANY file, re-run `node scripts/lane.mjs
  digest`. If a target file is under any seat's `🔒 EDITING NOW`, do not edit it.
  Pick another file, append a request to `review-queue.md`, or ask Sean.
- **Claim/release:** overwrite **your own** lane file — the exact path `digest`
  prints on its `me:` line (status, exact files under `🔒 EDITING NOW`, ISO
  `Updated:` stamp) — when you start a slice; clear it when done. **Never write
  another agent's lane file.**
- **Commit safety:** never `git add -A` while another agent holds a lock. Stage
  explicit paths.
- **Staleness:** another lane stamped >30 min ago and still `in-progress` may be
  an abandoned claim — flag it to Sean, do not silently seize the files.

## 4. Skills

OpenCode already resolves this repo's skills (125 available: 124 from
`.claude/skills/` + `.agents/skills/`, plus one built-in). Load them via the
`skill` tool — do not re-implement their content by hand.

The load-bearing ones for SwanStudios work:

| Skill | Use it when |
|---|---|
| `closeout-evidence-lock` | End of any non-trivial task, before claiming done (rule 41) |
| `verification-before-completion` | Before saying "passes", "fixed", "builds" |
| `canonical-surface-audit` | Any UI / data-truth bug (rules 26–28) |
| `swan-design-router` | Any UI or visual work (rule 40) — mandatory default |
| `spend-guard` | Before any metered API call (rule 16) |
| `blast-radius-guard` | Before any destructive or shared-infra change |
| `drift-check` | After editing anything Sequelize / DB-adjacent (rule 58) |
| `repo-hygiene-scan` | Session feels cluttered, or after a large workstream (rule 32) |
| `recon` | Unfamiliar area before touching it |
| `systematic-debugging`, `test-driven-development` | Bugs and features |
| `handoff`, `hermes-inbox` | Session closeout and inbox triage |

## 5. Model lane for this seat

Default model is set in the repo-root `opencode.json` provider config at the
user level (`~/.config/opencode/opencode.json`) — currently a free OpenRouter
model with a 1M context window. It is **advisory/experimental tier only**
(per `docs/ai-workflow/references/PROVIDER-SUBSCRIPTION-ROUTING.md`): it may
build and explore, but it is never a Rule 46 review gate and never the Final
Decider. Verdicts from this seat are input, not authority.

### Two lanes, pick by task (added 2026-09-18)

| Lane | Instruction surface | Use for |
|---|---|---|
| `build` (**default**, no switch needed) | `AGENTS.md` — the full rulebook, ~175KB / ~43.5k tokens | Anything risky, cross-cutting, or touching production data, auth, billing, or shared infrastructure. Full parity with Claude and Codex. |
| `swan` (**Tab** to switch) | `.opencode/agent/swan.md` — compact digest, ~8.7KB / ~2.2k tokens | Routine coding, design, debug, and exploration work. Cuts the per-request instruction cost ~20×. |

`swan` deliberately carries a **digest, not the rulebook**: it states every rule
that binds the work and cites rule numbers, and its prompt requires it to open
the full rule text in `AGENTS.md` before acting when a rule's detail could
change the decision — and to hand back to `build` when the work is risky. It also
caps agentic iterations (`steps: 60`) so a free-tier lane cannot run away.

**Verified [2026-09-18]:** `opencode debug agent swan` resolves the agent with an
8,671-char prompt and **no** `AGENTS.md` field, while `build` carries no custom
prompt and therefore loads `AGENTS.md`. The compact lane is real, not nominal.

## 6. MCP

Two MCP servers are wired in the repo-root `opencode.json`:

- `playwright` — browser automation (read-only discipline; supervised admin
  audits per the Browser Harness rules)
- `swan-scout` — this repo's own scout server (`scripts/mcp/swan-scout-server.mjs`)

MCP tools consume context. If a session is context-tight, disable them rather
than fighting the budget.

## 7. Known gaps on this seat (do not assume parity here)

- No `opencode.lane.md` history yet — this seat is newly registered.
- OpenCode has **no equivalent of the Claude `Stop`-hook orient gate**
  (`scripts/hooks/orient-gate.mjs`). The ORIENT block is a **manual**
  discipline on this seat, not enforced. Do not claim the gate ran.
- The `consult-*.mjs` transport scripts are not yet exposed as MCP tools
  (planned: `docs/ai-workflow/references/PROVIDER-SUBSCRIPTION-ROUTING.md`
  §Harness interconnect).
