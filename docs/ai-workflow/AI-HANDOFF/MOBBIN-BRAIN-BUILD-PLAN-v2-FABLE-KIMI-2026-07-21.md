---
decision: Fable × Kimi agreed v2 of the Mobbin ranked build plan — corrects stale item states, adds a zero-build "ship what's built" wave, threads dictation-first + proof-share loop through the core waves, grounds the money wave in the locked Marketing Brain epic, bakes Rule 71 catalog protocol into wave operations, and locks Kimi's R1 buildability deltas (least-click budgets, cold-start contracts, SSE spike scheduled, share-consent spec, signature-moment design contracts).
status: consensus
supersedes: MOBBIN-BRAIN-BUILD-PLAN-2026-07-21.md
---

# Mobbin Brain — Build Plan v2 (Fable × Kimi, 2026-07-21)

**What this is:** the Fable Final-Decider upgrade of `MOBBIN-BRAIN-BUILD-PLAN-2026-07-21.md`, cross-checked
against the live repo state (Rule 71 catalog greps, coordination lanes, memory of shipped work), then
hostile-reviewed by Kimi K3 (R1: SHIP-WITH-CHANGES, all 10 deltas applied below — see co-review log at bottom).
Same honest framing as v1: these are **ranked candidates, not approved work**; every item still passes
`grill-me` → (`chromie` if unproven) → `swan-orchestrator` → `swan-design-router` (UI) → build →
`closeout-evidence-lock`.

## Why v1 needed an upgrade (the corrections that change the plan)

1. **v1 item 1.4 is STALE.** The workout-completion proof card **already shipped dark to `main`**
   (push `72e3f37da..f5cf065e1`, completion-blueprint convergence v1, claude lane 2026-07-21) `[VERIFIED — lane file + git]`.
   Remaining work is NOT "build the card" — it is the canonical-surface-audit of the DORMANT
   `PostWorkoutCelebration` client-completion surface, then light-up (1.4a) and share wiring (1.4b).
2. **v1 misses the dictation spine.** The dictation planner/logger shipped 2026-07-15 (deterministic sequencing
   brain, live Coach command proof "✓Added Goblet Squat — 3×12") `[VERIFIED — memory + main history]`. Sean's
   operating model is dictation-first (Execution Roadmap). A logger upgrade that is touch-only is HALF a logger
   upgrade for this product. v2 makes every 1.x item dual-input by contract — with an explicit degradation spec.
3. **v1's money wave ignores already-built money assets.** The storefront inquiry button is BUILT on a branch
   awaiting one main-push `[LIKELY — memory; verification step now mandatory, see −1.1]`; the Marketing Brain
   plan is LOCKED with first epic = speed-to-lead email-only + referral seeding; trainer comp mode-b (flat
   $/session payroll) shipped — giving 2.3 real payroll data. The cheapest money moves are **pushes and wiring
   of built work**, and v1 doesn't rank them at all.
4. **v1 stops the core loop one step early.** The Product Core Loop ends at "make meaningful milestones shareable
   with the community." v1's Wave 1 ends at the proof card. v2 adds the **share/celebrate loop** (1.4b) as the
   loop-closer — now with a required share-consent spec (Kimi B3).
5. **v1 doesn't use the new brain.** Rule 71 catalog (248 rows AI-HANDOFF + local store) landed after v1's
   research. v2 bakes the catalog protocol into wave operations (grep-before-slice, frontmatter-born docs,
   regen-at-closeout) so the plan compounds instead of decaying.
6. **Known prerequisites v1 didn't sequence:** the LIVE P1 wrong-client draft bug (`useCoachComposerDraft.ts`
   actor-scope; Codex fix `448755211` unmerged — rebase onto main, land ONE store) precedes Coach-adjacent work
   (explicitly gates 0.2); the B1b SSE spike is now scheduled as **0.4**, not an orphan.

## Standing constraints (unchanged from v1, restated as law)
- Marketing Command Center = #1 focus · Product Core Loop second · trainer-indispensability (clients read+do,
  never decide) · least-clicks · Rule 62 strategy gate on everything.
- ⚠ = high-stakes (Stripe/billing/auth/multi-tenant) → Rule 50 Tier-C Village + Sean approval.
- ENHANCE-not-rebuild: every UI item needs a Canonical Surface Receipt (rule 26) before code.
- All UI rides the **Style Lens OS + Aurora Console skin contract** (adopt via `data-console-root` + token bridge
  + `<ConsoleAtmosphere />`) — no bespoke styling lanes. Mobbin MCP reference gate per rule 40.
- The public site-overhaul (theme/lens wiring) belongs to ANOTHER agent — coordinate, never collide (rule 67).
- **Acceptance metrics are the closeout payload (Kimi #10):** every built item names its metric in the grill-me/
  orchestrator artifact and `closeout-evidence-lock` verifies against it. Key metrics are pre-declared per item below.

---

## THE PLAN (waves = sequence; within a wave, top = first)

### Wave −1 — SHIP WHAT'S BUILT (zero/near-zero build; do immediately)
| # | Item | Why / contract | Effort | Gate |
|---|------|----------------|--------|------|
| −1.1 | **Inquiry-button main-push** — **step 1 is verification** (branch exists, diff vs main reviewed, checks pass) before it enters the Rule 70 batch; status is `[LIKELY]` until then | #1-focus money surface, already built; near-pure shipping once verified. | XS–S | verify → Sean gate-push |
| −1.2 | **Land the wrong-client-draft P1 fix** (rebase Codex `448755211` onto main; ONE draft store) | LIVE P1 data-leak class on shared browsers; **explicit prereq of 0.2** and all Coach-adjacent UI. | S | orchestrator + hostile pass |
| −1.3 | **Completion proof-card light-up decision packet** — canonical-surface-audit of `PostWorkoutCelebration` / client completion surface | The card is shipped dark; the audit is the only blocker between "dark" and "clients see their win." Prereq of 1.4a. | S | canonical-surface-audit |
| −1.4 | **Sean-queue money decisions** (honor-vs-refund call; billing-flag review) | **Gate resolution (Kimi B1):** the *decision* is Sean's. *Execution* of any flag flip that changes live Stripe/billing behavior = ⚠ Tier-C Village + Sean approval; flips that are non-billing (UI visibility, non-monetary features) are exempt and named as such in the flip slice. No flip executes on this row alone. | XS | Sean (decide) → ⚠ Village if billing-behavior flip |

### Wave 0 — UX foundation (small, high-leverage, unblocks everything)
| # | Item | Contract (v2) | Effort | Gate |
|---|------|---------------|--------|------|
| 0.1 | **Empty-state coaching + inline validation + branded 404** | Empty states coach the **next best action per role** (client: "Log your first workout" / trainer: "Invite your first client" / admin: "No stale clients — celebrate X"). **Cold-start contract (Kimi B6/#7):** the spec explicitly covers downstream cold states — 1.2 PR analytics ("PRs unlock after 3 logged sessions of an exercise"), 1.3 readiness map ("Readiness unlocks after N logged sessions"), 2.3 finance ("No payments yet — share your booking link"). Named per-surface list is a deliverable of the slice. | S | design-router |
| 0.2 | **⌘K command palette + global search (admin/trainer)** | **Prereq: −1.2 shipped** (voice routes through the Coach command dispatcher — Coach-adjacent). Scope defined up front: search entities = clients, exercises, sessions, settings, nav targets; ranking = role-first with MRU clients pinned. **Palette teaches the voice grammar**: mic button (44px) inside the palette; every result shows its dictation phrasing as hint text. | M+ | orchestrator + design-router |
| 0.3 | **Skeleton loading for charts/lists** | Skeletons follow the lens (crystalline shimmer on Carbon `#141419`), not gray boxes. | S | design-router |
| 0.4 | **B1b SSE spike** (Render flag + streaming probe) — **scheduled here per Kimi B2/#3** | De-risks 3.2's streaming UX ceiling AND 0.2's voice-result streaming. Owner: backend lane. Outcome: a written GO/NO-GO on SSE through Render's proxy. | S | orchestrator (read-only spike) |

### Wave 1 — Core loop / proof-of-value (the spine)
| # | Item | Contract (v2) | Effort | Gate |
|---|------|---------------|--------|------|
| 1.1 | **Logger spine: PREVIOUS/last-time + auto-rest-timer (±15/skip) + RPE/AMRAP + inline set notes** | **Least-click budget (Kimi B7/#4): a set logged in ≤2 taps; repeat-last-set in 1 gesture.** Mobile contract: **ghost-fill pattern mandatory** — last-time values render as crystalline ghost text *inside* the inputs (not a separate column); one tap or "same as last time" accepts. Swipe grammar: swipe-right = repeat last values, swipe-left = inline note; numeric bottom-sheet keypad (48px keys); RPE = snap-slider 6–10. **Rest timer as atmosphere:** `<ConsoleAtmosphere />` pulse at timer tempo, haptic tick, voice "skip"/"plus fifteen"; reduced-motion = static ring + aria-live countdown. **Dictation degradation spec (Kimi #9):** mic denied / gym noise / ambiguous parse → instant keypad fallback + undoable confirmation chip ("✓ …" · undo 5s, extending the shipped Coach proof pattern) — never an error wall. Dual-input by contract on every new field. Data model extends the EXISTING logged-workout schema — schema-drift check (rule 58) mandatory. **Metric:** median taps per logged set; % sets logged via dictation. | M | orchestrator + design-router |
| 1.2 | **Per-exercise analytics: e1RM + rep-range PRs + PR badges on sets** | PR detection emits a **gamification event** (existing XP/streak engine, idempotency keys). **PR flare** (signature micro-moment): crystalline edge-glow on the set row, e1RM counts up, badge stamps; reduced-motion = badge appears, number swaps, aria-announced. Cold-start handled by 0.1's contract. Victory-only; real-log data-truth. **Metric:** PR events fire correctly on real logs (regression-tested); zero mock data paths. | M | design-router |
| 1.3 | **Muscle-readiness body map from logged volume** | **Trainer coaching tool first** (trainer dashboard: per-client readiness → next-session adjustment); client view read-only — indispensability preserved. Cold-start handled by 0.1's contract ("unlocks after N sessions"). | M | design-router |
| 1.4a | **Proof-card light-up** (depends on −1.3 audit) | Wire the shipped-dark card to the canonical client completion surface. **Metric:** card renders on real workout completion in production. | S | orchestrator (Fable review on file) |
| 1.4b | **Share + celebration loop** | **Requires a one-page share-consent/privacy spec first (Kimi B3/#2):** what client data may be published, opt-in model, moderation path. Then: card as **artifact, not modal** — aspect presets (9:16 / 1:1 / feed), PR number refracted through the lens prism, data-truth watermark, crystalline streak sigil (no emoji-fire). **≤2 taps completion → published** (smart default = community feed; long-press = external share sheet). **Trainer-in-the-loop:** share triggers a trainer "celebrate" affordance — one tap injects a coach comment on the client's post (indispensability *inside* the viral loop). Admin "celebrations this week" surface = thin read-only list in this slice, not a new dashboard. **Metric:** taps from completion → published; % shares receiving trainer celebrate within 24h. | M | grill-me (consent spec) → orchestrator → design-router |

### Wave 2 — Money / acquisition (Marketing Command Center = #1 focus; runs IN PARALLEL with Wave 1)
| # | Item | Contract (v2) | Effort | Gate |
|---|------|---------------|--------|------|
| 2.1 | **Coach acquisition surface: trainer profile (case-study/portfolio) + booking (slot grid, reschedule-with-credit) + directory** | Wired into the LOCKED Marketing Brain epic: every profile/booking view feeds **speed-to-lead** (inquiry → email capture → fast follow-up) + referral-seeding hook. Profile hero = **proof reel**: anonymized client progress charts as scroll-driven reveals (lines draw on viewport entry; reduced-motion = pre-drawn crossfade) — the acquisition surface demos the Wave-1 loop. **Scope honesty (Kimi minor):** the chart-anonymization pipeline is NEW infra — named sub-slice inside 2.1, not assumed. Credential lockup as designed element: "26+ years experience · NASM protocol" — never "NASM-certified". Booking close: confirm → instant calendar add + speed-to-lead email fires → **referral card** ("bring a training partner") reusing the 1.4b card component — one component, two loop-closers. **Metric:** inquiry→first-response time; booking completion rate. | L | grill-me → chromie → orchestrator → design-router |
| 2.2 | ⚠ **Tier paywall + Free/Guardian/Crystalline comparison + package usage meters + tier change + billing hub** | Map to REAL tiers (Starter FREE / Guardian $1+ / Crystalline $24.99) and REAL packages ($175/hr, $110/30min, 3/6/12-mo). Usage meters read session-credit truth from the shipped Order/credit reconcile work. HIGH-STAKES → Tier-C Village + Sean. | L | ⚠ Village + Sean approval |
| 2.3 | **Admin financial dashboard** (revenue compare-period + package holdings + payments ledger) | **Margin lens:** revenue minus shipped comp-mode-b trainer payroll = margin per client/package — the number Sean decides with. Cold-start covered by 0.1. Read-only slice on existing Stripe/order data may precede 2.2; full version follows 2.2. | M | design-router |

### Wave 3 — Coaching depth & content
| # | Item | Contract (v2) | Effort | Gate |
|---|------|---------------|--------|------|
| 3.1 | **Trainer plan-builder: set-schemes + supersets + reusable template library** | Templates integrate the shipped **deterministic sequencing brain** (dictate a plan → structured template) + NASM-OPT phases. Trainer-only writes (indispensability: switching active plan + editing planData = trainer-only). **A thin template slice of 3.1 is a named prereq of 3.4 (Kimi B8/#8).** | L | grill-me → orchestrator → design-router |
| 3.2 | **Data-grounded Swan Coach** (cites the user's real logs/readiness) | Prereqs explicit: Wave-1 data model + **0.4 SSE spike GO/NO-GO** (streaming ceiling) + zero-PII proxy (rule 8, IDs only). Never "AI" user-facing — "Swan Coach". | M | orchestrator (privacy rule 8) |
| 3.3 | **Video Collections / member playlists + multi-facet filter** | Video-library strategy (free YouTube funnel → member playlists); R2-hosted; trainer-curated. | M | design-router |
| 3.4 | **Onboarding self-assessment → personalized plan-preview reveal** | **Prereq: 3.1 thin template slice** (the reveal must show a REAL plan — a signature moment on a stub is a lie). Signature cinematic beat: assessment answers visibly **assemble** — each answer becomes a facet flying into a crystalline plan-preview deck, resolving into "Coach Sean built this for you" with real trainer attribution. Data honesty in the theater: "PREVIEW — pending coach approval" sigil until the trainer gates it (assess-before-prescribe). Ends on first-session booking CTA → feeds 2.1 speed-to-lead. Reduced-motion: facet fly-ins → opacity/stagger crossfades, nothing lost narratively. | M | grill-me → orchestrator → design-router |

### Wave 4 — Deferred / gated (unchanged, deliberately)
4.1 Gamification-V2 RPG (business-DEFERRED — Marketing first; 1.2's PR events quietly warm the existing XP
engine so V2 lands on warm data later) · 4.2 ⚠ post-auth role router + SSO/passkey polish (Village if auth-core
touched) · 4.3 trainer/client DM w/ offer-help gate (only if it reinforces coaching, rule 62).

---

## Dependencies (build-order truth, updated)
- **−1.2 (draft-scope P1) → 0.2** (explicit, Kimi B4). **−1.3 audit → 1.4a → 1.4b.** Share-consent spec → 1.4b.
- **1.1 logger** is still the spine → 1.2, 1.3, 3.1 (data model), 3.2 (grounding data).
- **0.4 SSE spike** → 3.2 streaming promise (and informs 0.2 voice-result streaming).
- **3.1 thin template slice → 3.4 reveal.**
- **2.x runs parallel to Wave 1** (different surfaces); 2.3 read-only slice may precede 2.2; full 2.3 follows 2.2.
- **Design-lane capacity (Kimi minor):** Waves 1+2 in parallel plus the 14-surface design-overhaul program all
  pull the design-router lane — sequence slices so only ONE major design slice is in flight per agent at a time
  (rule 67 lanes are the mechanism).

## Operating protocol per wave (the brain, used)
- **Before each slice:** `rg -i "<topic>" docs/ai-workflow/CATALOG.md .ai-workflow/CATALOG.local.md` — prior
  decisions are pointers; open the source doc before acting (Rule 71). Kills re-research and rework.
- **Every new handoff/brainstorm doc** is born catalog-ready: frontmatter `decision:` / `status:` / `supersedes:`.
- **At each wave closeout:** rule-48 audit record + `node scripts/catalog-regen.mjs` + hermes-inbox memo — the
  wave's decisions enter the recall layer the day they're made.
- **Mobbin MCP gate** (rule 40) per net-new/major-redesign slice; receipts via `external-reference-mcp.md`.
- **Acceptance metrics** declared per item above are the `closeout-evidence-lock` payload (Kimi #10).

## What we still deliberately do NOT build (unchanged)
Re-confirmed existing features (streaks/badges/class detail/self-schedule/cart/leaderboard) · GPS/route cardio ·
live-studio social · generic feed noise (rule 62).

## Recommended first move (v2)
**Wave −1 in one batch** (verify+push inquiry button · land the P1 draft fix · run the completion-surface audit ·
put the money decisions in front of Sean) — almost pure shipping of finished work, and it de-risks both levers.
Then the standing fork, now cheaper on both sides: **1.1 logger spine** (unblocks the most product value) in the
coding lane while **2.1 coach-acquisition** enters `grill-me` (serves the #1 business focus) — non-colliding
surfaces (rule 67 lanes). Sean picks which gets HIS attention first; the plan no longer forces a single-lever choice.

---

## Kimi K3 co-review log
- **R1 (2026-07-21): SHIP-WITH-CHANGES** — 8 blockers + 2 minors, 10 ranked deltas, 10 confirmations of v2-over-v1,
  plus signature-moment upgrades for the four top surfaces. Full text:
  `KIMI-BUILD-PLAN-V2-REVIEW-R1-2026-07-21.md`.
- **Fable disposition:** all 10 deltas ACCEPTED and applied in-doc (this revision). Nuance on #1: −1.4 split into
  Sean-decides vs Village-gated-execution rather than blanket Village (the decision itself is not a billing write).
  Kimi's signature-moment upgrades adopted as design contracts in 1.1, 1.2, 1.4b, 2.1, 3.4, 0.2.
- **R2 (2026-07-21): SHIP — CO-SIGNED.** All 10 deltas verified RESOLVED, the #1 decide-vs-execute nuance
  ACCEPTED, all six signature-moment upgrades confirmed adopted without distortion, no new contradictions.
  Kimi co-signs this revision as the agreed plan superseding v1. Full text:
  `KIMI-BUILD-PLAN-V2-REVIEW-R2-2026-07-21.md`. Fable Final-Decider ratifies — **this doc is now the plan of record.**
