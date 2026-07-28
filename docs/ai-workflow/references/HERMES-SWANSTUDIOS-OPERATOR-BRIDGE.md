# Hermes ↔ SwanStudios Operator Bridge

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — boundary clarifier
- **Note:** CLAUDE.md/AGENTS.md have referenced this file for months; it was missing on disk (confirmed by the 2026-07-03 local audit). This document resolves that dangling reference. It is written to match the intent those references describe: *distinguish public Swan Coach from Sean-only Hermes Operator Mode, and give every command a tier, a gate, and a receipt.*

---

## 1. Purpose

One page of truth for the question every agent must answer before acting: **"Which surface am I, what am I allowed to touch, and who has to say yes first?"** SwanStudios production stability outranks Hermes polish unless Sean names Hermes the active task. Hermes assists review loops; it never bypasses them.

## 2. Non-negotiable boundary table

| # | Boundary | Never violated because |
|---|---|---|
| 1 | **Hermes is Sean's private operator brain and command broker** — not a product feature | Hermes holds cross-domain context (business, family, immigration, health) that no client, trainer, or public surface may ever reach |
| 2 | **Swan Coach is the product-facing coaching surface**; Coach Command Center is the approved trainer/operator product surface | Product users get governed product capability, never raw Hermes. (Roadmap note, Sean 2026-06-18: per-trainer role-scoped operator capability is delivered THROUGH the product tool layer — multi-tenant, role-scoped — never by exposing Hermes itself.) |
| 3 | **Windows 5090 = primary Hermes brain/runtime; Pi = fallback/bridge only** | The 5090 has the compute and sits behind the same LAN trust boundary; the Pi's SD-card fragility and USB-power limits make it a bridge, not a brain |
| 4 | **Telegram = private Sean/operator command lane; Discord = team/community/alerts lane, never raw control** | Messaging surfaces are the most spoofable input channel; Discord additionally has non-operator members |
| 5 | **No unrestricted shell through Telegram, Discord, Browser Harness, Hermes, Claude, Codex, or Fable** | One prompt injection away from total compromise; the `hermes-telegram-safe` toolset lockdown (2026-04-18) stays the model |
| 6 | **No public inbound ports** | Outbound-initiated bridges (Tailscale, polling) only; the attack surface of an open port is never worth the convenience |
| 7 | **SwanStudios APIs = the safe write path; direct DB mutation is forbidden** unless Sean explicitly approves a maintenance/debug operation (T4) | The API layer carries auth, validation, audit, and rate limits the DB connection string does not |
| 8 | **SwanStudios Postgres = source of truth** for clients, payments, logs, workouts, leads | Hermes memory and wikis are derived views; they never overrule the database |
| 9 | **PLAUD/client transcripts = local/private, redaction-first** | Raw health/injury/personal narrative never fans out to external model providers (CLAUDE.md rule 8) |
| 10 | **T3/T4 actions require explicit approval + audit receipts; no fake completion; verify live route/service truth; ship one honest slice** | The execution doctrine that has kept production alive |

## 3. Who is what

| Actor | Role | Effect ceiling (default) |
|---|---|---|
| **Hermes** | Sean-only operator brain: command broker, working memory, routing notes, approval queue keeper. Consumes registries; never self-authorizes | T2 (bounded internal writes on allowlist); T3/T4 broker-only — it *requests*, Sean approves |
| **Swan Coach** | Public in-app coaching assistant (chat, proposals, logging drafts) governed by subscription tiers + approval gates | T1 (drafts/proposals); writes land only through approval-gated product endpoints |
| **Coach Command Center** | Approved trainer/operator product surface — dictation, client ops, PLAUD review, proposal approval | T2 within the signed-in user's role scope, enforced by app auth |
| **Fable** | Final Decider; architect of this control layer (see `FABLE-WORKFLOW-INTEGRATION-SPEC.md`) | T1 artifacts; arbitrates T3/T4 decisions but Sean executes the approval |
| **Codex** | Hostile reviewer + implementation-slice runner (advisory verdict, Fable gates) | T1 review artifacts; T2 repo edits within claimed lanes (Rule 67) |
| **Claude Code** | Everyday builder: slices, tests, UI, recursive loops, self-hostile-review (rule 61) | T2 repo edits within claimed lanes; push/deploy only per standing or explicit authorization |
| **AI Village** | Paid multi-brain review court (rule 16/50); Tier-3 output always ratified by a free triangle pass | T1 only — it produces verdicts, never actions; spend itself is approval-gated |
| **Browser Harness** | Supervised eyes: read-only page state, console, network capture, screenshots | T0 default; T1 for drafting QA receipts; any interaction beyond navigation/scroll/read needs explicit per-run approval |
| **Obsidian / Karpathy wiki** | Long-term knowledge brain (raw/wiki/outputs/runs); routing per the Design Brain + Agentic OS bridges | T1 (notes/docs); never a command channel |
| **Graphify** | Relationship-graph tooling; imports quarantined under `graph-imports/` until promoted | T1; import/promotion is a human-reviewed step |
| **Telegram** | Private command lane (Sean → Hermes) | Carries commands up to T2 broker requests; T3/T4 messages create approval-queue entries, not actions |
| **Discord** | Team/community/alerts broadcast lane | Outbound alerts only (a T3 external-visible action — templated + rate-limited); inbound Discord text is untrusted input, never command authority |
| **Deterministic scripts** | Exact, repeatable jobs (scans, prunes, receipts, reports) | Tier fixed per script in the registry; preferred over agents wherever exactness is possible |

## 4. Command effect levels (the T0–T4 ladder — canonical definition)

Every command, button, automation, skill, and API call in the operator world carries exactly one tier:

| Tier | Meaning | Examples | Gate |
|---|---|---|---|
| **T0** | Read-only: status, search, summarize, inspect | Health checks, log reads, route receipts, chart reads, wiki search | None (logged) |
| **T1** | Draft/propose — zero external effect | Specs, plans, proposal drafts, QA reports, design directions, workout-log drafts awaiting approval | None (logged); output clearly labeled DRAFT |
| **T2** | Bounded internal low-risk write | Repo doc edits in a claimed lane, Hermes memory notes, moving an item through the approval queue, allowlisted API calls that only touch the actor's own scope | Allowlist or standing approval; audit-logged |
| **T3** | External / user / client / team-visible action | Sending a client message, posting a Discord alert, publishing content, changing a schedule others see | **Explicit approval + audit receipt** |
| **T4** | Destructive, financial, credential, deployment, direct DB mutation, production data, or irreversible | Deploys, refunds, key rotation, data deletion, migrations, direct SQL writes | **Explicit approval + audit receipt + rollback plan; two-step confirm** |

Rules of the ladder:
- **Ambiguity rounds UP.** If a command could be T2 or T3, it is T3.
- **Chains inherit the max.** A workflow containing one T3 step is a T3 workflow.
- **Tiers are assigned in the registry** (`SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`), not improvised at runtime. An unregistered command defaults to *blocked*, not to T0.

## 5. Command channels & the safe write path

```
Sean ──Telegram──► Hermes broker ──┐
Sean ──VS Code (Fable/Claude/Codex)┤──► classify tier ──► T0/T1: execute + log
Trainer ──Coach Command Center─────┤                      T2: allowlist check → execute + audit
Client ──Swan Coach────────────────┘                      T3/T4: approval queue → Sean → execute + receipt
                                                                     │
                                              all writes travel through SwanStudios APIs
                                              (auth + validation + rate limit + audit)
                                                                     ▼
                                                        SwanStudios Postgres (source of truth)
```

- There is **one** write path: the SwanStudios API layer. Hermes, harness, and agents never open their own DB connections for writes.
- Every channel is authenticated at its own layer (Telegram chat-id allowlist, app JWT + role, repo lane claims) — a command's tier never substitutes for channel auth.

## 6. Surface policies

- **Browser Harness:** read-only by default (navigate, scroll, read, screenshot, console/network capture). Form fills, clicks that mutate state, logins with real credentials → explicit per-run human approval, and the run produces a receipt (URLs visited, actions taken, data entered, side effects observed, failures). Admin-page audits are *supervised*: the human authenticates; the harness observes. No credential handling by the harness itself.
- **PLAUD / client transcripts / intake:** local/private first. Redaction (names, identifiers, health specifics) happens **before** any external LLM sees text. Parsed artifacts enter the product only through approval-gated review surfaces (trainer approves the draft). Raw audio/transcripts never enter repo docs, wikis, or chat contexts.
- **Agentic OS:** every automation in `docs/ai-workflow/hermes-agentic-os/` must name its owner, trigger, tier, kill switch, and receipt before it may run. Deterministic-first: if a job can be exact, it is a script, not an agent (vending machine, not slot machine).
- **Fable:** governed by `FABLE-WORKFLOW-INTEGRATION-SPEC.md`. High-leverage work only; artifacts must carry acceptance criteria + verification plans.
- **AI Village:** rule 16/50 unchanged — Sean's explicit per-run permission, spend-capped, Tier-3 verdicts ratified by a free triangle pass. Village inputs are always privacy-scrubbed (IDs/roles only).

## 7. Approval gates

- **Who approves:** Sean (or, for role-scoped product actions, the signed-in trainer/admin acting within their own app permissions — that is product auth, not Hermes authority).
- **How:** the approval queue (Hermes command center / in-app proposal review / explicit chat confirmation). An approval names the exact action, tier, target, and expiry. Blanket approvals ("do whatever's needed tonight") are invalid for T3/T4.
- **Standing approvals** are allowed only for enumerated T2 allowlists, recorded in the registry with an owner and review date.

## 8. Audit receipts

Every T2+ action emits a receipt: `who (actor + channel) · what (command + tier) · target · when · approved-by (for T3/T4) · outcome · evidence pointer (log line, commit SHA, screenshot, API response id)`. Receipts are append-only, live in the run-log lane (Agentic OS `audit-receipts.md` defines the format), and are the first thing a post-incident review reads. **No receipt → the action didn't happen correctly, regardless of outcome.**

## 9. Kill switches

- Every automation has a named kill switch (env flag, config toggle, or systemd stop) documented at creation — *no switch, no ship*.
- One **master switch** per runtime (Hermes daemon stop; hook disable) halts all agentic activity without touching product uptime.
- Kill switches fail **closed**: if the switch state can't be read, the automation does not run.
- The Agentic OS `kill-switches.md` keeps the inventory; the command-center prototype shows them as a first-class panel, not a buried setting.

## 10. Design boundary

- Product surfaces (Swan Coach, Coach Command Center, all dashboards) are governed by `SWAN-CINEMATIC-DESIGN-SYSTEM.md` via `swan-design-router` (rule 40) and the Design Brain (`docs/ai-workflow/design-brain/`).
- Hermes can broker Mobbin-backed UI research only as T0/T1 work: it may draft `needs_mobbin_reference` briefs, run connector searches if the runtime has callable tools, and store distilled receipts. It may not authorize connector secrets, install connectors, copy external UI, or write product styles.
- Hermes operator surfaces use the **Crystalline Cyberforest** mode defined in the Design Brain — a sibling mode of the same token system, scoped to Sean-only tooling. Operator aesthetics never leak into client-facing UI, and product rules (44px targets, dark-first, reduced-motion, WCAG 4.5:1) apply to operator UI too.

## 11. Open questions

> **2026-07-04:** all four items below are consolidated and **DECIDED** in `../hermes-agentic-os/open-questions.md` (this section maps: 1→Q7, 2→Q2, 3→Q3, 4→Q4) via Sean's delegation to Fable's proposed defaults. Residual gates that stay live: Q2 exact template TEXT is a per-template Sean yes at slice-4 start, and Discord send-authority remains per-send queued (no §7 amendment granted).

1. **Per-trainer operators (2026-06-18 decision):** when the role-scoped tool layer ships, which T2 allowlist entries extend to trainers, and does each trainer get their own audit lane? Proposed: yes — receipts partition by actor; Sean reviews trainer-lane receipts weekly at first.
2. **Discord alert taxonomy:** which event classes justify a T3 Discord post (deploy health, stale-client alert, lead capture)? Needs a template list before the alert broker is built.
3. **Approval expiry default:** proposed 24h for T3 approvals, single-use for T4 — confirm.
4. **Receipt retention:** proposed 90-day hot / archive after (matching `fusion-prune.mjs` convention) — confirm.
