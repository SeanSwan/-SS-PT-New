# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/ATELIER-V2-COMFY-MCP-REVIEW-PACKET-2026-08-24.md
**Seed:** (none)
**Tokens:** 3741 in / 4660 out · **Cost:** ~$0.0000 · **Wall:** 176.5s · **finish:** stop

---

## VERDICT

REVISE — the architecture instincts (P1, P2, P7) are sound, but the proposal ships three unpriced landmines: an MCP/render-agent lifecycle collision, a licence-gate bypass hiding inside P3, and a P5 schema migration asserted as "highest-risk" with zero decision criteria or migration plan attached.

## BLOCKERS

1. **P1 — MCP server-lifecycle operations have no arbitration against the render agent.** Failure scenario: `render-agent.mjs` polls the queue and dispatches `generateVideo` → in-flight job hits `comfyuiLocal.mjs` → meanwhile the Doctor surface (P6) or an operator-triggered node install uses the MCP's documented **start/stop** capability → ComfyUI goes down mid-render → job fails → retry classification in `backend/scripts/handlers/generateVideo.mjs` misclassifies an infrastructure kill as a provider/content error, poisoning retry stats and possibly burning a paid partner-node call on re-dispatch. The transcript itself says "ComfyUI must be running for the handshake"; the proposal never states who owns the process lifecycle. Evidence: §3 (lifecycle claims), §4 P1/P6 — no arbitration mechanism named anywhere. Required: a process lock/lease owned by the queue layer; MCP lifecycle ops go through Hermes-style approval gates and refuse to stop while jobs are in flight.

2. **P1 — P3 routes paid partner nodes through Comfy Cloud credits, which structurally bypasses the fail-closed licence gate.** The existing invariant is explicit: "`SWAN_VIDEO_PROVIDERS_ENABLED` (provider on) and `SWAN_VIDEO_LICENCE_GRANTS` (a written grant arrived). Enabling never confers commercial rights." P3 says partner nodes "arrive through the *existing* provider contract with declared capabilities, licence terms" — but a per-generation credit balance is not a written grant, and Runway/BFL/Kling terms restrict commercial use differently per model. Failure scenario: Sean generates a hero video via a Kling partner node for a paying client site → output carries a non-commercial licence → takedown/legal exposure. The proposal never maps cloud-credit entitlements onto `SWAN_VIDEO_LICENCE_GRANTS`. This is a silent violation of the house rule *fail-closed licence gates* unless each partner provider ships with its own grant switch defaulting to OFF.

3. **P1 — Retry × pay-per-generation = double-spend with no idempotency story.** Failure scenario: partner-node call times out *after* Comfy Cloud bills the credit → `generateVideo.mjs` retry classification marks it transient → retry fires → second charge. §2.2 shows retry classification exists; §4 P7 shows a ledger honouring `spendGuard`; neither mentions idempotency keys or verify-before-retry for credit-burning providers. Every hosted provider added under P3 inherits this hole on day one.

4. **P1 — P5 declares itself "the highest-risk item" and then provides no decision criteria, no migration plan, and no FK inventory.** §4 P5 admits "an earlier handoff already flagged the queue's FK coupling against extractability" — and the proposal's entire response is a noun phrase ("multi-project is the schema change"). Failure scenario: `videoJobQueue`/`videoRenderJobService` tables gain a nullable `project_id`, backfill half-completes, Render Queue shows SwanStudios jobs under the wrong project, and the ContentStudioStorageMeter aggregates across tenants. A proposal that names its own highest risk and defers it is asking the panel to approve a blank cheque.

5. **P2 — Zero-PII rule is violated by construction in P4.** "describe -> brief (taste-steered from Swan Brain)" means Sean's project descriptions, client site names, and brand context flow into an LLM prompt path (and potentially through MCP tool calls). House rule: **zero PII to LLMs (IDs only)**. The proposal contains no redaction/tokenization layer between the brief composer and any model call. Failure scenario: brief containing a client's name/business details is sent to a hosted partner node's prompt endpoint → PII leaves the machine. Evidence: §4 P4; no mitigation anywhere in §4.

## ATTACKS

**Correctness**
- **Two divergent truths about the machine (P1/P6 drift trap):** MCP reports installed nodes/versions; `comfy-object-info.cache.json` is a static cache; the P2 manifest declares "required custom nodes." Three sources, no reconciliation loop. Stale cache + fresh MCP report = Doctor says healthy, adapter fails at dispatch. Drift-prevention mechanism (this answers §5.1): MCP introspection results must be **written back into the same manifest/registry the HTTP adapter reads**, making the manifest the single source of truth and the MCP merely a writer. If MCP facts live anywhere else, you have built the drift trap by hand.
- **VRAM floor is static in the manifest (P2) but the 5090 is a shared, serialized resource:** manifest says "VRAM floor X," queue runs job A (video) and job B (image upscale) concurrently or back-to-back with fragmented weights → OOM at dispatch, not at admission. Admission control must read *current* free VRAM, not declared floors.
- **Compose ladder lie (§5.3):** the describe→still→approve→animate rung implies the approved still is what gets animated. Image-to-video models re-frame, hallucinate limbs, and drift from the approved composition. If "approve" doesn't bind the exact artifact hash + graph + seed into the animation job, users will experience approval as a broken promise. Each rung must visibly show: price-before-run (P7 ✓), model/graph id, seed, expected runtime, and **the commercial-rights status of the output** (currently missing).
- **`comfyuiLocal.mjs` is at 296 lines against a 300-line cap.** Any P1-adjacent change (Cloud auth state surfacing, manifest reads) blows the cap. Split before touching, not after.

**Security**
- **IDOR via multi-project scoping:** `contentStudioRoutes.mjs` job-creation endpoints currently have no project dimension. Add `project_id` and every route becomes an IDOR candidate unless ownership checks are added in the same commit. Projects are Sean's IP for *other client sites* living inside the SwanStudios SaaS DB alongside trainer/client accounts — the role model must make studio projects operator-private by default, not "authenticated user visible."
- **Comfy Cloud credential handling (P3/P6):** the transcript notes Cloud authorization is "separate from being logged into the GUI" and needs its own auth flow. Where does that token live? Env var? Keytar? Plaintext in the MCP config block? Unstated. Also: MCP is a local service exposing server lifecycle + filesystem-touching install ops — anything that can reach the MCP port can stop production renders or install arbitrary nodes. Bind to localhost, require the same class of token auth as `renderAgentAuthService.mjs`.
- **SSRF surface via P3:** hosted-provider base URLs must come from `catalogue.mjs`, never from workflow JSON or MCP responses. An operator-supplied graph (which is the design!) must not be able to redirect generation calls at an arbitrary endpoint.
- **Rate-limit/DoS:** Compose invites rapid-fire generation against a single local GPU and metered credit balance. Per-project spend budgets (not just a global `spendGuard`) are missing from P7.

**Data-truth / schema drift**
- **Manifest field drift (P2):** manifest says `vramFloor`, `expectedRuntime`, `nodeBindingMap` — the registry reader (`registry.mjs`) and `comfyuiGraph.mjs` must consume these exact keys. Proposal gives no schema; first implementation will invent camelCase in TS and snake_case in the JSON, guaranteeing the classic drift. Publish the manifest schema in the same PR as the first consumer.
- **Frontend response-shape drift (P4):** Compose is a new tab hitting `contentStudioRoutes.mjs`; the hub's lazy-load/gate pattern (`requiresService`/`requiresFlag`) means a shape mismatch fails silently behind a gated tab — exactly the "ships no tab rather than a broken one" pattern inverted into "ships a tab nobody tested."
- **FK target drift (P5):** adding `projects` table — do jobs FK to `projects.id` or to a polymorphic `owner_type/owner_id`? Polymorphic FKs are unfalsifiable by the DB and will drift. Hard FK or nothing.

**House-rule violations / omissions in the document**
- P4 and P6 describe new UI surfaces with **zero** statement of styled-components-only, Victory-only, `var(--token,#fallback)` palette, Dual-Button Glow, 44px targets, dark-first, WCAG 4.5:1, or the 300-line cap. For a packet whose deliverable is "precise enough that a worker-bot builds it without asking follow-up questions," omitting the binding constraints guarantees the worker-bot reaches for MUI.
- No "yoga/meditation" language appears — compliant. Credentials language does not appear at all in this packet; when Compose copy is written, it must say "26+ years / NASM-protocol," never "NASM-certified."

## HIGHEST RISK

**P5 executed as schema surgery before the product exists.** §2.5 records the exact death pattern: honest slices that walk away from the original ask because no gate re-reads it. P5 is the most seductive way to repeat it — weeks of migrations, zero pixels Sean can click. Cheapest de-risk: **defer P5 entirely out of the first three slices**, and instead ship a one-page decision-criteria memo plus a read-only audit query enumerating every FK/column in the queue and artifact services that hardcodes SwanStudios identity. That audit converts "highest-risk item" from a vibe into a checklist, costs an afternoon, and blocks nothing.

## CONFIDENCE

What I could **not** verify from the document alone:

1. **The actual FK coupling.** §4 P5 cites "an earlier handoff" I cannot see. Whether extraction is a weekend or a quarter depends entirely on how many tables hardcode SwanStudios identity. Evidence that settles it: the audit query output above, or the migration files themselves.
2. **Whether the ComfyUI MCP exposes authentication at all,** and whether it runs in-process with the agent or as a sibling process. The transcript summary doesn't say. If it's an unauthenticated localhost socket, Blocker-adjacent risk rises sharply. Settle by reading the `comfy-mcp` source/config surface.
3. **Whether `openrouterImage.mjs` supports image-to-video input** (i.e., whether the Compose "animate the approved still" rung can reuse the shipped lane or needs a new adapter). The three-function contract suggests yes; nothing confirms the input type flows through.
4. **Partner-node licence terms per model.** I asserted non-commercial restrictions plausibly exist for Runway/BFL/Kling tiers; the specific terms per partner node are outside my knowledge and must be read from Comfy Cloud's current ToS before P3 ships. My Blocker 2 stands regardless — the *mechanism* (credit balance ≠ written grant) is the violation, independent of which specific terms apply.
5. **Line counts beyond those the packet cites** (296, 152, 167). I take those on faith; the 300-line-cap pressure on `comfyuiLocal.mjs` is therefore directional, not measured to the byte.

Where I'm deliberately uncertain, treat my severity calls on Blockers 2 and 3 as high-confidence-in-mechanism, medium-confidence-in-blast-radius — the fix is cheap either way, which is why they're blockers rather than attacks.
