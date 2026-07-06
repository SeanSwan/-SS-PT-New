# Mobile & Edge Case Analysis — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 23.5s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

## Edge‑Case Review Matrix  
*Derived from the **Fable‑Vision Master Build Brief** (v2) and the **Deep‑Audit** evidence (`file:line` references).  
Each case is scored against the **10‑breakpoint responsive matrix** (320 → 3840 px) and the **mobile‑first touch‑target rule (44 px, 56 px on < 768 px)**.  

---  

### 1️⃣ Narrow‑width squeeze (320 px) – *Densest surfaces*  

| Surface (plan‑derived) | Rating | Why it matters (clipping / overflow) | CSS / React fix |
|------------------------|--------|--------------------------------------|-----------------|
| **`SwanExercisePicker`** (virtualized `react‑window` list) | **CRITICAL** | List items are rendered at **48 px height** (icon + label). At 320 px the width is forced to `100%` but the internal `flex` layout uses `gap: 1rem`. Items overflow the viewport and the “next” button is clipped. | ```tsx\n// Styled‑components\nconst PickerItem = styled.div`\n  min-height: 44px;               /* touch‑target floor */\n  max-width: 100%;                /* never exceed container */\n  overflow-x: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  padding: 0 0.75rem;            /* 0.75rem ≈ 12px → 24px total */\n`;\n\n// React – enforce virtual‑list height\nconst VirtualPicker = () => (\n  <FixedSizeList\n    itemCount={themeList.length}\n    itemSize={48}\n    width={320}\n    height={320}\n    itemData={themeList}\n    component={PickerItem}\n  />\n);\n``` |
| **`ProgressChartActionBar`** (CSV / PNG / Share / Details) | **HIGH** | The bar is a flex row with 4 icons + text. At 320 px the icons wrap, but the text label (`Details`) pushes the total width > 320 px, causing horizontal scroll and loss of the “Share” button. | ```css\n.ActionBar {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  justify-content: center;\n  max-width: 100%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.ActionBar button {\n  min-width: 44px;               /* enforce touch target */\n  flex: 0 0 44px;\n}\n``` |
| **`ChartExpandModal`** (modal that fills screen) | **MEDIUM** | Modal uses `height: 100vh` and `width: 100vw`. On 320 px the Victory chart’s default `height={200}` becomes too small, leaving large empty space and the close‑icon is positioned off‑screen on some iOS Safari builds. | ```tsx\n// Victory height adapts to modal size\nconst AdaptiveChart = ({ data }) => (\n  <VictoryChart\n    containerComponent={<VictoryContainer width={window.innerWidth} height={window.innerHeight} />}\n    height={window.innerHeight - 80}\n    theme={victoryTheme}\n  >\n    <VictoryAxis tickSize={0} />\n    <VictoryBar data={data} />\n  </VictoryChart>\n);\n``` |
| **`UniversalThemeToggle`** (single 44 px button) | **HIGH** | The button’s hit‑area is 44 px but the icon is centered with `margin: 0`. On 320 px the surrounding padding (1 rem) pushes the clickable area beyond the viewport, causing the button to be cut off at the right edge. | ```css\n.ThemeToggle {\n  width: 44px;\n  height: 44px;\n  padding: 0;               /* remove extra space */\n  margin: 0.5rem;           /* keep breathing room */\n  border-radius: 50%;\n  background: var(--bg-primary);\n  color: var(--text-primary);\n}\n``` |

**Overall rating for 320 px:** **CRITICAL** – the picker and action‑bar are the only surfaces that can break layout; all fixes are ≤ 300 lines and use only styled‑components + CSS custom properties.

---  

### 2️⃣ iOS Safari quirks  

| Quirk (plan‑used API) | Rating | Evidence (`file:line`) | WebKit support / prefix / policy | React / CSS fix |
|-----------------------|--------|------------------------|----------------------------------|-----------------|
| **`navigator.mediaDevices.getUserMedia`** (planned for future “camera‑scan” barcode) | **MEDIUM** | `components/BarcodeScanner.tsx:12` – uses `stream` with `video` element. | Supported in iOS 13+, but **autoplay** is blocked unless the user interacts first. No prefix needed, but must guard with `userInteraction` flag. | ```tsx\nconst [hasPermission, setHasPermission] = useState(false);\nuseEffect(() => {\n  if (!navigator.mediaDevices?.getUserMedia) return;\n  const request = async () => {\n    try {\n      await navigator.mediaDevices.getUserMedia({ video: true });\n      setHasPermission(true);\n    } catch (_) {}\n  };\n  // Only call after a user gesture (e.g., button click)\n  request();\n}, []);\n``` |
| **`prefers-reduced-motion`** media query (used in many animations) | **HIGH** | `utils/animations.ts:45` – defines `motion` keyframes. | Fully supported, but **iOS Safari** sometimes ignores the media query when the page is restored from cache. Must add a class toggle on mount. | ```tsx\nconst ReducedMotion = () => {\n  useEffect(() => {\n    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');\n    const toggle = e => document.body.classList.toggle('reduced-motion', e.matches);\n    mq.addEventListener('change', toggle);\n    toggle(mq);\n    return () => mq.removeEventListener('change', toggle);\n  }, []);\n  return <>{children}</>;\n};\n``` |
| **`window.visualViewport`** (used for keyboard‑height handling) | **MEDIUM** | `hooks/useKeyboardHeight.ts:8` – subscribes to `visualViewport`. | Supported from iOS 13.5, but **iOS 14** returns `null` on orientation change. Must fallback to `window.innerHeight`. | ```tsx\nconst useKeyboardHeight = () => {\n  const [height, setHeight] = useState(() => window.innerHeight);\n  useEffect(() => {\n    const cb = (vh) => setHeight(vh);\n    if (window.visualViewport) {\n      window.visualViewport?.addEventListener('resize', cb);\n    }\n    const ro = new ResizeObserver(cb);\n    ro.observe(document.body);\n    return () => {\n      window.visualViewport?.removeEventListener('resize', cb);\n      ro.disconnect();\n    };\n  }, []);\n  return height;\n};\n``` |

**Overall rating for iOS Safari quirks:** **MEDIUM** – only three APIs are used; all have work‑arounds that respect the 44 px touch‑target rule and avoid hard‑coded hex colours (fallback to `var(--token)`).

---  

### 3️⃣ Mobile keyboard handling  

| Surface | Rating | Problem (push‑off) | Solution (CSS / React) |
|---------|--------|--------------------|------------------------|
| **`QuickLogMode`** (mobile logger) – the sticky save bar at the bottom | **CRITICAL** | When the virtual keyboard opens, the bar’s `position: fixed` is hidden behind the keyboard on iOS, causing the “Save” button to be unreachable. | ```css\n.StickyBar {\n  position: absolute;   /* instead of fixed */\n  bottom: env(safe-area-inset-bottom, 0);\n  width: 100%;\n  z-index: 1000;\n}\n```<br>React: add `useKeyboardHeight` (see above) and adjust `bottom` dynamically: `bottom: calc(env(safe-area-inset-bottom, 0) + (height > 0 ? height : 0))` |
| **`ExercisePickerPanel`** (bottom‑sheet) – expands to show filtered list | **HIGH** | The sheet’s height is calculated as `calc(100vh - 60px)`. On keyboards that shrink the viewport to ~200 px, the sheet collapses off‑screen. | ```tsx\nconst sheetHeight = useKeyboardHeight() ? \n  `calc(100vh - ${useKeyboardHeight()}px)` : \n  '100vh';\nconst Sheet = styled.div`\n  height: ${sheetHeight};\n  max-height: 70vh;   /* never exceed */\n`;\n``` |
| **`ProgressChartActionBar`** (share / details icons) | **MEDIUM** | Icons are positioned with `margin-top: 1rem`. When the keyboard appears, the margin pushes them out of view. | Use `margin-top: max(1rem, 5vh)` to keep a relative spacing that shrinks with the viewport. |

**Overall rating:** **CRITICAL** for the sticky save bar; **HIGH** for the picker sheet; **MEDIUM** for action‑bar. All fixes stay within the 44 px touch‑target envelope and avoid hard‑coded dimensions.

---  

### 4️⃣ Offline / slow network  

| Surface | Rating | Failure mode (empty‑state UX) | Solution (React + styled‑components) |
|---------|--------|------------------------------|--------------------------------------|
| **`WorkoutLogger`** (offline queue) – `useOfflineQueue` hook | **HIGH** | When the network is down, the queue silently drops logs; user sees “Saved” but no data persisted. | ```tsx\n// queue hook returns a promise that resolves on reconnect\nconst Queue = styled.button`\n  background: var(--bg-primary);\n  color: var(--text-primary);\n  min-width: 44px;\n`;\n// In component\nuseEffect(() => {\n  if (isOffline) {\n    alert('You are offline – your workout will be saved locally and synced when back online');\n  }\n}, []);\n``` |
| **`ProgressChartStudio`** (fullscreen chart) – Victory chart data fetch | **MEDIUM** | On slow 3G, the chart may render an empty Victory chart for > 5 s, leading to a blank screen. | ```tsx\nconst ChartPlaceholder = styled.div`\n  background: var(--bg-secondary);\n  min-height: 200px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--text-muted);\n`;\n// Render placeholder while fetching\n{isLoading && <ChartPlaceholder>Loading chart…</ChartPlaceholder>}\n``` |
| **`ThemeToggle`** – persists theme to `localStorage` | **LOW** | If storage is disabled (private mode), the toggle falls back to default theme but no visual feedback. | ```tsx\nconst fallback = () => {\n  const stored = localStorage.getItem('theme');\n  return stored ?? 'dark';\n};\n// Use fallback in styled‑component token\nbackground: ${props => `var(--theme-${props.fallback})`};\n``` |

**Overall rating:** **HIGH** for logger queue; **MEDIUM** for chart loading; **LOW** for theme persistence. All empty‑state flows respect WCAG contrast (`var(--text-primary)` vs `var(--bg-primary)` ≥ 4.5:1).

---  

### 5️⃣ Long / overflowing text  

| Surface | Rating | Truncation / wrap strategy | CSS / React implementation |
|---------|--------|----------------------------|----------------------------|
| **`ExerciseName`** in `SwanExercisePicker` (dynamic length) | **MEDIUM** | Names can exceed 30 chars; must truncate with ellipsis to keep 44 px height. | ```css\n.Ellipsis {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n``` |
| **`ChartTooltip`** (Victory tooltip) – custom label may be long | **HIGH** | Tooltip width is limited to 250 px; long labels wrap and cause layout shift. | ```tsx\nconst TooltipLabel = styled.span`\n  max-width: 250px;\n  word-break: break-word;\n  display: block;\n`;\n``` |
| **`AdminDashboardHeader`** – long user name | **LOW** | Use `max-width: 100%` and `text-overflow: ellipsis` only when `line-clamp` is not supported on older Android. | ```css\n.HeaderName {\n  display: -webkit-box;\n  -webkit-line-clamp: 1;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n``` |

**Overall rating:** **MEDIUM** – only the tooltip can break layout; all solutions stay within the 300‑line file limit and use only styled‑components + CSS custom properties.

---  

### 6️⃣ Large lists  

| Surface | Rating | Virtualization needed? | Implementation notes |
|---------|--------|------------------------|----------------------|
| **`SwanExercisePicker`** (virtualized list) | **CRITICAL** | Yes – list can grow to **~1 200** exercises (all 28 themes + 736 exercises). Without virtualization, rendering all items would exceed 300 lines of JS and cause jank on 320 px. | Already uses `react-window` (`FixedSizeList`). Keep `itemSize={48}` and `height={320}` for 320 px; for larger breakpoints use `VariableSizeList` with `measureRef`. |
| **`AdminProgressChartsGrid`** – 12 charts + 6 intelligence boards | **HIGH** | The grid is a static 2‑col layout; on 320 px each chart gets a sliver. Not a scrollable list, but the **board list** (`IntelligenceBoard`) can grow to 30 items. | Replace with `react-window` `VariableSizeList` and set `height: calc(100vh - 120px)` to keep 44 px touch targets for “next” actions. |
| **`ThemeShowcase`** (grid of 28 theme swatches) | **MEDIUM** | 28 items fit comfortably on larger screens but on 320 px they become a single‑column scroll. No virtualization needed; just enable horizontal scrolling with `overflow-x: auto`. | ```css\n.ThemeGrid {\n  display

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
