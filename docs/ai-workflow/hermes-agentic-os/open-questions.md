# Open Questions

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the consolidated decision list for Sean; sibling docs cite these by Q-number, so numbering is stable (new questions append, never renumber)
- **Companions:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §11 (the bridge's open items, folded in here) · `./implementation-slices.md` (which slices each answer unblocks)
- **Law:** an open question is not a blocker for T1 doc work, but **no slice ships against an undecided question it depends on**. Proposed defaults below are Fable's recommendations; none is in force until Sean says yes. Grep this file for your topic before adding a duplicate.

---

## Q1 — T2 standing-allowlist contents

- **Question:** which commands sit on Hermes's standing T2 allowlist — the only unattended-write authority in the system?
- **Proposed:** exactly the four rows in the T2 table: `memory-note`, `queue-approve` + `queue-deny` (Sean-only channels), and `switch-flip`. (Briefing generation is T1 — no allowlist needed; receipt writes are part of every command's lifecycle, not a separate allowlist entry.) Nothing else, and the list carries an owner + review date per bridge §7.
- **Unblocks:** slice 1–2 close cleanly; registry §14 Q1 resolves.
- **Decision path:** Sean reads the four rows in `./command-effect-registry.md` §3 (T2 table) and confirms or strikes each individually — this is a per-row yes, not a list-level yes.
- **DECIDED 2026-07-04** (Sean blanket delegation to Fable's proposed defaults — "do all open recommended slices… we're gonna do what you recommend"): all four rows confirmed under the delegation — `memory-note` · `queue-approve` · `queue-deny` · `switch-flip` — each carrying owner + review date; nothing else on the allowlist. Any row remains individually strikeable by Sean at the first registry review.

## Q2 — Discord alert taxonomy

- **Question:** which event classes justify a T3 Discord post, with what template text, channel, and rate cap?
- **Proposed starter set (three templates, no more):** `deploy-health` (amber/red only — green is silence), `stale-client-threshold` (count crosses N, IDs never included), `lead-captured` (count + source, no lead details). Seed caps: 5/day per template, 10/day channel-wide.
- **Unblocks:** slice 4 (explicitly blocked on this) · `./channels-and-brokers.md` §3 (auto-send would require an explicit bridge §7 amendment — standing approvals are currently T2-only).
- **Decision path:** Sean approves each template's exact text and trigger condition individually (content approval only — every send still queues); send-authority graduation is a separate later yes that takes the form of a bridge §7 amendment, reviewed against slice-4 receipts.
- **DECIDED 2026-07-04** (delegation, PARTIAL): taxonomy + caps adopted — the three templates (`deploy-health` amber/red-only · `stale-client-threshold` count-only · `lead-captured` count+source) at 5/day per template, 10/day channel-wide. **Exact template text approval remains a slice-4 start gate** (per-template, individually, when the text exists). Send-authority NOT graduated — every send still queues per-send; no bridge §7 amendment.

## Q3 — Approval expiry defaults

- **Question:** how long does an approval live?
- **Proposed:** **24h single-execution for T3; single-use short-fused for T4** (approval exists only to enable the 10-minute arm window) — as written in `./approval-gates.md` §4–5.
- **Unblocks:** slice 1 queue implementation hard-codes these; changing later is a registry-grade change.
- **Decision path:** confirm both numbers, or set alternates; also confirm the 10-minute arm fuse.
- **DECIDED 2026-07-04** (delegation): 24h single-execution for T3 · single-use short-fused for T4 · 10-minute arm fuse — all confirmed. Hard-coded by slice 1 (`scripts/hermes/queueModel.mjs`); changing later is a registry-grade change.

## Q4 — Receipt and run-log retention

- **Question:** how long do receipts/logs stay hot?
- **Proposed:** **90-day hot, then compressed local archive, never deleted** (`./audit-receipts.md` §3, `./run-logs-and-self-improvement.md` §3), pruning by receipted deterministic script.
- **Unblocks:** slice 1 prune script; vault runs/ lane sizing.
- **Decision path:** confirm 90 days, or lengthen — shortening below 90 is not recommended (the quarterly registry audit reads this window).
- **DECIDED 2026-07-04** (delegation): 90-day hot, compressed local archive, never deleted — confirmed. Receipted prune shipped in slice 1 (`scripts/hermes/receipt-prune.mjs`; registry row proposed, pending Sean per registry §4).

## Q5 — First three buttons

- **Question:** confirm the command-center first ship: **health sweep (T0), morning briefing (T1), approval queue (T2)** in that order (`./dashboard-button-registry.md` §4; registry §14 Q3).
- **Unblocks:** slice 3 scope; everything else in the button registry waits for a week of clean receipts behind these three.
- **Decision path:** yes/no per button; a substitution restarts the slice-3 scope discussion, which is cheap now and expensive later.
- **DECIDED 2026-07-04** (delegation): yes to all three, in that order — health sweep (T0) · morning briefing (T1) · approval queue (T2).

## Q6 — Voice hardware

- **Question:** what physical device carries the wake-word layer — repurposed hardware on the LAN, a dedicated mic on the 5090, or nothing yet?
- **Proposed:** defer until slices 1–5 are boring; when chosen, the device must satisfy `./distribution-and-voice.md` §4 whole (local STT, LAN-only, no cloud assistant, audio not retained).
- **Unblocks:** slice 6 only — deliberately last.
- **Decision path:** Sean picks hardware; the vocabulary list gets its own yes before the listener ever runs.
- **DECIDED 2026-07-04** (delegation): defer, as proposed — no hardware chosen until slices 1–5 are boring. Hardware pick + vocabulary list remain Sean's own future yes (not delegable).

## Q7 — Trainer-lane receipt review cadence

- **Question:** when per-trainer role-scoped operators ship (Sean's 2026-06-18 decision; bridge §11 Q1), how often does Sean review trainer-lane receipts?
- **Proposed:** **weekly at first**, as a section of the receipt digest (`./audit-receipts.md` §5), relaxing only after a quarter of boring trainer lanes; receipts partition by actor from day one.
- **Unblocks:** the trainer-facing product slice (outside this folder) and the digest's trainer section.
- **Decision path:** confirm weekly; name the day (proposed: with the Sunday weekly business snapshot review).
- **DECIDED 2026-07-04** (delegation): weekly, Sundays with the weekly business snapshot review; receipts partition by actor from day one; relax only after a quarter of boring trainer lanes.

## Q8 — Command-center graduation

- **Question:** when does the command center stop being a static prototype and become a real local app?
- **Proposed criteria (from `./dashboard-command-center-spec.md` §5):** slice-1/2 scripts exist and are receipting; the three Q5 buttons have registered commands behind them; Sean has used the prototype long enough to reject at least one panel. All three true → slice 3 may start.
- **Unblocks:** slice 3 start date.
- **Decision path:** Sean declares the third criterion met (it is his to judge); Fable verifies the first two from receipts and the registry, evidence cited.
- **DECIDED 2026-07-04** (delegation): the three graduation criteria are adopted as written. Criterion 3 ("Sean has used the prototype long enough to reject at least one panel") stays Sean's live judgment at the time — the delegation covers the criteria, not the judgment.

---

## Answered-question protocol

When Sean decides a question: record the decision inline here (one line, dated, "DECIDED:" prefix), update the sibling doc that proposed the default, and if the decision changes a registered command's shape, the approval-reset rule applies (`./loop-engineering.md` §5). Questions never get deleted — a struck-through decided question is the cheapest institutional memory this folder has.
