# Approval Gates

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — deep spec of bridge §7
- **Companions:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4 (tier ladder) + §7 (gate summary) · `./command-effect-registry.md` (what can be requested at all) · `./audit-receipts.md` (what every approval emits) · `./channels-and-brokers.md` (channel auth for the confirm phrases)

---

## 1. What an approval is

An approval is a **single, named, expiring permission** for one registered command against one target. It is not trust, not a mood, not a standing relationship. The moment the action, the tier, the target, or the prompt behind it changes, the approval is void. Sean is the only approver for T3/T4 (bridge §7); role-scoped product actions approved by a signed-in trainer are product auth, out of scope here.

## 2. Queue entry format

Every T3/T4 request — from any channel — becomes a queue entry before anything else happens. Stored append-only in the runs/ lane beside receipts (`./audit-receipts.md` §3); the command center renders the open set.

| Field | Content |
|---|---|
| `id` | `Q-YYYYMMDD-NNN` |
| `action` | Registered command name (unregistered → refused upstream, never queued). T4 human-maintenance intents use the reserved `manual-maintenance` registry row — an intent-class row the broker can queue, arm, and receipt but never execute |
| `tier` | From the registry row, echoed for the approver's eyes |
| `target` | Exact object acted on (client-id, Discord channel + template-id, service name). "Various" is not a target |
| `requester` | Actor + channel (e.g., `hermes/runner`, `sean/telegram`) |
| `evidence` | Pointer to why this action is proposed (report path, receipt id, briefing line) |
| `created` / `expires` | Timestamps; expiry defaults in §4 |
| `status` | `open → approved → armed (T4 only) → executed \| denied \| expired \| revoked` |
| `resolution` | Who resolved, via which channel, phrase/receipt pointer |

## 3. Approval channels

Exactly three, all authenticated at their own layer (bridge §5 — tier never substitutes for channel auth):

1. **Command center approval panel** — the primary lane. Entry card shows all fields + evidence link; approve/deny are 44px buttons behind a confirm modal that restates action, tier, and target verbatim.
2. **Telegram confirm phrase** — for when Sean is away from the desk. Approval requires the **exact-match phrase** `APPROVE Q-YYYYMMDD-NNN <action-name>` from an allowlisted chat-id. Anything else — paraphrase, emoji reply, "yes do it" — is not an approval; the broker answers with the exact phrase required. Inbound Telegram text is untrusted input (`./channels-and-brokers.md` §2); the exact-match rule is the injection defense.
3. **In-app proposal review** — product-surface approvals (trainer approves a Swan Coach draft) via app auth. These never touch the Hermes queue; they are listed here only so nobody builds a duplicate lane.

## 4. Expiry defaults (proposed — confirm in `./open-questions.md` Q3)

- **T3:** approval valid **24 hours**, single execution. Unexecuted after 24h → `expired`, re-request required.
- **T4:** **single-use and short-fused** — the approval exists only to enable the arm step (§5) and dies with it.
- **Standing T2 allowlists:** not queue approvals at all; enumerated in the registry with owner + review date (bridge §7). The queue never processes T2 — if a T2 command is asking for a queue entry, its tier is wrong.

## 5. T4 two-step confirm: approve + arm (authorization only — never execution)

T4 (destructive/financial/credential/deploy/irreversible — bridge §4) never fires off a single yes — and it never fires from the broker at all. **T4 is human-executed** (`./deterministic-vs-agentic-boundary.md`): the queue records intent and authorization; the keyboard act is Sean's.

1. **Approve** — Sean resolves the queue entry (`approved`). This unlocks nothing yet.
2. **Arm** — within **10 minutes**, Sean issues the separate arm confirmation **on a DIFFERENT channel than the approval** (approve in the command center → arm via `ARM Q-... <action-name>` in Telegram, or vice versa; the command-center arm modal forces retyping the target). The cross-channel requirement is what makes a single compromised surface insufficient — same-channel arm attempts are refused. Arm expires the approval whether or not the act follows: one arm, one window.
3. **Execute — Sean, at the keyboard.** The armed entry is his authorization record, not a trigger; the broker executes nothing at T4. The entry must carry the registry row's rollback pointer before it can be armed — no rollback pointer → the broker refuses to arm.
4. **Receipt** — the manual act is receipted against the armed entry id (who · what · target · outcome · rollback pointer), closing the loop.

## 6. What invalidates an approval (auto-revoke)

- **Scope drift:** target, parameters, or template differ in any way from the queue entry → revoked at execution time, receipt records the mismatch.
- **Prompt/definition drift:** the registered command's prompt, inputs schema, or tier changed after the entry was created (loop-engineering drift rules apply — see `./run-logs-and-self-improvement.md` §4) → all open entries for that command auto-revoke.
- **Kill switch flip:** flipping any switch the command depends on revokes its open entries.
- **Expiry:** clock runs out, entry closes itself. Fail closed — an entry whose expiry can't be read is expired.

## 7. Blanket-approval ban

"Do whatever's needed tonight," "approve everything from the runner," "you have my standing yes for alerts" — **invalid for T3/T4, always** (bridge §7). A broker receiving blanket language answers with the queue entries it actually holds, one at a time. The only standing permission that exists in this system is a named T2 allowlist row with an owner and a review date.

## 8. Worked examples (placeholder demo content)

**A — T3 Discord deploy alert.** Nightly `health-sweep` finds Render deploy amber. Runner creates `Q-20260703-001: discord-alert / T3 / target: #ops + template deploy-health / requester: hermes/runner / evidence: sweep receipt R-...-014 / expires +24h`. Morning briefing surfaces it. Sean, on phone, sends `APPROVE Q-20260703-001 discord-alert`. Broker validates chat-id + exact phrase, executes the templated post, emits a receipt with the Discord message id, closes the entry. Total elapsed authority: one message, one template, one channel.

**B — T3 client follow-up.** `stale-client-report` flags client 4471 (ID only). Sean clicks **Draft follow-up** (T1 button) in the command center; `draft-client-followup` produces a proposal. Sending it is client-visible → queue entry `Q-20260703-002: send via Swan Coach product endpoint / target: client 4471 / evidence: draft proposal id`. Sean reads the draft *in the entry card*, edits one line (edit re-stamps the entry — the approved text is the sent text), approves in the panel's confirm modal. The send travels through the SwanStudios API (bridge boundary 7), receipt carries the API response id.

**C — T4 storefront reseed (human-executed).** Bad package data needs `FORCE_RESEED`. Production data mutation → T4, so the broker's role ends at authorization. Entry `Q-20260703-003: manual-maintenance / T4 / target: storefront reseed (exact seeder command recorded) / evidence: the drift report / rollback: the pre-reseed row export path`. Sean approves in the command center. Nothing runs. Within 10 minutes he arms from the OTHER channel (`ARM Q-20260703-003 manual-maintenance` via Telegram). Still nothing runs — the armed entry is his recorded authorization. Sean then runs the seeder himself in the Render shell and files the receipt against the armed entry (outcome + rollback pointer). If he arms at minute 11: expired, start over — the fuse is the feature.
