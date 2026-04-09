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

### What Codex should verify
- [ ] `frontend/src/context/SocketContext.tsx` — confirm it reads `VITE_BACKEND_URL` and that the updated value flows through correctly
- [ ] `frontend/src/hooks/useSocket.ts` — confirm it reads `VITE_API_BASE_URL` or `VITE_SOCKET_URL` and will resolve to the correct domain
- [ ] No other files hardcode `ss-pt-new.onrender.com` that would still send traffic to the old subdomain

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

## ADD NEW FIXES BELOW THIS LINE

<!-- Format:
## FIX N — Short description
**Commit:** `hash`
### Problem
### Fix
### Files changed
### What Codex should verify
-->
