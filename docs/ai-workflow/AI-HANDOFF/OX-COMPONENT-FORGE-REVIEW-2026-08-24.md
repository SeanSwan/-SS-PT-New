# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md
**Seed:** (none)
**Tokens:** 2002 in / 4968 out · **Cost:** ~$0.0000 · **Wall:** 191.2s · **finish:** stop

---

# Ox Alpha — Hostile Review: Swan Component Forge v0.1

Verdict up front so you can stop reading if you're fragile: **REVISE**. The architecture is directionally right, the sequencing has one genuine integrity problem, and the plan is missing the *governance* layer that determines whether catalogs live or die. Details below.

---

## Part 1 — Trying to break the headless-core + token-skin bet (§1, §5)

**Break #1: Two layers is the wrong number.** The plan claims "design it differently = swap a theme pack, not touch the component" (§1). That's false for any component where sites differ *structurally*, not just chromatically. Your own T2 list proves it: Nav/Sidebar (§2 T1) — one site wants a top nav, another wants a sidebar. A token cannot change DOM structure, focus order, or responsive collapse behavior. Same for Hero with "scroll-bound video variant" (§2 T2) — scroll-binding is *behavior*, i.e., headless-core territory, meaning your "headless core" already forks per variant. The honest model is **three layers**: headless core → **variant/composition layer** (structural variants as first-class catalog entries, sharing the core) → token skin. Until you admit this, every structural difference becomes a per-site fork done *outside* the catalog — which is exactly the drift R2 fears, just laundered.

**Break #2: "Dark-first with light derivation" contradicts the theming pitch.** §1 mandates dark-first with light *derived*. But theme packs are supposed to express arbitrary site identities — several of Sean's future sites will be light-native editorial designs (SwanGuard newsroom is the obvious one). Deriving light from dark produces washed-out, muddy light themes, and you'll fix it with per-site token overrides — again, forks outside the catalog. Drop the dark-first mandate at the catalog level; make it a property of theme pack #1 (`crystalline-swan`), not a law of physics.

**Break #3: Token tier ambiguity is R4 wearing a disguise.** §5 says "token schema is fixed (names/roles)." Fixed at which tier? If only global semantic roles (`--color-primary`, `--radius-md`), then all Buttons across all sites share one radius — packs become cosmetic reskins and Sean's "design it differently" fails. If component-scoped tokens (`--button-radius`), the pack authoring surface explodes combinatorially (~22 components × ~8 tokens each). You need the standard three-tier split — primitive / semantic / component-override — with the semantic set locked (~40–60 names, additive-only) and component tokens as *optional* overrides. This isn't stated anywhere in the doc and it's the single most consequential design decision in §5.

**Break #4: The tech stack leaks.** §1 cites styled-components as precedent. Runtime CSS-in-JS inside a shared package is a liability for future sites (SSR/RSC friction, duplicated runtime, version coupling across repos). Decide now: either the Forge goes zero-runtime (CSS modules / vanilla-extract / plain custom properties) or you accept styled-components as a permanent tax on every future consumer. Silence here becomes an accidental architecture decision.

**Break #5: Scope inflation in T2.** Pricing table, Testimonial row, Feature grid/bento, CTA band (§2 T2) are *marketing-site* organisms. Sean's demonstrated demand is AI/dashboard products (SS-PT, Jarvis, SwanGuard). Building ten T2 patterns upfront is speculative inventory. Apply a **rule of two**: nothing enters the catalog until a second consumer demonstrably needs it. T2 shrinks to Dashboard shell, Data-card cluster, Auth forms, Chart wrapper on day one; the rest wait for evidence.

**Break #6: Chart wrapper pins Victory (§2 T2).** Vendor lock inside a "canonical, forever" catalog. Keep the SafeChart boundary, put the charting lib behind an adapter interface so swapping renderers isn't a catalog-breaking event.

---

## Part 2 — Jarvis-first ordering vs. FIX-BEFORE-BUILD (§3, §6 Phase 3)

§3's argument is clever and mostly right: formalizing the contract *is* gate work, not a new capability. But there are two holes a hostile reviewer drives a truck through:

**Hole 1: "Landing in step with" (§6 Phase 3) is unfalsifiable mush.** The blueprint ruling is a strict ordering: F1/F3/F2/F6/F5 backend slices merge and pass acceptance *before* new Coach surfaces ship. "In step" invites the classic failure: frontend built against hand-written fixtures that silently diverge from the real Receipt Service, discovered at integration time. Replace with a hard gate: **Phase 3 frontend work may begin only after F1 + F3 are merged in SS-PT origin/main and pass an integration test suite; the Jarvis component runs against the live receipt service in a staging environment, not mocks.**

**Hole 2: Shipping the Jarvis UI at all is a capability surface.** Even a "demo" panel rendering "Verified ✓" from a fake oracle violates the spirit of F1 — it trains Sean and future users to trust a success signal with no oracle behind it. Rule: **the catalog Jarvis ships feature-flagged off in every consumer until the consuming backend passes the blueprint's gate acceptance tests.** The component can be *built* early; it cannot be *enabled* early. Write that into the component's spec receipt itself.

One more inversion worth naming: making the hardest, least-portable organism the *flagship* means catalog discipline gets proven on the most expensive artifact. Phases 1–2 partially defuse this — keep it that way, and resist any urge to pull Jarvis forward because it's exciting.

---

## Part 3 — R1–R5, answered concretely

**R1 (extraction cost):** Don't harvest-and-refactor — that's how entangled components get copied with their entanglements. **Rewrite-forward:** Forge components are written fresh against the token contract; SS-PT adopts them via strangler PRs (one component per PR, starting with Button). The Phase 0 harvest table (§6) becomes an *adoption priority list*, not a copy source. Hard rule: no component exists in both SS-PT-local and Forge form for more than one sprint.

**R2 (two-repo drift):** Kill submodules — they are drift-by-design (detached HEADs, forgotten bumps, exactly the failure class this project fights). Single source of truth = package dependency with lockfile pinning. Then add a **drift-linter CI job**: scan consumer repos for forbidden patterns (duplicate component filenames, raw hex colors outside token files, `var(--token, #fallback)` fallbacks that differ from the canonical default). Drift you can't lint, you can't prevent.

**R3 (N=1 portability):** Yes, it's premature — say so in the doc instead of gesturing at it. Mitigation: write the OpenAPI contract *first* (see Q3), generate TypeScript types from it, and test the component against a **contract-conformance mock server generated from the spec** (Prism/Schemathesis-class tooling), never hand-authored fixtures. Accept explicitly: v1 Jarvis is SS-PT-shaped; portability is *unproven* until a second backend implements the contract. Do not speculatively generalize capabilities for imaginary consumers — that's how N=1 contracts bake in SS-PT-isms *while claiming* to avoid them.

**R4 (token lock-in):** Answered by Break #3 above: three-tier tokens, additive-only semantic schema with a deprecation window, codemods for renames. The audit gate (§5 step 3) must check contrast on *resolved token pairs*, not raw values — a pack can pass per-token checks and still produce unreadable combinations.

**R5 (maintenance tax):** Make it finite and explicit: (a) rule-of-two admission, (b) semver with aggressive deprecation, (c) catalog work capped at ~20% of any sprint — if a site needs something now, it forks locally and schedules reconciliation rather than blocking the site, (d) **kill criteria**: any catalog component with zero consumers for two release cycles gets deleted. Catalogs die of bloat, not of bugs.

---

## Part 4 — Q1–Q3, answered

**Q1 (repo topology):** **Monorepo workspace** (pnpm/npm workspaces), `packages/swan-forge`, with SS-PT and SwanGuard as sibling packages. Atomic cross-cutting changes (a token rename touching schema + packs + components + gallery in one commit) are worth more than repo hygiene during this phase. Separate repo becomes correct only when an *external* consumer exists — revisit then. Submodule: rejected outright (see R2).

**Q2 (gallery as public marketing asset):** Not yet. A public gallery before Phase 4 commits you to marketing polish on an unstable catalog and leaks unreleased client work. Build it private-first with a per-page `public:` flag; flip it public only after the second-site proof (§6 Phase 4). The asset value is real; the sequencing in the doc is wrong.

**Q3 (minimum portable Jarvis contract):** Yes — ship it as an **OpenAPI file plus an AsyncAPI/streams descriptor** alongside the organism, versioned independently of the component (contract semver ≠ component semver). Minimum surface:
- `POST /intents` with `Idempotency-Key` header (F4/F6)
- `GET /receipts/{id}` and `GET /receipts?since=` cursor (F1)
- Server-side identity/target resolution endpoint (F3)
- Capability manifest endpoint consumed post-resolution (F2)
- Streaming proposal channel (SSE or WebSocket — pick one for v1; the transport belongs in the contract, see Break on streaming below)

---

## Part 5 — ADD: what a top component-platform team builds that this plan omits (absence-first, ranked by value)

1. **An adoption governance rule.** The plan has build phases (§6) but nothing forcing anyone to *use* the catalog. Without "all new UI comes from Forge or files a written exception," SS-PT keeps its local copies forever and the Forge becomes a museum. Zero code, highest leverage. *(Closes R1/R2 permanently.)*
2. **Contract-conformance test harness** — mock server generated from the OpenAPI file, run in CI against the Jarvis component. Makes Q3 operational instead of aspirational. *(Defuses R3.)*
3. **Visual regression + a11y audit as a matrix, not a checklist.** §1 audits components; §5 audits packs. Contrast and overflow failures emerge from *combinations*. Gallery must run screenshot-diff + WCAG audit across the full component × theme-pack matrix on every PR. The gallery (§4) is currently described as a preview; it must be a test gate.
4. **Theme surface-area statements per component.** Each spec receipt declares what is explicitly NOT themeable (structure, touch targets, focus behavior). This is what prevents R4 from rotting into per-site forks — it converts "swap tokens" from a hope into a bounded contract.
5. **Bundle/performance budget.** A shared package silently becomes a megapackage. Require per-component import paths (no barrel mega-import), state a KB budget per tier, and measure the Jarvis panel's hydration cost — it's the heaviest organism and will be embedded on every future page.
6. **Streaming transport ownership.** §2 lists "streaming display" as Jarvis behavior, but the plan never says whether the headless core owns the stream parser or the host app does. Put it in the contract (Q3) and the component spec, or every consumer reinvents backpressure/reconnect/error handling badly.
7. **Adversarial offline-queue fixture suite.** F4 enumerates six states; the plan implies happy-path coverage. Add fixtures for hostile sequences: verified-then-conflict, replay-after-failed, intent queued across a contract version bump.
8. **Deprecation & deletion policy** (folded into R5 above — write it down in §7 as a named mechanism, not a vibe).

---

## Verdict: **REVISE**

The bet is sound; the plan as written would still produce a beautiful catalog nobody is forced to use, a Jarvis component tested against fiction, and a token system that forks under pressure. Three highest-value changes:

1. **Hard-gate Phase 3 (§6)** on F1+F3 merged and integration-tested in SS-PT staging; Jarvis ships feature-flagged-off everywhere until the consuming backend passes blueprint acceptance. No mocks as success oracles. *(Resolves the §3/§6 tension with FIX-BEFORE-BUILD honestly.)*
2. **Monorepo workspace + strangler adoption rule + CI drift-linter** (answers Q1, kills R1 and R2, and gives the catalog teeth via mandatory consumption).
3. **Three-tier token schema + component×theme audit matrix in the gallery** (defuses R4, fixes the two-layer fiction in §1, and turns §5's pipeline from a taste exercise into a verified one).

Fix those three and this goes from "well-organized enthusiasm" to an actual platform. Bring me v0.2.
