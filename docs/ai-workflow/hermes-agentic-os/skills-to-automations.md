# Skills → Automations (Level 2)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — which proven skills earn a trigger, and on what terms
- **Companions:** `./workflow-audit.md` (Level 1 — where candidates come from) · `./loop-engineering.md` (Level 3 — what run history does next) · `./command-effect-registry.md` (the registration a trigger presupposes) · `./approval-gates.md` · `./kill-switches.md` · `./headless-runner-spec.md` (what executes scheduled/triggered runs)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 1. The rung

A skill is a governed capability; an automation is that capability firing without Sean pressing anything. The gap between the two is where operator systems rot, so this level makes the gap explicit: **nothing automates without N clean manual runs, a registered command row, a named kill switch, and a receipt format already producing receipts.** The promotion ladder is manual → button → scheduled (`./agentic-os-principles.md` §10), and it runs both directions — this file defines both the climb and the fall.

## 2. Trigger types

| Type | Meaning | Fit |
|---|---|---|
| **Scheduled** | Clock-fired via the headless runner | Reports, digests, sweeps — work whose value is rhythm. The runner checks kill switches before every run (`./headless-runner-spec.md` §3) |
| **Event-triggered** | Fired by a detected event: deploy push, lead webhook, transcript-ready, queue expiry approaching | Work whose value is latency. Event source must be authenticated at its own layer; event *content* is untrusted input |
| **Manual-only** | Button or explicit command, forever | Anything in registry §12; anything whose judgment points (`./workflow-audit.md` §5) include a *gate* step at the top; anything Sean wants to feel himself doing |

Manual-only is a legitimate end state, not a failure to automate. Some workflows earn a button and stop there.

## 3. Approval mode by tier

The trigger decides *when* a run starts; the tier decides *what may happen without a human*. These never trade off against each other:

- **T0/T1 automations** run to completion unattended: reads and drafts, logged, output labeled DRAFT where applicable.
- **T2 automations** run unattended only within their standing allowlist row (bridge §7); anything outside the row's scope refuses and receipts the refusal.
- **T3/T4 producing automations** never execute their final step. The automation's job ends at **creating an approval-queue entry** with evidence attached (`./approval-gates.md` §2). A scheduled job that "just sends the alert because it's scheduled" is the exact failure this file exists to prevent.

## 4. Failure handling

1. **Bounded retry:** transient failure (timeout, 5xx) retries at most twice with backoff, all attempts receipted. No infinite loops, no silent retry storms.
2. **Dead-letter to the approval queue:** a run that exhausts retries lands as an **attention item** in the queue — not an approval request, an "a human should look at this" card with the failure receipt attached. The morning briefing surfaces it.
3. **Alert on repeat failure:** the same automation failing on consecutive runs escalates — attention item plus (once the Discord broker ships) a templated ops alert through its own gated path.
4. **Auto-demotion:** three consecutive failed runs demote the automation to manual — its trigger is suspended, its switch state untouched, and re-enabling the trigger requires Sean after the cause is found (`./architecture.md` §6). Trust is a balance, not a badge.

## 5. Logging requirements

Every automated run — success, failure, refusal, or skip — writes to the receipt stream per `./audit-receipts.md`: T0/T1 as log lines, T2+ as full receipts. Scheduled runs that *don't* fire (switch off, runner down) are logged as skipped on recovery; the digest's silence check treats a missing receipt as a failure mode, never a clean day. Redaction rules are the run-log rules (`./run-logs-and-self-improvement.md` §2).

## 6. Decision table (seeded from the Level-1 candidates)

Proposed states — each row is live only once its command row exists in `./command-effect-registry.md` and its switch exists in `./kill-switches.md` §4 (switch names not yet in that inventory are proposals under its §6).

| Skill | Trigger type | Tier | Approval mode | Failure route | Kill switch |
|---|---|---|---|---|---|
| Receipt digest | Scheduled (daily 06:00) | T0 | None (logged) | Retry ×2 → attention item | `SWITCH_RECEIPT_DIGEST` |
| Health sweep | Scheduled + event (deploy) | T0 | None (logged) | Retry ×2 → attention item + repeat-failure alert | `SWITCH_HEALTH_SWEEP` |
| Deploy-health watch | Event (deploy detected) | T0 | None (logged) | Retry ×2 → attention item | `SWITCH_DEPLOY_WATCH` (proposed) |
| Stale-client sweep | Scheduled (weekly) | T0 | None (logged; IDs only) | Retry ×2 → attention item | `SWITCH_STALE_CLIENT` |
| PLAUD review nudge | Scheduled (daily) | T0 | None (logged) | Skip + attention item | `SWITCH_PLAUD_NUDGE` (proposed) |
| Morning briefing | Scheduled (daily 06:05, after digest) | T1 | None; output DRAFT | Retry ×1 → attention item (a missing briefing is visible by itself) | `SWITCH_MORNING_BRIEFING` |
| Lead triage | Event (lead webhook) | T1 | None; draft response is DRAFT, sending queues as T3 | Dead-letter lead to attention item — a dropped lead is money | `SWITCH_LEAD_TRIAGE` (proposed) |
| Session-note filing | Event (redacted transcript ready) | T1 draft | Draft only; product write lands via trainer approval in-app | Dead-letter to attention item | `SWITCH_SESSION_NOTES` (proposed) |
| Weekly business snapshot | Scheduled (Sunday) | T1 | None; output DRAFT | Retry ×1 → attention item | `SWITCH_WEEKLY_SNAPSHOT` (proposed) |
| Content idea capture | Manual-only (Sean's message) | T2 | Standing allowlist (`memory-note`) | Refusal receipt | `SWITCH_MASTER` |
| Package/credit status check | Manual-only (button/Telegram) | T0 | None (logged) | Refusal receipt | `SWITCH_MASTER` |
| Stale-client follow-up **send** | Never automated | T3 | Queue entry per send, always | n/a — the queue is the path, not the fallback | dependent switches + `SWITCH_MASTER` |

## 7. The N-clean-runs rule

**Nothing acquires a trigger without N clean manual runs and a receipt format that already exists.** Defaults: N = 5 manual runs to earn a button, then 5 clean button runs to earn a schedule (mirroring `./workflow-audit.md` §5's boring-predictability bar). "Clean" means: outcome `ok`, no manual correction afterward, receipt complete with followable evidence. A prompt, scope, or tier change at any point resets the count and the approval (`./loop-engineering.md` §5). The count is read from receipts, not from memory — if the receipts can't prove five clean runs, there weren't five clean runs.
