# Channels & Brokers

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — per-channel law for every lane that touches the broker
- **Companions:** `./architecture.md` §1/§4 (where channels sit; trust rings) · `./command-effect-registry.md` (channels field on every command row) · `./approval-gates.md` §3 (confirm phrases) · `./kill-switches.md` §4 (`SWITCH_TELEGRAM_BROKER`, `SWITCH_DISCORD_BROKER`) · `./headless-runner-spec.md` (the non-chat channel)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 1. Channel law

A channel is not plumbing; it is a **registry entry with a tier ceiling**. Every lane into or out of the broker is registered with: name, direction (inbound command / outbound broadcast), auth mechanism at its own layer, tier ceiling (the highest tier of *request* it may carry — never the highest tier it may execute), and kill switch. A command row's `channels` field may only name registered channels, and the effective ceiling of any invocation is `min(channel ceiling, command tier gate)`. Authority never flows inward with data (architecture §4): no channel content — message, reply, webpage, webhook body — is ever instructions.

## 2. Telegram command broker (inbound, private)

The Sean-only command lane. Its rules are the 2026-04-18 lockdown made permanent, plus the queue discipline:

- **Chat-id allowlist.** Commands are accepted only from enumerated chat IDs. An unlisted sender gets **silence** — no error, no bot-exists confirmation (architecture §4, ring 3). Allowlist changes are a registry-grade change: proposed as T1, applied by Sean.
- **Safe-toolset heritage.** The `hermes-telegram-safe` lockdown is the permanent shape of this channel: no shell, no file read, no arbitrary tool reach through chat, ever (bridge boundary 5; principles §6). The broker's entire vocabulary is `./command-effect-registry.md`; unregistered text is refused with a receipt.
- **Inbound text = untrusted input.** Even from Sean's own chat-id. Free text is parsed for a registered command name + declared inputs; free-text *parameters* are typed `untrusted` in the registry schema and validated, never interpolated anywhere executable — there is nothing executable to interpolate into, by construction.
- **Tier ceiling: T2 broker requests.** T0/T1/allowlisted-T2 commands execute and receipt. **T3/T4 requests become approval-queue entries, never actions** — the message creates the entry; nothing external happens (`./approval-gates.md` §2).
- **Approvals are exact-match phrases.** `APPROVE Q-YYYYMMDD-NNN <action-name>` and the T4 `ARM …` phrase, verbatim, from an allowlisted chat-id (`./approval-gates.md` §3/§5). Paraphrase, emoji, "yes go ahead" — not approvals; the broker replies with the required phrase. The exact-match rule *is* the injection defense on this lane.
- **Kill:** `SWITCH_TELEGRAM_BROKER` pauses inbound processing (bot may answer "broker paused"); the Pi relay's Hermes-down behavior is architecture §5.

## 3. Discord alert broker (outbound, broadcast)

Discord exists to tell the team things, not to be told things:

- **Outbound templated alerts only.** Every alert is a registered template: fixed structure, enumerated fill-slots with validation, named channel. Posting is T3 (`discord-alert` in the registry), and **every send rides the per-send queue** per `./approval-gates.md`. **Per-template standing send authority is a PROPOSAL, not the current contract:** bridge §7 allows standing approvals only for enumerated T2 allowlists, so template-level auto-send would require an explicit bridge §7 amendment approved by Sean (framed as such in `./open-questions.md` Q2). If that amendment ever lands: Sean approves each template — text, trigger conditions, channel, rate limit — as a versioned artifact, and a template edit voids its approval (`./loop-engineering.md` §5). Content approval and send authority are separate things, earned separately.
- **Rate limits are part of the template.** Each template carries a per-day cap (seed: 5/day per template, 10/day channel-wide); the broker refuses above cap with a receipt. An alert system that can spam has already failed as an alert system.
- **Inbound Discord has ZERO command authority.** No reply, reaction, DM, or webhook from Discord reaches the broker as a command — not from Sean, not from anyone. Inbound Discord text is untrusted content that may, at most, be *logged*. This is absolute because Discord has non-operator members and the richest spoofing surface of any lane (bridge §3 actor table).
- **Kill:** `SWITCH_DISCORD_BROKER` stops all outbound posts, approved or not.

## 4. VS Code lane (inbound, dev surface)

Fable / Claude Code / Codex operating in the repo. Auth is the machine + repo lane discipline (Rule 67 claims); tier ceiling is T2 repo edits within claimed lanes, per the bridge actor table. This lane talks to the *repo* and the registry-as-docs; when it wants a runtime effect, it goes through the same broker as everyone (a slice may register commands; it may not side-door them). Push/deploy remain governed by standing authorizations outside this folder's scope.

## 5. Channel registry (seed)

The channel rows as they stand — each is a governance entry, kept current here until the runtime registry externalizes them:

| Channel | Direction | Auth at own layer | Tier ceiling (requests) | Kill switch |
|---|---|---|---|---|
| `telegram` | Inbound commands | Chat-id allowlist | T2 (T3/T4 → queue entries) | `SWITCH_TELEGRAM_BROKER` |
| `command-center` | Inbound commands | Local session on the 5090, LAN-only | T2 (T3/T4 → confirm/arm flows over queue) | `SWITCH_MASTER` |
| `vscode` | Inbound (repo/docs) | Machine + Rule 67 lane claims | T2 repo edits | n/a (repo discipline) |
| `runner` | Inbound (scheduled) | Local process identity | T1 effects + T2 queue-entry creation (queue writes are the runner's ONLY T2) | `SWITCH_HEADLESS_RUNNER` |
| `discord` | **Outbound only** | Bot token, posts only | n/a inbound (zero command authority) · outbound = T3 templated sends, per-send queued | `SWITCH_DISCORD_BROKER` |
| `event-sources` | Inbound (webhooks/events: lead webhook, deploy-detected, transcript-ready) | Per-source signature verification + source allowlist (PLAUD webhook pattern is the template) | Queue/attention-entry creation ONLY — no command execution | proposed `SWITCH_EVENT_SOURCES` |
| `voice` | Inbound (slice 6) | LAN device identity — weakest auth, lowest ceiling | T0/T1 + `memory-note` | proposed `SWITCH_VOICE` |

Refusals on every channel are receipted (`./audit-receipts.md` §2) — the refusal trail is the injection-probe detector, so a channel that refuses silently *to the log* is misbuilt even when it correctly refuses to the sender.

## 6. Adding a channel

A new channel (Signal, email-in, a second Telegram bot, a webhook source) ships like an automation, because it is one:

1. **Registry entry first** — name, direction, auth-at-own-layer, tier ceiling, kill switch, receipt shape for refusals. No entry, no listener.
2. **Ceiling starts at T0/T1.** A new channel earns T2 request-carrying the way skills earn triggers: clean receipted history (`./skills-to-automations.md` §7). No channel ever ceilings above T2 *requests* — T3/T4 queue, on every channel, forever. (Outbound broadcast lanes like `discord` carry no requests at all; their T3 label is the tier of the *send* they deliver after queue approval.) Event-source lanes ceiling at queue/attention-entry creation — the signature-verified webhook may wake work, never execute it.
3. **Untrusted-input posture inherited whole.** The Telegram rules in §2 (allowlist/auth, exact-match approvals, content-is-data) are the template; a channel that can't implement an equivalent of each does not ship.
4. **Sean's yes to the specific channel** — including what it's *for*, because every added channel is added attack surface, and "it would be convenient" is where this file starts saying no.

Removing a channel is the cheap direction and needs only its kill switch plus a registry-row status change to retired — retired rows stay in the table so the refusal of a revived listener is documented, not accidental (the same reasoning as the registry's FORBIDDEN rows).
