# THE SUPER PROMPT — JARVIS SWAN OS (v2.0, VILLAGE-RATIFIED)
## Master handoff: Client-Happiness Core FIRST · then Lens Finish · Swan Coach · Agent Platform · SWAN WORLD · Full-Site Sweep — with delegated packs locked to Fable's vision

```
Status:      ACTIVE — the boot document for the next chat/agent
Version:     2.0 (2026-07-12) — 15-brain AI Village ratified + Sean's
             client-first amendment folded. v1.0 preserved in git history.
Ratification: 15-brain Village planning run 2026-07-12 — $0.4087, 15/17
             validators PASS, 3/3 recursive debates CONSENSUS, escalation
             skipped (no CRITICAL gaps). Artifacts:
             AI-Village-Documentation/validation-prompts/latest/ (+archive).
             Final Decider: Fable (in-session, full-context) — see §10.
Authored:    Fable 5 (Final Decider synthesis of Sean's 2026-07-12 vision
             dump + screenshots + Village panel), Sean-directed
Boot order:  CLAUDE.md → THIS DOC → smart-lens-os-ultra-prompt-2026-07-12.md
             (§8/§13/§14 referenced constantly) → .ai-workflow/coordination/
             claude.lane.md → then execute §9 RUN ORDER. Do NOT re-derive
             what §1 already receipts.
Prime law:   REVENUE FIRST, CLIENTS FIRST. Sean is a solo AI-assisted
             developer with real bills and real deadlines. LANE 1: the site
             must work 100% and look beautiful for CURRENT PAYING CLIENTS
             before anything else is built. LANE 2: everything else ships
             as agent-executable plan packs written in FABLE'S VISION ONLY
             (§8b contract) for Sean's other agents to build later. Scope
             that doesn't serve coaching, adherence, progress proof,
             community, revenue, or trust gets cut (Rule 62).
Identity:    A Jarvis/Iron-Man-class site that NEVER gets old — themes
             forever fresh (Smart Lens), voice-first keyboard-second,
             ultra-mobile pixel-perfect (device-matrix, 30+ phones), and a
             Sims-heir world as the long-game backbone.
Naming law:  "JARVIS" is an INTERNAL CODENAME ONLY (Marvel IP + Swan
             branding rule: never "AI" user-facing). Every user-facing
             surface says "Swan Coach". FTC 2026 AI-disclosure compliance
             lives in ToS/marketing copy, not in the product name.
```

---

## §0. PRIME DIRECTIVE — THE TWO LANES (Sean's 2026-07-12 amendment; binding)

**LANE 1 — BUILD NOW (the Client-Happiness Core).** Everything a current
paying client touches must work 100% and look beautiful, on a phone,
before any new frontier is built. Lane 1 = §4 P0 (workout logger →
planner/naming → rolodex → schedule → clients & team → progress charts →
bootcamp) **plus** §2b known client-visible residuals **plus** the three
live-site compliance/activation CRITICALs from the Village (§7b: deferred
onboarding, 1-click cancel, honest empty/error states on client surfaces).
**Lane-1 DoD:** a paying client can log a workout, see their plan, see
their schedule, and see beautiful truthful progress — on a P1 phone —
with zero known client-visible defects and zero dead controls.

**LANE 2 — PACK NOW, BUILD LATER (delegated).** Workstreams A, C, D, E,
and the F backlog are delivered as comprehensive plan packs conforming to
the §8b AGENT-PACK CONTRACT, written in Fable's single vision. Sean's
other AI agents execute them WITHOUT design latitude. Packs are produced
in this chat-arc; builds start only after Lane 1's DoD is met (A-pack may
run earlier in parallel because it has its own separate agent and zero
file overlap with Lane 1 — see §3).

---

## §1. STATE OF THE WORLD (receipts — do not rebuild these)

LIVE on main @ `0f0e99e1d` lineage, all deploy-verified:
- **Smart Lens v1**: 26 manifests, registry/validation/fallback, live
  scoped previews, two-live-stage Compare, nebula Lab, per-lens glyphs.
- **Smart Lens v2 GOLDEN PAIR (complete)**: Recipe v2 core
  (`core/style-lens-os/v2/` — schema/manifest/compiler/whatChanged, all
  fail-closed), the two production recipes + Lab host manifest
  (`adapters/style-lens-swan/v2/labRecipes.ts`), **LensPlanFrame** (the
  ONLY recipe→DOM boundary) + `lensRepresentationStyles` + stable
  `lens2-*` hooks, Compare **Engine toggle (v1|v2)** — one World renders
  as two genuinely different design systems with a live axes-differ count.
- **Device-matrix** (`frontend/src/styles/device-matrix/`): top-20 phones
  / P1–P12 buckets / media builders / safe-area / lens-aware SwanGrid.
  THE responsive law for everything below.
- **Aurora Bridge**: Coach Command Center presence line (idle/listening/
  thinking/speaking from real state), Contrast-Supreme pass, −33% chunk,
  first Lens-aware production surface. Dead legacy style tree retired.
- **Chart Charter v1.1 (THE VITALS)**: ultra-prompt §5 — five goal-aware
  anchor slots + opt-in Body, L1/L2/L3 disclosure model (L3 Explain =
  confirmed gap), Victory bridge seam = `chartTheme.ts` victoryTheme.
- **Schedule Day Strip**, PR engine events, Recovery/Goal/Pain data —
  see ultra-prompt §1/§6.4 real-event table.
- Open Sean decisions: §11 below (supersedes the v1 pointer).

---

## §2. OBSERVED IMPERFECTIONS (Sean's screenshots, 2026-07-12)

The Lab works but is not PERFECTED. Findings the finish-agent must fix:
1. Style-mode detail card: large dead space below Apply; the glyph
   collides visually with panel edge at some widths; receipt toast
   (bottom-right) overlaps the stage-hint italic line.
2. Catalog: 25 chips in a cramped 2-col scroller — needs grouping
   (mood families), search is under-used, current lens not pinned first.
   **Village fold:** single-column mood-family list on mobile, prominent
   always-visible search, current lens pinned first; safe-area
   `padding-bottom` so the bottom-sheet never obscures the last chips.
3. Compare v1: identical-looking panes for chrome-only lenses erode
   trust (v2 engine fixes this — make v2 the DEFAULT once all 25 convert;
   until then label v1 honestly as "chrome systems").
4. "Live stage · X wearing Y" strip easy to miss; Apply outcome needs a
   clearer moment. **Village fold (adopted spec):** Apply button scale
   beat 1.0→0.95→1.0 (200ms) + confirmation chip slide-up (300ms,
   `aria-live="assertive"`), placed to NEVER overlap other UI; all motion
   killed under `prefers-reduced-motion`.
5. Duplicated safety copy ("Prototype only") appears 3× on one screen.
6. General: organize, reduce clicks, make add-a-style trivially easy.

## §2b. OPEN CLIENT-VISIBLE RESIDUALS (Lane 1 absorbs these — receipts in `.ai-workflow/coordination/review-queue.md`)

1. **Redemption paid-boundary throw** — `specialOfferRedemptionService`
   throws `NO_REDEMPTIONS_LEFT` at the PAID boundary (would strand a
   charged customer + 500-loop the Stripe webhook). Currently unreachable
   only via the one-open-cart index. Fable rec: convert to honor+alert.
   **Sean decision required** (§11) — money-path.
2. **`/api/serve-photo/*` is UNAUTHENTICATED** and serves measurement
   (health) photos. uuidv4 keys = not enumerable, but any leaked URL is
   permanently public. Fix = short-TTL signed URLs (naive `protect`
   breaks `<img>`).
3. **LensRenderRecipe honesty gap** (Codex REVISE): "25 Styles" is not a
   true product claim until (1) real LensRenderRecipe consumption,
   (2) nearest-lens selector isolation, (3) day-strip zero-unhandled test
   repair, (4) selected-date continuity. The v2 engine conversion (§4)
   is the durable fix; interim = honest labeling (§2.3).
4. **Historical data cleanup** — duplicate Orders + mis-charged credits
   (destructive, plan-gated, Sean-approved execution only).
5. **10 pre-existing gamification test fails on main** — dedicated fix
   arc; client-visible XP/streak surfaces must be truth-verified.

---

## §3. WORKSTREAM A — LENS FINALIZATION (Lane 2 pack · separate agent · may run parallel to Lane 1)

**Goal:** STOP feature-building; PERFECT + DOCUMENT + make it portable.
**Deliverable for the finish-agent (produce FIRST in next chat):** a
single diagram-pack doc `docs/ai-workflow/brainstorms/lens-finish-pack-<date>.md`
conforming to §8b, containing: (a) system flowchart + runtime mermaid
(extend ultra-prompt §13 — add LensPlanFrame/v2 path), (b) Lab wireframes
v6 (fix every §2 item; ultra-prompt §14 is the base; Village catalog spec
in §2.2/§2.4 is binding), (c) component blueprint (file map, contracts,
tests, the recipe→DOM boundary law), (d) **ADD-A-STYLE PIPELINE** — the
"new style in minutes" recipe: 1 recipe file + 1 visuals entry + 1 CSS
block (v1) or 0 CSS (v2) + auto-gates (compile, axes-diff vs nearest
neighbor, a11y receipts, screenshot) — Sean will keep adding styles
FOREVER; this pipeline is the product, (e) **PORTABILITY FINAL DOCS** —
extraction contract per ultra-prompt Track-2 P7 (boundary test already
exists) so the lens ships as a component for Sean's future sites.
**Dependency ruling (Fable, overriding the Village risk-assessment's
"hard gate"):** §4 rollout does NOT wait for this pack. The shipped v2
contract (schema/compiler/LensPlanFrame, fail-closed, test-locked) is the
frozen interface; rollout builds against it while the finish-agent
polishes the Lab in parallel. Zero file overlap is a lane rule.
**Definition of done:** all §2 items fixed w/ receipts; 25 v1 lenses
still green; v2 engine default-visible; docs complete enough that a
stranger adds style #27 in <30 minutes.

## §4. WORKSTREAM B — LENS ROLLOUT ACROSS SWAN (LANE 1 — the conversion program, the money core)

Adopt the Golden Pair pattern (capability manifest per surface +
LensPlanFrame/LensPrimitives, NEVER component forks) across the app.

**P0 — the client-happiness core (convert first, in this order):**
1. Workout Logger (client + trainer log-workout paths)
2. SwanStudios Workout Planner (+ admin "Plan Library" — SAME surface)
3. Exercise/Workout Rolodex
4. Universal Master Schedule ("My Schedule")
5. Clients & Team (client management)
6. Client progress section (charts — via Chart Charter §5, Victory theme
   bridge; Vitals row assembly rides this)
7. Bootcamp Creator
**P0 side-quests bundled with #2:**
- **NAMING STREAMLINE (mandatory, Village-hardened):** admin dashboard is
  the leading naming method. Ship `canonical-surface-names.ts` (≤100
  lines) as the MACHINE-READABLE single source of truth — canonical name,
  role-appropriate subtitle, route, test ID, and aria-label per surface —
  consumed by all three dashboards + routes + tests. One name per surface
  (e.g. "Plan Library" vs "Workout Planner" vs "Build Plans" → ONE).
- **BUILD-PLANS AUDIT:** the "Build Plans" section appears to schedule
  rather than build (possibly admin-view routing). Canonical Surface
  Receipt (Rule 26) → fix or relabel honestly.

**Architecture laws for every P0 conversion (Phase-2B Village consensus,
adopted verbatim):**
- **SHARED WRITE PATH LAW:** all workout writes route through
  `/api/workouts/...` with role-based authorization and pending flags —
  no per-surface write forks. Server-side ownership check on EVERY
  mutation (authenticated user vs resource owner), role ACL per action.
- **File budgets:** e.g. `WorkoutLogger.tsx` ≤120 lines,
  `useWorkoutSession.ts` ≤200 lines (sole API caller for the session);
  no nested `LensPlanFrame`; extract per Rule 4 at 300.
- **Capability manifest schema:** `capability-manifest.schema.ts` (≤80
  lines) exporting `SurfaceCapabilityManifest`; forbidden fields: layout,
  raw colors, free-form version strings.
- **Logger mobile grid (Phase-2C consensus):** set rows =
  `32px | 1fr | 1fr | 48px` (Set# | Weight | Reps | Log), min-height
  56px, spinbutton a11y, log-check `aria-pressed`, Blue→Purple on the
  log check, Purple→Cyan on Add Exercise. 320px is a hard gate.

**P1 (after Lane-1 DoD):** Swan Coach on HOME (§5 — placement is P1;
the Coach PACK is produced now), Video Library lens analysis, Home +
About full Fable overhaul (beautify with existing assets + creative
freedom; lens-analyzed; premium design loop applies).
**P2 (plan, don't build yet):** Messages, misc dashboard surfaces,
Coach Command Center visual completion (in progress separately), PLAUD
intake, Photography page (LAST — enhance what's already deep).

**Method per surface:** capability manifest → primitives adoption →
recipe tokens → receipts (computed-signature + screenshots at P1/1440)
→ device-matrix audit → tap-count receipt (§8) → ship behind the
appearance profile.

## §5. WORKSTREAM C — SWAN COACH PROGRAM (Lane 2 pack; internal codename "Jarvis"; highest-value pack)

**Placement:** Coach lives ON the home page — client + trainer home top
section, beautifully integrated (not a separate tab-hotel): persistent
chat with full conversation history, resumable threads, voice-first
(dictate by default, type second), TTS replies (Aurora presence states
already exist). User-role access = paid tier.

**Voice architecture (Village GAP 1.1, Fable-corrected):** the pack
specifies a **realtime speech-to-speech transport over WebRTC** (sub-
second latency; the backend brokers ephemeral session tokens; the client
streams audio directly) — **provider-abstracted behind one interface.**
First candidate: Gemini Live API (fits the existing Gemini stack + $20
plan). NO OpenAI dependency without Sean's explicit approval; legacy
STT→LLM→TTS chaining is the documented fallback, not the target.
**Context continuity (GAP 4.2, adopted):** a conversational state machine
persists active-workout context server-side (PostgreSQL), so a dropped
connection or locked screen resumes with "You were on set 2 of squats —
how many reps?". Coach hooks decompose per Village consensus:
`useCoachSession` ≤200 · `useCoachMessages` ≤200 · `useCoachCost` ≤150 ·
`useVoiceInput` ≤150, strict import boundaries.

**Charts-in-chat + CUSTOM CHART BUILDER (very important):**
- Coach renders live charts inline in the transcript (SafeChart inside
  chat bubbles; image-export fallback for share — export endpoint is
  MIME-whitelisted `image/svg+xml`/`image/png`, server-rendered, served
  via short-TTL signed URLs; Village security consensus).
- Clients CREATE custom charts conversationally ("chart my squat volume
  vs sleep") → Coach proposes → client saves → **pinned to their
  dashboard as a first-class card**, lens-aware (Chart Charter rules:
  data-truth invariants, familiarity budget, colorblind-safe palettes),
  entitlement-gated server-side, data scoped to THEIR data only (Rule 8;
  trainer scope via existing ownership gates). **Ownership is enforced at
  the SCHEMA level** (chart row carries `ownerId`; fetch-time ownership
  check — Village data-safety CRITICAL 4). Adopt the Village state
  machine: `CustomChartStatus` + `CustomChart` interface;
  `useCoachChat` / `useCustomCharts` / `useDashboardPins` hook split.
  Deliverable: custom-chart schema (sources = canonical chart endpoints +
  goals + wearables), builder flow wireframe, dashboard-pin card spec,
  receipts.

**Regulatory guardrails (Village CRITICAL, adopted):**
- **FDA General-Wellness line:** system prompt hard-rule — Swan Coach is
  a fitness coach, NOT a doctor; never diagnose, never interpret
  biometrics as medical symptoms ("your HRV suggests sleep apnea" =
  forbidden class). Mandatory wellness disclaimer on all biometric
  charts. Regression-tested with a forbidden-phrase suite.
- **Retention policy:** conversation history gets a retention +
  summarization policy from day one (no unbounded JSONB growth —
  data-safety CRITICAL 1); raw voice audio is NEVER persisted —
  transcribe-and-discard, transcript only (GDPR Art. 9 posture).
- **Privacy:** the existing zero-PII proxy pattern (Rule 8) applies to
  every outbound LLM call including free-form chart titles/descriptions;
  regression test injects known PII strings and asserts zero presence in
  outbound bodies (Village security consensus §1).

**Monetization + cost guardrails (Sean's economics, enhanced):**
| Audience | Default | Path |
|---|---|---|
| Admin + trainers | ON, house-paid API | operational tooling |
| SwanStudios clients | upgrade option ($9.99/mo) | self-serve upgrade |
| Users (public tier) | paid tier only | subscription |
| **Move Fitness clients** | **OFF** | admin per-client toggle → admin chooses **Paid** (client sees consent module: "$9.99/mo unlocks Swan Coach" → Stripe → access) or **Free** (grant, instant access) |
- Reuse the existing feature-access grant system + Stripe; every grant
  audited; kill-switch per lane already exists. Grant checks are
  server-side on every premium call (never client-only).
- **FTC compliance (Village CRITICAL, adopted):** the $9.99 subscription
  ships WITH a 1-click cancel in the billing surface (§7b builds it for
  the live site first) and honest AI disclosure in marketing/ToS copy.
- **Cost guardrails:** per-user monthly token budgets w/ soft warning +
  hard stop; model tiering (cheap/local for chit-chat, cloud for heavy
  asks); response cache for common questions; admin cost dashboard per
  user (`useCoachCost` owns the client side). The $20 Gemini plan is NOT
  a public utility. Grant-system extension is prototyped EARLY in a
  sandbox branch (Village risk fold) — additive grant types only.

**Design seed:** the Phase-2C consensus chat spec is binding — user
bubble Blue→Purple, coach bubble graphite gradient + purple left border,
mic listening = Arctic w/ Wing glow, thinking = Purple→Cyan, transcript
`aria-live="polite"`, dynamic mic `aria-label`, inline charts
`role="img"` + descriptive labels, sticky 64px input, reduced-motion
kills all pulses.

## §6. WORKSTREAM D — AGENT-READY PLATFORM (Lane 2 pack; Hermes first, everyone eventually)

**Thesis:** every user will soon bring their own AI agent. SwanStudios
must be AI-feature-ready NOW. Hermes is the first-class proof client.
**Standard ruling (Village GAP 1.2, adopted):** build a **NATIVE MCP
server** on the official `@modelcontextprotocol/sdk` — not an "MCP-style"
custom wrapper. T0 reads (my workouts, my charts, my schedule) = MCP
`resources`; T1 draft proposals (log-workout draft, plan suggestions) =
MCP `tools`. A thin REST facade may mirror the same contract for
non-MCP clients, but MCP is the canonical surface. ALL writes stay
review-gated per the existing Hermes↔Swan bridge doctrine (T0–T4 tiers,
receipts, kill switches;
docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md).
**Key + token hygiene (Village data-safety CRITICALs 2–3, adopted):**
per-user agent API keys get a real schema — hashed storage, scopes,
expiry, rotation, revocation audit trail; short-lived scoped JWTs at the
gateway; per-token rate limits (e.g. 60 req/min). Wearable OAuth tokens:
server-initiated flow, encrypted at rest (envelope/pgcrypto), explicit
revocation path + UI surface.
**Research mandate (do FIRST in next chat, before designing):** sweep
current YouTube top AI-agent videos + Reddit (r/LocalLLaMA, r/AI_Agents,
agent-protocol discourse) for how agents connect to apps (MCP servers,
tool schemas, auth patterns), what users expect, what's winning.
Hermes connects day one; strangers' agents = later, same contract.

**Wearables (very important, feeds §5 charts + §7 world):** Fitbit
first (OAuth consent posture, Rule 8 data minimization — request only
needed scopes, ≤90-day default retention), then the accessory field
(Apple Health/Google Fit as aggregators). Integrations are ENRICHMENT,
never source of truth (Rule 62). **Predictive loop (Village GAP 3.2,
adopted):** a T1-draft webhook reads the morning wearable sync and
PROPOSES (never auto-applies) a Gentle-Mode swap — "3h sleep + tanked
HRV → suggest mobility day instead of heavy squats" — through the same
review-gated draft contract. **Export (GAP 6.1):** data export supports
standard CSV + FHIR JSON (EU Data Act / interoperability posture).
Deliverable: wearables integration plan w/ consent/export/revocation
surfaces.

## §7. WORKSTREAM E — SWAN WORLD (Lane 2 pack; the Sims heir; separate AAA-grade plan)

**Positioning:** the Sims-community dream developer. Research mandate
(FIRST): deep Reddit sweep of Sims 1–4 gripes + inZOI gripes (the
"Sims-killer" that stumbled) — build the anti-gripe list into the spec.
Be the opposite of the business practices players hate (no paid
randomized drops — already law; expansions that respect owners; mod-
friendliness as a value).
**Deliverable:** `docs/ai-workflow/brainstorms/swan-world-master-plan-<date>.md`
— comprehensive, deep, professional, AND solo-dev tackle-able, with
full mermaid + blueprint + wireframes, phased:
- **E0 Foundation audit:** existing avatar home ("My Home", Level-10
  unlock), gamification economy (levels→1000, rarity, currency), what's
  reusable.
- **E1 Web-fluid base (build target):** React Three Fiber (already
  sanctioned in the design system for surgical 3D; stylized low-poly =
  mobile-capable + timeless), ONE room/home scene, avatar with
  body-morph parameters, 60fps on P1 phones via device-matrix budgets,
  `<Suspense>` 2D fallback (tier rules). **Renderer law (Village,
  adopted):** prefer the WebGPU renderer where available with automatic
  WebGL/2D fallback; include `@react-three/xr` in the foundation so the
  world can toggle into WebXR later for free (architecture note, not a
  build target). **Bundle law (Village CRITICAL):** three.js is a
  SEPARATE code-split entry — it must NEVER enter the main vendor chunk;
  Lane-1 surfaces pay zero bytes for the world.
- **E2 REAL-LIFE MIRROR (the hook):** avatar body/energy reflects real
  logged workouts, nutrition (Gentle-Mode aware — body morph respects
  sensitivity settings; never punitive), streaks, Fitbit data (§6).
  This is adherence gamified — the Rule-62 justification.
- **E3 Social world:** visit homes, shared community spaces, presence.
  **Village fold (adopted):** "Bootcamp Guilds" — groups pool logged-
  workout points to unlock shared spaces / group cosmetics; peer
  accountability is the retention engine, avatars alone are not.
- **E4 Economy:** skins/furniture/outfits = the SAME creator economy as
  the Lens Atelier (one entitlement system, immutable versions,
  royalties — ultra-prompt Track 2). Lens styles and World skins are one
  catalog family. THIS is the sellable long game. (Creator "Coach
  Persona" licensing noted as a far-future E4 idea — parked, LOW.)
- **E5 High-fidelity client (far future):** same data/economy, richer
  renderer (PC/console class) — architecture must keep world STATE
  server-side and renderer swappable from day one.
- Revenue milestones per phase; content-rating/minors posture; asset
  budgets; every phase independently shippable.

## §7b. WORKSTREAM F — FULL-SITE FABLE SWEEP (F-pack produced now; three items PROMOTED to Lane 1)

Sean's addendum: the WHOLE rest of the site gets the same treatment —
Fable analyzes every remaining surface and upgrades/polishes it. Scope:
storefront + checkout, galleries, waiver, contact, video library,
sessions/booking surfaces, gamification pages, food tracker/nutrition,
notifications, profile/settings, auth screens, footers/headers — every
mounted route not already claimed by §3–§7.
**Method per surface (the sweep card):** (1) LOGIC pass — hostile-review
for real bugs and dead controls; (2) EASE-OF-USE pass — click-count the
primary job, cut taps (Sean's standing least-clicks mandate), fix
confusing flows, honest empty/error states; (3) POLISH pass — premium
design loop, contrast supreme, device-matrix receipts; (4) LENS
readiness — capability-manifest notes for later conversion.

**PROMOTED TO LANE 1 (Village CRITICALs for the live site — build with
the core, not after):**
1. **Deferred onboarding / progressive profiling (GAP 4.1):** ask only
   goal + fitness level up front; first workout logged within 60
   seconds; height/weight/equipment gathered contextually later. The
   meaningful-first-action clock is a Lane-1 activation gate.
2. **1-click cancel** in the client billing surface + honest
   subscription copy (FTC 2026 posture — GAP 2.2).
3. **Honest empty/error states on every client-facing Lane-1 surface**
   (part of each conversion's DoD, called out so it can't be skipped).

**F-pack backlog seeds (Village folds):** photo-based food logging via
an off-the-shelf food-AI API with manual-adjust sliders (GAP 3.1,
MEDIUM — Rule 8 privacy review required); high-contrast mode as a lens;
automated contrast checking in CI.
**Deliverable:** F-pack = full route inventory + one sweep card per
surface + a RANKED backlog (value × effort). **Sequencing law:** F-pack
is PRODUCED with the other packs but BUILT strictly AFTER the workout
core (§4 P0) is client-usable — the workout logger/planner path remains
the most important thing in this entire document. Do not forget.

## §8. GLOBAL BUILD STANDARDS (bind every workstream)

LOGIC + EASE-OF-USE ARE FIRST-CLASS: every slice upgrades correctness
and click-count, not just pixels — count the taps for the surface's
primary job before and after, and report the delta as a receipt.
Device-matrix on EVERYTHING (P1/XR first, receipts at 414+1440; 320px
is a hard gate on dense surfaces); contrast supreme (13px floor, the
Coach pass is the model); 44px; voice-first keyboard-second;
styled-components/Victory/palette laws (CLAUDE.md 1–11); one celebration
owner; receipts culture (computed-signature + screenshots + committed QA
folders); fail-closed everything; server-side authz on every mutation;
Hermes memo at every substantial close; batch-push cadence.

## §8b. THE AGENT-PACK CONTRACT (Sean's delegation law — every Lane-2 pack MUST contain, in order)

> Purpose: Sean's other AI agents build these packs **as though Fable
> were building them.** The pack removes their design latitude. If an
> executing agent has to make a design decision, the PACK failed — fix
> the pack, never improvise.

1. **FABLE VISION STATEMENT** — what this thing IS, what it must FEEL
   like, and where it sits (parent surface or child), in exact language
   the agent may not reinterpret.
2. **ARCHITECTURE** — file map with line budgets, interfaces/contracts
   verbatim (TypeScript), boundary laws (e.g. "LensPlanFrame is the ONLY
   recipe→DOM boundary"), and forbidden patterns.
3. **FLOWS** — mermaid diagrams, one per user story, UI → API → service
   → DB → response.
4. **WIREFRAMES + TASTE ANCHORS** — layout sketches; exact Crystalline
   Swan tokens (`var(--token, #fallback)`); Dual-Button Glow mapping per
   control; motion specs with millisecond values AND reduced-motion
   fallbacks; a11y roles/labels. The Phase-2C Village design spec is the
   seed standard for depth.
5. **PHASES** — each independently shippable, with DoD, receipts spec,
   tests-first list, and tap-count receipts.
6. **FORBIDDEN CHOICES** — enumerated decisions the agent may NOT make
   (libraries, naming, palette, endpoint shapes, schema changes, new
   dependencies). Default rule: anything not explicitly delegated is
   forbidden — stop and ask.
7. **ESCALATION TRIGGERS** — conditions that halt the build and return
   to Fable/Sean: any schema change, any new dependency, anything
   touching auth/billing/PII, any contract ambiguity, any test that
   can't be made to pass without changing a contract.
8. **VERIFICATION** — computed-signature receipts, screenshots at
   414/1440, device-matrix points, test gates, Rule-42 backend audit,
   secret scan, and the reviewer chain (Rule 46/50) the slice must pass.
**Pack acceptance test:** a stranger agent can build the whole pack
without asking ONE design question. Reviewers verify the pack against
this contract before any delegation.

## §9. RUN ORDER FOR THE NEXT CHAT (execute top-down)

1. Boot (header order). Confirm main is current; `npm install` in
   frontend if node_modules hollow (env sweeps happen).
2. **LANE 1 STARTS IMMEDIATELY:** B-pack P0 items 1–2 (workout logger +
   planner conversion + naming streamline via
   `canonical-surface-names.ts`) — Sean's clients use these TODAY.
   Fold §2b residuals into the same arc (redemption boundary + serve-photo
   are small, high-trust slices; Sean decisions in §11 gate two of them).
   The three §7b promoted items ride the Lane-1 arc.
3. **Research pass (Lane 2, parallel/background):** §6 + §7 mandates
   (MCP/agent discourse; Sims/inZOI gripes). Output: two compact
   research briefs.
4. **Produce the SIX PLAN PACKS** (each conforming to §8b), priority
   order: A-pack Lens Finish (§3 — hand to its own agent immediately) ·
   C-pack Swan Coach (§5) · D-pack Agent Gateway+Wearables (§6) ·
   E-pack Swan World (§7) · F-pack Full-Site Sweep (§7b — produced now,
   BUILT last) · B-pack exists as Lane-1 live work, its receipts double
   as the rollout playbook for P1/P2 surfaces.
5. Free **triangle review** of each pack; fold verdicts. Packs touching
   auth/billing/PII (C, D) get the §8b escalation list verified twice.
6. **Then build (Lane 2, only after Lane-1 DoD):** C-pack custom-charts
   + home placement first among packs; A-pack runs on its own agent in
   parallel throughout.
7. Rule-48 audit records per phase close; §11 answers folded when Sean
   provides them.

## §10. VILLAGE RATIFICATION RECORD (2026-07-12 — what the 15 brains changed)

**Run receipt:** planning mode, $0.4087, 435s, 15/17 validators PASS
(2 fails = free-model availability, zero content impact), 3/3 recursive
debates CONSENSUS (security · architecture · design), escalation
skipped, 42 web sources cited. The in-run API Fable judge was skipped
(its own confirm gate); Final-Decider synthesis was performed by Fable
IN-SESSION with full repo context — strictly more informed than the API
judge would have been. Artifacts:
`AI-Village-Documentation/validation-prompts/latest/`.

**Adopted (consensus):** Phase-2B architecture consensus items 1–7
(§4/§5 laws); Phase-2C design spec as the taste-anchor seed (§5/§8b);
security baseline (PII sanitizer regression suite, signed-URL chart
export, server-side authz everywhere, agent-key schema + rotation +
audit, transient voice audio, server-side entitlements); data-safety
CRITICALs 1–4 (retention policy, key schema, OAuth token encryption +
revocation, schema-level chart ownership); three.js code-split law;
native MCP SDK; FDA wellness guardrail; FTC 1-click cancel + AI
disclosure; deferred onboarding; voice context-continuity state machine;
predictive wearable T1 drafts; FHIR/CSV export; Bootcamp Guilds;
WebGPU-preferred renderer + WebXR readiness note; catalog mood-family
re-org + apply-confirmation motion spec.

**Overridden by Fable (4):**
1. "Use OpenAI Realtime API" → principle adopted (WebRTC speech-to-
   speech), provider-abstracted, Gemini Live first candidate — Swan
   stack posture excludes OpenAI absent Sean's explicit approval.
2. "Hard-gate the rollout behind Lens Finish" → rejected; the shipped,
   test-locked v2 contract already unblocks §4; A-pack runs parallel.
3. "Store theme selection in server session" → rejected; contradicts
   the shipped appearance-profile design. Token allow-list validation
   adopted.
4. Village-invented file paths → advisory only; real repo structure
   wins everywhere.

**Fable additions the Village couldn't see (repo context):** §2b
residuals absorbed into Lane 1; 10 gamification test fails flagged;
"Jarvis"→internal-codename-only naming law; B2B tenant/agency
opportunity (GAP 5.1) parked as a §4 naming-registry architecture note —
it aligns with the existing Move-Fitness white-label direction but is
NOT current scope.

## §11. OPEN SEAN DECISIONS (carry to every session until answered)

1. **Honor-vs-refund** at the redemption paid boundary (§2b.1) — Fable
   rec: honor + alert. Money-path; your call.
2. **Serve-photo signed-URL slice** (§2b.2) — approve as an early
   Lane-1 trust slice? Fable rec: yes, it's small.
3. **LensRenderRecipe priority** (§2b.3) — v2-conversion pace vs interim
   honest labeling.
4. **Historical cleanup** (§2b.4 — dup Orders + mis-charged credits) —
   destructive; needs your explicit plan-gated go.
5. **Coach user-facing name** — Fable rec: "Swan Coach" everywhere,
   "Jarvis" internal only (IP + branding law). Confirm.
6. **Ultra-prompt §16 items** (Vitals set/names, Forge tiers, pricing/
   rarity, prescription defaults, familiarity default, L3 Explain
   boldness, body-chart gating flip, minors Body-slot posture).
7. **B2B tenant/agency tier** (Village GAP 5.1) — park or pack? Fable
   rec: park until Lane-1 DoD; revisit with Move-Fitness white-label.

## §12. GAPS FILLED (v1.0 ledger + v2.0 additions — Sean audit these)

v1.0: Naming-streamline registry as a deliverable · Build-Plans
false-label audit · Coach cost guardrails (budgets/tiering/cache/cost
dashboard) · custom-chart data scoping + entitlement + Chart-Charter
compliance · consent module = Stripe + feature-grant reuse (no new
billing system) · Agent Gateway mapped onto the EXISTING T0–T4 bridge
doctrine · Fitbit consent/revocation surfaces · World body-morph
Gentle-Mode guard + minors posture · renderer-swappable world
architecture · Lens×World one-economy unification · solo-dev feasibility
gates + revenue milestones on every phase · Lab §2 imperfection list as
the finish-agent's DoD · F-pack triple pass + tap-count receipts.

v2.0 (this revision): the TWO-LANE prime directive · §2b residual
absorption (the site cannot be "100%" with known client-visible
defects) · §8b Agent-Pack Contract (delegation without design drift) ·
machine-readable naming registry · SHARED-WRITE-PATH law + file budgets ·
realtime voice transport ruling · FDA/FTC/GDPR guardrail set · deferred
onboarding as an activation gate · schema-level chart ownership ·
agent-key + OAuth token hygiene · predictive wearable drafts ·
three.js bundle isolation · Bootcamp Guilds · WebGPU/WebXR posture ·
"Jarvis = codename only" naming law · Village ratification record (§10).

## §13. CHANGELOG

- **v2.0 (2026-07-12):** 15-brain Village ratification folded ($0.41,
  3/3 consensus); Sean's same-day amendment restructured the doc into
  the two-lane prime directive (client-happiness core builds first;
  everything else = Fable-vision agent packs per §8b); §2b, §8b, §10,
  §11, §12-v2 added; C/D/E re-scoped from "P0-critical build" to
  "highest-value packs"; three F items promoted to Lane 1.
- **v1.0 (2026-07-12):** original synthesis of Sean's vision dump +
  screenshots; six workstreams; §9 run order.

*— End of Super Prompt v2.0. Next chat: boot, Lane 1 builds while the
packs are produced, triangle-review the packs, delegate them in Fable's
vision, and keep the workout core sacred. The world is already
half-lit — finish it. —*
