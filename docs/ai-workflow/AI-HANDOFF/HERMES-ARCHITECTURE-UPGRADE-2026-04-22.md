# Hermes Bridge — Architecture Upgrade Plan (Next Phase)

> **Created:** 2026-04-22
> **Status:** Village-validated. Durable plan doc — safe to park and resume.
> **Author:** Claude Opus 4.7 (CEO) synthesis of AI Village 15-brain Phase C planning review ($0.32, 341s, 11/11 validators passed, 2 specialty debates CONSENSUS REACHED in 3 rounds each)
> **Supersedes:** `HERMES-BRIDGE-NEXT-PHASE-PLANNING-INPUT-2026-04-22.md` (input-only, kept as audit trail)
> **Parent context:** `CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md` (Phase B shipped 2026-04-22, commits `3620e4579`, `6b320579c`, `c667314c7`)

---

## 1. Sean's two core needs

**N1 — Easy commands from Telegram.**
Complex work under the hood, but one-tap surface on the phone. Slash commands for the highest-frequency operations.

**N2 — Permission-prompt routing from desktop → phone.**
When Sean is on Telegram and his desktop Claude/Codex hits a permission prompt, the desktop just hangs. He needs awareness (ping), action (approve/deny from phone), and context (enough info to decide intelligently).

Phase B gave the 4 surfaces shared memory via the rolling log. This upgrade makes the bridge **live-process interactive** — Telegram becomes a real remote control, not just a read-only observer.

---

## 2. Final command surface (merged from Phase 2 + Phase 3 consensus)

**8 commands total. `/task` + `/approve` + `/deny` cover 80% of daily use; the rest are power/ops.**

| Command | Purpose | Risk tier | Behavior |
|---|---|---|---|
| `/task "<natural language>"` | Primary do-work command. Hermes NLP routes to the optimal surface (`tg-claude` or `tg-codex`) invisibly. | Normal | Sean doesn't need to think about which brain — Hermes picks. 15s idempotency. |
| `/status` | Query desktop session state. | Read | Returns: active task, last 2 continuity entries, dirty files count, running tmux sessions. |
| `/approve` | N2 permission approval — reply to a pending desktop prompt. | Action | Valid only when a prompt is pending. Otherwise "no pending prompt." |
| `/deny` | N2 permission denial. | Action | Same. |
| `/refresh` | Cache-bust Telegram session + restart `hermes-gateway.service`. | Ops | Wraps the multi-step ritual into one tap. |
| `/continuity [N]` | Show last N closeout entries (default 2). | Read | No LLM call — pure grep against rolling log. |
| `/run <allowlist-name>` | Run an explicit allowlisted command in the relevant tmux. | **High** | Looks up entry in `scripts/continuity-allowlist.yaml`. Rejected otherwise. |
| `/help` | Discoverable command list + examples. | Read | Default behavior on `/start`. |

**Explicitly rejected from surface:**
- `~~/codex~~` — subsumed by `/task` with NLP routing. Explicit agent names expose internals Sean doesn't need to manage.
- `~~/vs-claude~~`, `~~/vs-codex~~` — same reason.
- **`/run --unsafe "<arbitrary>"` exists behind an inline-keyboard approval gate**, but is NOT advertised in `/help`. Use only when allowlist is insufficient.

---

## 3. N2 — Permission-prompt routing (the hard one)

**Adopted: Option E — Hybrid of aggressive defaults + Telegram approval for high-risk.**

### 3.1 Layers

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1 — Aggressive acceptEdits (Phase A Chunk 1)      │
│  - defaultMode: acceptEdits in ~/.claude/settings.json   │
│  - Bash allow list covers 200+ routine commands          │
│  → 90%+ of operations never generate a prompt at all     │
└──────────────────────────┬───────────────────────────────┘
                           │ (remaining 10% — high-risk)
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 2 — Claude Code `ask` rules (Phase A P-CLAUDE-2)  │
│  - force-push, --no-verify, git reset --hard,            │
│    git filter-repo, rebase -i, git commit --amend        │
│  → These still generate prompts on desktop               │
└──────────────────────────┬───────────────────────────────┘
                           │ (prompt appears on desktop terminal)
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 3 — Prompt capture + Telegram relay (NEW, v1)     │
│  - Desktop-side wrapper watches Claude Code / Codex      │
│    stdout for prompt patterns                            │
│  - Matches → serialize {command, severity, context}      │
│  - POSTs to Hermes daemon via Tailscale                  │
│  - Hermes pushes Telegram message with inline keyboard:  │
│    [✅ Approve] [❌ Deny] [ℹ️ Show more]                   │
└──────────────────────────┬───────────────────────────────┘
                           │ (Sean taps; callback fires)
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 4 — Reply routing back to desktop                 │
│  - Hermes receives Telegram callback                     │
│  - Publishes {prompt_id, decision} to bridge endpoint    │
│  - Desktop wrapper pipes decision to Claude/Codex stdin  │
│  - 15-minute auto-deny timeout if no reply               │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Timeout behavior (Village-approved)

- **15-minute approval window.** After that, Hermes auto-denies to avoid leaving destructive ops wedged.
- **Telegram message edits** the original prompt message: `❄️ Request frozen — 15m timeout reached. Task paused. Use /task to resume.`
- **Continuity log entry** logged automatically: `[TIMEOUT] N2 Permission dropped after 15m — <command summary>`
- **No silent auto-approve, ever.** Timeout = deny, by policy.

### 3.3 What DOESN'T get relayed to Telegram

**Relay filter:** only prompts matching the Phase A `ask`-rule patterns OR detected-high-risk operations (credential-touching, secret-involved, destructive). Routine file edits that slip through `acceptEdits` are NOT relayed — otherwise Telegram becomes a firehose.

Sean remains the source of truth on what's high-risk via the `ask` rules list. New high-risk patterns are added to that list, not to the relay filter independently.

---

## 4. Critical security: `/run` allowlist (Village CRITICAL finding)

**Village called out `/run`/`/codex` as the HIGHEST-RISK items in the surface — shell-injection vectors via tmux command execution.**

### 4.1 Allowlist-only for default `/run`

`scripts/continuity-allowlist.yaml` (new file, tracked with placeholder template, real entries in `.local.yaml` override):

```yaml
# scripts/continuity-allowlist.yaml — TEMPLATE (placeholders only)
# Real command entries live in scripts/continuity-allowlist.local.yaml (gitignored)
version: 1
commands:
  # Sean will fill local.yaml with actual entries like:
  # - name: "tests-fe"
  #   cmd: "cd frontend && npx vitest run --reporter verbose"
  #   surface: "tg-claude"
  #   description: "Frontend test suite"
  # - name: "tail-logs"
  #   cmd: "tail -n 200 /path/to/log"
  #   surface: "tg-claude"
  #   description: "Tail recent logs"
  - name: "<TODO_FILL_FIRST_ALLOWLIST_ENTRY>"
    cmd: "<TODO>"
    surface: "tg-claude"
    description: "Placeholder — continuity-allowlist.local.yaml overrides"
```

**Resolution rule:** `/run <name>` looks up `name` in the allowlist. If missing → rejects with a list of valid names. Never passes user input to shell.

### 4.2 `/run --unsafe "<arbitrary>"` behind inline-keyboard gate

For one-off commands not in the allowlist, `--unsafe` triggers a Telegram inline keyboard: `[✅ Approve Execution]` `[❌ Cancel]`. Command is passed to tmux ONLY if the `callback_query` matches the approval button. This is the escape hatch that keeps ergonomics high without removing the safety net.

**Not advertised in `/help`.** Discoverable only when Sean knows about it or hits the allowlist-miss rejection (which suggests the `--unsafe` fallback).

---

## 5. Tailscale resilience (Village HIGH finding)

### 5.1 Fail-closed mode

**If the bridge cannot verify Tailscale status → close the listener socket immediately.** All commands return "Bridge offline — Tailscale connection lost. Commands disabled."

### 5.2 Polling + state-change pushes

Background async worker runs `tailscale status --json` every 30 seconds. State transitions trigger Telegram messages:
- **Online → offline:** `⚠️ Bridge offline — Tailscale connection lost. Commands disabled.`
- **Offline → online:** `✅ Bridge online — Tailscale connection restored.`

### 5.3 Idempotency on command execution

15-second `asyncio.wait_for()` on each tmux command:
- Telegram immediately replies: `"Command routed to desktop..."`
- Within 15s → edit message with exit code (success/failure)
- At 15s without exit code → edit to `⚠️ Command status unknown — verify on desktop.`

Prevents duplicate sends if Telegram retries due to network blips.

---

## 6. Implementation sprints (sequenced)

Village consensus: **each sprint is ~1 session of work.** Stop when value plateaus.

### Sprint 1 — Ops surface (~1 session)
**Delivers:** `/refresh`, `/help`, Tailscale polling + state-change pushes.

**Files:**
- `~/.hermes/hermes-agent/` — new Telegram command handlers
- `~/.hermes/hermes-agent/tools/` — Tailscale status polling worker
- Pi-side only; no repo changes

**Value:** Immediately removes the biggest daily friction (manual cache-bust ritual). Sean sees phone pings when the bridge flaps.

### Sprint 2 — Read-only queries (~1 session)
**Delivers:** `/status`, `/continuity`, `/promote`.

All three are read-only, zero injection risk. `/status` does SSH-read of git state + tmux status. `/continuity` greps rolling log via SSH-cat. `/promote` runs `scripts/continuity-promotions.sh --count` via SSH.

### Sprint 3 — `/task` with NLP routing (~1 session)
**Delivers:** `/task "<natural language>"`.

Hermes invokes a routing LLM (FREE model — Gemini Flash or Nemotron Nano) to pick `tg-claude` vs `tg-codex` based on task content. Routes to the right tmux session + idempotency timeout.

**Village recommendation:** Default LLM: Gemini Flash (cheapest + US). Routing prompt should be cached so the same `/task` text doesn't re-route repeatedly.

### Sprint 4 — `/run` allowlist + `--unsafe` escape hatch (~1-2 sessions)
**Delivers:** `scripts/continuity-allowlist.yaml` template + local override pattern; `/run <name>` strict allowlist lookup; `/run --unsafe "<cmd>"` with inline-keyboard approval.

**The highest-risk sprint.** Village flagged this as CRITICAL for security design. Extra care:
- Input validation rejects any `name` matching `[<>&|;$]` before YAML lookup
- Allowlist entries use structured `{cmd, surface, description}` schema (no shell composition)
- `--unsafe` callback uses HMAC-signed callback_data to prevent replay attacks

### Sprint 5 — N2 Permission routing (hardest, ~2-3 sessions)
**Delivers:** Desktop wrapper + prompt capture + Telegram relay + Layer 4 reply routing.

This is the biggest lift. Village consensus on approach:
1. Build the desktop wrapper FIRST (Windows-side, stdout pattern detection)
2. Test end-to-end against known Claude Code / Codex CLI prompt patterns (both versions)
3. Wire Telegram inline keyboard callback
4. Add 15-minute timeout + auto-deny + continuity log entry
5. Lock against false-positive prompt capture (don't relay every `y/n` in an LLM response)

**Risk:** Prompt format may change between Claude Code / Codex versions. Mitigation: version-pin wrapper pattern detection, bump on upgrade.

### Sprint 6 — Push-on-change notifications (~1 session)
**Delivers:** Hermes polls `rolling-last-done.md` mtime; on new entry, Telegram ping with topic summary.

Quiet-hours support: Village recommends per-event granularity opt-in via `/notify` (subcommand). Default: OFF to avoid notification fatigue. Sean opts in once it's stable.

### Sprint 7 — DEFERRED: Cross-surface handoff (optional)
Only worth building if Phase B rolling log proves insufficient for handoff context. Revisit after Sprints 1-6 ship and real usage surfaces the need (or doesn't).

---

## 7. Failure modes (each with fail-soft behavior)

| Failure | Mitigation |
|---|---|
| Tailscale down | Bridge fail-closed, polling every 30s, push on state change. Commands disabled with explicit message. |
| Desktop asleep / hibernating | `/status` returns "desktop unreachable." No retry storm. Sean physically wakes the desktop. |
| Cellular high latency | 15s idempotency window + optimistic UI ("routed to desktop..."). Message edited when exit code arrives or at timeout. |
| Rolling log corrupted | Atomic write (already in Phase B) + lockfile protection. Hermes reads cached version if latest read fails. |
| Messages out of order on Telegram | Each command has unique ID; Hermes deduplicates via idempotency window. |
| Prompt capture false-positive (Layer 3 relays an innocuous prompt) | Pattern regex scoped tightly to Claude Code / Codex known prompt formats. New patterns added only after testing. |
| Claude Code / Codex CLI version updates change prompt format | Wrapper version-pin + smoke test on CLI upgrade. Update pattern matcher. |
| Hermes Pi down | Telegram bot just doesn't respond; bridge infrastructure is local-or-nothing. Sean's desktop operations continue unaffected. |

---

## 8. Open questions back to Sean

These are decisions Village couldn't make without your input:

**Q1 — `/task` NLP routing LLM cost.** Each `/task` call invokes a routing LLM. Gemini Flash is ~$0.00000025 per routing call, so 1000 tasks/month = ~$0.00025 (basically free). **Confirm Gemini Flash routing is acceptable, or want a different model?**

**Q2 — Initial allowlist entries.** Village gave examples (`deploy-staging`, `restart-nginx`, `tail-logs`) but those are generic. **What 5-10 commands do you actually want pre-configured for `/run`?** My guesses based on your workflow:
- `tests-fe` — run frontend vitest suite
- `tests-be` — run backend tests
- `build-fe` — vite build
- `status` — `git status` + tmux session list (but `/status` may cover this)
- `logs` — tail production logs
- `deploy-check` — scan-secrets.sh --staged + check backend untracked

You supply the actual commands.

**Q3 — N2 approval timeout duration.** Village recommended **15 minutes**. Is that right for your rhythm? Too short for deep-work sessions? Too long for production-urgent responses?

**Q4 — Push-on-change default state.** Village recommended OFF by default with `/notify` opt-in. Your instinct? (Sean's previous note: "I still need to know ... am I going to get updated on those as well" suggests ON default may match his mental model better.)

**Q5 — Approval authority for `--unsafe`.** Should EVERY `--unsafe` invocation require Telegram inline-keyboard approval, or should there be a "trust session" mode where once Sean approves one, subsequent `--unsafe` in the same 15-minute window skip the keyboard?

---

## 9. What Village got wrong (context bleed — noted but discarded)

Village's prompt pipeline kept bleeding SwanStudios B2C product framing into analysis of an internal tool:

- **Gamification & Engagement Review** treated the Hermes bridge as needing XP bars and achievement states.
- **NASM & Fitness Science Validation** scored the document on fitness-domain alignment (the document had nothing to do with fitness).
- **Design Gap debate** treated commands as customer-facing brand (`Crystalline Solution`, `elite asynchronous service`, phone keyboard styling from the frontend design system).

The Technical Accuracy consensus itself flagged this: *"deploying a dedicated AI-Village-DevOps prompt chain that explicitly strips SwanStudios B2C context and injects a doc-type: internal-tooling system header."*

**Action for future Village runs:** add an internal-tooling mode toggle to `scripts/validation-orchestrator.mjs` so Gamification/NASM/frontend-design brains are skipped (or swapped for DevOps/infra-focused brains) when the input doc is flagged as internal tooling. **Tracked as LOW follow-up.** Does not affect this architecture plan.

---

## 10. Explicit non-goals (from Village Q&A + existing constraints)

- **No 5th surface** (Mythos/local model) until that model actually exists. Architecture supports adding via `VALID_SURFACES` extension; no work needed now.
- **No multi-user support.** Single-user tool.
- **No voice interface** in this phase (PLAUD integration plan is separate).
- **No web UI / browser dashboard.** Phone-first.
- **No production-grade encryption** beyond Tailscale + SSH key auth (single-user, single-laptop scope).
- **No commits/pushes without Sean approval.** Every bridge improvement ships as a dedicated reviewed commit.

---

## 11. Success criteria

After all 6 core sprints ship:

1. Sean can field-work from his phone with **2-3 taps** for the common case (`/task` + approve one prompt + `/status` to confirm done).
2. Permission prompts NEVER leave desktop sessions wedged — auto-denied after 15min with Telegram visibility.
3. Tailscale flaps are visible on phone within 30s — no silent failures.
4. Zero shell injection surface from Telegram commands — allowlist-only default + HMAC-signed `--unsafe` callbacks.
5. `/continuity` + `/promote` give instant read access to shared state without invoking an LLM.
6. Daily pattern: Sean closes a session on VS Code (`"log this and close"`), next time he opens Telegram, `/status` or `/continuity` shows what was just done. Reverse flow also works.

---

## 12. Village validation audit trail

- **Input doc:** `docs/ai-workflow/AI-HANDOFF/HERMES-BRIDGE-NEXT-PHASE-PLANNING-INPUT-2026-04-22.md` (13.6 KB)
- **Run orchestrator:** `scripts/validation-orchestrator.mjs --document <input-doc>`
- **Run results:** `AI-Village-Documentation/validation-prompts/latest/` — 9 per-track reports + 2 specialty-debate consensus files (`fix-instructions.md`, `design-recommendations.md`) + full debate transcripts
- **Audit compliance:** `[audit-compliance] OK at phase1-docs` — verified the 2026-04-06 privacy audit holds post orchestrator-fix commit `76a509e54`. No disallowed providers (MiniMax M2.7 only in Phase 2C UX/UI design debate, policy-allowed).
- **Cost:** $0.3199 (paid via OpenRouter — Claude Sonnet 4.6 tracks + Gemini 3.1 Pro for debates)
- **Time:** 341.3s (5.7 min)
- **Consensus:** Both Phase 2 and Phase 3 debates reached CONSENSUS in 3 rounds each.

---

## 13. Where to pick this up

**If resuming in a fresh session:**
1. Read `CLAUDE.md` + `ACTIVE-INDEX.md` (standard load order)
2. Read this document (§1-§6 are the core)
3. Read `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md` for current production priorities
4. Answer the 5 Open Questions in §8 if not already decided
5. Start Sprint 1 (ops surface — `/refresh`, `/help`, Tailscale polling)

**If resuming mid-sprint:**
- Continuity log `/continuity` command + rolling log `.ai-workflow/continuity/rolling-last-done.md` should have the latest state

**If Village needs to be re-run on this doc:**
- `node scripts/validation-orchestrator.mjs --document docs/ai-workflow/AI-HANDOFF/HERMES-ARCHITECTURE-UPGRADE-2026-04-22.md`
- Budget: ~$0.32 per run

---

*Phase B gave the brains shared memory. This phase turns the bridge into a conversational remote control — with the exact safety discipline Village validated.*

---

## 14. Q1–Q5 Locked Decisions (added 2026-04-22, PC-4)

Sean answered the §8 Open Questions. Decisions locked for Sprint 1 and all downstream sprints unless explicitly reopened in a new debate file.

### Q1 LOCKED — `/task` routing LLM
**OpenRouter Sonnet 4.6 primary + Gemini 3 Flash fallback.** Surfaces: `tg-claude` + `tg-codex` only. **NO Kimi.** Privacy constraint: open-weights Kimi would only be acceptable air-gapped on the 5090; 5090 heat + quantization-quality loss make it impractical for bridge-path routing. Expected cost: ~$2/mo at current `/task` volume projections.

### Q2 LOCKED — `/run` allowlist v1
**9 entries, all `tg-claude` surface:** `status`, `tests-fe`, `tests-be`, `build-fe`, `typecheck-fe`, `lint-fe`, `audit-backend`, `secrets-scan`, `promote-count`. Deliberately excluded: `logs` (too broad, needs arg), composite `deploy-check` (defer until Sprint 4 redesigns), `tsc-be` (backend typecheck command is not yet canonical — waiting on tsconfig settle). All 9 verified against live `package.json` scripts and repo tool scripts.

### Q3 LOCKED — N2 approval timeout
**30-minute flat auto-DENY**, no tiering in v1. Frozen-request message format: `❄️ Request frozen — 30m timeout reached. Task paused. Use /task to resume.`. Rolling continuity `[TIMEOUT]` entry logged automatically with: surface, agent, command, risk tier, timestamp, and the literal string `"auto-denied after 30m"`. No silent approve path. 30m replaces the 15m Village recommendation because Sean does deep-work sessions longer than 15m where a permission prompt can correctly be left pending during real thinking.

### Q4 LOCKED — Push-on-change
**HYBRID, ON by default for high-signal events.** High-signal (push always, unless in quiet hours): N2 permission prompts, desktop Claude/Codex crashes, Render deploy FAIL, new rolling-continuity entry. Low-signal (opt-in via `/notify <event>`): routine deploy success, test-run completion, background-task heartbeat. **Quiet hours: 00:00–06:00 local time**; during quiet hours only N2 prompts + deploy FAIL bypass and push immediately, everything else is deferred to a wake-time digest delivered at 06:00.

### Q5 LOCKED — `/run --unsafe` approval authority
**Option (C) — command-text-scoped trust-per-approval (hybrid).** Dual-button inline keyboard: `[✅ Approve once]` + `[🔒 Approve + trust this exact command 15m]`. Trust window: 15 minutes, scoped to **identical command text only** (hash match, not semantic similarity) — a different command still prompts. `callback_data` HMAC-signed with a secret pulled from `gateway/platforms/telegram.py` config (not hardcoded) to prevent replay of an older approval. No global session-trust mode.

### Consequences for sprint plan
- Sprint 1 is unaffected by Q1/Q2/Q5 (no `/task`, no `/run`, no `--unsafe` yet).
- Sprint 1 IS affected by Q3 timeout format (shared copy used across [TIMEOUT] logging) and Q4 quiet-hours (bridge-readiness push-on-change respects quiet hours immediately).
- Sprint 1 patch doc: `docs/ai-workflow/AI-HANDOFF/HERMES-DAEMON-SPRINT-1-PATCH-2026-04-22.md`.
