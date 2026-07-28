# Headless Runner Spec

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — spec only; implementation is slice 5 (`./implementation-slices.md`)
- **Companions:** `./command-effect-registry.md` (its entire vocabulary) · `./kill-switches.md` (`SWITCH_HEADLESS_RUNNER` + per-command switches) · `./audit-receipts.md` (what every run emits) · `./skills-to-automations.md` (which commands have schedules at all) · `./channels-and-brokers.md` (the runner as a non-chat channel)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 1. What it is

The headless runner is the process on the 5090 that executes scheduled and event-triggered runs **without a chat session, a human, or a model improvising anything**. It is the dullest component in the system, and its dullness is load-bearing: every interesting decision was made earlier — at registration, at trigger-assignment, at approval — and the runner merely executes the residue. It is registered as a channel (`runner`) with the same standing as any other lane: its invocations carry `who: hermes/runner`, and the broker treats them with zero extra trust.

## 2. What it may run — and the hard negatives

- **Registered commands only.** The runner resolves a scheduled entry to a row in `./command-effect-registry.md` whose `channels` field includes `runner`. No row, no run — an orphaned schedule entry produces a `refused` receipt and an attention item, not a best guess (principles §8).
- **Never elevates tier at runtime.** The tier executed is the tier registered. If a T1 briefing run discovers something that wants a T3 action (an alert worth sending), it creates a **queue entry** with evidence and stops (`./skills-to-automations.md` §3). There is no "the situation justified it" path; situations justify queue entries.
- **No interactive shell capability at all.** The runner has no shell executor, no eval, no arbitrary-process spawn. Deterministic-script commands it runs are enumerated executables with declared arguments from the registry's `inputs` schema — the runner passes validated parameters to named programs, nothing else. This is not a restraint bolted on; it is the absence of the capability (bridge boundary 5 applied to the non-chat lane).
- **No novel composition.** The runner never chains commands that weren't registered as a chain. A workflow is either one registered command (which may internally be a script pipeline, registered as such) or it doesn't exist to the runner.

## 3. Run lifecycle

Five steps, in order, no step skippable:

1. **Acquire.** Take the per-command run lock (single concurrent instance per command; a second trigger while running is logged as skipped, not queued behind). Load the registry row fresh — a row that changed since scheduling (prompt hash, inputs, tier) aborts the run per the drift rules (`./loop-engineering.md` §5) and files an attention item.
2. **Switch check.** Read — fresh, never cached (`./kill-switches.md` §2) — `SWITCH_MASTER`, `SWITCH_HEADLESS_RUNNER`, and the command's own switch, in that order, before **every** run. Any off, or any unreadable: the run does not start, a `refused` receipt names the switch, fail closed (principles §11).
3. **Execute.** Run the command with its declared inputs. Timeouts are per-row (seed default: 5 minutes); a timed-out run is `failed`, killed, never left dangling.
4. **Receipt.** Emit the receipt per `./audit-receipts.md` §2 before the run is considered finished. If the receipt cannot be written, the run's effects are treated as suspect: the runner halts further scheduled work and raises the loudest attention item it has — an unaccountable runner is a stopped runner.
5. **Digest hook.** Append the run to the day's digest inputs (counts, attention lines, silence-check ledger). Runs that were scheduled but never started (switch off, runner down) are written as **skipped** on recovery — the silence check depends on skips being explicit (architecture §5).

## 4. Failure routing

Per `./skills-to-automations.md` §4, mechanically: transient failure → bounded retry (max 2, backoff, each attempt receipted) → dead-letter to the approval queue as an **attention item** with the failure receipts attached. Consecutive-run failure (default 3) → auto-demote: the runner suspends that command's schedule, receipts the suspension, and only Sean re-enables. The runner never "fixes" a failing command — not by widening inputs, not by retry-forever, not by skipping the failing step.

## 5. Idle and backoff behavior

- **Idle is quiet.** Between runs the runner sleeps against its schedule table; it does not poll external services "to stay warm," does not pre-fetch, does not speculatively execute. An idle runner's footprint is a timer and a lock file.
- **Backoff on infrastructure failure.** If the broker, receipt store, or switches file is unavailable, the runner backs off exponentially (seed: 1m → 4m → 15m → 60m cap) and retries *its own startup checks*, not the missed commands. Missed schedule slots during backoff are recorded as skipped, never batch-replayed — a 6am briefing has no business firing at 2pm because the disk came back (architecture §5: skipped runs are logged as skipped, not silently backfilled).
- **Clock discipline.** Schedule evaluation uses local time with UTC offset recorded in receipts; a clock jump beyond tolerance (seed: >5 min) pauses scheduling and files an attention item rather than firing whatever suddenly looks due.
- **Restart behavior.** On start: verify receipt-log consistency (replay tail, confirm last receipt is well-formed), reconcile the skipped ledger, *then* resume the schedule. No command executes before the receipt store is proven writable — step 4 is only trustworthy if it can't be skipped at boot either.

## 6. Schedule table

The runner's only configuration is a schedule table, itself governance-controlled (edits are T1 proposals applied by Sean, like registry rows):

| Field | Meaning |
|---|---|
| `command` | Registered command name — must resolve to a row whose `channels` includes `runner` |
| `cadence` | Cron-style expression or event name (`deploy-detected`, `transcript-ready`) |
| `timeout` | Per-run cap; overrides the 5-minute seed default if the row justifies it |
| `enabled` | Boolean, distinct from the kill switch: `enabled: false` is a scheduling decision, a switch is a brake |

Seed entries at slice 5 (per `./implementation-slices.md`): `receipt-digest` daily 06:00 · `health-sweep` daily 06:01 + on `deploy-detected` · `morning-briefing` daily 06:05. Everything else earns its row through `./skills-to-automations.md` §7.

## 7. Relationship to the chat lanes

The runner is deliberately *less* capable than Telegram, not equally capable minus the human: it cannot create registry proposals (`propose-command` is chat-only), cannot resolve queue entries in any direction, and cannot flip switches — including its own. If the runner needs something only a human-facing lane can do, that is by design working correctly: it files the attention item and waits. Symmetrically, nothing a chat lane does depends on the runner being alive; killing `SWITCH_HEADLESS_RUNNER` degrades the system to fully manual with zero loss of governance, which is the recovery posture for any runner anomaly that resists a quick diagnosis.

## 8. What done looks like

The runner is correct when a week of its receipts reads like a metronome: same commands, same outcomes, skips explained by switches, zero attention items — boring, per the Level-3 health metric (`./loop-engineering.md` §7). Acceptance criteria for the implementing slice live in `./implementation-slices.md`; nothing in this spec grants the runner existence until that slice ships with Sean's approval.
