# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (medium)
**Document:** ./SWAN-DECISION-PACKET.md
**Seed:** (none)
**Tokens:** 2631 in / 14632 out | **Cost:** ~$0.2274 | **Wall:** 429.4s | **finish_reason:** stop

---

# DECISIONS — Kimi K3

---

## DECISION 1 — H3 licensing: File. Build hosted now. Wan 2.2 proceeds. Nothing waits on legal.

**The call, three parts:**

1. **File the US licensing request this week.** The asymmetry is total: the cost of filing is one email; the cost of not filing is the permanent closure of the lane Sean called "of extreme importance." Hosted is *sufficient for the workflow* but not for the *requirement* — and the requirement isn't really dollars (200 clips/mo hosted ≈ $40–110, trivial). It's **supply-chain independence**: hosted providers deprecate, reprice, and change ToS; granted weights on his 5090 can't be revoked by a vendor roadmap. That justifies the email by itself.
2. **Build the hosted lane now** — H3 API first (cheapest per hero, same model family as the local target so prompts/params transfer), Seedance 2.5 second as a registry entry only after its terms are verified. Nobody owns this lane and it is the only video lane that is legal, unblocked, and fast *today*. The convergence loop needs hosted speed; the local lane's real product is overnight batch. Both stated goals get served: hosted for iteration, local for volume.
3. **Wan 2.2 proceeds as the agent-MVP target, immediately.** The provider contract (submit/poll/cancel/capabilities) means H3-local is a *drop-in provider entry* after the grant arrives, not a workstream. Waiting on a legal queue of unknown duration is the only losing move. (Guard: confirm Wan 2.2's license file in-repo before the first client deliverable.)

**Cost if wrong:** Grant denied → one email lost; Wan 2.2 + hosted carry production. Hosted lane built "unnecessarily" → a few days of creator Claude's time + trivial spend. The inverse choices (don't file, don't build, wait) each cost more than their savings.

**Facts only Sean holds — decide around them:**
- **Legal entity name + country/state of registration** (application field)
- **Distribution scope**: internal / client-delivered / public (application must describe it)
- **Human-review commitment**: the product is admin-only and Sean *is* the reviewer, so the honest answer is yes — he must confirm it stays that way for H3 output
- **Revenue attestation** under $20M/yr, in writing
- **Monthly hosted cap number**: mechanism is decided — fail-closed, per-job estimate at submit, hard stop at 100%, warn at 80%, resets monthly UTC. Default **$50/mo** unless Sean corrects the *number* (not the mechanism).

**First concrete action:** Sean fills two bracketed fields and sends this:

```
To: <REDACTED_EMAIL>
Subject: MiniMax H3 licensing - authorization request

Requesting authorization to deploy MiniMax H3 locally for commercial use in the United States.

Entity: [LEGAL ENTITY NAME], registered in [STATE/COUNTRY]
Annual revenue: under USD $20M (attested — [NAME, DATE])
Use case: H3 runs on a single local workstation (RTX 5090) as one provider
inside an internal creative tool. Admin-only access, single operator. All
output is human-reviewed before any publication or client delivery.
Compliance controls, built or in build:
 - "MiniMax H3" attribution displayed in the product UI wherever H3 output appears
 - Server-side spend caps; per-job provenance records (provider, model version, license snapshot)
 - No use of H3 outputs to train or distill any model
Distribution scope: [internal / client-delivered / public — describe]

Happy to accept additional conditions.
```

One extra ruling: display the "MiniMax H3" attribution for **hosted** H3 output too — uniform, cheap, satisfies the stricter case.

---

## DECISION 2 — Post the correction now. Append-only, pushed immediately.

**The call:** Yes, into `.ai-workflow/coordination/review-queue.md` today — not noise, because two of its items land *inside work creator Claude is doing right now*: the 768p error would get baked into capabilities metadata being shaped in Slice 3/4 (fixing data later = a migration), and the hosted-lane gap is a **sequencing decision they will make the moment Slice 3 ends**. The note must arrive before they pull Slice 4. The queue is the sanctioned async channel; using it mid-slice is what it's for.

**Cost if wrong:** they lose five minutes at a checkpoint. Cost of silence: wrong ceiling in schema, hosted lane unplanned for another full cycle, FIRST LIGHT handoff arrives cold.

**First concrete action — the note, verbatim:**

```
## 2026-08-11 — H3 corrections + hosted-lane proposal (design-brain worktree, per K3 decision packet)

1. CORRECTION (capabilities metadata): H3 local ceiling is NOT 768p. On 32GB,
   ComfyUI dynamic offloading runs the 2K model; INT8 pruned (~21GB) is the
   community default; 8s clips ≈ 2–14 min. If Slice 3/4 writes capabilities
   rows: local maxRes = 2K (offloaded), hosted = 1080p. Not 768p.

2. LICENSING (confirms your Slice 9 block): US/EU/UK/SK carve-out verified.
   Sean is filing the application this week. Keep Slice 9 blocked. Wan 2.2
   stays the agent-MVP target — no idle waiting on legal.

3. GAP + PROPOSAL: no slice covers the hosted lane. Propose inserting
   "Slice 3.5 — hosted provider adapter (H3 API)" between Slice 3 and agent
   MVP: submit/poll/cancel/capabilities, server-to-server (no agent),
   deterministic R2 keys + idempotent complete per your design, spend cap
   enforced at submit (fail-closed). Depends only on Slice 3. Rationale:
   exercises the job table + contract with the simplest possible provider
   before the home agent adds leasing/heartbeat complexity; gives Sean usable
   video this week at ~$0.64/8s-1080p hero. Agent MVP unchanged, follows.
   If you disagree, say so here and it goes to Sean.

4. CONTRACT ADDITION (small): capabilities need an `attribution` string field.
   H3's license requires "MiniMax H3" displayed prominently in commercial UI.
   Cheap now; retrofit touches every surface.

5. REQUEST (rides your in-flight migration): add estimated_cents /
   actual_cents INTEGER columns to the job table in Slice 3's migration so
   the spend gate needs no second migration. Pricing config lands from my
   lane as a neutral module; enforcement is one import at your submit route.

6. INCOMING (no action yet): FIRST LIGHT Create-surface input — token
   substrate + interaction spec + compiler API contract — lands before
   your Slice 5.
```

Transport ruling: both worktrees share this filesystem — append the note to **both** copies of the queue (coordination files are the standing carve-out from Rule 67; append-only, coordination path only), commit on my branch, and push the coordination commit **immediately**, exempt from batch-push. Sean ratifies or reverses that exemption.

---

## DECISION 3 — Build (a) B7 token substrate now. (c) is not mine to build. (b) follows, contract-first.

**The call:** **B7 typography/grid token substrate, starting today.** Then the prompt-compiler brain + `GenerationRecord`, with its **API contract shipped first** so creator Claude's Slice 5 and my brain proceed in parallel. The hosted lane (c) lives in `backend/services/contentStudio*` — creator Claude's owned path; my entire share of (c) is the queue note above plus one neutral pricing-config module (`providerPricing.mjs`: model → cents/sec by resolution, fail-closed cap semantics). Anything more violates Rule 67.

**Reasoning:** Substrate before surface — my prior finding, HY3's concurrence, and the standing constraints (`var(--token, #fallback)`, no raw hex, dark-first, 44px, AA) are all literally B7's spec. It is wholly in my lane, it is the *first* input Slice 5 needs from me, and every surface built before it gets rebuilt after it. One unification move: **the tokens adopt creator Claude's landed 414/768/1024 breakpoint matrix** so both lanes render the same geometry.

**Cost if wrong:** if the compiler contract was more urgent, creator Claude stubs one call for days — small. Had I picked (b): Slice 5 built on ad-hoc hex, rebuilt — larger. Had I picked (c): lane violation, merge collisions, broken trust between agents — worst, avoided.

**First concrete action:** `tokens/` package — primitives + semantic tiers for type scale, spacing, grid; CSS custom properties with fallbacks; dark-first Crystalline Swan; breakpoints 414/768/1024; every file under the 300-line cap. Then the compiler API contract doc.

---

## What changed in my prior recommendations

- **"Hosted video exists and is well-built" → wrong; it was a facade.** Deletion stands. My B6 instinct (job state machine, not registry entry) is confirmed and is now their Slice 3.
- **FIRST LIGHT "routes around both risky unknowns" → one unknown is gone.** Hosted video is not risky; it's unblocked and cheap. Gemini-still-first stands; the *follow-on* is now hosted video, not "wait for local."
- **Spend-gate ambiguity (cost-gate.mjs reuse) → resolved:** enforcement at submit in creator Claude's routes (their architecture), shared pricing config in a neutral module, CLI `cost-gate.mjs` stays CLI-only.
- **GenerationRecord → upgraded:** must share lineage with their job table (`jobId`, deterministic R2 keys) and gains `provider`, `modelVersion`, `licenseSnapshot` fields — see lawsuit below. Rejection-signal capture goes from "cheap now" to **compliance infrastructure**.
- **"Replayable, not deterministic" → affirmed** by their at-least-once + idempotent-complete design. Taxonomy (~60 facets) and backend→CLI→MCP: unchanged.

## What nobody has named yet

1. **Slice 3 is being built with no safe database.** Local `DATABASE_URL` points at PRODUCTION and creator Claude is *right now* writing `FOR UPDATE SKIP LOCKED` leasing, a sweeper, and a migration. That logic cannot be responsibly exercised against prod. **P0: a disposable Postgres (docker or a $7 dev instance) before the job-table migration runs anywhere.** Only Sean can provision credentials — named fact.
2. **Coordination transport vs. batch-push.** If `review-queue.md` syncs only via git at batch end, corrections arrive after the next slice is pulled. My immediate-push exemption is a patch; Sean needs to ratify the protocol.
3. **Migration sequence collisions.** Two branches adding migrations concurrently will collide at merge. Claim numbers via the queue; name a merge-time owner. (Item 5 in my note already avoids one collision.)
4. **The Disney/Universal/WB suit is a design requirement, not trivia.** If platforms or regulators demand provenance, per-asset license snapshots are the difference between a config change and a rebuild. Also: the $20M threshold is dynamic — re-attest annually.
5. **The local lane's product is overnight batch.** At 10–30 min/clip serial, Queue — with agent-health status and honest ETAs — is the primary local surface, and the convergence loop must default to hosted. IA copy should say so.
6. **Seedance 2.5 terms are unverified.** Registry entry only; nothing on the critical path until pricing, ToS, and commercial rights are checked. Same lawsuit exposure.
7. **The decision record is decaying.** Linear blocked, ~11 commits uncaptured. Commit this packet as `docs/decisions/2026-08-11-h3-hosted-lane.md` — when Linear unblocks, nobody will reconstruct the *why* from SHAs.
