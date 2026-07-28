# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-CORE-PRODUCT-SURFACES-REVIEW-PACKET-2026-07-17.md
**Seed:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/023a7358-014c-4d44-b231-e8b8db3a61dd/scratchpad/fable-seed-session-findings.md
**Tokens:** 16859 in / 10925 out · **Cost:** ~$0.7148 · **Wall:** 154.8s

---

# FABLE 5 — FINAL RULING (fold verbatim into the packet as §1.5 "FABLE FINAL RULINGS — BINDING")

## (a) VERDICT

**LOCK-WITH-CHANGES.**

The packet is the strongest artifact of its kind this repo has produced: real `main` anchors, dormant-code flags, per-surface run model that respects the known Kimi output-budget failure, and a remit that forces authorship instead of critique. It is not shippable as-is for three reasons: (1) it reviews ten surfaces but omits the two surfaces where money and the client-side Core Loop actually live (storefront/checkout and the client Home/Progress view); (2) it lets Kimi produce three *parallel* planner blueprints over one backend when the correct ask is one *consolidation* blueprint — a wrong classification that would make Kimi build the wrong thing three times; (3) it flags the 4.7 monolith's 300-line violation but is silent on the other cap violators Kimi will touch (Logger 855L, `aiChatService` 2342L, `adminClientController` 1926L), which invites blueprints that assume compliant files that don't exist. Fold in §(d) below and it locks.

## (b) PAIN-CHART RULING — RATIFIED WITH ONE CORRECTION AND TWO TRAPS

**Ratified [VERIFIED]:** the anatomical BodyMap upgrade is merged (`c44755d6c`), mounted at every render site, and the anatomy PNGs return `200` from production today. There is nothing to push, and nothing may be deployed from `wip/comms-notifications` — it would regress the chart by ~756 commits. Opus's server-side work is correct.

**Corrected [LIKELY → reordered]:** "browser cache, fix with hard-refresh" is the *wrong primary suspect* for a symptom Sean describes as *persistent across sessions* ("never seems to reach production"). A one-time stale bundle doesn't survive weeks. The prime suspect is a **service-worker pin**: a registered SW (workbox / vite-plugin-pwa / hand-rolled) serving the pre-merge JS bundle from CacheStorage, which hard-refresh does **not** clear. Two secondary traps Opus under-weighted:

1. **The onLoad race in `BodyMapSVG.tsx:693-697`.** The anatomy layer only goes to `opacity 0.85` "once loaded." If the load state is set from an `onLoad` handler and the image is *already cached* (`img.complete === true` before the listener attaches), the handler never fires, the state stays false, and the **old-looking SVG outline renders forever — precisely on repeat visits**, which matches Sean's symptom better than any deploy theory. This must be checked before blaming caches.
2. **Render-site divergence.** `/body-map` is verified, but Sean may be looking at `ClientBodyMapModal`, `MeasurementEntry`, or `BiometricsTabContent`. Each embed must be grep-verified to import `components/BodyMap/index.tsx` (not a snapshotted/simplified variant) and to pass no prop that suppresses the image layer.

**Exact next action, in order (all direct-to-builder, no Kimi):**
1. Ask Sean the exact URL + role where he sees "the old one." (One question kills half the search space.)
2. Read `BodyMapSVG.tsx:660-720`: if image-loaded state depends on `onLoad` without an `if (imgRef.current?.complete) setLoaded(true)` guard, **that is the bug** — patch it (≤5 lines) and ship.
3. `grep -rn "serviceWorker.register\|workbox\|registerSW" frontend/src frontend/public frontend/index.html` on `origin/main`. If a SW is registered, verify `skipWaiting`/`clientsClaim` and bundle-hash cache-busting; if pinned, ship an SW self-destruct update.
4. Grep the three embed sites for their BodyMap import path.
5. **`bootcampPainAlerts.mjs`:** run `git log origin/main -- backend/services/bootcamp/bootcampPainAlerts.mjs` and grep `main` for imports of it. If `main` imports a file that was never committed, the bootcamp pain-alert path is **silently dead in production** — a real Phase-F gap, not WIP housekeeping. Either commit it (after review) or excise the import. It is NOT the cause of the chart symptom; it IS a live safety-feature gap. Resolve before Kimi's 4.9 run so the blueprint designs against truth.

## (c) WHAT THE PACKET MISSED

1. **Storefront / checkout / session packages — the money surface is absent.** `Order`, `OrderItem`, `StorefrontItem`, `SessionPackage`, Stripe reconciliation all appear as *dependencies* of 4.5 and 4.7, but the surface where money enters is not one of the ten. Sean would want this reviewed; revenue left on the table is by definition the largest "value left on the table."
2. **Client Home / Progress view — the client half of the Core Loop is absent.** §1 declares "Home first, then Progress one reach away" as the client north star, yet no client-facing dashboard/progress surface is in §4. Every reviewed surface is trainer/admin-weighted. The loop's "charts/progress proof" step for the *client* has no owner. Same for the loop's terminal step — **community share** has no surface anywhere in the ten.
3. **Planner misclassification (would cause a wrong Kimi build).** 4.3 as written invites three parallel upgrade blueprints. The correct ask is ONE consolidation blueprint (ruling in §(e)). Ditto 4.1 + 4.3 being run separately when they front the same backend — separate runs guarantee contradictory blueprints.
4. **300-line-cap violators unflagged outside 4.7.** `WorkoutLogger.tsx` (855), `aiChatService.mjs` (2342), `adminClientController.mjs` (1926), `EnhancedTrainerDataManagement.tsx` (1347). Any blueprint touching these must include a split layout or Kimi designs against fictional file shapes.
5. **`/api/workout/plans` legacy alias (4.3C)** is presented neutrally; unruled, Kimi may design *for* it. It must be marked deprecate-behind-adapter.
6. **White-label has no file anchor.** §2 and §5.9 assert the law but give Kimi no anchor for where client-type branding is resolved — Kimi cannot design white-label-safe PDFs/share images without it. Opus must ground this before the 4.3/4.4/nutrition runs (plan PDFs are the named bleed risk).
7. **§0 authority contradiction.** The packet crowns Kimi "final decider" while this ruling is binding. Resolve explicitly: Kimi is final on *design within* Fable's rulings; Fable's rulings are not re-openable by Kimi.
8. **4.10 retention purge is dry-run-only** and named only as a gap — it needs to be a mandated acceptance criterion, because "encrypted, retention-policied" intake that never actually purges is a trust/compliance claim the product isn't keeping.

## (d) CONCRETE FOLD-IN ADDITIONS (paste these)

**D1 — Into §4.9, after the 4.9-NOTE:**
> **FABLE RULING (binding):** The anatomical BodyMap is verified live in production (assets 200, merge `c44755d6c` mounted at all render sites). Do NOT re-design or re-litigate the current chart. Your scope is exclusively Phase E (dashboard integration completeness: one-tap client sidebar entry, pain feeding trainer next-best-action) and Phase F (active pain entries injected into `/api/workout-builder/generate` and `/api/bootcamp/generate` with contraindicated-exercise exclusion + flagging). Known truth: `bootcampPainAlerts.mjs` tracking status is being resolved before your run — design Phase F assuming the alert service exists and spec its contract explicitly. Any "why does prod look old" concern is closed: root cause is client-side (image-onLoad race / service-worker pin), already assigned direct-to-builder.

**D2 — Replace the 4.3 gaps paragraph with:**
> **FABLE RULING (binding): this is a CONSOLIDATION blueprint, not three upgrades.** Canonical = 4.3A (`admin-workout-planner`). 4.3B becomes a thin client-drawer shell over 4.3A's panels (shared components, zero duplicated save logic). 4.3C is deprecated: blueprint a propose-only deletion (Rules 32–39: grep evidence + Sean approval) and an adapter that 301s `/api/workout/plans` reads onto `/api/workout-plans` until removal. 4.1 (Workout Builder) is IN SCOPE OF THIS SAME RUN: it is the generation front-end to the same backend; decide whether it folds into 4.3A as a mode or remains a route that shares 4.3A's components. One backend contract, one save path, one activate path — trainer-gated everywhere. Deliver ONE blueprint covering 4.1+4.3A+4.3B+4.3C disposition.

**D3 — Into §4.2 gaps:**
> **FABLE RULING (binding):** `WorkoutLogger.tsx` is 855 lines — your blueprint MUST include its split layout (`WorkoutLoggerCore` engine + `*.styles.ts`/`*.logic.ts`/`*.types.ts` + role-shell adapters for client/trainer/admin/modal, each ≤300). Deliver a **logger parity matrix**: every capability (voice, offline queue, ghost prefill, rest timer, NASM rolodex, correctives) × four role variants, with the ruling that capabilities live in the core and shells only gate/skin. **The signature-upgrade slot for this surface is pre-assigned: the POST-SAVE HANDOFF** — the moment after `POST /api/workout-summaries` succeeds must render, in one screen with zero additional taps: (1) a Victory chart proving progress from the just-saved real data, (2) a next-best-action card, (3) a share affordance stub (see §5.5). State before→after tap counts for "log this set" and "save session → see proof."

**D4 — New §2 line, under Engineering law:**
> **Known 300-line violators you may touch** (blueprints touching them must include split layouts, not assume compliance): `WorkoutLogger.tsx` 855, `UniversalMasterSchedule.tsx` 1025, `EnhancedTrainerDataManagement.tsx` 1347, `adminClientController.mjs` 1926, `aiChatService.mjs` 2342. Dormant heavies (`NASMAdminDashboard` 1132, `EnhancedAdminClientManagementView` 2445) are deletion candidates — never design against them.

**D5 — New §5 items:**
> **10. Money-path integrity (fail-closed).** Three revenue rails: session deduction (4.7), Stripe reconciliation (4.5), pro-gating (4.10). Any blueprint touching them carries acceptance criteria proving no double-deduct, no fail-open booking, no unreconciled order state. A booking that errors must never consume a session credit.
> **11. Interim client next-best-action owner.** Until a Client Home surface is grounded and reviewed, the logger post-save screen (4.2, D3) is the canonical home of the client's next-best-action. Do not scatter it.
> **12. Coming next round (do not design for yet, do not contradict):** §4.11 CLIENT HOME/PROGRESS and §4.12 STOREFRONT/CHECKOUT will be grounded by Opus and appended. Leave seams (share affordance stub, next-best-action card contract) that they can plug into.

**D6 — Append to the §0.5 remit string:**
> "…Obey the shared brand/implementation law in §2 AND the Fable Final Rulings in §1.5 — the rulings are binding constraints and are not re-openable."

**D7 — Two §7 kill-check lines:**
> - Does every file you create OR modify end ≤300 lines, with the split layout specified where you exceed it?
> - Did you obey every §1.5 Fable ruling without re-opening it?

**D8 — Into §4.10 gaps:** "FABLE RULING: the retention purge going live (with an audit log of purged `coach_intake_items` counts, IDs only) is a mandatory acceptance criterion of this blueprint, not an optional gap."

**D9 — Task for Opus before the 4.3/4.4/4.8 runs:** ground the white-label branding resolution point (file:line where client type selects branding, esp. PDF generation) and add the anchor to §2.

## (e) SEQUENCE RULING

Per-surface Kimi review is **correct for design-heavy surfaces only**. Split the work:

**Direct-to-builder NOW (skip Kimi — mechanical, objective, no design authorship needed):**
- Pain-chart client-side fix chain (§b actions 1–5), including `bootcampPainAlerts.mjs` disposition.
- Nutrition client-ID picker replacing the raw numeric input (reuse the Client Hub picker; this is a bug fix, not a design question).
- `UniversalMasterSchedule.tsx` 1025-line mechanical split + **session-deduction fail-closed audit** (read `sessionDeductionRoutes`/`sessionController` for double-deduct/fail-open paths). Kimi reviews 4.7's booking UX *after* the split, against real files.
- Dormant-file deletion proposals (grep evidence packets for Sean's approval — Rules 32–39).

**Kimi, merged runs (one document each):** 4.1+4.3 as the single consolidation run (D2). 4.10 runs as a **delta** on the existing KIMI-COACH-CC verdict — remit says "build on your prior Crystallize verdict; do not re-derive."

**Kimi, standard per-surface runs:** 4.2 (with D3 pre-assignment), 4.6, 4.9 (Phase E/F only), 4.5, 4.8 (unification design — the picker fix will already be shipped), 4.4, then post-split 4.7.

**Deferred until Opus grounds them:** §4.11 Client Home/Progress, §4.12 Storefront — Kimi runs on those follow the same contract.

## (f) BUILD-PRIORITY RANKING (final)

| # | Surface | Why (value/money/risk on the table) |
|---|---------|--------------------------------------|
| 1 | **4.2 Logger (post-save handoff)** | The Core Loop's entry AND its broken handoff; every other surface consumes what this one produces. |
| 2 | **4.7 Master Schedule** | Direct money path; deduction fail-open = silent revenue leakage; 1025L monolith is the biggest engineering risk. |
| 3 | **4.10 Coach CC (Crystallize delta)** | Trainer-indispensability money surface; blueprint 80% exists — cheapest high-value execution. |
| 4 | **4.6 Client & Team** | The canonical client record is the moat; next-best-action home for trainer/admin. |
| 5 | **4.3 (+4.1) Planner consolidation** | Coherence debt: 3 live + 2 dead UIs over one backend is the top drift-bug factory. |
| 6 | 4.9 Pain Phase E/F | Safety + differentiation; pain→generation is a claim no competitor can fake — but the current chart already ships value. |
| 7 | 4.5 Admin Overview | Proof-of-value re-rank + landing decision (ruling: keep coach-first landing; make Overview one tap away with a next-best-action strip at top). |
| 8 | 4.8 Nutrition | Unification design (picker fix already shipped direct in the parallel track). |
| 9 | 4.4 Bootcamp/Sprint | Already the most polished; 375px month-view + floor-tap fixes only. |
| 10 | Dormant deletion sweep | Pure debt; propose-only; lowest urgency, do it opportunistically. |

**Single highest-leverage first move:** **the 4.2 post-save handoff** — save a real log → instant Victory proof + next-best-action + share stub, zero extra taps. It converts the app's most-used moment into the product's thesis, and it lights up §5 themes 1, 2, 4, and 5 in one build. (Parallel, same day, direct-to-builder: the pain-chart onLoad/SW fix and the deduction audit — they're de-risking, not competing.)

## (g) SINGLE HIGHEST RISK + DE-RISK

**Building from the wrong base.** The local working branch is ~756 commits behind `main`. A builder-bot that "executes to the letter" on that branch will faithfully produce code that regresses seven hundred commits of production — including the pain chart Sean already thinks is broken — and blueprints written against `main` anchors will half-apply, producing schema-drift-class bugs (Rule 58) in the models that four loggers and three planners already share.

**De-risk (mandatory, cheap):** (1) Every build task starts `git fetch && git checkout -b feat/<surface> origin/main` — write this into the builder's standing instructions and into each Kimi blueprint's first acceptance criterion ("branch base = origin/main, verified by `git merge-base`"). (2) Before blueprint #1 executes, Opus produces a one-page **canonical data contract** (exact live shapes + write paths for `WorkoutSession`, `WorkoutPlan`, `ClientPainEntry`, `DailyMacroLog`, `Session` deduction fields) appended to §2; every Kimi run and every builder task treats it as binding. Two hours of work; it inoculates all ten builds against the two failure modes that have actually bitten this repo before.

— **Fable 5. This ruling is final. Fold §(d) in, dispatch the direct-to-builder track today, run Kimi on 4.2 first.**
