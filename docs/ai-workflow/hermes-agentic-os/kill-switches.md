# Kill Switches

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the inventory the bridge §9 mandates
- **Companions:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §9 · `./command-effect-registry.md` (every row names its switch) · `./headless-runner-spec.md` (switch check before every run) · `./dashboard-command-center-spec.md` (switches are a first-class panel)

---

## 1. The three laws

1. **No switch, no ship.** An automation without a named kill switch documented at creation does not run — not in staging, not "just this once." The registry enforces this structurally: the `kill-switch` field is mandatory on every command row.
2. **Switches fail closed.** If the switch state cannot be read — file missing, corrupt, permission error — the automation does not run and writes a `refused` receipt naming the unreadable switch. An unreadable brake is a pulled brake.
3. **Switches are tested.** A switch nobody has flipped in 90 days is **presumed broken**. The test is trivial: flip it, watch the dependent automation refuse, flip it back, confirm receipts show both states. Untested switches are theater.

## 2. Mechanics (Windows 5090 runtime)

Switch state lives in one place: a local switches file (`~/.hermes/switches.json` — placeholder path pending implementation slice 2, `./implementation-slices.md`), one boolean per named switch, read fresh before **every** execution — never cached across runs. Flipping is a T2 act (`switch-flip` in the registry): via the command-center kill-switch panel, or the Telegram exact-match phrase `KILL <switch-name>` / `RESUME <switch-name>` from an allowlisted chat-id. Every flip emits a receipt and auto-revokes open approvals for dependent commands (`./approval-gates.md` §6).

The **master switches** are coarser and deliberately duller than the file:
- **Hermes daemon stop** — stopping the Hermes process/service on the 5090 halts everything Hermes brokers, no file read required.
- **Hooks disable** — disabling the Claude Code hooks in `.claude/settings.json` halts hook-driven automation on the dev surface.

Both masters work when the switches file itself is the problem. Neither touches product uptime — the SwanStudios app keeps serving clients with every operator switch pulled (bridge §9).

## 3. Inventory format

| Field | Meaning |
|---|---|
| `name` | `SWITCH_*` constant, unique, referenced verbatim by registry rows |
| `stops` | Exactly what refuses to run when off |
| `flip` | How to turn it off/on (panel, phrase, process stop) |
| `fail-closed` | What happens when state is unreadable (always: dependent commands refuse) |
| `owner` | Who is accountable for it existing and working |
| `last-tested` | Date of last verified flip; >90 days stale → presumed broken, flagged in the digest |

## 4. Inventory (seed — placeholder entries, `last-tested` starts empty until slice 2 lands)

| name | stops | flip | owner |
|---|---|---|---|
| `SWITCH_MASTER` | Every registered command except `switch-status` and `switch-flip` itself — the whole broker | Panel big-red · `KILL MASTER` · or Hermes daemon stop | Human/Sean |
| `SWITCH_HEADLESS_RUNNER` | All scheduled/triggered runs; the runner idles (checks this before *each* run — `./headless-runner-spec.md` §3) | Panel · `KILL HEADLESS_RUNNER` | Human/Sean |
| `SWITCH_TELEGRAM_BROKER` | Inbound Telegram command processing (bot may still answer "broker paused") | Panel · daemon config · or Telegram bot stop | Human/Sean |
| `SWITCH_DISCORD_BROKER` | All outbound Discord alerts, approved or not | Panel · `KILL DISCORD_BROKER` | Human/Sean |
| `SWITCH_BROWSER_HARNESS` | Harness session starts (running sessions end at next navigation) | Panel · `KILL BROWSER_HARNESS` | Human/Sean |
| `SWITCH_HEALTH_SWEEP` | The health-sweep automation | Panel · phrase | Deterministic Script owner |
| `SWITCH_MORNING_BRIEFING` | Briefing generation | Panel · phrase | Hermes |
| `SWITCH_STALE_CLIENT` | Stale-client report generation | Panel · phrase | Deterministic Script owner |
| `SWITCH_RECEIPT_DIGEST` | Digest rendering (receipts still *write* — only the view pauses; receipt writing has no switch by design, it is the one thing that must never be off) | Panel · phrase | Deterministic Script owner |

Note the deliberate asymmetry: **receipt writing itself has no kill switch.** If receipts can't be written, the executing command fails closed instead. An OS that can act without accounting for itself has no off switch worth trusting.

## 5. Test cadence

- Each named switch: verified flip **at least every 90 days** (the presumed-broken threshold). The receipt digest's switch-activity section makes staleness visible without anyone remembering to check.
- `SWITCH_MASTER` and `SWITCH_HEADLESS_RUNNER`: monthly, because they are the ones reached for during an incident, and incident time is the wrong time to discover a broken brake.
- Every test is two receipts (off-refusal observed, on-restored) — the test *is* its own evidence.

## 6. Adding a switch

New automation → new row in §4 *in the same change* that registers the command. The `./implementation-slices.md` acceptance criteria for any automation slice include: switch exists, fail-closed behavior demonstrated, panel shows it, first test flip receipted. A switch added after ship is a rule-1 violation that already happened.
