# Hermes Agentic OS

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the operating manual for Sean's private operator brain
- **Companions:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` (boundaries, actors, T0–T4 effect ladder) · `../references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` (owners, decision labels) · `../references/FABLE-WORKFLOW-INTEGRATION-SPEC.md` (who plans this system)

---

## 1. What this is

The Hermes Agentic OS is a **governance-first operating system** for turning Sean's repeated workflows into something better than memory and willpower. It is a doc system, not a codebase: it defines the rules under which any automation in Sean's operator world is allowed to exist, and the ladder every workflow climbs before it earns autonomy:

> **repeated manual work → audited workflow → governed skill → gated automation → feedback loop → durable memory → visual command center → careful distribution.**

Every rung is earned, never assumed. A workflow that has not been done manually until boring does not become a skill. A skill without clean receipts does not become an automation. An automation whose prompt changes reverts to manual until re-approved. The system is designed so that six months from now, the answer to "why is this thing allowed to run at 6am and message Discord?" is a file in this folder, not an archaeology project.

Hermes itself is the **Sean-only command broker** defined in the operator bridge: it classifies incoming commands by effect tier, executes what it may, queues what it may not, and keeps receipts on everything. This folder is its constitution. Hermes consumes these docs; it never amends them.

## 2. Who consumes this folder

| Consumer | What it takes from here |
|---|---|
| **Hermes** | The command effect registry, approval-gate rules, receipt format, kill-switch inventory — the runtime law it enforces |
| **Fable** | Architect of record (registry Â§6); evolves levels 1â€“6, arbitrates classification disputes; uses `../references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` for bulky-context cost control |
| **Codex** | Hostile-review target list; attacks new automations against `approval-gates.md` and `audit-receipts.md` before they ship |
| **Claude Code** | Builder of implementation slices per `implementation-slices.md`; must honor the deterministic-vs-agentic boundary |
| **Browser Harness** | Its read-only-by-default policy and receipt obligations (bridge §6) as applied to OS-level QA runs |
| **AI Village** | Safety/governance review packets — the Village reviews THIS control layer for gaps, per the registry §9 |
| **Sean** | The only approver. The command center (`dashboard-command-center-spec.md`) is his cockpit; the kill switches are his brakes |

## 3. Load order

1. `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` — actors, boundaries, and the T0–T4 ladder (canonical; nothing here redefines it)
2. `./index.md` — the folder map and canonical/temporary/quarantined status of every file
3. `./agentic-os-principles.md` — the doctrine everything else instantiates
4. `./architecture.md` — the runtime picture
5. Then only the level or governance doc your task touches. Do not bulk-read the folder; the index tells you which file answers which question.

## 4. What this is NOT

- **Not a product feature.** Nothing in this folder ships to clients, trainers, or any public surface. The product's operator capability arrives through the role-scoped tool layer (bridge §2, boundary 2) — never through Hermes.
- **Not public.** Hermes is Sean's private lane. There is no "Hermes for users," and no doc here may be repurposed into one.
- **Not a shell.** No file in this system authorizes raw command execution through Telegram, Discord, the harness, or any chat surface. The 2026-04-18 lockdown is permanent posture.
- **Not an excuse to skip approvals.** "It's in the Agentic OS" grants zero authority. Tiers are assigned in the registry; unregistered commands are blocked; T3/T4 always queues for Sean. A doc describing an automation is a proposal until its gates, receipts, and kill switch exist.

## 5. The six levels

1. **Workflow Audit** (`workflow-audit.md`) — find Sean's real repeated work and classify it before anything is built.
2. **Skills → Automations** (`skills-to-automations.md`) — decide which proven skills earn a trigger, under which approval mode, with which failure route.
3. **Loop Engineering** (`loop-engineering.md`) — run logs feed improvement; changes are propose-only; drift is treated like a code change.
4. **Memory & State** (`memory-and-state.md`) — the three-brain model: Hermes working memory, the Obsidian/Karpathy long-term vault, SwanStudios Postgres as sole source of truth.
5. **Command Center** (`dashboard-command-center-spec.md` + `dashboard-button-registry.md`) — one visual cockpit where every button wears its tier badge and the kill switches are a first-class panel.
6. **Distribution & Voice** (`distribution-and-voice.md`) — the careful last mile: alerts out to Discord, optional voice in, never new authority.

The governance spine — `command-effect-registry.md`, `approval-gates.md`, `audit-receipts.md`, `kill-switches.md`, `deterministic-vs-agentic-boundary.md` — cuts across all six levels. Levels are how capability grows; the spine is why it stays safe.
