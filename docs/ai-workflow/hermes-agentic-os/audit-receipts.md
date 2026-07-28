# Audit Receipts

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the receipt format the bridge §8 mandates
- **Companions:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §8 · `./command-effect-registry.md` (per-command `receipt` field) · `./approval-gates.md` (queue lifecycle the receipts record) · `./run-logs-and-self-improvement.md` (what the receipt stream feeds)

---

## 1. Doctrine

**No receipt → the action didn't happen correctly, regardless of outcome.** A command that produced the right result but no receipt is a bug of the same severity as a command that failed: both mean the system can't account for itself. Post-incident review reads receipts first; an unreceipted action turns review into archaeology, and archaeology is exactly what this OS exists to abolish.

Receipts are for **T2 and above always**; T0/T1 write lightweight log lines in the same stream (same schema, `approved-by: n/a`). The cost of logging a read is trivial; the cost of not knowing what read a decision was based on is not.

## 2. Receipt format

One receipt per executed (or refused) command, fields fixed:

```
who        actor + channel            e.g. hermes/runner · sean/telegram · harness/command-center
what       command name + tier        e.g. discord-alert (T3) · health-sweep (T0)
target     exact object acted on      client-id, channel+template, service, file path — never "various"
when       ISO timestamp (local + UTC offset)
approved-by  queue-id + resolver for T3/T4 · allowlist row for T2 · n/a for T0/T1
outcome    ok | failed | refused | partial — with one honest line
evidence   pointer, not prose: log line ref, commit SHA, API response id, Discord message id,
           screenshot path, diff path. A receipt whose evidence can't be followed is incomplete.
```

The registry row's `receipt` field may require *additional* evidence per command (e.g., `qa-session-start` must attach the full harness receipt: URLs visited, actions taken, side effects observed — bridge §6). Refusals get receipts too: an unregistered command, a failed kill-switch read, a mismatched confirm phrase all produce `outcome: refused` records — the refusal trail is how injection attempts get noticed.

## 3. Storage

- **Where:** the vault **runs/ lane** — `runs/receipts/YYYY-MM/receipts-YYYY-MM-DD.jsonl` (machine line-per-receipt) with a sibling human-readable `receipts-YYYY-MM-DD.md` rendered by the digest job. JSONL is the source; the markdown is a view.
- **Append-only.** No edit, no delete, no rewrite. A wrong receipt is corrected by a *new* receipt referencing the old one's id. (Same posture as rule 45's no-amend discipline, applied to logs.)
- **Retention:** 90-day hot, then archive (proposed, matching the `fusion-prune.mjs` convention — confirm in `./open-questions.md` Q4). Archive is compressed and moved, never deleted, within the local vault.
- **Redaction at write time:** receipts obey rule 8 and the run-log redaction rules (`./run-logs-and-self-improvement.md` §2) — client IDs only, no secret values ever, evidence pointers instead of payload bodies.

## 4. Examples (placeholder demo content)

**T0 — health sweep (runner):**
```json
{"id":"R-20260703-014","who":"hermes/runner","what":"health-sweep (T0)",
 "target":"api.sswanstudios.com health endpoints + render deploy status",
 "when":"2026-07-03T06:00:11-07:00","approved-by":"n/a",
 "outcome":"ok — 5/5 green, deploy age 14h",
 "evidence":"runs/logs/2026-07/health-sweep-20260703-0600.log"}
```

**T2 — approval-queue move (Sean, Telegram):**
```json
{"id":"R-20260703-031","who":"sean/telegram","what":"queue-approve (T2)",
 "target":"Q-20260703-001","when":"2026-07-03T08:12:44-07:00",
 "approved-by":"allowlist: sean-only queue ops (bridge §7 standing T2 allowlist; contents pending open-questions Q1)",
 "outcome":"ok — Q-20260703-001 open→approved, exact-match phrase verified",
 "evidence":"runs/queue/2026-07/queue-20260703.jsonl#L9"}
```

**T3 — templated Discord alert:**
```json
{"id":"R-20260703-032","who":"hermes/discord-broker","what":"discord-alert (T3)",
 "target":"#ops · template deploy-health · fill: {status:amber, age:14h}",
 "when":"2026-07-03T08:13:02-07:00","approved-by":"Q-20260703-001 · sean/telegram",
 "outcome":"ok — posted within rate limit (1st of 5/day)",
 "evidence":"discord message id 118842...901"}
```

## 5. Daily receipt digest

The command center's **run receipts panel** does not show raw JSONL; it shows the digest that `receipt-digest` (T0, registered) renders every morning and on demand:

- **Counts by tier** — how many T0/T1/T2/T3/T4 in the last 24h (a T4 count > 0 is always a headline, never a footnote).
- **Attention lines** — every `failed`, `refused`, and `partial` receipt, one line each with its evidence pointer. Refusals cluster? That's an injection probe or a broken broker — either way, top of the digest.
- **Approval flow** — queue entries opened / approved / denied / expired, with median open→resolved time.
- **Switch activity** — any kill-switch flips (these are rare by design; each one is named).
- **Silence check** — automations that were *scheduled* to run but produced no receipt. Silence is a failure mode, not a clean day.

The digest is itself a T0 artifact written to the runs/ lane and linked from the morning briefing. Weekly, the digest gets a trainer-lane section once per-trainer operators ship (bridge §11 Q1; cadence in `./open-questions.md` Q7).
