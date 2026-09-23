# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 18416 in / 25196 out (reasoning: 21050) | total 43612
**Wall:** 679.3s

---

VERDICT: **REVISE** — the audit is trustworthy and the resolved-strings doctrine is right, but the drill data contract, the portal/theming interaction, the loading-state contradiction, and a test spec that cannot run in its own environment will each produce broken builds if a worker executes this verbatim.

---

## FINDINGS (most severe first)

**1. BLOCKER | §7, §8.4, §9.3, §10.3 | The drill data contract is undefined, and §0's "No new endpoints" forbids the natural fix.**
A weekly-volume drill needs "Mon · Lower · 1,900 lb" session rows. The canonical handlers (`chartDataController.mjs:131-853`) return *aggregates*; session-level rows are not in the payload. Failure scenario: worker implements `drill(index)` honestly → every `entries` array is empty (10.3.8 forces the cold-start line) and "every chart clickable" ships hollow — the exact failure §13 Round 2 flagged and then dismissed with a contract that has no data behind it; or worse, the worker fabricates plausible rows, violating the real-data rule. Meanwhile §10.6 demands "drill sheet lists that session," which is unbuildable as specced. **Fix:** name the entry source per chart now: either add row-level arrays to the existing 15 handler payloads (a controller change, not a new endpoint — say so explicitly to release the §0 constraint), or spec reuse of the existing session-history endpoint per drill with a loading state, and make `drill` return `SwanDrillDatum | Promise<SwanDrillDatum>`.

**2. BLOCKER | §6.2, §7, §8.4 | Portals escape the themed DOM subtree, so the resolved-strings doctrine silently fails exactly where the plan adds new chrome; the inline-in-modal drill mode doesn't exist; two focus traps will fight.**
`SwanChartDrillSheet` is a portal (to `document.body`), and `ChartExpandModal` already portals; custom properties inherit through the DOM tree, not the React tree, so token-driven colors inside portal content resolve to nothing → the fail-closed fallback fires and the sheet/expanded chart silently render default-brand colors under an active lens. Compounding it: §7 bans modal-over-modal and says drilling inside the expand modal "replaces the modal body" — but `SwanChartDrillSheet` is only specced as portal/bottom-sheet/side-panel; there is no `inline` variant, no owner for the breadcrumb, and no spec for focus return *into* the modal. **Fix:** mandate a swan host element (or `:root`-promoted lens vars) inside portal content; add `variant="inline"` with breadcrumb ownership; spec focus-return target when the trigger lives inside an open modal.

**3. BLOCKER | §6.2 animation row vs §7 / §8.5 / §9.4 / §10.2.5 | Ready→loading is specced two contradictory ways.**
§9.4: "ready → loading: range change (keep last frame, no re-animate)." §7 anatomy, §8.5, and test 10.2.5: loading renders `SkeletonChart`. Failure scenario: user changes range on a ready card → per one half of the spec the chart blanks to a skeleton and repaints — a visible regression versus every chart shipped today. The worker must pick one; either choice violates the other. **Fix:** add a third state (or `previousRows` on loading); 10.2.5 asserts skeleton only when no prior frame exists.

**4. BLOCKER | §10.1.2, §10.1.5, §10.2.1, §10.2.6, §10.2.9, §10.3.5 | Four specced tests cannot run in vitest/jsdom, and the computed-style pipeline has no test that can fail.**
jsdom has no `ResizeObserver` (10.2.6 hangs unless a mock is specced — the blueprint never mentions one), no viewport to resize (10.3.5), zero-size `getBoundingClientRect` (10.2.1's primary method is dead; the styled-CSS fallback depends on stylesheet cascade in jsdom, which is unreliable), and stylesheet-declared custom properties do not cascade into `getComputedStyle` [UNSURE — recent jsdom may support inline-only custom props]. Worst part: 10.1.2 and 10.1.5 will pass *vacuously* against the fallback constants — they cannot distinguish "resolution works" from "hook always falls back." The entire color proof currently rests on the manual post-deploy probe in §11. **Fix:** split the spec into jsdom-safe assertions (theme object shape; fallback resolution with an inline-style-seeded host div) and Playwright assertions (computed stroke, RO resize, sheet variant); name the RO mock in the test-setup file; and pull the unread Style-Lens test-seeding API (§13 residual risk) into a T0 prerequisite, not a worker discovery task.

**5. HIGH | §6.2 animation row | "600ms on-load only, never re-animate on refetch, key by id" is not expressible as written, and no test asserts the non-re-animation.**
With a stable key and a persistent `animate` prop, Victory animates data *updates*; keying by data remounts and replays onLoad. The spec's mechanism column is empty. Failure scenario: every range change/refetch plays a 600ms animation across 15 cards, or the worker keys by data to stop it and violates the spec the other way. **Fix:** pin the exact Victory-37 mechanism (e.g., `animate={{onLoad:{duration:600}}}` only — verify against the installed version) or a mount-scoped animate flag, and add the missing assertion: re-render with new rows → no animation attributes added.

**6. HIGH | §7 events contract | The keyboard path on data marks is dead code that 10.3.1 will happily certify.**
SVG data marks have no `tabindex`/`role` — the blueprint never mentions Victory `accessibilityProps` — so focus can never land on them and `onFocusIn` never fires. [UNSURE — Victory's support for an `onFocusIn` event name may also not exist; but without tabindex it is moot.] Failure scenario: 10.3.1 passes (it only inspects the events array), the shipped chart is keyboard-dead on marks, and nobody notices because the table path works. **Fix:** either add `accessibilityProps` in `swanChartEvents` and test real focus behavior, or delete `onFocusIn` from the contract and declare the data table the only keyboard path (§9.3 already draws it).

**7. HIGH | §6.1 | The lightness-band override's mitigation is vaporware.**
The ruling accepts the band FAIL on brand authority and claims mitigation via "legend AND direct labels" — but there is no direct-label prop, no render guidance, no frame mechanism (the frame cannot introspect the opaque `renderChart` tree), and no test. Failure scenario: a 2-series NASM chart ships with legend only or neither; the accepted deviation lands with zero mitigation and CI stays green. **Fix:** make the mitigation mechanical: a required `seriesCount` declaration per chart body; frame throws in dev when `seriesCount ≥ 2` without `legend`; direct labels specced (hero size only, end-of-line) or honestly dropped from the ruling.

**8. HIGH | §6.1 | Slot 1 vs slot 4 is an unvalidated pair, and the status row contradicts itself in the same table.**
`#50A0F0` and `#4070C0` are both blue-family and co-occur in any 4-series chart, but the validator evidence cites only worst *adjacent* ΔE — the all-pairs case was never run. Separately, warn = Gilded Fern = series-3 and info = Swan Lavender = series-4, directly contradicting "never reused as a series" one line below. Failure scenario: a warn annotation on a gold-goal chart reads as a second goal; a 4-series chart shows two near-identical blues. **Fix:** run all-pairs CVD now; give warn its own token or document the collision as accepted; if 1v4 fails, swap slot 4 or cap series at 3.

**9. HIGH | §3.3 D7 + §10.6 | The TTL cache as specced breaks the marquee e2e and post-save freshness, and the naive AbortController is wrong for shared requests.**
Failure scenario: 10.6 logs a workout, navigates to the grid within TTL → cached payload lacks the new session → "last row equals logged volume" fails; in production, users who just logged see stale charts. And if two mounts share an inflight request and one unmounts, aborting kills the survivor's data. **Fix:** refcount inflight requests; invalidate on the workout-save mutation (or refetch-on-mount after any write); assert staleness in the D7 test.

**10. HIGH | §10.4 + §9.5 T8 | The guards are name-vacuous, and their enforcement is scheduled into the slice with human dependencies.**
G1 bans `victoryTheme`/`DETAILED_AXIS_STYLE`/`forgeVictoryTheme`, but the audited files are `chartTheme.ts`, `detailedChartTheme.ts`, `forgeChartTheme.ts` — the actual export symbols were never verified, so the guard can pass forever while the real imports continue. G3 is a raw grep that cannot evaluate `animate={expr}`. And warn→error rides T8, which contains Sean-gated deletions — a human approval on the critical path of enforcement. Failure scenario: guards normalize as noise for months; T8 slips; the doc's title claim ("regression impossible") is never true on any given day. **Fix:** re-grep real symbols before T0; make G1/G3 import-path or AST rules; flip guards per-tier as each surface's glob completes; get the T8 deletion list pre-approved at T0.

**11. MEDIUM | §5, §11 T0.6, §10.2.10 | The strangler direction is correct, but the plan hedges it into incoherence.**
Home at `components/Charts/swan/` is right: 34 importers anchor there, the Forge catalog itself defers a chart adapter, and Forge has 0 consumers so the re-export is free. But `forgeChartTheme.ts` has no assigned fate: kept (to keep `forgeChartTheme.test.tsx:36` green) it survives as a 10th theme source, contradicting the entire premise; deleted, T0 is red. And the `ForgeChart` alias is un-guarded, so new code can keep importing the old name forever. **Fix:** port the theme assertion into `swanChartTheme.contract.test.ts`, delete `forgeChartTheme.ts` in T0, mark the re-export `@deprecated`, and extend G1 to reject *new* `ForgeChart` imports outside `ui/forge/`.

**12. MEDIUM | §7 | `renderChart` relocates drift rather than preventing it.**
Nothing bans importing `useSwanChartTheme` inside a render body (G1 doesn't cover it), nothing stops hand-built theme objects, and nothing manages `renderChart` identity. Failure scenario: a NASM body calls the hook directly (works today, drifts tomorrow); unstable inline closures remount the Victory subtree on every parent render → jank + animation replays across a 15-card grid. **Fix:** brand the theme/palette types (nominal types constructible only inside `swan/`) so `ctx` is the *only* obtainable source; require module-level or `useCallback`-stable `renderChart`; add a render-count test.

**13. MEDIUM | §7 interaction contract | "Invisible ≥44px-equivalent stroke" is undefined and harmful; the voronoi container already solves this.**
12 points in a 240px plot get overlapping 44px hit circles → ambiguous clicks; 12 weekly bars at ~25px can never reach 44px; 10.2.1 excludes marks, so nothing verifies the claim. **Fix:** line/scatter activation via the voronoi container's nearest-datum targeting (no fat strokes); bars get full-column targets via `domainPadding`; define "clickable" for marks as voronoi-resolved, not 44px-rectangle.

**14. MEDIUM | §5 fusion + §7 | `ChartExpandModal` is specced "unchanged" with `renderChart(w,h)`, but `SwanChartProps.renderChart` takes a ctx object.**
Failure scenario: worker passes positional `(w,h)` → type error; or builds a ctx without events → expanded chart loses drill, violating "every chart clickable"; or with events → trips finding 2's banned modal-over-modal. **Fix:** spec `buildRenderCtx(w, h, {suppressDrill})` for the modal; drill inside the modal renders the inline variant. On the two-affordances question itself: keep both — expand is spatial zoom, drill is record detail, and cutting expand regresses shipped SWA-68 S1 — but only with this adapter contract in place.

**15. MEDIUM | §11 T3 + §11 T0.4 | T3's file layout is unbudgeted and the drill copy map is under-scoped.**
14 renderChart bodies from a 1137-line file have no named modules; `drillCopy.ts` is "15 canonical ids" while NASM keeps ≥2 non-canonical charts that also need `whyText`. Failure scenario: worker invents ad-hoc locations, breaks the 300-line cap mid-slice, and 10.3.7's copy regex fires on missing ids. **Fix:** name the chart-body modules in T3 and extend the copy map to the NASM-only ids.

**16. MEDIUM | §7 ctx | The 15 non-Victory charts (pure CSS/SVG: `SystemAnalyticsViz`, `ProgressRing`, `MetricConstellation`, `ConsistencyHeatmap`) have no path to the drill.**
`containerComponent` and `events` are Victory-only; ctx exposes no imperative handle. Failure scenario: T7 worker wraps a CSS-bar chart, has nothing to call on click, and hand-rolls a second sheet — frame system #8 reborn. **Fix:** add `activate(datumIndex: number)` to `SwanChartRenderCtx`; test that a CSS-bar chart opens the same sheet.

**17. MEDIUM | §7 + §10.3.1 | Victory data-target `index` is a string ("3", or "1-2" under groups/stacks); `drill` takes `number`, and the test feeds `{index:3}`.**
Failure scenario: first grouped/stacked chart yields `Number("1-2") = NaN` → `drill(NaN)` → wrong or empty datum. **Fix:** spec the parse (split on `-`, series-aware) and test with a grouped dataset.

**18. MEDIUM | T6 vs T8 | The `hardware` skeleton variant merges into `SkeletonChart` at T8, but its single consumer's surface migrates at T6.**
Failure scenario: T6 worker either keeps a half-dead file for two more tiers or inlines a duplicate variant (new divergence). **Fix:** move the variant merge into T0 or the first tier that touches its consumer.

**19. LOW | §9.5 T4 | The merged registry's gating model is unowned: `requiresPro` vs `SafeChart` gating — not `[SEAN]`-marked.**
Failure scenario: worker silently drops `requiresPro` → pro charts leak to free profiles (paywall regression). **Fix:** registry entries as `{path, gate}`; contract test that pro ids still gate post-merge.

**20. LOW | §7 + §10.5 | Two small holes: (a) the plot host has no pre-measurement state — `renderChart` before the first RO callback gets width 0 (Victory renders blank/warns); (b) the PII capture guard covers the card only, while the expanded modal's data table and the new footer buttons are capture-adjacent surfaces. **Fix:** renderChart only when `width > 0` (aspect-ratio placeholder first); extend the PII guard to assert the capture root excludes table/drill subtrees and every new action button carries `data-no-capture`.

---

## WHAT THE PLAN GETS RIGHT

- **The resolved-strings doctrine with fail-closed validation, fallbacks, and the "lying-gate" positive control (10.1.5)** — the single most important correctness idea in the document, and correctly identified as the thing every other decision hangs on.
- **The audit's honesty discipline**: re-deriving "0 consumers" with `<Name([[:space:]/>]|$)` and path-based lazy resolution, and counting T5/T6 as theme sources rather than inflating the theme count — the *numbers* are trustworthy even where the *inferences* above are not.
- **D1 (locked ≠ unavailable) plus the five-state machine** — fixes a real user-facing lie (paywall rendered as outage) instead of treating it as cosmetics.
- **The fusion table pins every capability to a file:line donor and forbids re-invention** — this is what makes a no-questions worker-executable blueprint possible at all.
- **Real-data-only enforced as a journey, not a hope**: the e2e "log one workout → row appears" (10.6) is the correct way to make the no-mock rule a testable property.

---

## THE SIX OPEN DECISIONS

1. **D4 tier gate:** Weight/body-fat free on the *client* router; keep the admin gate at pro. A client's own body data is the core logging-habit loop and shouldn't be paywalled; the admin gate is plausibly deliberate trainer-tier monetization. Document the asymmetry as intentional and pin it with the D4 contract test so it can't silently flip.
2. **Trainer share-to-feed:** Hide it (hidden, not dead). Posting to a client's feed on their behalf is a consent/PII trap with no cited demand; revisit only with explicit client-granted permission.
3. **NASM URLs:** Keep `/client-progress`; redirect `/client-progress-tracking`; one sidebar entry titled "Client Progress." Shorter URL, matches the trainer-role path, kills the double-labeled sidebar.
4. **GoalProgressBullet:** Delete. It's documented removed, has no source, and is pure registry rot; resurrect if the goals API ever gets real work.
5. **Grid stroke:** Confirm 12% Frost. A 28% dashed grid competes with 1px data strokes on dark; recessive grid is the correct default and the 28% rationale predates the unified system.
6. **Review tier:** Yes, run the free triangle. This review alone found a drill-data blocker and portal/focus gaps; hours of second-opinion cost against eight slices built on a wrong contract is not a close call.
