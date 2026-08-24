---
decision: Swan Component Forge — canonical, themeable component catalog across all Sean's sites; Jarvis Coach panel as flagship organism; v0.2 integrates Ox Alpha's REVISE findings; RATIFIED by Sean 2026-08-24 (all 6 decisions, see §8)
status: ratified — build pending (Phase 0 next)
supersedes: none
---

# Swan Component Forge — Canonical Component Catalog (v0.2 — post-Ox revision)

**Date:** 2026-08-24 · **Author:** Claude (Fable 5) · **Hostile review:** Ox Alpha (`stealth/ox-alpha`), verdict **REVISE** → integrated here. Full review: `docs/ai-workflow/AI-HANDOFF/OX-COMPONENT-FORGE-REVIEW-2026-08-24.md`
**Context:** Sean builds multiple sites (SS-PT, SwanGuard, future client sites). Goal: ONE ultimate version of each recurring component, re-skinned per site instead of rebuilt. Flagship: the Swan Coach AI brain ("Jarvis panel") — every future AI site needs one.
**Status:** PLAN ONLY — awaiting Sean's ratification. No build starts before that (Rule 15).

## 1. Architecture: THREE layers (revised per Ox Break #1)

1. **Headless core** — behavior only: state machines, keyboard/a11y, focus management, data contracts, offline/error states. Written once, never forked per site.
2. **Variant/composition layer** — structural variants as first-class catalog entries sharing the core (top-nav vs sidebar; static hero vs scroll-bound-video hero). Tokens cannot change DOM structure or focus order; variants can. Without this layer, structural differences become per-site forks done outside the catalog.
3. **Token skin** — presentation via CSS custom properties (color, type, radius, depth, motion tier). Per-site theming = a theme pack.

**Token schema is three-tier (per Ox Break #3):** primitive → **semantic (locked, ~40–60 names, additive-only, deprecation window + codemods for renames)** → optional component-level overrides. The audit gate checks contrast on *resolved token pairs*, not raw values.

**Dark-first is a property of theme pack #1 (`crystalline-swan`), NOT a catalog law** (per Ox Break #2) — light-native packs (e.g., SwanGuard editorial) are first-class. Rule 3 continues to govern SS-PT's own pack.

**Styling runtime — DECISION FOR SEAN (Ox Break #4):** Ox recommends zero-runtime styling (plain custom properties / CSS modules / vanilla-extract) for the shared package instead of styled-components, to avoid SSR/version coupling on every future consumer. SS-PT stays styled-components internally either way. My recommendation: agree with Ox — Forge components style via plain CSS custom properties; SS-PT wraps them without friction.

**Chart wrapper:** keep SafeChart boundary; charting lib behind an adapter interface (Victory is the SS-PT adapter, not a catalog pin) (Ox Break #6).

**Non-negotiable per-component spec receipt:** 44px targets, WCAG 4.5:1 audited on resolved pairs, `prefers-reduced-motion`, responsive 320→3840px, loading/empty/error states, blueprint header + tests, **and a theme-surface statement: what is explicitly NOT themeable** (structure, touch targets, focus behavior) (Ox add #4).

## 2. Catalog tiers — admission by RULE OF TWO (Ox Break #5)

Nothing enters the catalog until a second consumer demonstrably needs it. Day-one scope:
- **T1 Primitives (~12):** Button (GlowButton discipline), Card (SheenCard chrome / low-motion data variant), Input/Select/Textarea, Modal/Drawer, Nav (variant: top/side), Tabs, Pill/Badge, Toast, Table, Avatar, Skeleton, Icon-button.
- **T2 Patterns (day-one, evidence-backed):** Dashboard shell (role-tabbed), Data-card cluster, Auth forms, Chart wrapper, **Hero variants (promoted per D6 — passes rule-of-two: SS-PT homepage + SwanGuard front page; includes the scroll-bound-video variant)**. **Waitlisted until a second consumer exists:** Pricing table, Testimonial row, Feature grid/bento, CTA band, Footer.
- **T3 Organisms:** **Jarvis Coach Panel** — chat lane + command lane + context anchor + receipts UI + proposal review + offline intent queue + streaming display; role-parameterized.

## 3. Jarvis is a CONTRACT with a hard gate (revised per Ox Part 2)

The 2026-08-23 Swan Coach panel blueprint (GLM final, ruling FIX BEFORE BUILD) defines the contracts: Receipt Service as sole success oracle (F1), server-owned identity (F3), post-resolution capability gate (F2), `409 TARGET_MISMATCH` re-anchor (F12), durable offline intent queue (F4), proposal transactions (F6), `undoable=false` default (F13).

**Hard gate (replaces "in step with"):** Phase 3 frontend work begins only after **F1 + F3 are merged in SS-PT origin/main and pass integration tests**; the Jarvis component is verified against the **live receipt service in staging, never mocks-as-oracle**. Until the consuming backend passes the blueprint's G-gates, the catalog Jarvis ships **feature-flagged OFF in every consumer** — a demo rendering "Verified ✓" from a fake oracle is itself an F1 violation. This is written into the component's spec receipt.

**Portable contract (Q3, per Ox):** ship an OpenAPI file + streaming descriptor alongside the organism, versioned independently (contract semver ≠ component semver). Minimum surface: `POST /intents` with `Idempotency-Key`; `GET /receipts/{id}` + `GET /receipts?since=` cursor; server-side identity/target resolution; capability manifest endpoint; ONE streaming transport (SSE for v1 — matches the existing SS-PT stream-spike lane, still subject to F7 proof). TypeScript types generated from the spec; CI runs the component against a **contract-conformance mock server generated from the spec** (Prism-class), never hand-written fixtures (Ox add #2). **Stream parsing/backpressure/reconnect is owned by the headless core**, not each host app (Ox add #6). **v1 is explicitly SS-PT-shaped; portability is unproven until a second backend implements the contract — no speculative generalization (R3).**

## 4. Topology + governance (Q1/R1/R2 resolved per Ox)

- **Monorepo workspace** (pnpm/npm workspaces): `packages/swan-forge` with SS-PT and SwanGuard as sibling consumers. Separate repo only when an external consumer exists. **Submodules rejected** (drift-by-design).
- **Adoption governance (Ox add #1, highest leverage):** all new UI in consumer repos comes from the Forge **or files a written exception**. Without forced consumption the catalog becomes a museum.
- **Strangler adoption (R1):** Forge components are written fresh against the token contract; SS-PT adopts one component per PR. No component exists in both local and Forge form for more than one sprint. Phase 0 harvest table = adoption priority list, not a copy source.
- **CI drift-linter (R2):** scans consumers for duplicate component filenames, raw hex outside token files, divergent `var(--token, #fallback)` defaults.
- **Maintenance tax made finite (R5):** rule-of-two admission; semver + aggressive deprecation; catalog work capped ~20% of any sprint (site-blocking needs fork locally + schedule reconciliation); **kill criteria** — zero consumers for two release cycles ⇒ deletion proposal (Rule 34 process still applies: proposal + approval, never silent deletion).

## 5. Theming pipeline + gallery as TEST GATE (Ox add #3)

1. Locked semantic token schema; packs supply values.
2. New site → mood words + reference imagery → design-router ideation → candidate packs → automated WCAG/OKLab audit (resolved pairs) → Sean taste-cut.
3. **Gallery is a test gate, not a preview:** screenshot-diff + a11y audit across the full component × theme-pack **matrix** on every PR. Private-first with per-page `public:` flag; goes public only after Phase 4 second-site proof (Q2).
4. **Performance budget (Ox add #5):** per-component import paths (no barrel mega-import), KB budget per tier, measured Jarvis hydration cost.

## 6. Sequencing

- **Phase 0 — Inventory & harvest (read-only):** audit **origin/main** (not stale branches) for the best existing version of each day-one component; Rule 27 classification; output = adoption priority list.
- **Phase 1 — Token contract (three-tier) + 4 primitives** (Button, Card, Input, Modal) + gallery-as-test-gate skeleton + drift-linter. Proves the whole pipeline.
- **Phase 2 — Remaining T1 + Dashboard shell + Data-card cluster + Auth forms + Chart adapter.**
- **Phase 3 — Jarvis flagship** under the §3 hard gate (F1+F3 merged on origin/main + staging integration; flagged off until consumer passes G-gates). Includes the adversarial offline-queue fixture suite: verified-then-conflict, replay-after-failed, intent queued across a contract version bump (Ox add #7).
- **Phase 4 — Second-site proof:** SwanGuard consumes the catalog with a light-native pack. Catalog is not "real" until this ships.

## 7. Decisions Sean must ratify

1. Green-light the Forge at all (this whole plan).
2. Styling runtime for the shared package: zero-runtime CSS custom properties (Ox + my recommendation) vs styled-components.
3. Monorepo workspace restructure (moves SwanGuard consumption into workspace or keeps cross-repo dependency until then).
4. Adoption governance rule ("all new UI from Forge or written exception") — this binds future sessions, so it should become a CLAUDE.md rule if adopted.
5. SSE as the v1 Jarvis streaming transport (still gated on blueprint F7 proof).
6. Day-one T2 cut (waitlisting the marketing patterns).

## 8. Ratification Q&A Log (grill session 2026-08-24)

| # | Decision | Recommended | Sean's answer | Implication |
|---|---|---|---|---|
| D1 | Green-light the Forge (full plan v0.2)? | Yes — full plan | **YES — full plan v0.2** | Forge is GO. Phase 0 read-only inventory is the first build slice after this grill. |
| D2 | Styling tech inside the shared package | Zero-runtime CSS custom properties | **YES — zero-runtime CSS + tokens** | Forge ships plain CSS files + custom properties; no styled-components runtime in the package. SS-PT keeps styled-components in app code and wraps Forge components. §1 Break #4 resolved. |
| D3 | Repo topology | Workspace inside SS-PT (`packages/swan-forge`) | **YES — workspace inside SS-PT now** | No repo migration. Atomic token/schema changes with the biggest consumer. SwanGuard consumes as pinned git/npm dependency. Graduation trigger to standalone repo: a third/external consumer. Amends §4 (which said SwanGuard as sibling workspace package — corrected to pinned dependency until graduation). |
| D4 | Adoption governance: "all new UI from the Forge or a written exception" | Yes, as a numbered CLAUDE.md MANDATORY rule | **YES — CLAUDE.md rule** | Draft a new numbered rule (next free number, currently 74) at Phase 1 close (when the Forge has its first real components + exception-filing mechanism exists). Binds Claude, Codex, and all future sessions. NEW UI only; existing UI migrates via strangler PRs. |
| D5 | v1 Jarvis streaming transport | SSE | **YES — SSE** | The v1 OpenAPI/streams contract standardizes SSE for server→client token streams; intents/chat go up as POSTs (receipt model requires this anyway). WebSocket deferred to a possible contract v2 (voice/presence). Production streaming remains gated on blueprint F7 proof. |
| D6 | Day-one T2 scope | Core four + Hero | **YES — core four + Hero** | Hero promoted to day-one: it passes rule-of-two already (SS-PT homepage Swans.mp4 hero + SwanGuard front page) and carries the cinematic scroll-video variant. Pricing/Testimonials/Bento/CTA/Footer stay waitlisted per Ox. |

**Grill outcome 2026-08-24: ALL SIX DECISIONS RATIFIED (each per recommendation). Plan v0.2 stands with three amendments: D3 (SwanGuard consumes as pinned dependency, not sibling workspace, until graduation), D4 (CLAUDE.md rule drafted at Phase 1 close), D6 (Hero is day-one T2).** Build may begin at Phase 0.

## 9. Synthesis & Advice (grill Phase 2 — advisory, Sean accepts/rejects each)

1. **Build theme pack #2 (SwanGuard light editorial) in Phase 1, not Phase 4.** A token schema validated against only `crystalline-swan` will bake in dark assumptions and lock the semantic tier around one aesthetic — the exact error class Ox caught in v0.1 (dark-first-as-law). Cost is one token file + one gallery matrix column; benefit is the schema proving both poles before it locks. Phase 4 remains the full second-*site* proof.
2. **The Jarvis OpenAPI contract is DERIVED, never pre-drafted.** Write it only after blueprint S1+S2 merge on origin/main, generated from the shipped receipt/identity shapes. Drafting it early "to give the backend a target" is mocks-as-oracle in disguise — the blueprint owns the backend shapes; the contract transcribes them.
3. **Enforce D4 through the design router (Rule 40), not just a new rule.** At Phase 1 close, the `swan-design-router` gains one routing step: "does a Forge component cover this? If yes, consume it; if no, file the exception." Every design task already passes through the router, so enforcement costs one skill edit instead of relying on rule recall.
4. **Minimal-click:** every gallery page gets a copy-usage-snippet button and a theme-pack-starter download — a new site bootstraps from zero to themed primitives in minutes, not a session.
5. **Scope observation ("asset generator" framing):** generated *media* (Seedance loops, hero video, imagery) stays with the storyboarding/Seedance pipeline — the Forge is code components. But theme packs declare **asset slots** (e.g., `--sw-hero-video`) so each site plugs its media into catalog components without touching them.
