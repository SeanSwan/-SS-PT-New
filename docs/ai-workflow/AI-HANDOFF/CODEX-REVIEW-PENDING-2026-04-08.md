# CODEX REVIEW: Pending Bug Fixes — 2026-04-08
**Status:** AWAITING CODEX REVIEW
**Branch:** main
**Commit:** c607b952

This file accumulates production bug fixes for Codex to audit.
Each section = one fix. Add new fixes below as they land.

---

## FIX 1 — Victory Chart NaN SVG Errors
**Commit:** `c607b952`

### Problem
All 9 live Victory chart components passed API data directly to Victory
without filtering. When the backend returns data points where `y` is
`undefined`, `null`, or `NaN` (sparse data, new users, empty periods),
Victory tried to compute SVG path coordinates from non-numbers and threw:
```
Error: <path> attribute d: Expected number, "M 117, NaN\n    L 121.66…"
Error: <tspan> attribute x: Expected length, "NaN"
```

### Fix
Added `sanitizeChartData<T extends { y: unknown }>(data: T[]): T[]` to
`frontend/src/components/Charts/chartTheme.ts` (tail of file). Applied it
to all 9 live chart components.

### Files changed
| File | Change |
|------|--------|
| `frontend/src/components/Charts/chartTheme.ts` | Added `sanitizeChartData()` export at end of file |
| `frontend/src/components/Charts/charts/live/WeightProgressionLive.tsx` | `data={data.data}` → `data={sanitizeChartData(data.data)}` (all Victory children) |
| `frontend/src/components/Charts/charts/live/SessionFrequencyArea.tsx` | Same pattern |
| `frontend/src/components/Charts/charts/live/WorkoutFrequencyBar.tsx` | Same pattern |
| `frontend/src/components/Charts/charts/live/BodyFatTrendLine.tsx` | Same pattern |
| `frontend/src/components/Charts/charts/live/MacroSplitDonut.tsx` | Same pattern |
| `frontend/src/components/Charts/charts/live/MuscleGroupFocusRadar.tsx` | `data={data.data}` on `VictoryArea` only (VictoryPolarAxis tickValues left as-is — string array) |
| `frontend/src/components/Charts/charts/live/MuscleRecoveryHeatmap.tsx` | Same pattern |
| `frontend/src/components/Charts/charts/live/CardioEnduranceLine.tsx` | `data={points}` → `data={sanitizeChartData(points)}` inside series map |
| `frontend/src/components/Charts/charts/live/RPEByExerciseScatter.tsx` | `data={pts}` → `data={sanitizeChartData(pts)}` on both `VictoryLine` and `VictoryScatter` inside series map |

### What Codex should verify
- [ ] `sanitizeChartData` is correctly typed and exported from `chartTheme.ts`
- [ ] Every `data={...}` prop on every Victory chart component in the 9 files is wrapped — none missed
- [ ] `MuscleGroupFocusRadar` `tickValues={data.data.map(d => d.x)}` was intentionally left unwrapped (string tick values, not y-numbers)
- [ ] No Victory component elsewhere in the codebase imports from these files in a way that bypasses the sanitization

---

## FIX 2 — WebSocket Connecting to Wrong Production URL
**Commit:** `c607b952`

### Problem
`frontend/.env.production` had all URLs pointing to the staging Render
subdomain instead of the production custom domain:
```
# BEFORE (broken)
VITE_BACKEND_URL=https://ss-pt-new.onrender.com
```
At runtime this caused:
```
WebSocket connection to 'wss://ss-pt-new.onrender.com/socket.io/...' failed:
WebSocket is closed before the connection is established.
```

### Fix
Updated all 4 URL vars in `frontend/.env.production`:
```diff
- VITE_API_URL=https://ss-pt-new.onrender.com
- VITE_API_BASE_URL=https://ss-pt-new.onrender.com
- VITE_BACKEND_URL=https://ss-pt-new.onrender.com
- VITE_WS_URL=wss://ss-pt-new.onrender.com/schedule-updates
+ VITE_API_URL=https://sswanstudios.com
+ VITE_API_BASE_URL=https://sswanstudios.com
+ VITE_BACKEND_URL=https://sswanstudios.com
+ VITE_WS_URL=wss://sswanstudios.com/schedule-updates
```

### Files changed
| File | Change |
|------|--------|
| `frontend/.env.production` | All 4 URL vars updated to `sswanstudios.com` |
| `frontend/src/config.js` | `PROD_BACKEND_URL` updated |
| `frontend/src/hooks/useBootcampAPI.ts` | Production hostname branch updated |
| `frontend/src/hooks/useBackendConnection.tsx` | sswanstudios.com branch updated |
| `frontend/src/services/api.service.ts` | `API_BASE_URL` production value updated |
| `frontend/src/services/enhancedClientDashboardService.ts` | `PRODUCTION_URL` updated |
| `frontend/src/services/enterpriseAdminApiService.ts` | Admin WebSocket `wss://` updated |
| `frontend/src/utils/axiosConfig.ts` | `API_BASE_URL` production value updated |
| `frontend/src/components/UniversalMasterSchedule/hooks/useRealTimeUpdates.ts` | Default `wsUrl` fallback updated |
| `frontend/src/pages/contactpage/ContactV2.tsx` | Local `API_BASE_URL` updated |
| `frontend/src/pages/contactpage/ContactV3.tsx` | Local `API_BASE_URL` updated |
| `frontend/src/pages/contactpage/EnhancedContactPage.tsx` | Local `API_BASE_URL` updated |

**Note:** 3 debug scripts in `frontend/src/scripts/` still reference the old domain but are not bundled into the production build.

### What Codex should verify
- [x] `frontend/src/context/SocketContext.tsx` — reads `VITE_BACKEND_URL` correctly (PASS per Codex R1)
- [x] `frontend/src/hooks/useSocket.ts` — reads `VITE_API_BASE_URL` correctly (PASS per Codex R1)
- [x] No runtime files hardcode `ss-pt-new.onrender.com` (FIXED in commit `1f0f57b0` — 11 files swept)
- [ ] Codex to re-verify: grep `ss-pt-new.onrender.com` across `frontend/src` confirms only `src/scripts/` remain

---

## FIX 3 — Farm Finder 503 (NOT A BUG — working as designed)
**No code change.**

The USDA Farmers Market Directory API (`search.ams.usda.gov/farmersmarkets/v1`)
is deprecated/offline. Our Phase 4 backend (`farmFinderService.mjs`) correctly
throws an error with `.apiDown = true`, the route returns `503 { apiDown: true }`,
and `FarmFinderTab.tsx` shows "Farmers market data is temporarily unavailable."

The browser console 503 is expected — it is the intentional HTTP status we set.
The UI handles it correctly with a distinct message (not false empty-state).

**Future work (not urgent):** Replace the deprecated USDA endpoint with the
Local Food Directories API at the USDA AMS Local Food Portal.

---

## FIX 4 — Exercise Rolodex Not Virtualized in Workout Planner & Bootcamp Builder
**Commit:** `0db929c6` (final, build-verified)

### Problem
Both `WorkoutPlannerPage.tsx` and `ExerciseRolodexPanel.tsx` rendered the full exercise list
as flat DOM nodes (`filteredExercises.slice(0, 200).map(...)`). With 840+ exercises in the DB,
all 200 visible items were in the DOM simultaneously — no windowing. The "Rolodex" behavior
(scroll in from bottom, disappear from top) was only present in `NASMExerciseRolodex.tsx`
(WorkoutLogger), which was never wired into these two pages.

### Fix
Added `react-window v2` `List` virtualization to both components (matching the API already used
by `NASMExerciseRolodex.tsx`). Initial implementation used `FixedSizeList` (v1 API) — Codex
correctly caught that `react-window@2.2.7` does not export `FixedSizeList`. Final implementation
uses the v2 `List` + `rowComponent` pattern.

**WorkoutPlannerPage** — left panel exercise list:
- Import: `import { List } from 'react-window'`
- `ExerciseRowRenderer` defined as `useCallback` with `{ index, style }` signature
- Left panel restructured: filters in `flex-shrink:0` div, List in `flex:1; min-height:0` div — no nested scroll conflict
- `<List rowComponent={ExerciseRowRenderer} rowCount={filteredExercises.length} rowHeight={64} rowProps={{}} style={{ height: 420 }} />`
- Shows ~6-7 exercises at a time; virtualized scroll

**ExerciseRolodexPanel** (Bootcamp Builder) — exercise grid:
- Import: `import { List } from 'react-window'`
- `exercisePairs` computed with `useMemo` (groups filteredExercises into pairs)
- `PairedRowRenderer` defined as `useCallback` with `{ index, style }`, renders 2 `ExerciseCard` per row
- `ExerciseGrid` changed from `display: grid` to `display: flex; flex-direction: column; overflow: hidden`
- `<List rowComponent={PairedRowRenderer} rowCount={exercisePairs.length} rowHeight={60} rowProps={{}} style={{ height: min(pairs,7)*60 }} />`
- Shows ~7 rows (14 exercises) at a time; 2-column layout preserved

### Files changed
| File | Change |
|------|--------|
| `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` | v2 List import + ExerciseRowRenderer useCallback + left panel restructured (no nested scroll) |
| `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx` | v2 List import + exercisePairs useMemo + PairedRowRenderer useCallback + ExerciseGrid flex column |

### What Codex should verify
- [x] `FixedSizeList` import was wrong (Codex R1 caught this) — FIXED: now uses `List` from react-window v2
- [x] Nested scroll conflict (Codex R1 caught this) — FIXED: filters moved to `flex-shrink:0` wrapper, List in `flex:1` wrapper outside PanelBody
- [x] Arrow Up/Down claim was over-broad (Codex R1 caught this) — CLARIFIED: WorkoutPlannerPage never had arrow navigation; only Enter/Space on ExerciseItem rows are preserved (same as before)
- [x] `react-window@2.2.7` in dependencies — PASS
- [x] Pair grouping handles odd arrays — PASS (Codex R1)
- [x] React `key` handling — PASS (Codex R1)
- [x] `vite build` passes — VERIFIED locally (5412 modules, 12.82s, ✓ built)
- [x] `ExerciseCard style={{ flex: 1 }}` type-safe — styled div accepts React.CSSProperties (Codex R2 PASS)
- [x] `rowProps={{}}` correct for v2 — matches NASMExerciseRolodex.tsx:339 pattern (Codex R2 PASS)

**Fix 4 verdict: ALL CHECKS PASS — deploy-ready**

---

## ADD NEW FIXES BELOW THIS LINE

<!-- Format:
## FIX N — Short description
**Commit:** `hash`
### Problem
### Fix
### Files changed
### What Codex should verify
-->

## CODEX RESPONSE

1. Fix 2 is incomplete. `frontend/.env.production` is corrected, `frontend/src/context/SocketContext.tsx` correctly uses `import.meta.env.VITE_BACKEND_URL`, and `frontend/src/hooks/useSocket.ts` correctly resolves from `import.meta.env.VITE_API_BASE_URL`, so those two reviewed socket paths now flow to `https://sswanstudios.com`. But the checkbox `No other files hardcode ss-pt-new.onrender.com` is false. I found active frontend/runtime code still pointing at the old domain in `frontend/src/services/api.service.ts`, `frontend/src/components/UniversalMasterSchedule/hooks/useRealTimeUpdates.ts`, `frontend/src/services/enterpriseAdminApiService.ts`, `frontend/src/utils/axiosConfig.ts`, `frontend/src/hooks/useBootcampAPI.ts`, `frontend/src/hooks/useBackendConnection.tsx`, `frontend/src/config.js`, `frontend/src/services/enhancedClientDashboardService.ts`, `frontend/src/pages/contactpage/ContactV2.tsx`, `frontend/src/pages/contactpage/ContactV3.tsx`, and `frontend/src/pages/contactpage/EnhancedContactPage.tsx`.

2. Fix 1 is functionally correct for the NaN-path bug. `sanitizeChartData` is exported from `frontend/src/components/Charts/chartTheme.ts` as `sanitizeChartData<T extends { y: unknown }>(data: T[]): T[]`, returns `[]` for non-arrays, and filters out non-number / `NaN` `y` values. I spot-checked `WeightProgressionLive.tsx`, `MuscleGroupFocusRadar.tsx`, and `RPEByExerciseScatter.tsx` in full, and I also checked the `Victory data={}` call sites across all 9 listed live chart files.

3. The Fix 1 checkbox wording is slightly over-broad. All vulnerable live series data props are wrapped. `MuscleGroupFocusRadar` intentionally leaves `tickValues={data.data.map(d => d.x)}` unwrapped, which is correct because those are string labels, not numeric `y` points. But if taken literally, `Every data={...} prop on every Victory chart component is wrapped` is not true because `VictoryLegend data={legendData}` is still unwrapped in `frontend/src/components/Charts/charts/live/CardioEnduranceLine.tsx` and `frontend/src/components/Charts/charts/live/RPEByExerciseScatter.tsx`. That does not appear to reintroduce the NaN SVG bug, because those legend arrays are not XY point data and would not type-check against `sanitizeChartData` anyway.

4. I did not find any import pattern that bypasses the live-chart sanitization. The live chart files are imported as default components by `ClientAnalyticsPanel.tsx` and `ProfileChartsSection.tsx`; callers do not inject raw `Victory data={}` props into those internals.

Checkbox verdicts:

- Fix 1 `sanitizeChartData` correctly typed/exported: PASS
- Fix 1 vulnerable Victory series `data={}` props wrapped across the 9 listed live charts: PASS
- Fix 1 `MuscleGroupFocusRadar` unwrapped `tickValues` intentional: PASS
- Fix 1 literal `every data prop on every Victory component is wrapped`: NOT LITERALLY TRUE because of the two `VictoryLegend data={legendData}` props above
- Fix 1 no caller/import bypass found: PASS
- Fix 2 `SocketContext.tsx` env flow correct: PASS
- Fix 2 `useSocket.ts` env flow correct: PASS
- Fix 2 no remaining hardcoded `ss-pt-new.onrender.com`: FAIL

5. Fix 4 is not deploy-ready. The frontend build fails immediately on the new virtualization import: `FixedSizeList` is not exported by `react-window@2.2.7`. I verified the installed package exports `List` and `Grid`, not `FixedSizeList`, and `vite build` fails on `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx` line 11. `WorkoutPlannerPage.tsx` uses the same invalid import pattern, so this is a release blocker.

6. Fix 4 also does not satisfy the keyboard-navigation checkbox as written. In `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx`, `ExerciseItem` still has `tabIndex={0}`, but the only preserved key handling is `Enter` / space on the row. I found no `ArrowUp` / `ArrowDown` handling in the file, so the claim that arrow navigation still works is not substantiated by the implementation.

7. The nested-scroll checkbox is also not convincingly resolved. `PanelBody` in `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles.ts` still has `overflow-y: auto`, and the new `FixedSizeList` introduces its own internal scroll container. That leaves nested vertical scroll regions in the left panel. I could not validate runtime behavior because the build is currently broken.

8. The remaining Fix 4 checks are mostly fine from source review:
   - Pair grouping in `ExerciseRolodexPanel.tsx` is safe for odd-length arrays. The final row renders a single card without throwing; it expands to full row width because of `style={{ flex: 1 }}`.
   - React `key` handling looks fine. Inner `ExerciseCard` nodes are keyed by `ex.id`, and the outer row wrapper inside `react-window` does not need an explicit React `key`.
   - `react-window` is present in `frontend/package.json` dependencies as `"react-window": "^2.2.7"`.

Fix 4 verdicts:

- Fix 4 `react-window` dependency present: PASS
- Fix 4 odd-length pair grouping safe: PASS
- Fix 4 `key` warning concern: PASS
- Fix 4 nested scroll conflict resolved: NOT VERIFIED / SOURCE INDICATES RISK
- Fix 4 `ExerciseCard style={{ flex: 1 }}` type-safety: NOT VERIFIED because build fails earlier on invalid `react-window` import
- Fix 4 Arrow Up/Down + Enter keyboard behavior preserved: FAIL
- Fix 4 deploy readiness: FAIL
