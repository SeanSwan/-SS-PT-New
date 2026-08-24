---
decision: Swan Component Forge — canonical, themeable component catalog across all Sean's sites; Jarvis Coach panel as flagship organism; v0.2 integrates Ox Alpha's REVISE findings; RATIFIED by Sean 2026-08-24 (all 6 decisions, see §8)
status: ratified — build pending (Phase 0 next)
supersedes: none
---

# Swan Component Forge — Canonical Component Catalog (v0.3 — post-GLM panel round 2)

> **Precedence note:** §11 (GLM REVISE integration) amends earlier sections wherever they conflict. §8/§10/§11 grill+panel outcomes are the current ruling state.

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
- **Phase 1 — Token contract (three-tier) + 4 primitives** (Button, Card, Input, Modal) + BOTH theme packs (crystalline-swan dark + swanguard-editorial light, per accepted §9.1) + gallery-as-test-gate skeleton + drift-linter + exception ledger (shipped together per §11.C3).
- **Phase 1.5 — WIRING GATE (added per GLM C2, the panel's strongest objection):** Forge Button live on ONE real SS-PT production surface via strangler PR #1, proving the D2 interop design (`sw-` namespacing, sanctioned override protocol, CSS import order) while it is still cheap to reverse. Acceptance: pixel-parity with the original GlowButton under crystalline-swan (Dual-Button Glow + reduced-motion assertions named). **No Phase 2 spend before this gate passes.**
- **Phase 2 — Remaining T1 + Dashboard shell + Data-card cluster + Auth forms + Chart wrapper** (SafeChart-wrapped Victory, explicitly labeled SS-PT-shaped; adapter *interface* deferred until a second charting consumer exists, per §11.A6).
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

## 10. Post-ratification inputs from Sean (2026-08-24, same session)

1. **SwanGuard AI confirmed as the SECOND Jarvis-contract consumer.** Sean: the Swan Coach brain pattern is "definitely the plan" for a SwanGuard AI. Framing: Swan Coach is NOT converted/moved — SS-PT keeps Swan Coach; SwanGuard gets its own brain speaking the SAME contract with a different persona + capability manifest (news curation/source vetting vs training actions). This upgrades the Jarvis contract from N=1 (R3's weakness) to N=2 planned consumers.
2. **The ORIGINAL GlowButton is the taste anchor for the Forge Button.** Sean built a new glow button, then reverted to the original he likes. Phase 0 must locate the canonical current GlowButton on origin/main (two tracked variants exist in the stale wip tree: `frontend/src/components/ui/buttons/GlowButton.tsx`, `frontend/src/components/ui/GlowButton.ts`; classify per Rule 27) and treat the original's look/feel as the design target. Forge Button = original GlowButton aesthetics rebuilt on the three-layer split (headless core + variants + zero-runtime tokens per D2), Dual-Button Glow discipline intact.
3a. **Grill checkpoints (2026-08-24, Phase 1 kickoff):** Sean confirmed (a) origin/main `buttons/GlowButton.tsx` IS the original he likes — Forge Button styling target locked; (b) push target = **main when gates are green** (additive-only content, Rule 42 audit first, one deploy). Build happens on fresh branch `forge/phase-1` cut from origin/main — never the stale wip tree.
3. **Swan design brain wired into Forge design work.** Two integration points: (a) `swan-design-router` + design-brain docs govern all Forge visual work (Rule 40 — already mandatory); (b) the Swan Brain vault (`node scripts/swan-brain.mjs`, incl. Sean's Midjourney/visual-taste archive) is queried during Phase 1 per-component design so "what Sean likes" comes from his curated taste data, not model guesses. Verify vault reachability at Phase 1 start (a prior session found it unreachable from one WSL context — do not assume). **[VERIFIED 2026-08-24: vault reachable, 5 hits on test query.]**

## 11. Panel Round 2 — GLM 5.3 REVISE integration (2026-08-24; full review: `docs/ai-workflow/AI-HANDOFF/GLM-FORGE-RATIFIED-REVIEW-2026-08-24.md`)

GLM verdict: **REVISE** — "the plan earns its build; it has not yet earned its locks." All findings adjudicated below; amendments override earlier sections.

**Architecture (A1–A7):**
- **A1 focus order — RULED: core-invariant.** Variants may change structure/layout, never focus order or keyboard behavior. Asserted per-variant in the gallery matrix.
- **A2 — ADOPTED.** Drift-linter also scans theme packs and consumer CSS for visual-reordering properties (`order`, `flex-direction: *-reverse`, `direction`, grid placement overrides) — tokens must not be able to fork the tabbing experience.
- **A3 — ADOPTED.** Rule-of-two and kill criteria extend to VARIANTS, not just components. A variant needs a demonstrated second consumer or a Sean exception.
- **A4 — ADOPTED.** Token resolution order is defined: component-override → pack semantic → primitive fallback. The contrast audit runs over the (pack × override) cross-product; overrides are part of the audited schema, not an escape hatch.
- **A5 — ADOPTED (D2 interop spec, proven at Phase 1.5):** (i) all Forge classes namespaced `sw-`; (ii) sanctioned override protocol = each component publishes its override custom properties (`--sw-btn-*`); consumer selector overrides and `!important` against `sw-*` classes are lint errors; (iii) CSS import order rule: Forge CSS before app CSS; (iv) no styled-components ThemeProvider bridge — Forge reads only custom properties, which SC-styled hosts already see natively.
- **A6 — ADOPTED.** Chart adapter interface deferred (see amended §6 Phase 2) — an interface with one implementation is speculative generalization (R3 applied to ourselves).
- **A7 — ADOPTED.** Gallery determinism controls: animations forced off via motion tokens during capture, videos replaced by poster frames, fixed date/clock injection. Chromium-first is a NAMED limitation, not silent; manual assistive-tech audit each release cycle (Part 4 #5).

**Jarvis contract (B1–B9):**
- **B1 — ADOPTED, with a correction from Phase 0 evidence.** §10.1 is downgraded: SwanGuard AI is a **second planned conformance profile**, never a rule-of-two consumer until it exists. **D6 re-adjudicated honestly:** Hero passes rule-of-two on REAL in-repo evidence instead — the live homepage hero (`Hero-Section.V2.tsx`) and the StoreV2/V3 hero surfaces both consume Swans.mp4 today (`videoAssets.ts`, `StoreV2.tsx`, `StoreV3.tsx`). D6's outcome stands on corrected grounds. Standing rule: **unbuilt sites never satisfy rule-of-two.**
- **B2–B8 — ADOPTED as contract-hardening requirements** (scheduled into Phase 3 prep, BEFORE contract v1 locks): job-status lifecycle for long-running intents (news digests take minutes, not seconds); intent TTL/expiry ("replay-after-irrelevant" is a failure mode, not idempotent success); target-gone semantics (410-class) beyond the 409 re-anchor; MUST/OPTIONAL conformance profiles (a coach and a curator will not implement identical surfaces — say so in the contract); versioned capability manifest + unknown-capability client default; the stream endpoint itself specified (event schema, intent↔stream correlation, ordering guarantee vs receipt finalization); full non-functional surface (auth scheme, rate limits/backoff, error taxonomy, SSE heartbeats, `Cache-Control: no-store`, proxy-buffering requirements, reconnect policy). **SwanGuard-domain red-team runs against the derived spec BEFORE v1 semver locks** (amends accepted §9.2).
- **B9 — ADOPTED.** Phase 4 sliced: **4a** = SwanGuard consumes tokens + Button via namespaced release tag (tests ONLY the cross-repo delivery mechanics); **4b** = broader component consumption + light-pack proof; **4c** = SwanGuard AI conformance profile (separate track, after Phase 3).

**Sequencing/governance (C1–C7):**
- **C1 — CLOSED with evidence.** Origin/main `buttons/GlowButton.tsx` verified canonical (84 consumers; `ui/GlowButton.ts` is a 3-line shim) and Sean confirmed it IS the original (§10.3a). Forge Button acceptance test = pixel-parity vs the original under crystalline-swan with Dual-Button Glow + reduced-motion as named assertions. Strangler PRs must record load-bearing behaviors in the harvest table before replacing.
- **C2 — ADOPTED: Phase 1.5 wiring gate** inserted into §6. The panel's strongest objection; D2 interop is proven on one real production surface before Phase 2 spend.
- **C3 — ADOPTED.** Exception ledger (`packages/swan-forge/EXCEPTIONS.md`: owner, reason, expiry, review date) ships in the SAME slice as the drift-linter; linter runs report-only until the D4 CLAUDE.md rule lands.
- **C4 — ADOPTED.** D4 rule text is scoped: "all new UI **of a class the Forge ships** comes from the Forge or files an exception." No exception spam for classes the catalog doesn't cover yet.
- **C5 — ADOPTED.** Linter maps legacy export names to Forge classes (GlowButton→Button), not just filenames; each strangler PR schedules its legacy delete-PR in the Forge changelog.
- **C6 — ADOPTED.** Release mechanics: namespaced git tags (`forge-vX.Y.Z`), `packages/swan-forge/CHANGELOG.md` carries deprecation notices, SwanGuard pins release tags (not raw SHAs). Adoption telemetry = consumers named per release in the changelog (kill criteria become measurable).
- **C7 — CLOSED.** §9 dispositions recorded: **Sean ACCEPTED all five advisory items** (9.1 light pack in Phase 1; 9.2 derived contract as amended by B8; 9.3 router enforcement at Phase 1 close; 9.4 gallery copy-snippet/pack starter; 9.5 asset slots) — grill checkpoint 2026-08-24.

**Absence adoptions:** i18n foundation from day one — all Forge CSS uses logical properties (`padding-inline`, `margin-block`), headless cores take strings as props (no hardcoded English). Release pipeline + exception ledger + non-functional contract surface + test-integrity program all covered above.

## 12. Panel Round 3 — Ox Alpha REVISE on v0.3 (2026-08-24; full review: `docs/ai-workflow/AI-HANDOFF/OX-FORGE-RATIFIED-REVIEW-2026-08-24.md`)

Ox verdict: **REVISE** — "architecture spine sound, v0.1 breaks held; surgical fixes, no re-ratification of D1–D6 required except D6 evidence re-verification." Adjudications (these amend §11 where they conflict):

1. **A5(iv) corrected (Ox Critical #1 — partially right, gap real).** The original claim stands for CSS: `var(--sw-*)` inside styled-components template strings resolves against the cascade natively (SS-PT's own Rule 6 pattern). Ox is right about the OTHER channel: SS-PT's `UniversalThemeContext`/ThemeProvider **JS theme object** (which the original GlowButton imports) is a second source of truth the drift-linter cannot see. **Ruling: one-way generation** — the SS-PT JS theme values consumed alongside Forge components are generated FROM `crystalline-swan.css` (pack = single source of truth), and the Phase 1.5 gate adds an SC-theme↔pack divergence check to the linter. Deliverable owned by Phase 1.5.
2. **Push classes per phase (Ox Critical #2 — contradiction resolved).** Package manager: **npm**. **Push-1 (Phase 0/1, this batch): strictly additive** — `packages/swan-forge/**` + `docs/**` only; NO workspace registration, no root or frontend manifest edit, no lockfile change, nothing imports the package, linter report-only, Rule 42 audit precedes push. Worst case = a wasted deploy of an unchanged app (Ox Part 4 conditions 1–6 adopted verbatim as the Push-1 checklist). **Push-1.5 (Phase 1.5): consumer-wiring class** — `frontend/package.json` gains `"@swan/forge": "file:../packages/swan-forge"` (frontend manifest, NEVER root), strangler PR #1 modifies consumer code, own deploy verification + single-PR `git revert` rollback. §10.3a's "additive-only" wording is hereby scoped to Push-1.
3. **D6 provenance ANSWERED with receipt (Ox High #3).** The Hero evidence was gathered from `origin/main` refs, not the wip tree: `git grep -l "Swans.mp4" origin/main -- frontend/src` → `origin/main:frontend/src/config/videoAssets.ts`, `origin/main:frontend/src/pages/shop/StoreV2.tsx`, `origin/main:frontend/src/pages/shop/StoreV3.tsx`; `Hero-Section.V2.tsx` via `git ls-tree -r origin/main` (Phase 0 doc). Hero as a COMPONENT stands on clean evidence. **Conceded: the scroll-bound-video VARIANT has no demonstrated second consumer as a variant — demoted from day-one** per A3; re-enters with a named consumer or Sean's written exception (one line from Sean suffices; likely candidates: homepage hero V3/V4 resolution + StoreV2/V3).
4. **Phase 3 entry gate moved (Ox Medium #4):** from "F1+F3 merged" to "**contract v1 LOCKED**" — i.e., derived from shipped S1/S2 shapes AND B2–B8-hardened AND SwanGuard-domain red-teamed AND profile-selected. The conformance mock takes an explicit `--profile <coach|curator>` per CI run.
5. **Ledger + cadence teeth (Ox Medium #5 + #3-paper + Low #6/#7):** (a) expired exception = unsuppressed violation (already implemented and unit-tested in `loadExceptions`); enforcement-day amnesty = pre-seed the ledger with all report-only-era findings at +60d expiry so Day-1 enforcement blocks only NEW drift; (b) token codemod tooling is a **Phase 2 named deliverable** (owner: Forge changelog process), first exercised on the first semantic rename; (c) R5's 20% cap binds steady-state consumer-repo work, NOT the Sean-commissioned bootstrap phases 0–1.5 (explicit exemption, recorded here); (d) gallery CI budget: ≤5 min per PR, shard by pack, sample non-critical states — full matrix nightly; (e) contract releases tag as `forge-contract-vX.Y.Z` (separate namespace from `forge-vX.Y.Z`).

## 13. Panel Round 4 — GLM 5.3 CODE review of the Phase 1 build (2026-08-24; full review: `docs/ai-workflow/AI-HANDOFF/GLM-FORGE-PHASE1-CODE-REVIEW-2026-08-24.md`)

GLM verdict on commit `0a11ec9b2`: **REVISE** — "nothing REJECT-grade… but the gate is the product of this slice, and the gate has holes." All ranked fixes 1–10 implemented in `147a94d1f` (+ the accent-glow fidelity fix `331f2e599`, which resolved GLM's LOW glow-collapse finding before the review even landed):

- **Audit evasion closed (GLM HIGH):** duplicate declarations of any audited token = hard fail (an @media-placed second value can no longer show the audit one number and the browser another). Non-audited tokens (e.g. `--sw-motion` reduced-motion blocks) still allowed duplicates.
- **Accent phantom closed (GLM HIGH):** `.sw-btn--accent` now consumes `--sw-btn-accent-text` — the audit measures what the CSS renders.
- **Waiver governance (GLM HIGH):** waivers are `{owner, expiry, packs[]}` — pack-scoped, time-boxed, expired = hard FAIL. The accent waiver is owned by Sean, expires **2026-10-01**, applies to crystalline-swan only (swanguard passes at 5.76:1 on its own). The double-standard against the EXCEPTIONS ledger is gone.
- **Non-themeable floors enforced (GLM MED):** new linter R5 — packs may not redeclare any `--sw-p-*` primitive.
- **Capture gate re-labeled truthfully (GLM HIGH-missing, Rule 75):** the automated screenshot gate is a **Phase 1.5 deliverable** (Playwright lives in the consumer; adding it to the package would break Push-1's no-new-deps). Gallery = manual matrix + determinism hook until then. Same honesty fix for R2/R4 (consumer rules run from consumer repos at 1.5+).
- **A11y/robustness batch:** focus ring composes over hover glow; sheen sweeps out; placeholder pair now audited (crystalline muted lifted to #7E93A8); modal close fade + a11y-tree removal via visibility pattern; RTL drawer mirror; dialog `tabindex="-1"` + zero-focusable Tab fallback; FOCUSABLE_SELECTOR expanded; labelId sanitized; binding-duties contract + `initialFocusTarget` in the core; packless motion fallbacks; button `type="submit"` path; linter walk() symlink/error/depth hardening; R1 alpha-hex, R3 case+grid-area.
- **Instrument trust:** the gate's FAILURE paths are now tested (FAIL / UNRESOLVED / missing-name / duplicate / expired-waiver / WAIVED-FAIL all asserted), and `SEMANTIC_NAMES` is sync-tested against `semantic.contract.md`. Tests 21 → **35/35**; audited pairs 22 → **28**.
- **Deferred with reasons:** multi-line declaration/import blind spots + `writing-mode`/`scaleX(-1)` reordering (documented v0 limitations); gradient-surface contrast modeling (content placement pins it in practice); unbounded readFileSync (dev-tool severity).

**Panel ledger for this slice:** GLM CODE review = round 4. Ox CODE review = ATTEMPTED 3×, upstream 429 (shared pool) each time except one plan-review success; final attempt in flight. If Ox's code pass cannot land before push, the gap is RECORDED here per protocol: Ox has reviewed the PLAN twice (v0.1, v0.3) but the Phase 1 SOURCE only via GLM + builder dry-loop. Any post-push Ox findings route to the Phase 1.5 slice.
