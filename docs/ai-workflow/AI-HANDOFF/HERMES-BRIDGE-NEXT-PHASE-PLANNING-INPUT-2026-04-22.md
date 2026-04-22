# Hermes Bridge — Next Phase Planning Input

> **Created:** 2026-04-22
> **Author:** Sean (CEO) + Claude (CTO/staff engineer)
> **Purpose:** Input document for AI Village 15-brain validation. Goal: identify gaps and design the simplest possible Telegram interface on top of the just-shipped Phase B continuity bridge, with explicit attention to permission-prompt routing.
> **Privacy:** All real infrastructure identifiers replaced with placeholders. Real values live in `scripts/continuity-config.local.json` (gitignored) and `tools/remote_ai_bridge_tool.py` SSH_TARGET constant on the Pi (out-of-tree).

---

## 1. What's live as of 2026-04-22

We just shipped a 4-surface continuity bridge across:

| Surface | Where Sean uses it | How it reads continuity | How it writes |
|---|---|---|---|
| `vs-claude` | VS Code on his desktop machine | `CLAUDE.md` item 10 directive — reads 3 continuity files at session start | `node scripts/continuity-append.mjs` |
| `vs-codex` | VS Code Codex CLI on his desktop machine | `<USER_HOME>/.codex/AGENTS.md` directive | same script |
| `tg-claude` | Telegram → Hermes daemon → SSH to desktop's WSL → `claude-session` tmux | Hermes daemon (`run_agent.py _build_system_prompt()`) calls `_build_continuity_bridge_context()` which SSHes to desktop, cats 3 files, prepends to system prompt with session-lifetime cache | same (via tmux command injection) |
| `tg-codex` | Telegram → Hermes → SSH → desktop WSL → `codex-session` tmux | same Hermes daemon code path | same |

Shared files:
- `.ai-workflow/continuity/rolling-last-done.md` — gitignored, append-only, 30 KB cap, auto-trimmed.
- `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md` — tracked, human-curated promotions.

Closeout trigger: ONLY when Sean explicitly says `"log this and close"` or `"session closeout"`. Sanitizer Layer 1 (scan-secrets.sh --stdin) + Layer 2 (path/hostname/IP scrubs from gitignored config) before any disk write. Atomic lock via `fs.openSync(path, 'wx')` with strict stale-PID-probe-only release in same namespace, fail-loud cross-namespace.

---

## 2. Sean's stated needs for the NEXT PHASE

Direct quote captured during planning: *"Easy easy easy but yet we're doing complex work and I still need to know how I'm going to be dealing with these permission prompts on my end on my computer at home when I'm talking to it and it's asking for permission to continue is that going to be sent to my phone am I going to get updated on those as well."*

Decomposed needs:

### N1 — Drastically simplified Telegram command surface
Current state: Sean talks to Hermes in natural language. Hermes routes to the right tool. Works, but "easy easy easy" suggests Sean wants explicit slash-command shortcuts for the highest-frequency operations, so common workflows are 1-tap.

### N2 — Permission-prompt routing from desktop to Telegram
**The hard one.** Today, when Sean is on Telegram and his desktop Claude/Codex session hits a permission prompt (Bash command, file write to a protected path, etc.), the desktop just hangs waiting for a click. From Telegram, Sean has zero visibility into that prompt.

He needs:
- **(a) Awareness:** Telegram pings him when a desktop session needs approval.
- **(b) Action:** He can approve or deny from Telegram, and the response routes back to the desktop process.
- **(c) Context:** The Telegram notification shows enough of the prompt to decide intelligently (command being run, file being touched, severity).

This is a desktop→bridge→phone notification path that does NOT exist today. Phase B handles SHARED MEMORY (text files); this handles LIVE-PROCESS INTERACTION.

### N3 — "Complex work, simple UX" — progressive disclosure
Power features should be one tap or one command. Anything Sean can defer to context (his pattern of work, recent activity) should be auto-handled. Don't make him remember syntax; assume sensible defaults.

### N4 — He needs visibility into desktop session activity from his phone
Beyond permission prompts: just KNOWING what each desktop session is doing right now. Current state: Sean has to ask Hermes Claude "what are you working on" and the answer comes from continuity context (which is stale per session). He wants closer-to-real-time state.

---

## 3. Initial proposal (Claude's pre-Village take, Tier 1-4)

### Tier 1 — Bridge improvements (small, daily-use wins)

1. **`/refresh` Telegram slash command** — wraps the current cache-bust ritual (delete sessions.json telegram dm keys + restart hermes-gateway.service) into a single tap.
2. **Reverse send (desktop → tmux)** — small Windows script to push commands into the persistent tmux sessions so Sean can kick off a remote-style task without leaving VS Code.
3. **`/continuity-last`, `/continuity-count`** — Telegram commands that return the latest continuity entry / pending PROMOTE marker count without invoking the model. Pure Hermes-daemon helpers.

### Tier 2 — Surface parity gaps

4. **`tg-codex` independent smoke** — verified code-path-equivalent to `tg-claude` but never tested in isolation.
5. **Codex plugin-sync 403 noise** — separate Codex CLI hygiene item, not Phase B blocker.

### Tier 3 — Higher-value bridge features

6. **Push-on-change** — Hermes daemon polls `rolling-last-done.md` mtime via SSH; on change, sends a Telegram message with the latest topic. Closes the "I closed the loop in VS Code, now I know Telegram saw it" gap.
7. **Cross-surface handoff protocol** — explicit "from `vs-claude` handing off to `tg-codex`" closeout marker that Hermes-Codex auto-picks-up on next session.
8. **Mythos / 5th surface** — additive when Anthropic Opus or local model surface ships; just add `'mythos-claude'` to `VALID_SURFACES`.

### Tier 4 — Deferred

9. Phase 18.B product work (admin view-as impersonation + measurements CTA gating).
10. Phase 19.C (movement-screen canonical surface decision).
11. Repo hygiene pass (qa-screenshots, AI-Village docs drift, untracked dirs).

---

## 4. Open questions for AI Village to answer

### Q1 — Permission-prompt routing architecture (N2)

This is the most architecturally novel piece. We need a design.

Options Claude is considering:

**Option A — Hermes-daemon-watches-stdout pattern.** A wrapper that wraps each VS Code Claude / Codex CLI invocation, captures stdout/stderr, parses for prompt patterns (`Allow this Bash command? [y/n]`), forwards to Telegram, and pipes the user's reply back to stdin. Requires a stable wrapper and reliable prompt-pattern detection.

**Option B — Permission-mirror via Hermes notification only.** Hermes ONLY notifies Sean when a prompt is pending; Sean must walk to the desktop to actually click. Easier to build, doesn't solve the round-trip.

**Option C — Stateless polling.** Telegram has a `/desktop-status` command that on each invocation greps `~/.claude/` and `~/.codex/` runtime state for pending prompts and reports them. Sean still has to walk to the desktop to act on them.

**Option D — Aggressive `acceptEdits` + curated `ask` rules.** Make permission prompts so rare on the desktop side that Sean almost never sees them; the tradeoff is reduced safety. Phase A already moved Claude Code toward this.

**Option E — Combination.** Default to (D) for low-risk operations + use (A) for high-risk-only prompts (push, file deletion, credential-touching), so Sean only gets pinged on Telegram when it actually matters.

**Village questions on N2:**
- Which option is most achievable? Lowest engineering cost vs highest UX win?
- Are there prior-art patterns for this in agentic tooling?
- What's the failure mode of (A)'s stdout parsing if Claude/Codex prompt format changes between versions?
- How should Telegram-side approval format work — slash-command? Inline keyboard? Free text?

### Q2 — Telegram command surface design (N1)

If we add slash commands, what should the canonical set be? Constraints:
- Phone keyboard, one-tap when possible
- Discoverable — `/help` must be useful
- Minimal cognitive load — Sean shouldn't have to remember syntax

Proposed minimal set (Village to evaluate + extend):
- `/refresh` — cache-bust Telegram session
- `/continuity` — show latest 2-3 closeout entries
- `/promote` — list pending PROMOTE markers
- `/desktop` — query desktop session status (running task, last commit, dirty files)
- `/log "topic" "outcome"` — short-form closeout from Telegram
- `/run "<command>"` — push command to claude-session tmux (replaces the longer `remote_ai_bridge` invocation)
- `/codex "<command>"` — same to codex-session
- `/help` — list all slash commands with examples

Village questions:
- Is this set complete? What's missing?
- Are there commands that are bad ideas (too dangerous on a phone interface)?
- How should `/run` and `/codex` handle long-running output? Streaming back to Telegram, or status polling?
- Should `/log` be guarded (sanity check before append)?

### Q3 — Push notification model (Tier 3 #6)

We want Telegram to ping when interesting state changes. What's "interesting"?

Candidates:
- New continuity entry landed (any surface)
- Desktop session has been idle for >N minutes (might want to close it out)
- Desktop session crashed / errored
- A new PROMOTE marker arrived
- A new commit landed on main
- Render deploy completed/failed

Village questions:
- Which signals should be DEFAULT-ON vs OPT-IN?
- Notification fatigue: how many pings per day before Sean mutes the bot?
- Quiet-hours support (don't ping at 2 AM unless critical)?
- Per-event granularity vs daily digest?

### Q4 — Cross-surface handoff protocol (Tier 3 #7)

Beyond reading the rolling log, an explicit "I'm handing this off to <surface>" marker that the receiving surface auto-picks-up.

Candidate shape:
```
HANDOFF: vs-claude → tg-codex
TASK: pick up the orchestrator-fix smoke at step 5
CONTEXT: <continuity-pointer-or-inline-summary>
```

Village questions:
- Is this worth building, or does the rolling log already suffice?
- Should handoffs be acknowledged (handshake) or fire-and-forget?
- How does the receiving surface know it's the intended target?
- Does this risk creating a queue Sean must manage?

### Q5 — "Easy easy easy" — what are we missing?

Village brains should look at the full picture and call out:
- UX patterns Claude isn't proposing that would matter
- Prior art from other agent-orchestrator products (ChatGPT mobile, Anthropic Workbench, etc.)
- The "mom test" — could a non-technical user send Sean's wife a Telegram bot like this and have her use it without instruction? What gets in the way?
- Specific frustrations Sean is likely to hit on day 2-3 that aren't obvious now

### Q6 — Failure modes the proposal doesn't address

- What if Tailscale goes down? (Hermes can't SSH to desktop)
- What if desktop is asleep / hibernating?
- What if Sean is on cellular data with high latency / dropped messages?
- What if the rolling log gets corrupted / locked?
- What if Telegram-side messages arrive out of order?

For each: fail-soft behavior + visibility.

---

## 5. Constraints + non-goals

### Hard constraints
- **No Grok / X-AI models** anywhere in the architecture
- **No Chinese models for sensitive roles** — MiniMax M2.7 only on Phase 2C design debate per existing privacy audit
- **No PII to LLMs** — client IDs only, names mapped client-side
- **Continuity append: explicit Sean trigger only** — no agent auto-decides "I'm done"
- **Sanitizer in-memory only** — unredacted candidate never touches disk
- **No commits/pushes without Sean approval** — bridge improvements ship in dedicated commits with review

### Non-goals for this phase
- 5th surface (Mythos / local model) — wait for the right model to exist
- Multi-user support — this is Sean's tool only
- Voice interface — defer to PLAUD integration plans
- Web UI — phone-first, no plans for browser dashboard
- Production-grade encryption beyond what Tailscale provides — single-user, single-laptop scope

---

## 6. Architecture artifacts already shipped (for Village context)

Files Village can read on the same machine to ground its analysis:
- `scripts/continuity-append.mjs` (~470 lines, Phase B writer)
- `scripts/continuity-promotions.sh` (Phase B reader)
- `scripts/scan-secrets.sh` (extended with `--stdin` for Phase B)
- `scripts/continuity-config.json` (placeholder template)
- `.ai-workflow/continuity/README.md` (schema)
- `docs/ai-workflow/AI-HANDOFF/CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md` (full architecture + 6-round Codex review)
- `docs/ai-workflow/AI-HANDOFF/HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md` (Pi-side patch record, placeholder-only)
- `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md` (curated promotions, currently empty template)
- `CLAUDE.md` item 10 (startup-read directive)

---

## 7. Desired Village output

The Village's job is to return:

1. **Gap analysis** — what's missing from Claude's Tier 1-4 proposal that should be there
2. **Q1 (permission-prompt) recommendation** — pick an option (A/B/C/D/E or hybrid), justify, identify implementation risks
3. **Q2 (slash command surface) — final canonical command set** with each command's behavior, output format, and failure mode
4. **Q3 (push notifications) — recommended default signals + opt-in signals + quiet-hours design**
5. **Q4 (handoff protocol) — verdict on whether to build, and shape if yes**
6. **Q5 (UX) — at least 5 concrete recommendations not in Claude's proposal**
7. **Q6 (failure modes) — design for each, fail-soft behavior**
8. **Implementation order — sequenced sprints, each ~1 session of work, stop when value plateaus**
9. **Open questions back to Sean** — anything Village can't decide without his input

This becomes the basis for `docs/ai-workflow/AI-HANDOFF/HERMES-ARCHITECTURE-UPGRADE-2026-04-22.md` which Sean keeps as the durable plan for the next phase.

---

*Phase B made the brains share memory. This phase makes the bridge actually conversational from Telegram.*
