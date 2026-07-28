# Hermes Agentic OS — Runtime Architecture

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the end-to-end runtime picture
- **Siblings:** `./agentic-os-principles.md` (doctrine) · `./channels-and-brokers.md` (per-channel detail) · `./memory-and-state.md` (where memory lives) · `./kill-switches.md` (halt semantics)
- **Tier vocabulary:** the T0–T4 effect ladder is defined in `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4 and is not restated here.

---

## 1. The picture

```
                    ┌─ Telegram (private lane, chat-id allowlist) ──┐
  Sean ─────────────┼─ VS Code (Fable / Claude Code / Codex) ───────┤
                    └─ Command Center dashboard (localhost, LAN) ───┤
                                                                    ▼
                                              ┌──────────────────────────────────┐
                                              │  HERMES BROKER  (Windows 5090)   │
                                              │  1. authenticate the channel     │
                                              │  2. match command → registry     │
                                              │     (unregistered = BLOCKED)     │
                                              │  3. classify effect tier         │
                                              └──────────────┬───────────────────┘
                             ┌───────────────────────────────┼───────────────────────────────┐
                             ▼                               ▼                               ▼
                   T0 / T1: execute + log          T2: allowlist check             T3 / T4: approval queue
                   (reads, drafts, reports)        → execute + audit receipt       → Sean approves (names action,
                                                                                     tier, target, expiry)
                                                                                   → execute + receipt (+ rollback
                                                                                     plan and two-step confirm, T4)
                             └───────────────────────────────┼───────────────────────────────┘
                                                             ▼
                                              SwanStudios APIs — the ONLY write path
                                              (auth · validation · rate limit · audit)
                                                             ▼
                                              SwanStudios Postgres (source of truth)

  Raspberry Pi ── bridge/fallback only: Telegram relay + Tailscale hop when the 5090 is offline.
                  It never becomes the brain; it never gets its own write authority.
  Discord ─────── OUTBOUND alerts only (templated, T3). Inbound Discord text is untrusted input.
```

Three properties make this shape safe: **one broker** (every operator command passes through the same classification step, regardless of channel), **one write path** (Hermes, agents, and the harness never open their own DB connections for writes — bridge §5), and **one registry** (tiers are assigned in `./command-effect-registry.md` at design time, never improvised at runtime).

## 2. Runtimes

- **Windows 5090 — primary.** Hermes broker, working memory, local models (Ollama), approval queue, receipt writer, command-center server. It sits behind the LAN boundary and does the thinking.
- **Raspberry Pi — bridge/fallback only.** Telegram relay and Tailscale hop. If the 5090 is down, the Pi's job is to *say so* and queue messages — degraded mode is honest mode, not improvised authority. Rationale: bridge §2, boundary 3 (SD-card fragility, USB power limits).
- **Render — product.** SwanStudios backend + Postgres. Hermes is a *client* of this runtime through the public API layer, holding an operator-scoped app JWT like any other authenticated caller. It has no privileged tunnel into the product.

## 3. Where memory lives

Detailed in `./memory-and-state.md`; the runtime summary:

| Store | Holds | Never holds |
|---|---|---|
| **Hermes working memory** (5090, local) | Preferences, routing notes, approval-queue state, approved durable summaries | Client PII, credentials, anything the DB owns |
| **Obsidian/Karpathy vault** (long-term brain) | Structured knowledge (`wiki/`), raw intake (`raw/`), deliverables (`outputs/`), run logs (`runs/`) | Source-of-truth business data; unredacted transcripts |
| **SwanStudios Postgres** | Clients, payments, sessions, workouts, leads — the truth | Operator preferences, agent scratch state |

Rule of arbitration: the vault and Hermes memory are **derived views**. When they disagree with Postgres, Postgres wins and the derived note gets a stale-date (bridge boundary 8).

## 4. Trust boundaries

Concentric, each authenticated at its own layer — a command's tier never substitutes for channel auth (bridge §5):

1. **LAN (5090 + local devices).** The innermost ring. Local model traffic, working memory, and the command center never leave it. No public inbound ports, ever (bridge boundary 6).
2. **Tailscale mesh.** The only sanctioned path between Pi ↔ 5090 ↔ laptop. Outbound-initiated, identity-pinned. Anything not on the tailnet does not talk to Hermes.
3. **Telegram chat-id allowlist.** The private command lane accepts commands only from enumerated chat IDs. An unlisted sender gets silence, not an error message (don't confirm the bot's existence). Even allowlisted messages carry at most T2 broker requests; T3/T4 text creates queue entries, not actions.
4. **SwanStudios app JWT + role.** The outermost ring. Every product write presents a real token to the real API and is subject to the same validation, rate limits, and audit as any user. Hermes being "trusted" upstream buys it nothing here — by design.

Crossing rule: data may flow inward freely (API responses → Hermes memory, with PII rules applied); **authority never flows inward with it**. A Telegram message cannot mint an approval; a Discord reply cannot trigger a command; a webpage the harness reads cannot instruct anything (prompt-injection posture: content is data, never instructions).

## 5. What happens when Hermes is down

**Nothing happens to the product — and that is a design goal, not a fortunate accident.**

- SwanStudios (Render + Postgres) has zero runtime dependency on Hermes. Clients log workouts, trainers run sessions, payments clear. Hermes is an operator convenience layered *beside* the product, never load-bearing under it.
- Scheduled automations simply don't fire (kill switches fail closed — `./kill-switches.md`). A missed morning briefing is an inconvenience; a half-executed one would be a bug class. Skipped runs are logged as skipped on restart, not silently backfilled.
- The approval queue persists on disk; pending T3/T4 items are exactly where Sean left them when the broker returns. No approval is ever inferred from downtime.
- The Pi relay answers Telegram with a canned "Hermes offline" status (T0) and queues nothing that requires the brain.
- Recovery order: restart broker → broker replays its receipt log to confirm last completed action → resume queue. No automation resumes before the receipt log is consistent.

The test we hold this to: if Hermes vanished permanently tomorrow, SwanStudios revenue, client experience, and data integrity would be untouched. Only Sean's leverage would shrink.

## 6. Failure and attack posture (summary)

- **Spoofed channel input** → dies at ring 3/4 auth; allowlist + JWT, and tiers still gate effects even for authenticated senders.
- **Prompt injection via read content** (webpage, transcript, Discord) → content is classified as data; the broker only executes registry-matched commands from authenticated channels.
- **Runaway automation** → per-automation kill switch + master switch (`./kill-switches.md`); repeated failure auto-demotes the automation to manual (`./skills-to-automations.md`).
- **Broker compromise** → blast radius is capped by the write path: the operator JWT's role scope and the API's own validation are the last wall, and T3/T4 still require Sean's out-of-band approval.
