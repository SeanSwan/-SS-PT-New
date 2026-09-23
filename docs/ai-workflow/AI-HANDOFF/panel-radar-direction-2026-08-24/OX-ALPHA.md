# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-DIRECTION-PANEL-PACKET-2026-08-24.md
**Seed:** (none)
**Tokens:** 2968 in / 5280 out · **Cost:** ~$0.0000 · **Wall:** 195.4s · **finish:** stop

---

# GATE REVIEW — Panel packet: "always-on box: what should it actually DO?" (2026-08-24)

---

## (a) VERDICT

**REVISE** — the packet's central corrected architecture (§4a) is declared "coherent" while its terminal node (corpus → personal agent) has **no executable host** under the packet's own constraints (§1), its absence-claims rest on uncontrolled negative searches (§3), and several load-bearing assertions use speculative-success language with no named verified path.

*Note: the document provides section headers, not line numbers; citations below are §-grade, which is the finest granularity the artifact supports.*

---

## (b) Correctness attacks

**B1. The §4a architecture has no compute host for its most important leg.**
§1 establishes: box has no usable GPU ("no local inference is possible"), workstation is off and "cannot be woken remotely (exhaustively disproven)." §4a then makes "corpus feeds his personal agent" a first-class leg and calls it "most likely underspecified." Underspecified is the wrong diagnosis — it is **unhosted**. There is no machine in the stated fleet that can run the agent that reads the corpus. The packet flags the RAG-ban collision (landmine 2) but misses the prior, harder failure: even a greppable-pointer recall layer needs *something* to execute grep and the model call. This is a happy-path architecture diagram with a dangling sink.

**B2. Negative-evidence probes presented as proof.**
§3: "A search for the feed route returns nothing" → "the real path was never built." A grep for a route name is falsifiable by dynamic registration, a differently-named handler among the seven routes the control file *does* list, or a monorepo package outside search scope. Same for "four ingest modules return 0 LLM references": LLM calls via SDK wrappers, HTTP endpoints, or template-assembled prompts evade a literal-reference probe. These are hypotheses graded as verified facts, and downstream decisions (§4's whole fix plan) sit on them.

**B3. The scheduler role has no idempotency/overlap semantics.**
§4a reduces the box to "SCHEDULER ONLY" — and then specifies nothing about: overlap (job runtime > interval), missed-run catch-up, retry duplication, clock/DST behavior. §4 correctly mocks agents for lacking "idempotency, replay" and then proposes "run ingest on a timer from the box" with none of those properties named. Duplicate-ingest on retry is the predictable first bug.

**B4. Prune/copy race in the backup hub.**
§1: snapshots "copy nightly" and "retention prunes daily." If prune and copy windows ever overlap, prune can delete a snapshot mid-transfer → corrupted leg-1 copy that still reports success. "Fails closed on status-file write" covers one failure mode, not this race.

**B5. T2 approval flow is a hand-wave.**
"T2 — drafts ... he approves before sending. Approval plus receipt." No approval channel, no draft-staleness rule (client context changes between draft and approve), no double-send guard, no timeout, no audit trail. T2 is where the blast radius actually lives and it gets one sentence.

**B6. Off-by-one class: threshold governance has no tripwire.**
Landmine 2 cites a written re-decision threshold (~2,000 catalog rows / ~5,000 items) and concedes a growing archive "crosses that threshold fast" — but proposes no monitor, no alert, no counter. Governed thresholds that aren't wired to an alarm are decorative; the breach will be discovered retrospectively.

---

## (c) Security attacks

**C1. Zero-PII house rule vs. T1 digests — direct collision.**
House rule: zero PII to LLMs, IDs only. §4 T1: box "computes who is stale / low on sessions / has a session tomorrow, and sends him a digest." The moment any *judgment* step in that pipeline is model-mediated (which §4's own "agent judges" doctrine invites), client identities flow to an external model. The compliant design — deterministic SQL computes candidates, IDs only leave the DB, names resolved locally at render time into the chat message — is never stated. As written, T1 is a house-rule violation waiting for its first "summarize today's at-risk clients" prompt.

**C2. Multi-tenant/lane containment is asserted, not enforced.**
Partner lane: "Separate credentials, separate storage, separate assistant" (§4). But both lanes' schedulers land on the same box, likely the same Postgres instance (§1 says "one product's full schema, 61 tables" — where do the second product's and the partner's tables live? Unstated). Shared host = shared logs, shared cron output, shared alert pipeline, shared compromise domain. For a lane governed by an absolute child-data prohibition, "separate" must mean separate *instance or at minimum separate OS users + separate databases + no shared scratch paths*, and the packet never says which.

**C3. Browser automation relocation imports a credential store onto the box.**
§2.8: automation moves off the workstation to stop focus-stealing. Headless browsers that stay logged into third-party platforms mean persistent session cookies/credentials at rest on a co-tenanted, always-on host — plus ToS/ban exposure from automated access at one IP, which directly threatens the latency goal in §4a. Neither the secret-at-rest problem nor the ban risk is acknowledged.

**C4. Memory-ceiling constraint contradicted by the plan's own workload.**
§1: anything co-tenanted with the DB "needs a memory ceiling or a runaway process gets the database OOM-killed." The plan adds: continuous ingest, headless Chromium (notoriously unbounded), timers, and possibly an agent harness — with no cgroup/systemd slice budget named per service. First bad week: Postgres gets OOM-killed during a scrape burst, taking the production SaaS down. This is the most probable real outage in the plan.

**C5. Secret-handling gaps throughout.**
Chat-bot token (long-lived bearer, §4 channels), object-storage credentials pending for leg 2 (§1), DB read-only role credentials for T1 — none have named storage, rotation, or scope. "Agents get no sudo" governs humans-turned-agents but says nothing about the credential file the cron jobs themselves must read.

**C6. Inbound surface unexamined.**
An always-on box running sftp intake, a chat bot, timers, and browser automation is an attack surface; the packet contains no exposure statement (is it internet-facing?), no patch story, no fail2ban/allowlist posture. For a document whose subject is "what should the box do," "what can reach the box" is a conspicuous absence.

---

## (d) Data-truth / schema-drift (Rule 58)

**D1. Instance-level tenant drift.** §1 declares "one product's full schema (61 tables) — a single source of truth," while §2 describes two products plus a partner lane. Either the 61-table claim is stale or the other tenants' schemas are homeless. Which database, which instance, which migration owns the news-product tables — unanswered.

**D2. Frontend response-shape drift is guaranteed by the mock-data fix.**
~8 web modules consume mock fixtures (§3); the real feed endpoint doesn't exist (§3); therefore the fixture shapes are the *de facto* API contract, and nobody has ratified them. When the endpoint is built (§4 step a), shape drift between fixtures and handler is near-certain unless the fixtures are promoted to the contract explicitly. The packet's remedy — "structurally unreachable, not merely unused" — names no mechanism (build-time exclusion? flag deletion? type-level contract?) and is exactly the speculative language Rule 58 exists to catch.

**D3. Magic numbers as facts.** "~51 creators and ~39 sources," "40 snapshots, 5.3GB," "seven real route files" — presented as verified but with no query/probe artifact attached. Seed-count claims rot silently; these should carry their generating query.

**D4. PascalCase/snake_case-class drift:** the packet references `agentRuntime` (camelCase file) as a "control file" without stating what it controls relative to the snake_case-named ingest modules — a small instance of the naming-boundary ambiguity that produces real drift in the codebase it describes.

---

## (e) House-rule violations & speculative-success language

*(Styled-components / Victory / palette / touch-target / dark-first rules: N/A — non-UI artifact. Terminology bans ("yoga/meditation," "NASM-certified"): not present. ≤300 lines: N/A.)*

Speculative-success language without a named verified path:

| Claim | Location | Problem |
|---|---|---|
| "Mock data should then be structurally unreachable" | §4 | "Should," no mechanism |
| "Near-zero blast radius" | §4, T1 | Assertion; no failure-mode enumeration (mis-scoped read role? compromised chat channel?) |
| "the corrected version is coherent" | §4a | Self-certification; contradicted by B1 |
| "exhaustively disproven" (remote wake) | §1 | Rhetorical certainty on a load-bearing fact; WoL failures are typically BIOS/NIC-power-state issues and deserve a documented test matrix, since the entire box rationale rests on it |
| "beats both email and SMS" | §4, channels | Comparative claim with no criteria |

Also: the remit demands "disagree with the framing... a confirming answer is worth little," yet §4a opens by ratifying the owner's correction ("He corrected the framing, and the corrected version is coherent") — the packet models the exact confirmatory behavior it forbids the panel.

---

## (f) SINGLE HIGHEST-RISK ITEM

**The corpus → personal-agent leg has no execution environment (B1).**

§4a's corrected architecture terminates in a node that cannot run anywhere in the stated fleet: the box is banned from inference, the workstation is unreachable, and even the RAG-free "greppable catalog" alternative requires a shell and a model call *somewhere*. Every other risk in this review is a defect inside a buildable plan; this one means the plan's headline value proposition ("an agent that knows the news") is currently fiction wearing an ASCII diagram.

**De-risk before any build:**
1. Decide the agent's runtime model explicitly: either (i) **episodic invocation** — the box triggers a hosted-API agent run on schedule/event, holding no resident model process (compatible with §1's constraints, converts "24/7 agent" into "24/7 trigger"), or (ii) **kill the leg** until a host exists, and say so in the plan.
2. Write the one-paragraph runtime contract (who executes, what credentials, what memory slice, what the failure mode is when the API is unreachable) and attach it to §4a before this packet goes to build sequencing.
3. Only then resolve landmine 2 (RAG threshold) — it's meaningless to govern index size for an agent that has no runtime.

Runner-up, flagged because it compounds (f): the unbudgeted per-service memory ceilings on a 16GB host co-tenanted with production Postgres (C4) — that's the item most likely to cause an actual outage first.

---

**Summary judgment:** strong evidence discipline in places (backup fail-closed, ingest-probe controls), genuinely good instinct on the collect/judge split and the T1→T3 tiering — but the packet certifies an architecture whose endpoint can't execute, grades negative greps as proof, leaves its own scheduler without idempotency, and skirts the two collisions most likely to bite: PII-to-model in T1 and OOM-by-Chromium next to Postgres. Fix those six things and re-seat it.
