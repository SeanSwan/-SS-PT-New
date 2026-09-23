# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-ARBITRATION-SANITIZED-2026-08-23.md
**Seed:** docs/ai-workflow/AI-HANDOFF/RADAR-FABLE-SEED-2026-08-23.md
**Tokens:** 4350 in / 7485 out · **Cost:** ~$0.4178 · **Wall:** 113.0s

---

## VERDICT
REVISE — I ratify the pull-lease architecture (B owns mailbox/ledger/scheduler, A pulls leased inference jobs) but **overrule the consensus framing**: this is not "corrected Position 1," it is Position 2 with the mailbox made mandatory — Grok and Sol converged and the seats should stop calling it an inversion, because "invert residency" invites porting the whole desktop stack to B, which is exactly the migration nobody has evenings for; CLIs/browser harness stay on A, KB gets one canonical copy on B, and the design as seeded ships with three unspecified failure semantics that will bite.

## BLOCKERS

1. **P0 — Split-brain poller at cutover.** State: mailbox deployed on B; Machine A later powers on and its old agent stack auto-starts (systemd/user service or subsystem autostart). Two consumers on one bot token → the chat API delivers each update to whichever poller wins the race. Operator messages vanish intermittently and non-reproducibly — the worst possible failure profile. Evidence: §2 constraint 2 ("Two pollers fight over updates"); §4 Position 2's mailbox is labeled "optional," and no seat specified decommissioning of A's poller. Fix is one line: rotate the bot token at cutover so A's old poller holds a dead credential even if it resurrects.

2. **P0 — Lease semantics are entirely unspecified.** Scenario: A leases the daily-briefing job, begins generation, operator powers A off mid-job. With no lease TTL/heartbeat/requeue, the job sits in `leased` forever; the briefing silently never fires again — reintroducing the exact availability failure the ledger was supposed to kill (§3, finding 1). The seed says "leased inference jobs" with zero mechanics. Required: lease TTL, heartbeat, requeue-on-expiry, and idempotency key checked at *both* lease-grant and result-commit.

3. **P1 — Duplicate outbound delivery on replay.** A completes a job, posts the result to B, the ack is lost, A retries after reboot → operator receives the briefing twice, or worse, a drafted outbound message is sent twice. §3 mandates idempotency keys for *execution* but nobody extended them to the *send* path. Send must be idempotent on (job_id, result_hash), and per §2 constraint 6, anything outward-facing needs the human gate enforced in the ledger state machine (`drafted` → human → `sent`), not in convention.

4. **P1 — OOM co-tenancy kills the source of truth.** If the operator's §5 wish is honored (CLIs + headless Chromium + Node on 16GB B alongside the ledger DB), a browser memory spike gets the DB OOM-killed. Pre-consensus, B held nothing critical; post-consensus, B holds the *single source of truth*, so this failure is strictly worse than before the migration. Ruling on §5: harness stays on A until (a) 32GB is physically installed, (b) the harness runs in a container/systemd unit with `MemoryMax`, and (c) someone answers whether the harness is LLM-driven — if the brain on A drives it, hosting it on B buys nothing while A is off anyway. Port forwarding does solve OAuth; RAM and blast radius are the real disqualifiers, so the "headless OAuth is disqualifying" reviewer is wrong for the right conclusion.

5. **P1 — Stale-briefing pileup.** A is off for four days; four briefing jobs queue; A powers on and delivers four stale briefings. No seat specified a staleness policy. Ledger needs per-job-type semantics: `coalesce-latest` for briefings, `run-all` for genuinely idempotent work.

6. **P2 — Scheduler ownership is "agreed" but not operationalized.** §3 correctly states the no-privilege account can't own systemd units without root-enabled lingering, but the consensus design never names who runs `loginctl enable-linger` once, on which box, for which unit. Unstated = will be done wrong.

7. **P2 — Job-type allowlist unspecified (Grok's surviving objection — see ATTACKS).**

## ATTACKS

**Correctness.**
- The seed's claim that the pull model resolves everything is happy-path. Every failure mode listed in Blockers 2/3/5 is a crash-or-wrong-output path the consensus doesn't touch.
- Schema drift over time: A can be off for weeks. If the ledger's job schema migrates while A sleeps, A wakes with an old worker and misparses new rows. Version-stamp the job schema; worker refuses jobs with a newer schema version rather than guessing.
- KB ruling (seed Q4): **one canonical copy on B, mandatory.** Writes happen where the runtime/ledger lives; the reader on A gets a one-way B→A read-only replica with a version stamp, or reads over the mesh at retrieval time. Bidirectional sync between an always-on box and an intermittently-powered box is split-brain by construction — dual-homing with a generic sync tool is rejected outright.

**Security.**
- **Grok's dissent is ~90% dissolved but a real residue survives:** pull-vs-push is only a security improvement if job payloads are *typed and allowlisted*. A generic `exec`/`run-command` job type makes B a command source with extra steps — anyone who compromises B (the internet-adjacent, always-on box holding the bot token) owns A the next time it polls. Required: closed enum of job types, payload schema validation on A before execution, no free-form shell.
- The bot token migrates to B — the more-exposed machine. It must be readable only by the mailbox unit's account, not the shared no-priv service account, and rotation (Blocker 1) doubles as hygiene.
- Enqueue authz: if anything that can message the chat bot can enqueue arbitrary job types, that's queue poisoning + disk-fill DoS. Chat-originated enqueues must map to a narrower allowlist than A-originated ones; cap queue depth.
- Browser harness inside the mesh VPN is an SSRF pivot: pages it loads can reach mesh-internal services. Another reason it stays off B (or gets network-namespaced) — no seat raised this.
- House rules: no UI code, no credential claims, no "yoga/meditation" language present — no violations. One tension worth logging: the "large personal knowledge base" flows to the LLM; local-only inference is the mitigating control, and fail-closed (no cloud fallback) is what keeps the zero-PII-to-external-LLMs posture intact. That makes fail-closed a *security* property, not just a preference — one more reason Qwen's "relax the no-inference constraint" is correctly discounted.

**Data-truth / schema drift.**
- Idempotency-key format must be pinned in one place; two implementations (B's granter, A's worker) drifting on key derivation silently defeats dedup.
- Result-blob shape between A's worker and B's sender is an interface contract nobody wrote down — define it before slice one, or the first briefing renders as raw JSON in chat.

## HIGHEST RISK
**The zombie poller on A after cutover (Blocker 1).** It corrupts the interface intermittently, only when A happens to be on, and looks like "the chat platform is flaky" — you will chase it for weeks. Cheapest de-risk, doable in ten minutes before any migration work: **rotate the bot token, give the new token only to B's mailbox, and `systemctl disable` + mask the old poller unit on A.** Total cost near zero; eliminates the P0 class permanently. (Smallest first slice, seed Q5, builds from there: token rotation → mailbox on B that acks-and-queues → single-table SQLite ledger with idempotency key and lease TTL → a ~100-line pull worker on A for the briefing job only. Persona, CLIs, harness, KB replication all deferred. Two evenings.)

## CONFIDENCE
Things I could not verify from the document, and what would settle each:
- **"Sending is not polling" for this specific bot API.** §3 asserts it; plausible for Telegram-style APIs, but per-token rate limits or webhook-vs-polling exclusivity could break the mailbox-acks-while-A-sends split. Settle with the platform's API docs for concurrent `send` from two hosts on one token.
- **Whether the chat platform supports webhooks at all** — if yes, the "one poller" constraint may be escapable entirely and the design simplifies. Nobody checked.
- **Mesh VPN viability from a NAT'd desktop subsystem** (this smells like WSL2). Outbound-only pull over plain HTTPS+mTLS to B may be more reliable than a mesh client inside the subsystem; settle with a one-evening connectivity test before betting the design on the mesh.
- **Whether the browser harness is LLM-driven or script-driven** — this single fact decides §5 more than the RAM debate does, and no seat established it.
- **KB size vs 217GB disk and its write patterns** — determines whether the B→A replica is rsync-trivial or a real problem.
- **The Qwen discount is taken on the seed's word.** The 27B-in-16GB claim is indeed wrong (a Q4 27B is ~16GB weights alone before KV cache), so the discount looks earned, but I'm trusting the seed's account of what Qwen said, not Qwen's actual output.

My uncertainty is lowest on the architecture ruling itself (the pull-lease design dominates both original positions on every stated constraint) and highest on the two platform-specific facts (send-vs-poll semantics, webhook availability) — either of which, if they break my way, would simplify the design further rather than invalidate it; if they break the other way, Blocker 1's token rotation is still the correct first move.
