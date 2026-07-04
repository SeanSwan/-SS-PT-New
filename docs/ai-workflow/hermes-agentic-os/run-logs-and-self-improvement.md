# Run Logs & Self-Improvement

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — what gets logged, how it stays safe, and how it feeds Level 3 without feeding on itself
- **Companions:** `./audit-receipts.md` (receipts — the structured spine of the log stream) · `./loop-engineering.md` (what the patterns become; the drift rules referenced in §4) · `./memory-and-state.md` §2 (the runs/ lane inside the vault folder law) · `./headless-runner-spec.md` §3 (the runs that write most of this)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 1. What is logged, and where

The **runs/ lane** of the vault is the system's flight recorder. It holds, per `./memory-and-state.md` §2 and `./audit-receipts.md` §3:

- `runs/receipts/` — the receipt JSONL stream + rendered daily markdown views. The structured record: who/what/tier/target/outcome/evidence for every T2+ action, lightweight lines for T0/T1.
- `runs/logs/` — per-run execution logs the receipts point *into*: command stdout/stderr (redacted, §2), timing, retry attempts, HTTP codes, the prompt-version hash for LLM steps.
- `runs/queue/` — approval-queue history: every entry's full lifecycle transitions (`./approval-gates.md` §2), append-only.
- `runs/digests/` — the daily digest artifacts and the skipped-run ledger the silence check reads.

Everything here is **append-only** (a wrong entry is corrected by a new entry referencing the old id) and machine-first: JSONL sources, markdown renders. What is deliberately *not* logged: prompt inputs containing untrusted free text beyond what validation retained, response bodies from product APIs (the receipt keeps the response *id*, the payload stays in the product), and anything §2 strips.

## 2. Redaction at write time

Logs are written redacted, not redacted later — a log that briefly contained a secret is a leak with a cleanup step:

- **No secret values, ever.** No API keys, tokens, JWTs, DB URLs, key-shaped strings, or env values in any log line (rule 44/59 posture). Where a run must prove a credential was present, it logs presence + length class ("key loaded, 51 chars"), never the value.
- **No client PII.** Client references are IDs only (rule 8); names, emails, and contact details never enter the runs/ lane. If an upstream API response contains them, the log keeps the response id and drops the body.
- **No transcript content.** PLAUD/session material stays in its local-private, redaction-first pipeline (`./memory-and-state.md` §6); run logs may record "transcript 8841 parsed, 14 sets, contract v-hash…" — never quoted speech.
- **Untrusted free text is truncated and fenced.** Where an input must be logged for debugging (a refused Telegram message, a failed template fill), it is length-capped, stored as data in its own field, and never rendered into an executable or prompt context by any downstream consumer.
- A redaction failure discovered in a written log is an incident, not a cleanup: new correcting entry, source fixed, occurrence noted per rule 59's response pattern.

## 3. Retention

**90-day hot, then archive** (proposed default, matching receipt retention — confirm in `./open-questions.md` Q4). Hot logs are grep-able and digest-visible; archives are compressed, moved within the local vault, and never deleted. Nothing in runs/ syncs to any cloud, any repo, or any other machine — the flight recorder lives inside the LAN ring (architecture §4). Pruning is a deterministic script's job (the `fusion-prune.mjs` convention), itself receipted.

## 4. Self-improvement policy

The receipt stream is allowed to make the system better, on exactly these terms:

- **Skills propose improvements from receipt patterns as T1 docs.** The signal classes (correction clusters, failure clusters, refusal clusters, dead automations) and the proposal templates are defined in `./loop-engineering.md` §2/§6; proposals land in the vault outputs/ lane, get linked from the morning briefing, and expire unreviewed in 30 days.
- **NO self-modification without human apply.** No skill, agent, or runner edits its own prompt, contract, inputs, schedule, tier, or template — the change is a repo diff Sean (or the review chain, for T0/T1 rows per registry change control) applies. This is `./loop-engineering.md` §3 stated as log policy: the logs are *evidence for* proposals, never *authorization of* changes.
- **Drift rules are loop-engineering's, not restated here.** Prompt-version pinning, diff-like-code review, scope-as-part-of-version, and the approval-reset rule (an approved automation whose prompt/scope/tier changes reverts to manual until re-approved) live in `./loop-engineering.md` §4–§5. This file's contribution is the enforcement hook: **receipts carry the prompt hash, so drift is detectable from the logs alone** — a hash mismatch between receipt and registry is an alarm the digest surfaces, and open approvals for the drifted command auto-revoke (`./approval-gates.md` §6).
- **Improvement of the logs themselves follows the same law.** A proposal to log more, log less, or change retention is a T1 proposal against this file — the flight recorder's format doesn't drift either.

## 5. What feeds what

The one-glance dependency map — every arrow is a read, never a write-back:

```
runs/receipts ──► daily digest ──► morning briefing ──► Sean
     │                │
     │                └──► silence check · switch-staleness flags · attention lines
     │
     ├──► Level-3 pattern review ──► T1 improvement proposals (outputs/ lane) ──► Sean applies
     │
     └──► quarterly Fable registry audit ──► suspend/flag rows (command-effect-registry §4)

runs/queue ────► approval panel + expiry sweeps
runs/digests ──► trend lines (weekly look) ──► trainer-lane section (once Q7 ring exists)
```

Nothing downstream mutates the stream it reads — the recorder records, consumers consume, and the only way log evidence changes system behavior is through a human-applied proposal. That single direction is what makes the whole Level-3 loop auditable end to end.

## 6. Reading cadence

Logs that nobody reads rot into liability. The standing cadence: the **daily digest** is read by Sean (or at minimum lands in the morning briefing, which he reads); **attention items** are reviewed as they arrive via the queue; **weekly**, the digest's trend lines (failure rates, refusal clusters, switch staleness, silence-check hits) get one deliberate look — this is also where trainer-lane receipts get reviewed once that ring exists (`./open-questions.md` Q7); **quarterly**, the Fable registry audit reads receipts against rows (`./command-effect-registry.md` §4). The health target is `./loop-engineering.md` §7's: the cadence should keep confirming that everything is boring — and the day it isn't, the logs are already the investigation.
