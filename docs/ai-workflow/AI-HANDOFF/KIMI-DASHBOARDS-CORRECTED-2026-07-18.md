# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/ss-build-swan-lens/docs/ai-workflow/AI-HANDOFF/KIMI-DASHBOARDS-BLUEPRINT-2026-07-17.md
**Seed:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/5fc53ba5-c4c0-459b-90db-02db460a54ce/scratchpad/kimi-dashboards-real-substrate-seed.md
**Tokens:** 12507 in / 21124 out · **Cost:** ~$0.3544 · **Wall:** 636.9s

---

# SWANSTUDIOS DASHBOARD SYSTEM — BUILD-EXACT BLUEPRINT v2 (RE-ISSUE)
**Codename:** CRYSTALLINE SHELL · **Author:** Kimi K3, Design Architect · **Base:** origin/main @ `cba39192b` · **Lens status:** Swan Lens Slices 1–3 SHIPPED — this blueprint **consumes** the lens API; it rebuilds none of it. **Rule set:** Crystalline Swan, real data, reversible-by-flag, zero PII.

---

## 0. DECISION LOCK (verbatim conventions)

| Decision | Locked value |
|---|---|
| Version mount | All new code in `frontend/src/components/DashBoard/v2/` + `backend/**/dashboardV2*` / `crystallize*`. **Lane-A files are untouchable:** `v2/SurfaceLensGate.tsx`, `core/style-lens-os/*`, the 36 lens surfaces. Note: Lane A's `v2/` ≠ our `DashBoard/v2/`. |
| V1 seam | **Exactly ONE file modified:** `frontend/src/routes/main-routes.tsx` (gate mount, lazy + flag). Zero V1 dashboard files edited. |
| Flag | `DASHBOARD_V2` + `DASHBOARD_V2_FINANCE` (money-adjacent). Resolution: runtime `/api/config/public-flags` (wins) → `REACT_APP_`/`VITE_` env → **default false (fail-closed)**. Finance flag enforced **server-side** too. |
| Token chain | Components consume ONLY `--dash-*`. `--dash-*` aliases the **real shipped** `--lens-*` / `--world-*` names (§3.1). Exactly one file may name lens/world tokens. No `--world-surface`, no `--world-data-*`, no `--world-z-*` — those names **do not exist** on main. |
| Gate | V2 renders **through** the shipped `SurfaceLensGate` / `makeLensFrame` / `LensPlanFrame`. No fork, no wrapper that interferes with `[data-style-lens-shell]`. |
| Action budget | ≤ 1 persistent `--world-action`-filled element per viewport per density (trainer "Start logging"; admin open-alerts stat; user milestone stat; client none). Exception: the Crystallize moment. |
| PII | Masked aliases (`C-1042`, `T-07`) computed **server-side** (HMAC + env salt). No names, emails, avatars, or free-text user content in any payload or DOM — including admin view-as. |
| testids (contract) | `dashboard-v2-root`, `dash-shell`, `dash-density-{role}`, `dash-stat-{key}`, `crystallize-overlay`. |
| Optics | Facet/prism/refraction SVG only. Zero creatures, zero literal swans. |
| Roles | DB default `'user'` (normalized to `'client'`); densities = admin / trainer / client / user. Admin view-as honored (§2.2). |

---

## 1. HOSTILE REVIEW — CORRECTED (re-verified against cba39192b)

**W1 — RETRACTED AS STATED. Real weakness: role logic is scattered config, not inline soup — but still not a density system.**
Verified: `grep -c "role ===" frontend/src/components/DashBoard/UniversalDashboardLayout.tsx` → **0**. The old "boolean soup" evidence was wrong; the 214-line layout is role-agnostic. The *actual* defect: role behavior is smeared across `UniversalDashboardLayout.routes.tsx` (`roleConfigurations`), `.routeComponents.tsx`, `.logic.ts`, `.controls.ts`, and the mounts in `main-routes.tsx` — adding a 5th role is a ≥5-file change with no single composition point.
Kill-check (corrected): `grep -Rlc "roleConfigurations\|trainer" frontend/src/components/DashBoard/UniversalDashboardLayout.* | wc -l` — **≥ 4 files confirms scatter**. (`grep -c "role ==="` must stay 0 — the v2 shell keeps it 0 via dispatch map.)

**W2 — PARTIALLY OBSOLETE: the lens now ships world scoping; V1 dashboards simply don't consume it.**
Evidence: `[data-style-lens-shell]` + scoped `--world-*` exist post-lens; `DashBoard/` reads neither `data-world` nor any lens token.
Kill-check: `grep -RIn -- '--world-\|--lens-' frontend/src/components/DashBoard/v2 | grep -v 'DashboardShell.theme.ts' | wc -l` → must be **0** (only the theme file names them); computed-style probe asserts `--dash-accent` resolves to the live `--world-accent` value.

**W3 — Charts as mock arrays (unchanged, still a violation).** Kill-check: `grep -RInE "data=\{\[" frontend/src/components/DashBoard/` — every hit replaced by summary-payload binding. **New constraint:** chart chrome must come from shipped `resolveLensVictoryTheme` / `resolveLensChartPalette` — no hand-rolled Victory theme (Chart-Charter deferral).

**W4 — Mobile hostile to the trainer floor workflow (VALID, confirmed).** No bottom tab bar, no sticky log action, sub-44px targets. The lens now ships `--world-target-size`; v2 binds it: `--dash-target: max(44px, var(--world-target-size, 44px))`.

**W5 — Motion ownership was wrong in the original.** Motion tier is owned by Lane A: `surfaceMotionTiers` = `dashboard.admin M1`, `dashboard.trainer M1`, `dashboard.client/.user M2`, consumed via `resolveMotionTier` / `useAnimationTier`. V2 invents **no** motion system; CSS keeps transform/opacity only.
Kill-checks: `grep -RIn "@keyframes" DashBoard/v2` → 0 · `grep -RInE "transition:[^;]*(width|height|padding|margin)" DashBoard/v2` → 0.

---

## 2. ARCHITECTURE — one shell, four densities, lens-native

### 2.1 File plan (CREATE unless noted; hard cap 300 lines/file)

```
frontend/src/components/DashBoard/v2/
├─ DashboardGate.tsx              70   flag + effective-role + world-contract check; lazy() shell; fail→V1
├─ flags.ts                       70   runtime→env→false; exposes {v2, finance}
├─ lensBindings.ts                60   THE ONLY Lane-A import site (barrel re-export, §2.5)
├─ types.ts                      160   §2.3 (worldKey removed from Base; client sends it only on crystallize POST)
├─ useWorldKey.ts                 50   reads current world key for crystallize POST (read-only observer)
├─ shell/
│  ├─ DashboardShell.tsx         210   renders THROUGH SurfaceLensGate; DENSITIES map; slot grid
│  ├─ DashboardShell.theme.ts    150   ONLY file naming --lens-*/--world-*; ONLY hex site (statuses)
│  ├─ DashboardShell.grid.ts     120   Band/Grid/Cell on data-viewport
│  ├─ DashboardShell.nav.tsx     170   TopBar + Rail (desk/wall) + TabBar (hand/lap, 44px)
│  ├─ DashboardShell.a11y.tsx    110   skip link, focus mgmt, live region
│  └─ useDashboardSummary.ts     150   fetch/abort/poll/SWR per DENSITY_CONFIG
├─ sections/
│  ├─ SectionHeader.tsx           60
│  ├─ StatCard.tsx               120   data-testid="dash-stat-{key}"
│  ├─ SparkChart.tsx              80   Victory + resolveLensVictoryTheme
│  ├─ ProgressRing.tsx           100   VictoryPie, --dash-dial-r
│  ├─ TrendChart.tsx             120   Victory line/area/bar; theme+palette from lens
│  ├─ DataTable.tsx              150
│  ├─ AlertList.tsx              110
│  ├─ NextBestActionCard.tsx     100
│  ├─ EmptyState.tsx              80   prism geometry only
│  ├─ MilestoneTile.tsx          110
│  ├─ CrystallizePanel.tsx       120   CONTENT ONLY — cinematic is the shipped overlay (§4)
│  ├─ RosterStrip.tsx            120   scroll-snap, masked refs
│  └─ LogSessionHero.tsx         160   56px action-filled CTA
├─ motion/
│  └─ useDensityMotion.ts         70   resolveMotionTier/useAnimationTier → {entranceMs, staggerMs, chartAnimate}
└─ densities/
   ├─ AdminDensity.tsx           190
   ├─ TrainerDensity.tsx          210   + sticky bottom log bar (hand/lap)
   ├─ ClientDensity.tsx           180
   └─ UserDensity.tsx             190

backend/ (all NEW, additive — composition per §6)
├─ routes/dashboardV2Routes.mjs                ≤120
├─ controllers/dashboardV2Controller.mjs       ≤140
├─ services/dashboardV2Service.mjs             ≤280  COMPOSES existing services (§6.1)
├─ routes/crystallizeRoutes.mjs                ≤ 80
├─ controllers/crystallizeController.mjs       ≤110
├─ services/crystallizeService.mjs             ≤180
└─ migrations/20260601a-create-achievement-crystallizations.cjs  ≤90  (down: NO-OP)

MODIFY (the ONE seam): frontend/src/routes/main-routes.tsx   ≤15-line diff
   — wrap the four dashboard route elements in <DashboardGate role="…">{<V1/>}</DashboardGate>
   — v2 imported via React.lazy INSIDE the gate; V1 imports untouched.
```

**Deleted from the original plan:** `CrystallizeOverlay.tsx` (240-line reimplementation — replaced by the shipped overlay + thin `CrystallizePanel`), `useWorldLens.ts` (replaced by 50-line `useWorldKey` + the gate's own scoping), the bespoke motion-token table (replaced by `useDensityMotion` over Lane-A tiers), and all invented `--world-*` names.

### 2.2 Shell signature (role-agnostic; `role ===` count stays 0)

```tsx
// DashboardShell.tsx — no role branching in this file
const DENSITIES = { admin: AdminDensity, trainer: TrainerDensity,
                    client: ClientDensity, user: UserDensity } as const;
const DENSITY_CONFIG = {
  admin:   { surfaceId: 'dashboard.admin',   pollMs: 60_000 },
  trainer: { surfaceId: 'dashboard.trainer', pollMs: 30_000 },
  client:  { surfaceId: 'dashboard.client',  pollMs: 0 },  // focus-refetch
  user:    { surfaceId: 'dashboard.user',    pollMs: 0 },
} as const;

export interface DashboardShellProps {
  role: Role;                 // EFFECTIVE role (see below)
  summary: DashboardSummary;  // discriminated union, server-shaped
  onRefresh(): void; isRefetching: boolean; lastUpdatedAt: string;
}
// Render: <SurfaceLensGate surfaceId={DENSITY_CONFIG[role].surfaceId} /* props per Lane-A contract */>
//           <div className="dash-shell" data-density={role} data-testid="dash-shell">
//             <SkipLink/><TopBar/><Rail|TabBar/>
//             <Main id="dash-main">{createElement(DENSITIES[role], { summary })}</Main>
//             <LiveRegion/>
//           </div>
//         </SurfaceLensGate>
```

- **Effective role:** `DashboardGate` receives the route's base `role`; admin view-as overrides it via the existing `AdminViewAsWrapper` context (hook name verified Slice 1 task 0). Server authorization ALWAYS uses the session role; `?as=` honored only for admin sessions, audit-logged (§6).
- **`data-density`:** written by the shell on its OWN node (dash-owned). Lane A's §11.1 density-attribute ambiguity is sidestepped — we never write to the gate's node. Selector for per-density tint lives in the theme file only.
- **`useLensViewport()`** (from bindings) returns `'hand'|'lap'|'desk'|'wall'` and the gate writes `data-viewport`; JS switches (Rail vs TabBar, sticky log bar, stack vs 7/5 split) read the hook; styling keys off `[data-viewport="…"]`.
- **`lensViewportCss` / `lensSurfaceCss`:** mounted idempotently (guard `document.head.querySelector('[data-lens-css]')`) by the theme module IF the gate hasn't already — verified Slice 1 task 0; never double-injected.
- **World re-skin needs no dashboard code:** world vars are scoped by the gate/world provider; a world switch restyles dashboards via CSS alone. `useWorldKey` exists solely to stamp `world_key` on the crystallize write.
- **World-contract check (fail-closed):** post-mount, the gate asserts `getComputedStyle(shellEl).getPropertyValue('--world-accent')` is non-empty AND `closest('[data-style-lens-shell]')` exists. Failure → render V1, log once.

### 2.3 Types (server-shaped; client formats nothing)

Carried over from the original §2.3 with two edits: `Base` drops `worldKey`; `AdminSummary.stats` gains the conditional key `revenue_today` (present **only** when the finance flag is on — server omits, client never stubs). `StatDef.accent: 'lens' | 'action' | 'good' | 'warn' | 'bad'` (semantic slots → §3.1 tokens; no color names in payloads). All other interfaces (`StatDef`, `SessionRow`, `AlertRow`, `Milestone`, `NextBestAction`, `ChartSeries`, role summaries) unchanged.

### 2.4 Densities — fixed section order (the spec)

Composition = `DENSITIES` map + per-density data config. Sections unchanged from the original §2.5 with these bindings: trainer `LogSessionHero` CTA is the density's one `--dash-action` fill (56px, full-width hand, 320px ≥desk) plus the IntersectionObserver-driven sticky bottom bar (64px + safe-area, hand/lap, 200ms translateY). Admin renders a 5th `StatCard` `revenue_today` only when payload contains it. Client carries zero action-fill elements (ring uses `--dash-accent`). User milestone stat uses action fill. All empty states use §3.3 copy.

---

## 3. TOKEN CHAIN — bound to the REAL shipped contract

### 3.1 `DashboardShell.theme.ts` — the ONLY file that may name `--lens-*` / `--world-*`; only hex site

```css
.dash-shell{
  /* structure ← REAL world slots */
  --dash-bg:var(--world-bg);            --dash-panel:var(--world-panel);
  --dash-ink:var(--world-text);         --dash-ink-2:var(--world-muted);
  --dash-accent:var(--world-accent);    --dash-action:var(--world-action);
  --dash-glass:color-mix(in oklab, var(--world-panel) 72%, transparent);
  --dash-line:color-mix(in oklab, var(--world-accent) 14%, transparent);
  --dash-line-strong:color-mix(in oklab, var(--world-accent) 28%, transparent);
  --dash-glow:color-mix(in oklab, var(--world-accent) 35%, transparent);
  /* shape/elevation/z ← REAL lens slots (set on [data-style-lens-shell]) */
  --dash-r-panel:var(--lens-panel-radius);  --dash-r-row:var(--world-row-radius);
  --dash-dial-r:var(--world-dial-radius);   --dash-pad:var(--lens-main-padding);
  --dash-canvas:var(--lens-canvas);
  --dash-elev-1:var(--lens-elev-1); --dash-elev-2:var(--lens-elev-2); --dash-elev-3:var(--lens-elev-3);
  --dash-z-sticky:var(--lens-z-sticky); --dash-z-overlay:var(--lens-z-overlay); --dash-z-toast:var(--lens-z-toast);
  /* type + targets + roster */
  --dash-font-display:var(--world-title-font);
  --dash-target:max(44px, var(--world-target-size, 44px));
  --dash-row-cols:var(--world-row-columns, 4);
  /* statuses: dash-local literals — the ONLY hexes in v2; never Galaxy values */
  --dash-good:#58D6A0; --dash-warn:#EFB456; --dash-bad:#F07575;
  /* focus ring: 2px solid var(--dash-accent), 2px offset — never removed */
}
/* per-density second accent — derived, zero invention (theme file only) */
.dash-shell[data-density="trainer"]{ --dash-accent-2:var(--world-action); }
.dash-shell[data-density="admin"]  { --dash-accent-2:var(--world-accent); }
.dash-shell[data-density="client"] { --dash-accent-2:color-mix(in oklab, var(--world-accent) 75%, var(--world-text) 25%); }
.dash-shell[data-density="user"]   { --dash-accent-2:color-mix(in oklab, var(--world-accent) 65%, var(--world-action, var(--world-accent)) 35%); }
```

- Components reference **only** `--dash-*` (bare `var(--dash-*)`, no fallbacks — a missing world token means the contract check already failed closed to V1).
- **No component, test, or comment names a `--world-*` / `--lens-*` outside this file.** No invented names (`--world-surface`, `--world-data-*`, `--world-z-*`) anywhere — CI grep, §7-A2b.
- Contrast: AA is re-verified **per world** at build by probing computed values inside the gate (the old fixed hex ratios are deleted — the lens owns palette now). `--dash-ink` on `--dash-panel` and CTA ink on `--dash-action` must be ≥ 4.5:1; violations fail CI with the offending world key.
- Body font: inherited from the lens shell (not redeclared). `--world-target-size` is the floor; trainer logging controls remain 56px.
- Nav edge: Rail placement reads `--lens-navigation-edge` (consumed in the theme file); TabBar always bottom on hand/lap.

### 3.2 Scales (unchanged decisions, restated briefly)

Spacing 4·8·12·16·24·32·48·64 · targets ≥44 (CTA 48, logging 56) · type Display 28/34→40/48, title 18/26→22/28, body 15/24, caption 12/18, stat value `tabular-nums` · card chrome: `var(--dash-panel)`, 1px `var(--dash-line)`, radius `var(--dash-r-panel)`, shadow `var(--dash-elev-1)`; hover (desk/wall, `pointer:fine`): border→`--dash-line-strong`, translateY(-2px), 120ms · z-order comes from `--dash-z-*` aliases only.

### 3.3 Copy

§3.3 of the original carries over **verbatim** (all rows, all punctuation). Two binding edits only: "gold CTA" phrasing → "action-filled CTA" (`--dash-action`); the Crystallize rows now label `CrystallizePanel` content (title "Milestone crystallized.", body "This moment is now part of your constellation.", CTAs "Share milestone" / "Not yet") rendered inside the shipped overlay. New row — finance-flag-hidden state: no copy exists because the tile is **absent**, not stubbed.

---

## 4. CRYSTALLIZE — wired to the SHIPPED API (no reimplementation)

```tsx
// sections/CrystallizePanel.tsx + densities consume via this hook (lensBindings re-export)
import { useCrystallizeTransition, CrystallizeOverlay } from '../../lensBindings';

export function useCrystallizeMilestone(role: Role, refresh: () => void) {
  const { phase, reduced, variant, overlayProps, crystallizeTo } =
    useCrystallizeTransition({ surfaceId: `dashboard.${role}` });   // motion tier resolved by Lane A
  const worldKey = useWorldKey();
  const onCrystallize = async (m: Milestone) => {
    try {
      await api.post(`/api/achievements/${m.id}/crystallize`, { worldKey });  // server confirms FIRST (rule 14)
    } catch { toast("Couldn't crystallize. Try again."); return; }            // no optimistic lie
    crystallizeTo(() => refresh(), { /* opts pass-through */ });              // commit at the cinematic beat
  };
  return { onCrystallize, overlayProps, phase, reduced, variant };
}

// in UserDensity (and any density rendering milestones):
<CrystallizeOverlay {...overlayProps} data-testid="crystallize-overlay">
  <CrystallizePanel phase={phase} variant={variant} />
</CrystallizeOverlay>
```

Locked behaviors:
- **Timeline, scrim, portal, focus trap, Esc, reduced variant, z-order (`--lens-z-modal`)** — all owned by the shipped overlay. The old §4.3 hand-rolled timeline table is **deleted**. Slice 3 task 0 verifies: (a) `CrystallizeOverlay` forwards `data-testid`/`children` to its portal root — if it doesn't, the testid rides a non-visual host span (not a fork); (b) `phase` values used by `CrystallizePanel` to disable CTAs mid-flight.
- `reduced` comes from the hook (Lane A honors `prefers-reduced-motion` + tier); `CrystallizePanel` auto-focuses its primary CTA when `phase` settles, only when the overlay doesn't already (verified, not assumed).
- `motionMode` option of the hook: pass-through from `useDensityMotion` — admin/trainer surfaces (M1) pass minimal; client/user (M2) pass the full variant. We never hardcode a mode.
- Failure path: POST error → no animation, tile unchanged, toast. Re-POST of an already-crystallized id returns 200 (idempotent) and simply plays the moment.

### 4.1 Motion law (what's left of it)

All in-app motion derives from `useDensityMotion()` → `{ entranceMs, staggerMs, chartAnimate }` per `resolveMotionTier`/`useAnimationTier`: **M1 (admin/trainer)** opacity-only 120ms, stagger 0, Victory `animate={false}`; **M2 (client/user)** 200ms ease-out entrances, stagger 40ms max 6, Victory onLoad fade ≤300ms. Transform/opacity only; one belt-and-braces `@media (prefers-reduced-motion: reduce)` block in the theme file forces opacity-only ≤1ms regardless of tier.

---

## 5. RESPONSIVE MATRIX — keyed to the lens viewport

`useLensViewport()` classes are authoritative; the original 8 widths remain **QA probes**, mapped:

| Class | hand | lap | desk | wall |
|---|---|---|---|---|
| QA widths | 320 / 375 / 414 | 768 | 1024 / 1440 | 2560 / 3840 |
| Nav | TabBar 64+safe | TabBar | Rail 72 | Rail 88 |
| Grid cols / gutter | 4 / 12–16 | 8 / 20 | 12 / 24 | 12 / 32–40 |
| Content max-w | fluid (margins 16–24) | 704 | 944→1280 | 1600→1920 |
| StatCard | 2×2 h88 | 4-up h96 | 4-up h112 | 4-up h128–144 |
| Chart h | 160–176 | 200 | 220–240 | 280–320 |
| Trainer hero h | 160 | 180 | 200 | 220–240 |
| ProgressRing | 120 | 132 | 144 | 160–176 |
| Roster card | 152×112 | 168×120 | 168×120 | 184×128–200×136 |
| 7/5 splits | stack | stack | split | split |

Selectors key off `[data-viewport="hand"]` etc. — no bespoke `@media` breakpoints in v2 (the lens owns the cuts; §11.1 note: if `data-viewport` boundaries shift, dashboards inherit the shift for free). Hand/lap behaviors: roster `scroll-snap-type: x mandatory`; tables collapse to card rows; sticky trainer log bar; refresh icon in TopBar (Rail refresh button ≥desk). Server down-samples chart series to ≤12 points for hand/lap (flag in payload meta).

---

## 6. BACKEND — COMPOSE, don't duplicate

### 6.1 Binding table. `EXISTING` = compose the shipped service (exact exports verified Slice 1 task 0); `NEW` = additive code this blueprint requires.

| UI need | Source | Status |
|---|---|---|
| Admin: active clients, growth | `backend/routes/admin/analyticsUserRoutes*` → its service | EXISTING — call service, **no re-query** |
| Admin: revenue_today | `analyticsRevenueRoutes*` / `adminFinanceRoutes*` service, gated by `DASHBOARD_V2_FINANCE` | EXISTING + NEW flag gate |
| Admin: open alerts | `adminComplianceRoutes*` service | EXISTING — VERIFY severity shape; adapter maps to `AlertRow` |
| Sessions today / trainer floor / roster | `Session` queries + NEW adherence projection over `WorkoutLog` | NEW projection (flagged): `adherencePct`, `roster[]`, `minutesUntilNext` |
| Client plan-week / progress | NEW projection over plan assignments + `WorkoutLog` | NEW projection (flagged) |
| Milestones | existing achievements model — VERIFY presence; else scope to `achievement_crystallizations`-joined catalog | VERIFY |
| User community slice | VERIFY existing social model; **if absent → DEFERRED** (§9), section omitted, not mocked | VERIFY |
| Aggregate | `GET /api/dashboard/v2/summary` | NEW thin route (below) |
| Crystallize write / share-card | `POST /api/achievements/:id/crystallize` · `GET /api/achievements/:id/share-card` | NEW route + table |
| Flags | `GET /api/config/public-flags` | NEW additive |

### 6.2 Genuinely-new contracts (flagged, additive, server-side masking)

**`GET /api/dashboard/v2/summary`** — Auth: session JWT (existing middleware). Role from `req.user.role`; optional `?as={role}` honored only when session role = admin (403 otherwise, audit-logged). Response: the `DashboardSummary` union (§2.3), every label pre-formatted server-side, refs masked via `maskRef(userId) = HMAC(id, env MASK_SALT) → "C-1042"/"T-07"`. Finance fields (`revenue_today`) present **only** when server env `DASHBOARD_V2_FINANCE=true`. One service method per role, ≤6 queries, **delegating to existing services wherever they exist** (duplicated aggregation = review blocker). `Cache-Control: private, max-age=15`. Errors: 401/403 standard; 500 → client keeps last-good + toast.

**`POST /api/achievements/:id/crystallize`** — Auth: owner or admin. Body `{ worldKey: string }`. Idempotent on `UNIQUE(user_id, achievement_id)`: replay → 200 with existing row (never 409-to-error). Response `{ crystallizedAt: ISO }`. No PII in logs.

**`GET /api/achievements/:id/share-card`** — Auth: owner or share token. Server-composed copy with masked refs only; rendering design deferred (§9).

**`GET /api/config/public-flags`** → `{ "dashboardV2": bool, "dashboardV2Finance": bool }`, `Cache-Control: max-age=60`. Unauthenticated, non-sensitive, fail-closed semantics on the client.

### 6.3 Reversibility (exact)

- **Seam:** one file — `main-routes.tsx`. V1 components imported by the gate as children; `React.lazy` loads the v2 shell only when the flag resolves true. Chunk-load failure → error boundary → V1. 
- **Revert:** set `DASHBOARD_V2_ENABLED=false` (or flip the flags payload; ≤60s propagation). V1 renders. No migration rollback (down is NO-OP by design), no code removal, zero data loss; crystallizations persist for re-enable.
- **Decommission** of V1 only after 30 stable days, separate PR.

---

## 7. BUILD ORDER + ACCEPTANCE TESTS

### SLICE 1 — SPINE (bindings, theme, shell-through-gate, admin density, summary route)
```bash
# A1 de-Galaxy — MUST output nothing
grep -RInEi '#0a0a1a|#00ffff|#7851a9' frontend/src/components/DashBoard/v2
# A2a raw hex outside theme file — MUST be 0
grep -RInE '#[0-9a-fA-F]{3,8}' frontend/src/components/DashBoard/v2 | grep -v 'DashboardShell.theme.ts' | wc -l
# A2b lens/world token names outside theme file — MUST be 0 (chain integrity)
grep -RIn -- '--world-\|--lens-' frontend/src/components/DashBoard/v2 | grep -v 'DashboardShell.theme.ts' | wc -l
# A2c INVENTED names — MUST be 0 anywhere (these tokens do not exist on main)
grep -RInE -- '--world-surface|--world-data-|--world-z-' frontend/src/components/DashBoard/v2 | wc -l
# A2d role branching in shell/densities — MUST be 0
grep -RInE "role ===" frontend/src/components/DashBoard/v2/shell frontend/src/components/DashBoard/v2/densities | wc -l
# A3 line cap
find frontend/src/components/DashBoard/v2 -name '*.ts*' | xargs wc -l | awk '$1>300{b=1} END{exit b}'
# A4 real-data parity (admin, dev DB)
curl -s -H "Authorization: Bearer $ADMIN_TOK" localhost:5000/api/dashboard/v2/summary \
  | jq -r '.stats[]|select(.key=="sessions_today")|.value'
#   = SELECT COUNT(*) FROM sessions WHERE "startTime"::date = CURRENT_DATE;
# A4b PII scan — response contains no email/name-shaped strings; refs match ^[CT]-\d+$
```
```ts
test('gate: flag off→V1, on→V2, flags-500→V1, lens contract present', async ({ page }) => {
  await page.goto('/admin/dashboard');                                  // flags=false
  await expect(page.getByTestId('dashboard-v2-root')).toHaveCount(0);
  await page.route('**/api/config/public-flags', r => r.fulfill({ json: { dashboardV2: true, dashboardV2Finance: false } }));
  await page.goto('/admin/dashboard');
  await expect(page.getByTestId('dashboard-v2-root')).toBeVisible();
  await expect(page.getByTestId('dash-shell')).toBeVisible();
  await expect(page.getByTestId('dash-density-admin')).toBeVisible();
  const shell = page.getByTestId('dash-shell');
  await expect(shell.locator('xpath=ancestor::*[@data-style-lens-shell]')).toHaveCount(1);   // renders THROUGH gate
  const [dash, world] = await shell.evaluate(el => {
    const cs = getComputedStyle(el);
    return [cs.getPropertyValue('--dash-accent').trim(), cs.getPropertyValue('--world-accent').trim()];
  });
  expect(dash).toBe(world); expect(dash).not.toBe('');                  // live chain, not fallback
  await expect(page.getByTestId('dash-stat-revenue_today')).toHaveCount(0);  // finance fail-closed
});
```

### SLICE 2 — DENSITIES (trainer/client/user, charts, matrix)
```ts
test('responsive matrix — 44px + zero h-overflow at all 8 probes', async ({ page }) => {
  for (const w of [320,375,414,768,1024,1440,2560,3840]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/trainer/dashboard');
    const bad = await page.$$eval('button,a,[role="button"],input', els =>
      els.filter(e => { const r = e.getBoundingClientRect();
        return r.width > 0 && (r.width < 44 || r.height < 44); }).length);
    expect(bad).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  }
});
test('trainer floor workflow: sticky log action appears when hero scrolls out (hand)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/trainer/dashboard');
  await expect(page.getByTestId('dash-density-trainer')).toBeVisible();
  await page.evaluate(() => document.getElementById('dash-main')!.scrollTo(0, 600));
  const bar = page.getByRole('button', { name: 'Start logging' }).last();   // sticky duplicate
  await expect(bar).toBeVisible();
  const r = await bar.boundingBox(); expect(r!.height).toBeGreaterThanOrEqual(56);
});
test('charts: summary-bound, lens-themed, zero mocks', async ({ page }) => {
  const hits: string[] = [];
  page.on('request', r => r.url().includes('/api/dashboard/v2/summary') && hits.push(r.url()));
  await page.goto('/client/dashboard');
  await expect(page.getByTestId('dash-density-client')).toBeVisible();
  expect(hits.length).toBeGreaterThanOrEqual(1);
  // static: no inline data literals; theme imported from lensBindings only
  // (grep -RInE "data=\{\[" v2 → 0; grep -RIn "victory" v2 | grep -v lensBindings/theme-fns → review)
});
test('motion law + reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin/dashboard');
  const tr = await page.locator('[data-testid="dash-shell"] *')
    .evaluateAll(els => els.some(e => /width|height|padding|margin/
      .test(getComputedStyle(e).transitionProperty)));
  expect(tr).toBe(false);
  const v = await new AxeBuilder({ page }).analyze();
  expect(v.violations.filter(x => ['critical','serious'].includes(x.impact!))).toEqual([]);
});
```
Fail-closed: summary 500 with no cache → §3.3 toast + last-good retained; admin view-as trainer renders `dash-density-trainer` with masked refs; finance flag off server-side → key absent from payload (client never stubs).

### SLICE 3 — CRYSTALLIZE + RELEASE GATE
```bash
# C1 additive migration: diff on schema copy = CREATE only
npx sequelize-cli db:migrate --env schema_copy && pg_diff pre post | grep -vEi '^CREATE' | wc -l   # 0
```
```ts
test('crystallize via shipped overlay: confirm-first, testid, Esc, reduced fast-path', async ({ page }) => {
  let posted = 0;
  await page.route('**/api/achievements/*/crystallize', r => { posted++; return r.fulfill({ json: { crystallizedAt: new Date().toISOString() } }); });
  await page.goto('/dashboard');                                        // user lens
  await page.getByTestId('milestone-tile').first().click();
  await expect(page.getByTestId('crystallize-overlay')).toBeVisible({ timeout: 2000 });
  expect(posted).toBe(1);                                               // server confirmed before commit
  await expect(page.getByText('Milestone crystallized.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('crystallize-overlay')).toBeHidden();
  // failure path: route→500 → overlay never appears; toast "Couldn't crystallize. Try again."
});
test('revert drill', async ({ page }) => { /* flags→false → dashboard-v2-root count 0; crystallization COUNT unchanged */ });
```
Perf gate: summary ≤60KB gz; first paint ≤1.8s on 375/4G throttle.

### Fail-closed matrix (every row testable)
flags unresolved / 500 → **V1** · missing `--world-accent` or `[data-style-lens-shell]` → **V1** · lazy chunk error → **V1** · finance flag off (either side) → field absent, tile absent · summary 500 → last-good + toast · crystallize POST fail → no animation, tile unchanged · share-card 404 → no share CTA rendered.

---

## 8. DELTA-VS-ORIGINAL (what this re-issue changed, and why)

1. **W1 retracted + rewritten** — real file has 0 `role ===`; weakness is 5-file config scatter (`.routes/.routeComponents/.logic/.controls/main-routes`), kill-check replaced.
2. **Token chain rebound to the REAL contract** — deleted invented `--world-bg-0..3/-glass/-ice/-wing/-gold/-text-hi-md-lo/-font-display/-font-body/-success/-warn/-danger`; chain now aliases shipped names (`--world-bg/panel/accent/text/muted/action/dial-radius/row-radius/row-columns/title-font/target-size`, `--lens-panel-radius/main-padding/canvas/elev-0..4/z-*`). Statuses = the only hexes left, dash-local in the theme file. Borders/glass/glow derived via `color-mix`.
3. **`data-lens={role}` removed** (not a real attribute) → `data-density={role}` on the dash-owned shell node (sidesteps Lane-A §11.1 ambiguity).
4. **CrystallizeOverlay (240-line reimplementation) DELETED** → shipped `useCrystallizeTransition` + `CrystallizeOverlay` via `lensBindings`; new thin `CrystallizePanel` (content only); hand-rolled §4.3 timeline deleted; `reduced/variant/phase` consumed from the hook.
5. **Bespoke motion spec DELETED** → `resolveMotionTier`/`useAnimationTier` (admin/trainer M1, client/user M2) via 70-line `useDensityMotion`; CSS keeps one reduced-motion guard.
6. **8-breakpoint media-query system → `useLensViewport` classes** (`hand/lap/desk/wall` via `data-viewport`); identical px values preserved as per-class steps; the 8 widths survive as QA probes only.
7. **Custom Victory theme DELETED** → `resolveLensVictoryTheme` + `resolveLensChartPalette` (Chart-Charter deferral honored).
8. **Shell renders THROUGH shipped `SurfaceLensGate`/`LensPlanFrame`**; `useWorldLens` observer slimmed to 50-line `useWorldKey` (crystallize POST stamp only); world-switch re-skin is now free via scoped vars; missing-contract case fails closed to V1.
9. **V1 seam shrunk: 4 files → 1 file** (`main-routes.tsx`, lazy+gate); zero V1 dashboard file touches.
10. **Backend: direct model reads → composition** of existing `admin/analytics{Revenue,User}`, `adminFinance`, `adminCompliance` services; genuinely-new items flagged (summary aggregate, adherence/roster/plan projections, crystallize POST, share-card GET, public-flags) with auth + idempotency + HMAC masking contracts.
11. **Money-adjacent runtime flag** `dashboardV2Finance`, enforced server-side; admin `revenue_today` exists only when on.
12. **Gold budget → action budget** (`--world-action`); z-scale 0–60 replaced by real `--lens-z-*` aliases; rail placement follows `--lens-navigation-edge`; target floor binds `--world-target-size`.
13. **Admin view-as + `?as=` contract** added (admin-only, audit-logged, still masked).
14. Base moved `96ac6bd3d` → `cba39192b`; all kill-checks re-verified.

## 9. DEFERRED (explicitly NOT in this build)

- **Chart-Charter dashboard grammar** (dense axes, annotations, crosshairs) — Lane-A charter pending; v2 consumes palette/theme only.
- **User community slice** — ships only if an existing social model verifies in Slice 1; otherwise section omitted (never mocked).
- **Share-card visual rendering** — contract + masked payload ship; image/OG composition is a follow-up.
- **`data-density` ownership unification** with Lane A (§11.1) — interim: dash-owned node only.
- **5th role (front-desk/partner)** — density map + one route when required; designed for, not built.
- **Realtime alerts (websockets)** — role-based polling stands.
- **Pull-to-refresh / gestures / in-dashboard theme pickers** — house-rule excluded.
- **V1 decommission** — separate PR after 30 stable flag-on days.
- **Non-Crystalline worlds' dashboard QA pass** — chain is world-agnostic by construction; per-world contrast CI gate ships in Slice 1, per-world visual snapshots deferred.

---

**House rules intact:** one shell + four densities by composition (`role ===` count 0 in v2) · real data only, one summary call · transform/opacity motion, tier-owned · ≤300 lines/file · zero PII (server-masked) · additive + flag + one-file seam + one-deploy revert + zero data loss · Lane-A files untouched · Victory-only via `resolveLensVictoryTheme` · banned hexes banned everywhere including fallbacks and tests.

**Sign-off.** The lens shipped; this blueprint now *consumes* it — real token names, real gate, real Crystallize — composes the backend that already exists, corrects the stale W1 on evidence, and keeps every reversal cheap. Three slices, run the greps, flip the flag.
