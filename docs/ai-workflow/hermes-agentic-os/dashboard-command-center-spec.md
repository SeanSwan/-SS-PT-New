# Command Center Spec (Level 5)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** SPEC — static prototype exists at `./prototypes/hermes-agentic-os-command-center.html`; real build gated on Sean approval (registry §7 row)
- **Companions:** `./dashboard-button-registry.md` (every button's contract) · `./command-effect-registry.md` (what buttons may invoke) · `./audit-receipts.md` §5 (the digest this renders) · `./kill-switches.md` (the panel that matters most) · design language: **Crystalline Cyberforest**, defined in `../design-brain/design.md` (operator mode — never leaks into client UI, bridge §10)

---

## 1. What it is — and the one thing it is not

The command center is Sean's cockpit: one screen that answers *what is the system doing, what needs me, and what may I do about it* — in that order. It is a **window, not an engine**: every panel is a read-only view over the receipt stream, the approval queue, the switches file, and the registry. Every button invokes a registered command through the same broker every other channel uses. The dashboard holds **zero authority of its own** — unplug it and nothing loses governance; the queue still queues, the receipts still write, Telegram still works. If a feature can only be built by giving the dashboard its own write path, the feature is wrong.

Sean-only surface on the 5090, local, no public inbound ports (bridge boundary 6). Product rules still apply to operator UI (bridge §10): dark-first, 44px targets, WCAG 4.5:1, reduced-motion respected.

## 2. Layout

```
┌──────────┬──────────────────────────────────────┬───────────────────┐
│ LEFT NAV │  CENTRAL: COMMAND BRIEFING           │ RIGHT: NEEDS-YOU  │
│          │  (status → needs-attention → actions)│  Approval queue   │
│ Briefing │──────────────────────────────────────│  Kill-switch panel│
│ Skills   │  Skill / automation cards            │                   │
│ Queue    │  (tier badge · last run · switch dot)│                   │
│ Receipts │──────────────────────────────────────│                   │
│ Memory   │  Run receipts (daily digest render)  │                   │
│ Graph    │──────────────────────────────────────│                   │
│ Design   │  Memory/vault map · Graphify preview │                   │
│ QA       │  Design Brain · Harness QA · Village │                   │
│ Switches │  status strips                       │                   │
│ Voice ⏸ │                                      │                   │
└──────────┴──────────────────────────────────────┴───────────────────┘
```

**Calm operational hierarchy — status → needs-attention → actions.** The eye lands on system state first (green means scroll no further), then on what needs a human, then and only then on things to do. Alarm states earn color; routine states stay quiet. Nothing pulses for attention it hasn't earned.

## 3. Panels

| Panel | Data source (all read-only) | Notes |
|---|---|---|
| **Command briefing** | Latest `morning-briefing` artifact (runs/ lane) | Health headline, digest summary, open queue count, stale-client count, calendar placeholder |
| **Skill/automation cards** | Command registry + last receipt per command | Each card: name, one-line description, **tier badge**, kill-switch state dot, last-run outcome, next-scheduled (if runner-owned). Card action buttons per `./dashboard-button-registry.md` |
| **Approval queue** | Queue JSONL (`./approval-gates.md` §2) | Open entries as cards: action, tier, target, requester, evidence link, expiry countdown. Approve/deny per gate spec; T4 shows the two-step approve→arm state explicitly |
| **Run receipts** | Daily digest (`./audit-receipts.md` §5) | Counts by tier, attention lines (failed/refused/partial), silence check. Click-through to raw receipt |
| **Memory / vault map** | Vault lane index (see `./memory-and-state.md`) | raw/wiki/outputs/runs lane sizes + recent notes; read-only browse |
| **Graphify preview** | `graph-imports/` quarantine + promoted graph | Relationship preview; promotion stays a human-reviewed act outside this screen (registry §10) |
| **Design Brain status** | `../design-brain/` index | Current design.md version, adapters present, drift flags |
| **Browser Harness QA** | Latest harness receipts | Sessions, targets, outcomes; **Start supervised QA** button (T0 + human login, bridge §6) |
| **AI Village review** | Latest packet/verdict docs | Read-only; running the Village is never a button (rule 16 — registry §12) |
| **Kill-switch panel** | Switches file via `switch-status` | Every switch: name, state, `last-tested` age (stale >90d shows amber "presumed broken"). Flip controls per `./kill-switches.md` §2. **Master is the biggest, dullest, most reachable control on the screen** |
| **Local voice / Jarvis** | Placeholder strip | Greyed; links `./distribution-and-voice.md` §4. Ships as a label, not a promise |

## 4. Interaction rules (non-negotiable)

1. **Every actionable control wears its tier badge** — T0–T4, colored per the Design Brain's operator tokens, always visible, never tooltip-only. A button whose tier the operator can't see at rest is a spec violation.
2. **T3/T4 buttons open confirm modals** that restate action, tier, and target verbatim from the registry/queue entry. T4 modals implement the two-step approve→arm flow (`./approval-gates.md` §5) including retyping the target.
3. **Nothing hover-only.** Every action reachable by click/tap/keyboard; hover adds detail, never capability.
4. **44px minimum targets**, dark-first, reduced-motion fallbacks — operator UI honors the product bar (bridge §10).
5. **Disabled ≠ hidden.** A button whose switch is off or whose preconditions fail renders disabled with the reason inline ("SWITCH_DISCORD_BROKER is off"). Invisible capability is how operators build wrong mental models.
6. **No free-text command bar in v1.** Free text is Telegram's job, behind the broker's untrusted-input posture. The dashboard is buttons over registered commands — that constraint is the security model.
7. **Every button press that executes emits the same receipt any channel would** — `who: sean/command-center`. The dashboard gets no quieter logging than Telegram.

## 5. Prototype → real app

The static prototype (sibling agent, `./prototypes/hermes-agentic-os-command-center.html`) proves layout and hierarchy with placeholder data only. Graduation criteria (also `./open-questions.md` Q8): the receipt/queue scripts exist (implementation slice 2), the three first-ship buttons have registered commands behind them, and Sean has used the prototype long enough to reject at least one panel. The real v1 is a local read-only app + three buttons — not a platform. Scope beyond `./dashboard-button-registry.md` first-ship is a proposal, not a default.
