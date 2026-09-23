# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-ARBITRATION-SANITIZED-2026-08-23.md
**Seed:** (none)
**Tokens:** 1927 in / 3433 out · **Cost:** ~$0.0000 · **Wall:** 128.3s · **finish:** stop

---

## VERDICT
REVISE — Commit to Position 1, but the document as written still leaves Constraint 5 unsatisfiable and Position 2's mailbox is a split-brain trap dressed as an option.

## BLOCKERS

1. **P1 — Constraint 5 is unsatisfiable as stated, under *both* positions, and the document never says so out loud.** The daily briefing requires the model; the model runs only on Machine A (§1, §2.3–2.4); Machine A is intermittently powered with non-functional remote wake. Whether the scheduler lives on A or B, when A is dark the fail-closed backend produces nothing. The job ledger converts "fires regardless" into "fires late via replay" — a different guarantee than the one written in §2.5. Neither §4 position claims otherwise honestly: Position 1's "interface always reachable" conflates *reachability* with *capability*. Evidence: §2.5 vs §3 first finding. The arbitration must restate Constraint 5 as "fire-and-replay with bounded staleness" or the acceptance test will fail on day one.

2. **P1 — Position 2 + optional mailbox is structurally split-brain, not optionally so.** If adopted, you get two writers to the ledger (Machine A's enqueue path *and* the mailbox), two homes for agent state (session/memory on A, message continuity on B), and no specified reconciliation protocol for when A boots with a drained-or-not queue. Evidence: §4 Position 2, "Optionally move only the chat poller… acknowledge and queue but never generate." There is no design text for who drains, who dedupes, or whose copy of conversational context answers a queued message. This isn't a cost line; it's a missing subsystem.

3. **P2 — Ack-before-persist data loss in the mailbox design.** Chat polling APIs with a single-consumer rule almost universally use offset-commit semantics: acknowledging an update marks it consumed platform-side. The document says the mailbox "acknowledges and queues" (§4) — in that order, a crash between ack and durable write silently destroys operator messages, and the one-consumer rule means nobody re-reads them. Must be persist-to-ledger-then-ack, and the document doesn't say which.

## ATTACKS

**Correctness**
- **Replay double-fire:** the ledger replays "when the model backend returns" (§3). If idempotency is enforced at enqueue-time only, a crashed-after-generate-but-before-recorded job replays and the operator gets two briefings. Idempotency must be checked at the *send* boundary, not the enqueue boundary.
- **Scheduler ownership still unstated:** §3 correctly finds a no-privilege account can't own system units, then neither position fixes it. Concretely: root performs a one-time install of the units; units run as the service account (`DynamicUser=` or `User=`); `Persistent=true` for missed-timer catch-up. Absent from both §4 positions.
- **Mesh VPN is "not yet joined" (§1)** — the entirety of Position 1 rests on infrastructure that has never carried a packet. If traffic falls back to a relay, inference streaming latency may be unusable; this is asserted nowhere.

**Security**
- **Ledger enqueue is a network-reachable influence surface.** Position 2 lets Machine A "enqueue allowlisted job types" — over what transport, authenticated how? If it's a bare HTTP endpoint, anything on the mesh can enqueue. Mesh-identity-authenticated or loopback-only; the document is silent.
- **Bot token residency moves to B under either mailbox or Position 1.** Acceptable (env of the no-privilege service account, not a dotfile), but worth stating since §1 currently implies it lives with the agent stack on A.
- **Browser harness on an always-on headless box** is a persistent unattended automation surface executing against live web services; combined with §2.6's human-ships-outward rule, the harness must be draft-only by construction, not by convention.

**Data-truth / schema drift**
- **Two enqueue clients, one ledger schema:** Machine A's enqueue path and the mailbox will be written by different hands at different times; field-name drift between them (and between either and the systemd tick consumer) is the classic failure. Define the ledger row schema once, in one migration file, before either client exists.
- **Dual-homed knowledge base (§6.4):** sync-tool dual-homing guarantees a window where retrieval answers from stale data with no way to detect it. One canonical copy, co-located with the retrieval code.

## HIGHEST RISK
The most dangerous item is Blocker 1: shipping on the belief that Constraint 5 is met when it is only met-late. Cheapest de-risk: before any porting work, run a 48-hour paper exercise — A powered off, manually walk one briefing through the ledger on B: timer fires → job claimed → inference endpoint unreachable → backoff → A returns → replay → generated → drafted for human ship (§2.6). If any step has no owner, you've found it for free. This also validates the mesh path end-to-end, killing two risks with one drill.

## CONFIDENCE
- **I cannot verify the chat platform's actual ack semantics.** My Blocker 3 assumes offset-commit-style consumption. If the API redelivers unacknowledged updates indefinitely, the failure mode changes from data loss to duplicate processing. One page of the bot API's polling docs settles it.
- **I cannot verify Machine B's real memory headroom.** 16GB with DB + headless Chromium + Node is tight but survivable *if* every unit gets `MemoryMax=` and the browser gets a hard cap; whether the specific database in play fits alongside a busy browser is unknowable from this document. The planned 32GB upgrade (§5) likely moots it — confirm it's funded, not aspirational.
- **I assumed the mesh VPN supports direct NAT traversal for the A↔B path;** if it is relay-only, Position 1's inference latency needs measurement before commitment.
- **House-rules check:** the document contains no frontend code, chart library, styling, or credential language, so the styled-components/Victory/palette/touch-target/WCAG/line-count rules have nothing to attach to. Zero-PIL/PII rule: satisfied (§ preamble is accurate — no identities or personal data appear). No "yoga/meditation" language; no "NASM-certified" phrasing. No violations to flag.
- **My own uncertainty:** I have taken a strong position (Position 1) on architectural grounds; a competent engineer could defend Position 2 purely on blast-radius grounds if the operator's real priority is minimizing the always-on attack surface rather than maximizing availability. The document never states which the operator values more — that is the one question whose answer could flip my verdict, and it is absent from §6.
