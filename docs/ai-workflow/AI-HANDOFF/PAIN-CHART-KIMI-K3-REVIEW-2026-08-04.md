# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PAIN-CHART-CONSULT-PACKET-2026-08-04.md
**Seed:** (none)
**Tokens:** 3435 in / 9916 out | **Cost:** ~$0.1590 | **Wall:** 381.7s | **finish_reason:** stop

---

# Kimi K3 — Hostile Review: BodyMap Upgrade

## 1. Hostile Findings (NEW — not in the packet's inventory)

### P0 — safety-critical, fix before any pixels

**F1. The exclusion gate abandons chronic pain.** Auto-exclusion keys on `createdAt` within 72h. A 9/10 rotator-cuff entry logged 10 days ago, `isActive=true`, never resolved, excludes *nothing*. The safety system is optimized for acute injuries and silently ignores chronic ones — which are the majority of PT-client pain. C8 circles this but never names it: **`isActive` is decorative to the exclusion path.** Fix: exclusion = `isActive AND severity≥7 AND lastConfirmedAt within N days`, where trainer re-confirmation refreshes `lastConfirmedAt`. Unconfirmed stale high pain must degrade to "review required," never to "no constraint."

**F2. Self-resolution makes the gate client-gameable.** The AI command lane exposes resolve/update "with confirmation," and `track_my_pain` is client self-service. If a client can resolve (or downgrade) their own 8/10, the entire fail-closed pain gate is a client-controlled toggle — and clients *will* toggle it, because pain costs them exercises (see F9). Rule: any resolve or severity-reduction on an entry with `painLevel≥7` creates a *pending* resolution requiring trainer confirm; client-side it displays as "resolution requested."

**F3. Client-authored free text flows raw into LLM prompts.** `description`, `aggravatingMovements`, `relievingFactors` are client-writable and are interpolated into coach chat context. That is a prompt-injection lane and a PII-leak lane ("my boss at Acme fired me and my back…") that the de-identification layer never sees because it only buckets structured fields. All client free text must be length-capped, delimiter-wrapped (`<client_reported>`), and stripped of prompt-shaped content before interpolation. The packet's "zero PII to LLM" invariant is currently honored only for fields the client can't type into.

### P1 — truth/logic failures

**F4. Duplicate same-region active entries have undefined gate semantics.** Nothing prevents five active "left shoulder" entries at severities 3, 5, 7, 9, 4. Which one drives exclusion — max? latest? first? If it's nondeterministic (it is — no ORDER BY is specified in the inventory's gate description), the same client gets different plans run-to-run. Define: gate input = `MAX(painLevel)` per (region, side) among active entries; trend input = latest episode (F6). One rule, documented, tested.

**F5. Severity conflates rest pain with load pain.** A single 1–10 collapses "hurts at rest" (contraindication) and "hurts at 80% 1RM" (modification). The planner treats both identically. Add one field: `painContext: rest | daily_activity | loaded_movement` with default `loaded_movement`. Rest pain ≥4 escalates the warning tier; this is one enum column and one prompt line, and it meaningfully changes plan safety.

**F6. No episode model — this is the root cause of B11 and C5, and the packet treats them as separate bugs.** Pain is episodic; the schema is a flat log. Without `episodeId` (or a `parentEntryId` flare-up chain), per-region trends will *always* lie, no matter how nice the Victory chart is. Migration: add `episodeId UUID`, backfill by clustering same-region entries with gaps <30 days, new-entry flow offers "new issue" vs "flare-up of existing" when an active/resolved same-region entry exists.

**F7. No audit trail on severity edits.** A trainer (or client, via update lane) can edit a 9 down to a 3 and the 9 never existed. For a safety-critical, liability-bearing record this is indefensible. Append-only `pain_entry_revisions` (entryId, changedById, old/new values, timestamp) — cheap table, huge legal and coaching value.

**F8. The system punishes honesty.** Product-level failure nobody flagged: reporting pain → exercises removed → harder workout withheld. Clients learn within two weeks that the pain chart is a *restriction machine* and stop reporting. Every downstream gate then runs on fabricated "all clear" data, and the trainer dashboard shows green. Mitigations are design, not copy: (a) pain reporting must visibly *produce* something (corrective work, modified plan framed as upgrade); (b) never render pain as the reason a plan got easier in client-facing text; (c) post-workout check-in framed as performance data ("how did the shoulder respond under load today?"), not injury confession.

**F9. Data starvation via friction.** 11-field form (B6) means clients log ~nothing, trainers backfill from memory. An 11-field form behind a 46-hotspot map behind a dashboard tab is three friction layers deep. Safety gates on empty data are safety theater. Fix = 2-tap quick-log (region → severity → done, everything else progressive disclosure) + post-workout prompt (Slice 5) + trainer in-session logging shortcut.

**F10. Fixing C1 is itself a behavior-change event.** The day the ontology goes from 16→50 mapped regions, generated plans for existing clients silently change — exercises vanish, trainers get angry client messages, nobody knows why. Ship the ontology behind a per-client "first-fire" notification to the trainer ("New: 2 exercises now excluded for region X — mapping added 2026-08-XX") and a changelog. Silent safety upgrades read as product bugs.

### P2

**F11. Hit-inflation is computed in viewBox units (r≥22 in 200×320), so it's wrong at every zoom level except 1×** — at 5× zoom the inflated targets are ~110px monsters overlapping everything; at 0.8× they shrink below 44px. Hit targets must be computed in screen pixels against the inverse transform. The inventory's B1 fix (resizing ellipses) doesn't address this.

**F12. No bilateral side value.** Bilateral lower-back pain becomes two entries → counted twice in dashboards, and the trend chart shows two series for one complaint. Add `bilateral` to the side enum (UI: tap center line or both sides).

**F13. Evidence media is ungoverned.** C9 covers columns; nobody covers the *files*. Client-uploaded photos/videos of bodies are sensitive media with no stated retention, encryption-at-rest, access scoping, or deletion-on-resolve policy. Define all four before the dedicated head-photo upload (A4) doubles the surface.

**F14. `onsetDate` is never reconciled with `createdAt`.** Client logs today, backdates onset 3 weeks — does the 72h exclusion fire (createdAt) or not (onset semantics)? Trend uses which? Rule: exclusion windows key on `createdAt` (system trust), trends display `onsetDate`, future dates rejected at validation.

### P3

**F15.** Client-visible risk badge: verify its derivation excludes trainer-only fields (posturalSyndrome). If a UCS diagnosis nudges the badge, clients can infer trainer-only data by badge-watching. One-line audit, cheap.

**F16.** No baseline intake: nothing forces an initial pain map at client onboarding, so "no entries" is indistinguishable from "never asked" — which is *exactly* the ambiguity the fail-closed `pain.status` gate exists for. Make first-plan generation require an explicit map pass ("tap any region with pain, or confirm none") so `pain.status` becomes known instead of unknown-but-tolerated.

**F17.** Region allowlist headers both claim 48 while holding 50 — after C11's single-source fix, generate the header comment from the array length so the lie can't regrow.

---

## 2. UI/UX Upgrade Spec (dark-first, premium)

### 2.1 Figure rendering strategy — kill the hybrid

The PNG-over-vector stack is the root of A3 and B1: two geometry sources that can't agree on where a head is. **Decision: single-source vector figure.** One hand-tuned SVG (front/back, male/female/neutral) with subtle muscle shading via layered linear gradients (Midnight Sapphire base → Ice Wing rim light at 12% opacity), 1.5px Frost White strokes at 40% opacity. Hotspot paths are *derived from the same path data* as the visible anatomy — geometry has exactly one author. If Sean insists on photorealism, the PNG becomes a strictly decorative underlay with `pointer-events: none` and the vector defines all interaction geometry; never the reverse.

Head photo: anchored to the vector head path's bounding box (`getBBox()` at runtime, not hardcoded cx=100/cy=24), clipPath id = `useId()` (kills A6), fallback chain: dedicated body-map photo → profile photo → Frost White initial glyph on Obsidian. Dedicated upload: `POST /api/users/:id/bodymap-head-photo`, square-crop UI, min 256px, governed by F13 retention policy.

### 2.2 Hotspot interaction — level-of-detail + disambiguation

Overlap at 44px is unsolvable by shrinking targets; solve it with **zoom-coupled region granularity**:

| Zoom | Regions shown | Example |
|---|---|---|
| 1–1.5× | 18 macro regions | "Shoulder" |
| 1.5–3× | 34 regions | "Rear delt" / "Rotator cuff" split apart |
| 3–5× | all 46 | Sub-regions, labels ≥12px |

Hit-testing in **screen space**: on pointerdown, convert to figure coords via inverse transform; inflate to 22 *screen* px (F11). If >1 candidate: don't guess — show a disambiguation chip row:

```
┌─────────────────────────────────────┐
│ Which area?                         │
│ [ Biceps ] [ Elbow ] [ Forearm ]    │
└─────────────────────────────────────┘
```

Severity encoding (B8) — color is now a *redundant* channel:
- **Numeric badge** on every active hotspot (1–10, 11px Frost White on Obsidian pill) — the truthful channel
- Color steps made non-adjacent: 1–3 Ice Wing outline · 4–6 Gilded Fern, dashed stroke (pattern channel) · 7–8 Wing Purple filled · 9–10 Wing Purple filled + double halo + slow pulse (pulse *only* ≥7; `prefers-reduced-motion` → static halo)
- Halo thickness scales with severity; Arctic Cyan stays charts-only per design law

### 2.3 Zoom/pan

Per-panel transform state (B2): `useTransformStore(panelId)`. Container: `touch-action: pan-y` — vertical page scroll lives, two-finger pinch handled in JS (B3). Visible affordances (B4): floating +/−/reset cluster, double-tap = zoom to tapped region's bbox at 2.5×. Zoom persistence per session, not per refetch (B5: keep figure mounted, skeleton only the data layer).

### 2.4 Entry flow — 2-tap quick log

```
MOBILE BOTTOM SHEET (real dialog: role="dialog", aria-modal,
focus trap, Escape, drag-to-dismiss on the handle, inert when closed)

Step 1 (auto-open on region tap):        Step 2 (progressive, skippable):
┌───────────────────────────┐            ┌───────────────────────────┐
│ Left Rotator Cuff         │            │ Type      [sharp][ache]…  │
│ How bad right now?        │            │ When      (rest)(daily)(  │
│ ┌───┬───┬───┬───┬───┐     │            │            loaded) ← F5   │
│ │ 1 │ 2 │ 3 │ 4 │ 5 │     │            │ Side      [L][R][Both]    │
│ ├───┼───┼───┼───┼───┤     │            │ ▸ Details (date, factors, │
│ │ 6 │ 7 │ 8 │ 9 │10 │     │            │   notes — collapsed)      │
│ └───┴───┴───┴───┴───┘     │            │ [ Save ]                  │
│ 48px targets, radiogroup  │            └───────────────────────────┘
│ [ Save ]  ← DONE IN 2 TAPS│
└───────────────────────────┘
Existing same-region entry? Banner: "Flare-up of your Jan shoulder
issue, or new issue?" (episode model, F6)
Severity ≥7 client-side: "Your trainer will review this before your
next session." (sets pending-confirm state, F2 — framed as care, not
restriction, F8)
```

Desktop: same component as a right-side panel, not a modal — the figure stays visible for cross-referencing.

### 2.5 Insight panel IA

```
DESKTOP: [FIGURE front|back] [INSIGHT RAIL 360px]
┌─ INSIGHT ─────────────────────────────────────────┐
│ Risk badge (trainer-derived; client-safe copy)    │
│ ┌─ Region episodes (cards, not one list) ───────┐ │
│ │ ■ L-Rotator Cuff · 8/10 · active · ep. #2     │ │
│ │   Victory line: THIS EPISODE ONLY, dated x-   │ │
│ │   axis, y 0–10, flare markers ▲, resolved     │ │
│ │   episodes as collapsed gray cards            │ │
│ │   Δ badge: "▲ +3 vs 14d ago" (backend-computed│ │
│ │   fact, C5 — never chart-inferred)            │ │
│ └───────────────────────────────────────────────┘ │
│ Modifications (from ontology w/ provenance):      │
│  "Excluded: overhead press, lateral raise         │
│   (auto: region→muscle mapping)"                  │
│  — or truthful: "No auto-exclusions; this region  │
│   isn't mapped. Trainer review flagged." ← C1 fix │
│ Tabs: proper tablist/tabpanel/aria-controls/      │
│   arrow keys (B9). No prompt fragments anywhere   │
│   (B10) — client copy is a separate template.     │
└───────────────────────────────────────────────────┘
```

### 2.6 Accessibility remediation (B7)

Roving tabindex: figure = one tab stop, arrow keys move between regions (`role="listbox"`, regions `role="option"`, `aria-label="Left rotator cuff, severity 8, active"`). Full **list alternative view** (toggle: Map | List) — a table of regions/severities that is the primary surface for screen readers and power users. Labels ≥12px at LOD tiers, announced via `aria-live="polite"` on selection. Error/alert text in `role="alert"`. Trend charts get `aria-describedby` with the computed delta sentence.

---

## 3. Feature-Logic Enhancements — ranked

Scoring: safety (S), coaching value (C), revenue/retention (R).

1. **Episode model + per-region flare detection** (S10/C9/R6). F6 migration + trend service computing per-episode deltas; flare = `latest − min(prior 3) ≥ 3 within 30d` or any new ≥7. Feeds prompt as computed fact (C5), feeds trainer digest. Everything else truthful depends on this.
2. **Exclusion-gate semantics repair** (S10/C7/R4). F1 (isActive honored, lastConfirmedAt window), F2 (trainer-gated resolution ≥7), F4 (MAX-per-region rule). Small diff, largest safety delta in the whole upgrade.
3. **Post-workout pain check-in loop** (S8/C9/R8). C6 fix: after each logged session, one 3-tap prompt per region flagged in the plan ("Shoulder under load today: 0–10?"), writes `WorkoutExercise.painLevel` (stop hardcoding 0), delta ≥3 or ≥7 → *candidate* entry + trainer notification (never auto-creates — trainer confirms). This converts the highest-frequency touchpoint from blind to sensing, and frames pain as performance data (F8).
4. **Ontology completion with provenance and honest over-claim removal** (S9/C7/R3). C1: full 50-region→muscle table as data (not code), unit test asserting every allowlisted region maps ≥1 muscle (locks C11 too), explanation strings that state what was excluded *and why*, and fail-visible "unmapped" parity with bootcamp. Ship with F10 first-fire comms.
5. **NASM corrective chain activation** (S6/C8/R7). C7: `PainEntryCorrectiveExercise` becomes the warmup source for entries with posturalSyndrome, trainer-selectable per entry, injected into plan generation as the *visible positive output* of pain reporting (F8 antidote — pain produces corrective work, not just removals).
6. **Identity pipeline** (S5/C6/R8). A1 (gender from client-profile endpoint on all mount paths), A2 (userId prop is the single source of truth for figure/photo/entries — kill global-selection reads inside BodyMap), neutral figure as **default** with male/female opt-in (A5: neutral renders for non-binary/unset/prefer-not-to-say; never silently male), dedicated head photo (A4, F13 policy).
7. **Trainer pain command surface** (S7/C9/R7). Digest card on trainer dashboard: worsening this week (from #1), stale-active needing re-confirm (from F1), unmapped-region entries, pending client resolutions (F2). This is the retention surface — it's what makes the trainer *feel* the system working.
8. **Append-only revision history** (S6/C5/R2). F7. Cheap, liability-critical.
9. **Audit hardening bundle** (S5/C2/R1). F3 prompt sanitization, F15 badge derivation, C12 trainerId applied, F14 date rules.

Deprioritized: muscle/bone label toggle (keep, fix legibility), video evidence (govern it, don't expand it).

---

## 4. Coach Hive-Mind Wiring Plan (minimal diffs, §5 invariants preserved)

```
                        ┌──────────────────────────────┐
                        │  painIntake service (NEW)    │
                        │  single validate+create path │
                        │  · region allowlist (1 file, │
                        │    test-locked)              │
                        │  · level 1–10 coercion ERROR │
                        │  · F3 free-text sanitizer    │
                        │  · episode linking (F6)      │
                        └──────────────▲───────────────┘
          ┌────────────┬───────────────┼───────────────┬──────────────┐
          │ REST CRUD  │ track_my_pain │ AI command    │ quick-log /  │
          │ (existing) │ (C3 fix: route│ lane (resolve │ check-in API │
          │            │ through same) │ ≥7 → pending, │ (logger, C6) │
          │            │               │  F2)          │              │
          └────────────┴───────┬───────┴───────────────┴──────────────┘
                               ▼
                    client_pain_entries (+episodeId,
                    +lastConfirmedAt, +painContext)
                               │
              ┌────────────────┼─────────────────────────┐
              ▼                ▼                         ▼
   painTrendService (NEW)  exclusion gate            context builders
   per (region,episode):   isActive AND sev≥7 AND    · masterPromptBuilder:
   delta, flare, staleness lastConfirmed ≤ N days    · isActive=true ONLY (C2)
   → computed facts table  → planner + bootcamp      · strip aiNotes/postural
   (read-only to prompts)  (unchanged fail-closed,      Syndrome from prompt (C2)
                            fail-visible, untagged    · inject trend facts as
                            fail-safe — §5 intact)      computed lines, not prose
                                                      · chat: active + recency
                                                        buckets + Δ (C4)
                               │
                               ▼
              Trainer digest (new route, admin query
              gets trainerId applied — C12)
```

Non-negotiables: proposal lane gains **zero** pain writes (§5); client redaction layer untouched; de-identification stays upstream of every prompt builder; `pain.status` fail-closed gate is not refactored, only fed better data; every new prompt input is a *computed fact from a service*, never raw rows.

---

## 5. Three Ways the Upgraded Feature Still Fails

**1. The honesty economy defeats every gate.** F8 is a mitigation, not a cure. Clients who learn that "7" costs them their favorite lifts will report 3s, and trainers managing 30 clients will rubber-stamp re-confirmations to clear their digest queue. Six months post-launch the dashboards glow green, the gates all pass, and the data is fiction — worse than today's empty data, because it's *confident* fiction. The system has no ground-truth source; every number is self-report from an incentivized liar. Watch for it via the check-in delta: if logged-session pain (3-tap, low stakes) consistently exceeds map entries, the map is lying.

**2. The fail-safes get trained out of the trainers.** Untagged-exercise fail-safe + completed ontology = plans that lose 30% of their exercise pool overnight (F10). Trainers experience this as the product getting *worse*, and the available workarounds — resolving entries, lowering severities, tagging exercises sloppily to escape the fail-safe — all degrade safety while looking like normal usage. Safety mechanisms that fight the user's goal get routed around, and the routing-around is invisible in analytics unless you specifically instrument "resolve-within-24h-of-exclusion" events. Instrument that, or the safety layer becomes opt-in in practice.

**3. Quantified trend lends false authority to noise.** Once F6/C5 ship, the model receives "shoulder: 4→7 over 21d" as a *computed fact* — and computed facts from sparse, noisy, self-reported 1–10 data get treated by both LLM and trainer as clinical signal. One bad check-in (client fat-fingered an 8 while rushing out of the gym) generates a "worsening" alert, a modified plan, and a trainer conversation about a flare that never happened. The Δ badge needs a sample-size/confidence qualifier ("based on 2 check-ins") and the trend service must require ≥2 points before emitting any delta — otherwise you've replaced the lying chart (B11) with a lying statistic.

---

## 6. Build Order — independently shippable, safety-first

**Slice 0 — Gate integrity hotfixes** *(days, deploy individually, no schema work)*
C2: `isActive` filter + strip aiNotes/posturalSyndrome from `masterPromptBuilder`. C3: route `track_my_pain` through REST validator. F3: sanitize client free-text in all prompt builders. F1: exclusion honors `isActive` (stop 72h-only decay). F2: ≥7 resolve/update → pending-confirm. C9 encryption column list. C12 trainerId applied. **Exit:** verified-execution tests reproducing each original failure now pass; §5 invariants re-verified untouched.

**Slice 1 — Truthful constraints** *(1 sprint; schema: `lastConfirmedAt`, `painContext`, region→muscle table as data)*
Ontology 50/50 with coverage test (locks C11), MAX-per-region gate rule (F4), unmapped fail-visible parity + provenance explanations + over-claim removal, F10 first-fire trainer notification, F14 date rules, C10 model/migration reconcile. **Exit:** every intake region demonstrably constrains a generated plan or fails visible; behavior-change comms shipped with it.

**Slice 2 — Identity pipeline** *(1 sprint; Sean's stated priority, revenue-visible)*
A1/A2 (userId prop = sole source; gender from profile endpoint on all mounts), A5 neutral-default figure, A6 `useId()` clipPaths, A3 geometry-anchored head clip, A4 dedicated upload + F13 media governance. Vector single-source figure (2.1) lands here. **Exit:** wrong-client bleed impossible by construction (prop-less render throws in dev).

**Slice 3 — Interaction overhaul** *(1–2 sprints; pure frontend, flag-gated)*
LOD hotspots + screen-space hit test + disambiguation chips (B1/F11), per-panel zoom + touch-action + controls (B2/B3/B4), mounted-during-refetch (B5), real dialog bottom sheet + 2-tap quick log (B6/F9), severity multi-channel encoding (B8), a11y: roving tabindex, list alternative view, tab ARIA, live regions (B7/B9), token sweep + file splits (B13). **Exit:** 44px targets at all zoom levels verified on device; axe clean.

**Slice 4 — Truth layer** *(1 sprint; schema: `episodeId`, revisions table)*
F6 episode migration + flare-up UX, F7 audit log, per-region dated Victory trends (B11), painTrendService + computed-fact prompt injection (C5/C4), B10 prompt-fragment removal, B12 guidance keyed to ontology. **Exit:** "worsening" claims in any surface trace to ≥2-point computed deltas (guards failure-mode 3).

**Slice 5 — Closed loop** *(1–2 sprints)*
C6: check-in API + `WorkoutExercise.painLevel` write/read, candidate-entry flow with trainer confirm, trainer digest surface (#7), C7 corrective-chain wiring as pain's *positive* output (F8 antidote). **Exit:** logger→entry→intelligence→plan→dashboard round-trip demonstrated end-to-end with a flare scenario.

Each slice ships behind its own flag, touches disjoint files where possible, and leaves the system strictly safer than before — Slice 0 alone is worth shipping this week even if nothing else ever lands.
