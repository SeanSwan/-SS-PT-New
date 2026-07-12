# Style Lens OS ? Five-Sentinel Fable Checkpoint

Date: 2026-07-11  
Branch: `codex/style-lens-os-foundation-20260711`  
Surface: canonical dashboard header Appearance Studio and `/dashboard/admin/workout-design-lab`  
Decision requested: `APPROVE` or `REVISE` before lenses 6?25 are authored.

## Non-negotiable product contract

This is not a color-theme clone and it does not replace routes, live data, forms, focus, dialogs, queries, or scroll state. Style Lens OS changes structural presentation around the mounted SwanStudios dashboard. The generic core remains extractable; Swan-specific tokens, recipes, and roles live only in the adapter.

The user explicitly approved the Swan Style Lens OS direction and asked for this sequence:

1. Swan adapter.
2. Appearance Studio.
3. Five polished sentinel themes.
4. Real mobile and desktop visual QA.
5. Fable checkpoint.
6. Only after approval: remaining 20 themes and Workout Design Lab's 25 workout worlds + 25 style lenses experience.

## What is implemented at this checkpoint

### Runtime safety

- Default Safety and Crystalline Swan Flagship remain distinct from the five sentinels.
- Unknown, malformed, unpromoted, and multi-hop fallbacks fail closed to Default.
- Preview is isolated; Apply validates, transitions, persists, and rolls back on persistence failure. Cancel never commits.
- The saved appearance is applied synchronously on first mount. Native View Transition is reserved for explicit commits, avoiding hydration-time transition aborts on dense dashboards.
- The existing route tree and DOM state stay mounted.
- Motion and density are independent from structural style.
- Admin view-as suppresses persistence.

### Appearance Studio

- Existing header theme control now opens one Studio with Style, Color, Motion, and Density tabs.
- Synthetic preview supports user, client, trainer, and admin roles plus mobile, tablet, and desktop frames. It displays no client data.
- Apply and Cancel are explicit. Focus returns to the trigger after either path.
- The Studio is portaled to `document.body`; this prevents transformed header ancestors from trapping the mobile bottom sheet above the viewport.
- Mobile has one scroll owner, reachable style cards, 44px controls, and a viewport-bounded bottom sheet.

### Five intentionally divergent sentinels

| Sentinel | Structural signature | Navigation | Emotional job | Swan-native treatment |
|---|---|---|---|---|
| Quiet Meridian | `single-meridian-column` | quiet rail | calm and orientation | restrained sapphire current, editorial whitespace, low-motion depth |
| Blueprint Fold | `folded-drafting-plane` | blueprint tabs | confidence and clarity | measured grid planes, drafting rules, Ice Wing focus |
| Kintsugi Circuit | `gilded-fracture-circuit` | circuit orbit | resilience and momentum | asymmetric signal paths joined by Gilded Fern seams |
| Analog Flight Recorder | `instrument-telemetry-stack` | instrument strip | trust and control | tactile telemetry bands, decisive status hierarchy |
| Candy Glass Arcade | `glass-arcade-action-dock` | arcade dock | energy and reward | playful glass depth with crisp controls and accessible contrast |

All five are approved manifests, use one-hop fallback, declare minimum 44px controls and minimum 4.5:1 text contrast, include reduced-motion behavior, use no remote assets or arbitrary HTML, and have unique layout/navigation/recipe signatures.

## Canonical implementation evidence

- Core runtime: `frontend/src/core/style-lens-os/`
- Swan manifests and registry: `frontend/src/adapters/style-lens-swan/`
- Swan structural CSS binding: `frontend/src/adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts`
- Mounted provider: `frontend/src/App.tsx`
- Canonical dashboard shell binding: `frontend/src/components/DashBoard/UniversalDashboardLayout/UniversalDashboardLayout.tsx`
- Appearance Studio: `frontend/src/context/ThemeContext/AppearanceStudio/`
- Existing picker integration: `frontend/src/context/ThemeContext/UniversalThemeToggle.tsx`
- Browser gate: `frontend/e2e/style-lens-sentinel-visual.spec.ts`

## Fresh verification receipt

| Gate | Result |
|---|---|
| Core + adapter + Appearance Studio tests | 47/47 pass across 11 files |
| Full frontend TypeScript | `npx tsc --noEmit` exit 0 |
| Production build | Vite exit 0; 6,663 modules transformed |
| Browser gate | Playwright exit 0 with retries disabled |
| Viewport matrix | 320, 375, 414, 768, 1024, 1440, 2560, 3440, and 3840 CSS pixels |
| Mobile interaction | 414?896: open Studio, scroll, select Quiet Meridian, preview updates, dialog remains within viewport |
| Touch targets | every visible Studio button is at least 44?44 at every matrix width |
| Overflow | document and dialog horizontal overflow remain at or below 1px |
| State/write safety | no non-GET `/api/` request during preview/apply; no route remount required |
| Browser errors | zero page errors and zero console errors |

The first browser attempt identified and fixed two real issues before this receipt: a hydration-time native transition timeout and a mobile fixed-position containment bug. Regression coverage now locks both corrections.

## Fable judgment questions

Return exactly one top-level verdict: `APPROVE` or `REVISE`.

Judge the checkpoint against Swan doctrine, not generic dashboard fashion:

1. Are the five sentinels structurally divergent enough to validate the manifest grammar before scaling to 25?
2. Does Appearance Studio make Style versus Color versus Motion versus Density understandable without cheapening the experience?
3. Is the mobile bottom-sheet interaction strong enough for extremely small phones, especially 320?414px?
4. Do the sentinels preserve Crystalline Swan identity while still feeling meaningfully different?
5. Are any safety, accessibility, performance, or state-preservation gaps blocking expansion?
6. Which rules should be locked before generating the remaining 20?
7. What is the strongest information architecture for Workout Design Lab's combined `25 workout worlds + 25 dashboard style lenses` experience without turning it into a 50-card wall?

If `REVISE`, list only evidence-backed blockers and give exact acceptance criteria. Separate blockers from non-blocking enhancements. Do not invent routes, APIs, data models, or remote assets. If `APPROVE`, state the locked expansion rules for lenses 6?25 and the recommended Lab mode architecture.

## Hard stop

No remaining lens manifests and no 25+25 Lab expansion are authorized by this packet itself. The implementation agent must apply blocking revisions, rerun the receipt, and obtain Fable approval before continuing.
