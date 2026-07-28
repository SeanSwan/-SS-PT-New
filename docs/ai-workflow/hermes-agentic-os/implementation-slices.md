# Implementation Slices

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the ordered honest-slice plan; this file's numbering is authoritative where siblings reference a slice number
- **Companions:** `./agentic-os-principles.md` §12 (one honest slice) · `./command-effect-registry.md` (what each slice registers) · `./kill-switches.md` §6 (switch ships in the same change) · `./dashboard-command-center-spec.md` §5 (graduation criteria slice 3 satisfies) · `./headless-runner-spec.md` (slice 5's contract)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 0. Ground rules

No giant rewrite. Each slice is built, hostile-reviewed, receipted, and closed before the next begins; a slice that can't be verified completely is two slices. Every slice lands as repo-reviewable code (Rule 46 chain for substantial work; Rule 67 lane claims while pair-coding), ships its kill switch in the same change, and **requires Sean's explicit yes before it starts and before it is declared done** — these are operator-infrastructure changes; none ride a standing authorization. Builder/reviewer split follows the house pattern: one agent builds, the other runs hostile review; Fable arbitrates.

The T0 `fable-context-compression-estimate` utility is an adjacent cost-control command, not a runtime automation slice. It may run locally to estimate safe prompt-packet savings, but image rendering and model API proxying remain separate future slices under `../references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md`.

## 1. Slice 1 — Deterministic receipt + queue scripts

- **Objective:** the accounting spine exists before anything acts: receipt writer/reader, approval-queue store, daily digest renderer — pure scripts, no LLM, no triggers.
- **Planned files:** `scripts/hermes/receipt-write.mjs`, `receipt-digest.mjs`, `queue.mjs` (create/list/transition), vault `runs/` lane scaffolding + lane `index.md` files; tests beside each.
- **Risk:** low — local file I/O only; worst case is malformed JSONL, which the tests exist to prevent.
- **Tiers involved:** T0 (reads/renders), T2 (append receipt, queue transitions).
- **Acceptance criteria:** receipts match `./audit-receipts.md` §2 exactly incl. refusal receipts; append-only enforced (no update path exists); queue entries match `./approval-gates.md` §2 incl. expiry-closes-itself; digest renders counts/attention/silence sections from fixture data; redaction rules (`./run-logs-and-self-improvement.md` §2) applied at write.
- **Verification plan:** unit tests on schema + lifecycle transitions; a scripted end-to-end fixture day (N synthetic receipts → digest) diffed against a golden file.
- **Rollback:** delete scripts + scaffolding; nothing depends on them yet.
- **Human approval:** Sean approves scope before build; reviews the golden digest before close.
- **Builder / reviewer:** Claude Code builds · Codex hostile-reviews (attack the append-only claim and the redaction).

## 2. Slice 2 — Switches file + Telegram broker hardening

- **Objective:** the existing Telegram lane becomes registered-commands-only, and kill switches become real: switches file, fresh-read check, `switch-status`/`switch-flip`, exact-match approval phrases wired to the slice-1 queue.
- **Planned files:** switches store (`~/.hermes/switches.json` per `./kill-switches.md` §2) + `scripts/hermes/switches.mjs`; broker command-matcher hardening in the Hermes bot (registry lookup, unregistered → refusal receipt, allowlist re-verification); phrase handlers for `APPROVE`/`ARM`/`KILL`/`RESUME`.
- **Risk:** medium — touches the live bot; a matcher bug could refuse everything (acceptable, fail closed) or accept too much (not acceptable — the hostile review's target).
- **Tiers involved:** T0 (status), T2 (flips, queue moves); the broker itself carries T3/T4 *requests* into the queue only.
- **Acceptance criteria:** unregistered text from an allowlisted chat-id → refusal receipt, no action; unlisted sender → silence; every registered command checks `SWITCH_MASTER` + own switch fresh per invocation; unreadable switches file → refusal (fail closed demonstrated, not asserted); paraphrased approval → rejected with required-phrase reply; `hermes-telegram-safe` toolset posture unchanged (no shell/file tools reachable — re-verified, not assumed).
- **Verification plan:** live-test matrix from Sean's phone (registered/unregistered/paraphrase/unlisted via a second account) with the receipt stream as evidence; switch flip test per `./kill-switches.md` §5 (off-refusal + on-restored receipts).
- **Rollback:** revert bot to pre-slice build (systemd unit rollback); switches file removal disables nothing product-side.
- **Human approval:** Sean approves before touching the bot; the live-test matrix runs with him.
- **Builder / reviewer:** Codex builds (bot lane heritage) · Claude Code hostile-reviews against `./channels-and-brokers.md` §2 line by line.

## 3. Slice 3 — Command center v1 (three buttons)

- **Objective:** the local read-only cockpit with exactly three buttons: **health sweep (T0)**, **morning briefing (T1)**, **approval queue (T2)** — per `./dashboard-button-registry.md` §4, satisfying the graduation criteria of `./dashboard-command-center-spec.md` §5.
- **Planned files:** local app (LAN-only, no public ports) rendering digest/queue/switch panels from slice-1/2 stores; `health-sweep` + `morning-briefing` command implementations registered per `./command-effect-registry.md` §3.
- **Risk:** medium-low — read-only views over existing stores; the buttons invoke the same broker path as Telegram (no dashboard-private write path is the design constraint to defend).
- **Tiers involved:** T0, T1, T2 (queue approve/deny with confirm modal).
- **Acceptance criteria:** every button wears its tier badge at rest; disabled-with-reason states render; button press and Telegram invocation produce indistinguishable receipts (`who` differs, nothing else); queue approve on a synthetic entry executes the confirm-modal flow verbatim; kill-switch panel shows all switches with staleness; unplugging the dashboard changes nothing about governance.
- **Verification plan:** seeded synthetic queue entries + fixture receipts; side-by-side receipt diff (button vs Telegram); interaction-rule checklist from spec §4 walked item by item; a week of Sean actually using it before close (spec §5's "rejected at least one panel" bar).
- **Rollback:** stop the local app; zero coupling by design.
- **Human approval:** Sean approves the panel set before build and confirms first-ship buttons (`./open-questions.md` Q5).
- **Builder / reviewer:** Claude Code builds (design via `swan-design-router`, Crystalline Cyberforest mode) · Codex hostile-reviews the no-own-authority claim.

## 4. Slice 4 — Discord alert broker

- **Objective:** outbound templated alerts, template registry, rate limits, and the queue-approved send path (`discord-alert` row goes live).
- **Planned files:** `scripts/hermes/discord-broker.mjs`, template definitions (taxonomy from `./open-questions.md` Q2 — this slice is **blocked until Q2 is decided**), `SWITCH_DISCORD_BROKER` wiring.
- **Risk:** medium — first externally visible actor. Blast radius capped by templates + rate caps + per-send queue.
- **Tiers involved:** T3 (sends), T2 (queue mechanics), T0 (broker status).
- **Acceptance criteria:** off-template send is impossible (no code path, not a validation error); per-template and channel-wide rate caps refuse with receipts; inbound Discord events have no handler that reaches the broker (verified by code walk, per `./channels-and-brokers.md` §3); every send receipt carries queue-id + Discord message id; template edit voids its approval (`./loop-engineering.md` §5 demonstrated).
- **Verification plan:** test channel first; full worked-example-A flow (`./approval-gates.md` §8) end to end with Sean approving from Telegram; then the real ops channel.
- **Rollback:** `SWITCH_DISCORD_BROKER` off + revert; templates deregistered.
- **Human approval:** Sean approves each template individually (per-template standing approval of content) and each send during the trust-earning window.
- **Builder / reviewer:** Codex builds · Claude Code hostile-reviews inbound-authority-zero and rate-cap bypasses.

## 5. Slice 5 — Headless runner

- **Objective:** `./headless-runner-spec.md` implemented whole: lifecycle (acquire → switch check → execute → receipt → digest), bounded retry, dead-letter attention items, auto-demotion, skip ledger, backoff, restart consistency check.
- **Planned files:** `scripts/hermes/runner.mjs` + schedule table; first scheduled commands: `receipt-digest`, `health-sweep`, `morning-briefing` (already registered by slice 3).
- **Risk:** medium-high — the first thing that acts with nobody watching. Mitigated by its vocabulary (registered commands only, all ≤T1 effects at first + queue-entry creation) and by shipping with `SWITCH_HEADLESS_RUNNER` off until the soak test.
- **Tiers involved:** runner executes T0/T1; creates T2 queue entries; **never** executes T3/T4.
- **Acceptance criteria:** every spec-§3 step demonstrably unskippable (kill each dependency in test and observe refusal); unregistered schedule entry → refusal + attention item; 3-consecutive-failure auto-demotion fires; missed slots recorded as skipped, never replayed; receipt-store-unwritable halts the runner loudly; silence check catches a suppressed run in test.
- **Verification plan:** one-week soak with runner on and all commands T0 (digest + sweep only), receipts reviewed daily; then briefing added; metronome bar per spec §6 before close.
- **Rollback:** `SWITCH_HEADLESS_RUNNER` off (instant); process removal (complete).
- **Human approval:** Sean flips the switch on personally, both times (start of soak, post-soak resume).
- **Builder / reviewer:** Claude Code builds · Codex hostile-reviews fail-closed paths + clock/backoff edge cases.

## 6. Slice 6 — Voice placeholder

- **Objective:** the smallest honest version of `./distribution-and-voice.md` §4: local wake-word + STT on the 5090, vocabulary limited to T0 status queries and `memory-note` capture. Explicitly a placeholder — hardware decision pending (`./open-questions.md` Q6).
- **Planned files:** `scripts/hermes/voice-listener` prototype; `voice` channel registration (ceiling T0/T1 + the single T2 note path); command-center voice strip un-greys to "experimental".
- **Risk:** low in effect (ceiling does the work), real in posture — the review must prove the ceiling is structural, not configured.
- **Tiers involved:** T0/T1 requests; T2 `memory-note` only.
- **Acceptance criteria:** spoken approval attempts are refused with a pointer to real channels (tested with a recorded/synthesized voice, deliberately); device unreachable-broker → silence (fail closed); audio not retained past session buffer; transcript enters as untrusted input identically to Telegram text.
- **Verification plan:** adversarial audio test (playback spoof attempting `APPROVE …`); LAN-isolation check (no WAN route from the listener); receipt review of a week of casual use.
- **Rollback:** unplug it. The system was complete without it — that is the point of shipping it last.
- **Human approval:** Sean picks the hardware and approves the vocabulary list before the listener runs.
- **Builder / reviewer:** Claude Code builds · Codex hostile-reviews the spoof surface.

## 7. Sequencing law

Slices run in order; a later slice never starts to "unblock" an earlier one's gap. If slice N's soak finds a flaw in slice N−1, work returns to N−1 and the approval-reset logic applies to anything that depended on it. The plan's success metric is the same as the system's: by slice 5, the receipts are boring.
