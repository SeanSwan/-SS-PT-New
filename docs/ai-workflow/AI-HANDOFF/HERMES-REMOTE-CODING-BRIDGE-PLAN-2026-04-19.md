# Hermes Remote Coding Bridge — Plan 2026-04-19

**Goal:** From his phone via Telegram → Hermes, Sean can watch and interact with **both Claude Code AND OpenAI Codex** running in his VS Code on his Windows 5090 PC. Continue coding while away from home.

**Origin:** Session conversation 2026-04-19. Sean's own words: *"Hermes on my phone via Telegram so that I could go ahead and get to my VS code console and see what it's saying so I can continue coding while I'm gone and not at home. That's very important. Like extremely important."* And: *"I'm using Claude Code and Codex together in VS Code, and I need to be able to talk to both of them and see what both of them say."*

**Status:** PLANNED. Not yet implemented. Awaiting Village review + Sean approval.

---

## Part 1 — What Sean actually wants (use case clarification)

Sean works solo, has a marathon builder's rhythm, and uses **Claude Code** and **OpenAI Codex** as a dual-AI coding pair (Claude does primary implementation → Codex double-checks / catches gaps, or they debate decisions together). Both are interactive CLI tools running in his VS Code terminal on the 5090 Windows PC.

When he's away from the PC (at work, gym, traveling), he wants:

1. **Read:** See what Claude Code / Codex are saying right now. Latest output streaming to Telegram.
2. **Write:** Send instructions to either one from Telegram. They receive the command, execute, report back.
3. **Route:** Clear labels — "Claude just said X" vs "Codex just said Y." So he knows who's speaking.
4. **Resume:** When he gets home, pick up where he left off at his actual VS Code.

This is NOT:
- A replacement for VS Code (terminal-only interface)
- Autonomous coding (he's still the director)
- A general-purpose coding agent (he has specific tools he already uses)

This IS:
- Remote visibility + remote control of his existing VS Code + AI pair
- Phone-friendly output (chunked, labeled, scrollable in Telegram)
- A persistent bridge that survives over hours/days

---

## Part 2 — Current state (what's already in place)

✅ **Hermes running on Pi** with Telegram gateway (`hermes-gateway.service`)
✅ **Privacy gate live** — PII detection across client/medical/immigration/etc.
✅ **Tool scope hardened** — `hermes-telegram-safe` toolset with 16 safe tools
✅ **Pi ↔ Windows SSH exists** in one direction — we've only verified **Windows → Pi**. Reverse (Pi → Windows) is untested.
✅ **Claude Code installed** in `~/.claude/` on Windows (inferred from session history)
✅ **OpenAI Codex** — Sean uses this, assume installed
❌ **Windows OpenSSH server** — unknown if running. Need to verify.
❌ **tmux or persistent terminal session** on Windows — unknown. Windows Terminal has tabs but not persistent sessions.
❌ **Bridge between Telegram messages and VS Code terminal input/output** — NOT BUILT. This is the engineering work.

---

## Part 3 — Three architecture options (honest trade-offs)

### Option A — SSH + tmux bridge (RECOMMENDED — simplest real solution)

**How it works:**
1. Install **OpenSSH Server** on Windows 5090 (enables Pi → Windows SSH)
2. Install **WSL2 + Ubuntu** on Windows (hosts tmux — Windows doesn't have native tmux)
3. In WSL: `tmux new -s claude` → launches Claude Code inside a tmux session
4. Separate tmux session: `tmux new -s codex` → launches Codex
5. Hermes on Pi gets a **new scoped tool**: `remote_ai_bridge`
6. Tool can:
   - SSH to WSL
   - `tmux send-keys -t claude "message" Enter` → send input to Claude
   - `tmux capture-pane -t claude -p` → read Claude's output
   - Same for codex session
7. Telegram chat routes: "@claude what did you just do?" → goes to Claude session
8. Output from either session gets posted to Telegram with `[Claude]` or `[Codex]` label

**Effort:** ~1-2 days implementation
**Reliability:** Rock solid once set up (tmux persists over days)
**Fallback:** If bridge breaks, Sean can still SSH from phone via Termius app directly

### Option B — File-watch + named-pipe bridge (more elegant but fragile)

- Claude Code / Codex write to log files
- Hermes tails logs, sends new lines to Telegram
- Hermes accepts Telegram commands, writes to stdin of each process via named pipes

**Effort:** ~2-3 days
**Reliability:** Fragile — process crashes or log rotation breaks it
**Not recommended**

### Option C — ACP (Agent Communication Protocol) bridge (most architecturally pure)

- Claude Code has ACP support (internal to Anthropic's CLI)
- Hermes has `acp_adapter/` infrastructure (saw this in earlier repo walk)
- Bridge Telegram messages → ACP → Claude Code
- For Codex: probably doesn't speak ACP, would need adapter

**Effort:** ~3-5 days (researching ACP + building adapter for Codex)
**Reliability:** Medium — untested in this combo
**Not the fastest path**

### Option D — Bypass Hermes entirely (shortest path, loses privacy-gate)

- Install SSH app on phone (Termius — free)
- SSH directly to Pi from phone, then from Pi SSH to Windows
- Run Claude Code / Codex in tmux on Windows
- Interact from phone SSH terminal

**Effort:** ~30 minutes
**Reliability:** Excellent
**Gives up:** Telegram-native UX, Hermes privacy gate, conversation history, ability to combine with Hermes chat in same app

**Use as fallback today. Option A later for the full experience.**

---

## Part 4 — Recommended implementation sequence (Option A)

### Phase R1 — Foundation (~3 hours)

1. **Install OpenSSH Server on Windows:**
   ```powershell
   Add-WindowsCapability -Online -Name OpenSSH.Server
   Start-Service sshd
   Set-Service -Name sshd -StartupType 'Automatic'
   New-NetFirewallRule -Name "ssh-server" -DisplayName "SSH Server" -Protocol TCP -LocalPort 22 -Direction Inbound -Action Allow -RemoteAddress 192.168.50.232
   ```

2. **Generate SSH key on Pi, add to Windows authorized_keys:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
   ssh-copy-id <OPERATOR>@192.168.50.83
   ```

3. **Install WSL2 + Ubuntu on Windows:**
   ```powershell
   wsl --install -d Ubuntu-22.04
   ```
   Needed because tmux + shell semantics are much saner in Linux than Windows PowerShell.

4. **Install tmux in WSL:**
   ```bash
   sudo apt install -y tmux
   ```

5. **Test full chain from Pi:**
   ```bash
   ssh <OPERATOR>@192.168.50.83 wsl -- bash -c "tmux new -d -s test 'echo hello'; tmux capture-pane -t test -p"
   ```

### Phase R2 — Session scaffolding (~2 hours)

1. **Create persistent tmux sessions for each AI:**
   ```bash
   # On Windows WSL:
   tmux new -d -s claude "cd ~/code/SS-PT && claude code"
   tmux new -d -s codex "cd ~/code/SS-PT && codex"
   ```

2. **Systemd or startup script in WSL to auto-start sessions on boot**

3. **Verify both sessions survive across SSH reconnects** (they should, that's tmux's whole job)

### Phase R3 — Hermes bridge tool (~1 day)

1. **Define new Hermes tool** — scoped, secure, only interacts with specific tmux sessions
2. **Tool schema:**
   ```python
   remote_ai_bridge(
       target: "claude" | "codex" | "both",
       command: "read_recent" | "send_input" | "status",
       payload: str | None = None,
       lines: int = 40,  # for read_recent
   )
   ```
3. **Implementation:**
   - `read_recent` → `ssh ... wsl tmux capture-pane -t {target} -p | tail -n {lines}`
   - `send_input` → `ssh ... wsl tmux send-keys -t {target} '{payload}' Enter`
   - `status` → reports if session is alive + last activity timestamp
4. **Add to `hermes-telegram-safe` toolset** in `toolsets.py`
5. **Output chunking** — Telegram max message = 4096 chars. Long terminal output paginated.
6. **Label prefixes** — responses start with `[Claude]` or `[Codex]` in Telegram.

### Phase R4 — Conversation ergonomics (~half day)

1. **Routing heuristics in Hermes:**
   - Message starts with `@claude` or `c:` → route to Claude session
   - Message starts with `@codex` or `x:` → route to Codex session
   - Otherwise → ambiguous, ask which one
2. **Auto-tail feature:** when Sean sends `@claude status`, Hermes shows the last 40 lines automatically.
3. **Streaming updates** (stretch): Hermes pushes new Claude/Codex output as they happen, not just on request.

### Phase R5 — Safety + monitoring (~half day)

1. **Audit log** of every bridge command sent (Sean's intent is always legible later)
2. **Rate limiting** — prevent runaway loops (some malformed tmux command looping back)
3. **Tmux session lock** — no two parallel Hermes commands overwrite each other's input
4. **Fallback alert** — if SSH to Windows fails, Hermes tells Sean "PC unreachable" instead of hanging

### Phase R6 — Polish (optional, ~1 day)

1. **Screenshots / image output** — if Claude Code generates images/diffs, pipe to Telegram as images instead of text
2. **Code-block formatting** — Telegram supports triple-backticks; format terminal output appropriately
3. **Session management commands** — `@session new codex python`, `@session kill codex`, etc.

### Total effort: ~3-5 days focused work

---

## Part 5 — Security considerations

Sean's key concern this session: we just locked down Hermes's tool scope to prevent prompt injection from reading files or running shell. This new tool intentionally RE-OPENS a limited shell path.

Mitigations:

1. **Scoped to specific tmux sessions only** — `remote_ai_bridge` CANNOT run arbitrary SSH commands. Only `tmux send-keys` and `tmux capture-pane` on **allowlisted session names** (`claude`, `codex`, and maybe `shell`).
2. **Privacy gate STILL applies** — if Sean's Telegram message contains PII and he's on cloud-model mode, the existing privacy gate warns before the bridge forwards to Claude/Codex.
3. **One layer of indirection** — Telegram attacker can only send TEXT to Claude/Codex via this tool. Claude/Codex then decide what to do. If they have dangerous tools themselves (they do), that's a higher-level concern but not a new vulnerability introduced by the bridge.
4. **Audit log** — every `remote_ai_bridge` call logged to `~/.hermes/audit/bridge_calls.jsonl`. Sean can review history.
5. **SSH key auth only** — no password fallback. If Pi compromised, attacker can pivot to Windows, but that's true of any remote-management setup.

---

## Part 6 — Dependencies / prerequisites checklist

Before Phase R1 starts, verify or install:

- [ ] Windows OpenSSH Server installed + firewall rule allowing Pi IP only
- [ ] WSL2 + Ubuntu installed on Windows
- [ ] tmux installed in WSL
- [ ] Claude Code CLI installed in WSL (`npm i -g @anthropic-ai/claude-code` or equivalent)
- [ ] OpenAI Codex CLI installed in WSL (per Codex docs)
- [ ] Working directory mounted in WSL (`<REPO>` or similar)
- [ ] SSH key from Pi (`~/.ssh/id_ed25519`) added to Windows authorized_keys
- [ ] tmux sessions auto-start on Windows boot (systemd unit in WSL or scheduled task)
- [ ] Hermes `toolsets.py` extended with `remote_ai_bridge` tool definition
- [ ] Telegram bot's current scope includes the new tool

---

## Part 7 — Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| tmux session dies mid-session | Medium | High | Auto-restart via systemd; Hermes notifies Sean |
| Claude Code / Codex subscription token expires | Medium | High | Hermes detects auth failures and notifies Sean to re-auth |
| SSH connection drops (Wi-Fi / router reboot) | Medium | Low | Hermes retries with backoff; reports failures clearly |
| Malicious actor gets Sean's Telegram → drives his AI tools | Low | High | Existing `TELEGRAM_ALLOWED_USERS` allowlist; privacy gate; audit log |
| Output too large for Telegram (4096 char limit) | High | Low | Paginate; most useful output fits in one message |
| WSL2 not usable for interactive Claude Code | Low | High | Fallback: use Windows Terminal with ConPTY-aware shim |
| Hermes tool scope re-opens vulnerabilities | Low | High | Scoped to specific tmux sessions only; audit log; retain safe toolset for other use |

---

## Part 8 — Success criteria (how we'll know it works)

Sean can, from his phone at the gym or coffee shop:

1. Open Telegram → Hermes bot
2. Type: `@claude where are we on the Plaud pipeline?`
3. Hermes sends to Claude Code session on WSL → Claude responds → Hermes forwards to Telegram with `[Claude]` prefix
4. Sean reads response in Telegram
5. Types: `@claude keep going, focus on the workout-log privacy proxy endpoint`
6. Claude receives instruction, works on it, output streams back via Hermes
7. Sean switches context: `@codex double-check what Claude just committed`
8. Codex runs its review, reports back with `[Codex]` prefix
9. Sean returns home, opens VS Code, sees both tmux panes with full state preserved — keeps working

If all 9 steps work end-to-end, this is shipped.

---

## Part 9 — Alternative today (while full bridge is built)

**Termius SSH app on phone** gives Sean 90% of the value immediately:
1. Install Termius on phone (free, iOS + Android)
2. SSH to Pi
3. `ssh <OPERATOR>@192.168.50.83` from Pi to Windows (requires OpenSSH Server on Windows first)
4. In Windows: `wsl` → attach to tmux session: `tmux attach -t claude`
5. See full terminal, interact directly

Downside: you lose Telegram-native UX, audit log, privacy gate, chat history. Upside: works today with ~30 min setup.

**Recommend: set up Termius fallback first so Sean has something working immediately. Build Hermes bridge over following sessions.**

---

## Part 10 — Questions for Village review

1. Is Option A (SSH + tmux) the right architecture, or does ACP/Option C give meaningfully better long-term UX that's worth the extra days?
2. Windows OpenSSH Server — is there a safer way to expose just tmux access without opening port 22 broadly? (Maybe pinhole via Pi's Wireguard tunnel?)
3. If Sean's Telegram account is compromised, what additional verification should the bridge require for destructive commands (e.g., "delete files", "git push --force")? Sean's TELEGRAM_ALLOWED_USERS allowlist is the first line. Should there be a second-factor challenge ("type BRIDGE CONFIRM to proceed") for high-risk ops?
4. The "routing heuristic" (`@claude` vs `@codex`) — is that the right UX, or should Hermes auto-detect which AI to use based on message content?
5. Where should tmux session output persist? If Sean is reading latest 40 lines on demand, how does Hermes know what's "new since last read" vs "already shown"?
6. If both Claude and Codex are mid-task when Sean sends a new instruction, should Hermes interrupt them, queue the command, or ask Sean how to handle?
7. What happens when Claude Code's underlying model (Opus 4.7) is rate-limited? Fallback to Codex? Notify Sean to wait?
8. Should this share infrastructure with the Plaud → Hermes → Workout Log pipeline, or stay fully separate?
9. Is there a simpler V0 we should ship first (e.g., READ-ONLY bridge — Hermes can show Sean what's happening but can't send input) before the full bi-directional version?
10. Does this create any regulatory concern (GDPR, PIPEDA) around "forwarding client data from AI tool outputs to Telegram servers"?

---

## Part 11 — Why this matters strategically

Sean builds alone. His time leverage is everything. Most of his waking hours are NOT at his desktop. He's training clients, traveling, at the gym, in transit. If his AI pair is only useful at home, he gets ~4-6 productive hours/day. If his AI pair is pocketable via Telegram, he gets ~14 productive hours/day by filling in the gaps (code during client breaks, review diffs on the bus, send instructions while falling asleep).

**Conservative estimate: 2-3× productivity multiplier.** For a solo SaaS founder, that's the difference between 12-week milestone slip and 4-week ship cycle.

This is why Sean called it "extremely important." He's right.

---

*Authored by Claude Opus 4.7 (1M context) during SwanStudios session 2026-04-19. Next step: Sean reviews, runs SwanStudios Village critique, incorporates feedback into v2, begins Phase R1 implementation.*
