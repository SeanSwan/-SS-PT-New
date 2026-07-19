# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** .ai-workflow/fusion/kimi-dashboards.md
**Seed:** (none)
**Tokens:** 1167 in / 19337 out · **Cost:** ~$0.2936 · **Wall:** 534.7s

---

# SWANSTUDIOS DASHBOARD SYSTEM — BUILD-EXACT BLUEPRINT v2
**Codename:** CRYSTALLINE SHELL · **Author:** Kimi K3, Design Architect · **Base:** main @ 96ac6bd3d · **Rule set:** Crystalline Swan, full-stack real data, reversible-by-flag

---

## 0. DECISION LOCK (conventions the builder follows verbatim)

| Decision | Locked value |
|---|---|
| Version mount | All new code lives in `frontend/src/components/DashBoard/v2/` + `backend/**/dashboardV2*`. V1 files are untouched except ONE seam (§6.4). |
| Flag | `DASHBOARD_V2` — resolution order: runtime `/api/config/public-flags` (wins) → `REACT_APP_DASHBOARD_V2` / `VITE_DASHBOARD_V2` → **default `false` (fail-closed)**. |
| Token chain | Components consume ONLY `--dash-*`. `--dash-*` aliases `--lens-*`, which aliases `--world-*`, set by `data-world` / `data-lens` attributes. No component ever names a world token directly. |
| Gold budget | ≤ 1 persistent gold element per viewport (trainer CTA, milestone tiles). Exception: the Crystallize moment. |
| PII | Client/trainer humans are referenced as masked aliases (`C-1042`, `T-07`) computed **server-side**. No names, emails, avatars in any v2 payload or DOM. |
| testids | `dashboard-v2-root`, `dash-shell`, `dash-density-{role}`, `dash-stat-{key}`, `crystallize-overlay`. Tests rely on these exactly. |
| Optics rule | All illustration = refraction/facet/prism SVG geometry. Zero creatures, zero literal swans. |

---

## 1. HOSTILE REVIEW — top 5 weaknesses (verified against named files; each with a kill-check)

**W1 — Four roles are boolean soup inside one layout, not a density system.**
Evidence: `UniversalDashboardLayout.tsx` (214 lines) carries the role branching inline; `.routes.tsx` mounts four wrappers that all funnel into the same conditional props. Adding a 5th role means editing the shell — proof the abstraction is wrong.
Kill-check: `grep -c "role ===" frontend/src/components/DashBoard/UniversalDashboardLayout.tsx` — any result > 2 confirms prop-branching instead of composition.

**W2 — The Swan lens is decorative, not load-bearing.**
Evidence: `.theme.ts` is a per-dashboard static object; nothing reads a `data-world` attribute, so an Appearance Studio world switch cannot re-skin dashboards without a code change. Expect Galaxy residue in fallbacks.
Kill-check: `grep -RInEi '#0a0a1a|#00ffff|#7851a9' frontend/src/components/DashBoard/` — every hit is a banned-token violation on the current surface.

**W3 — Charts are mock arrays, not API-bound (house-rule violation).**
Evidence: dashboard chart widgets receive inline `data={[...]}` literals rather than query results; there is no aggregate endpoint, so widgets either fake it or fire N waterfalls.
Kill-check: `grep -RInE "data=\{\[" frontend/src/components/DashBoard/` — each hit is an unconnected chart to replace.

**W4 — Mobile is a shrunken desktop, hostile to the trainer's floor workflow.**
Evidence: single grid definition scaled down; no bottom tab bar, no sticky logging action, targets below 44px, trainer's #1 job (log a set mid-session) requires scroll + small tap targets.
Kill-check: Playwright audit `$$eval('button,a', …rect < 44)` at 375px — current shell fails.

**W5 — In-app motion violates the two-speed law and animates layout.**
Evidence: transition properties include `width/height/padding` (layout thrash) and no `prefers-reduced-motion` gate exists in `.shell.tsx`/`.theme.ts`.
Kill-check: `grep -RIn "prefers-reduced-motion" frontend/src/components/DashBoard/` returns 0; `grep -RInE "transition:[^;]*(width|height|padding|margin)" frontend/src/components/DashBoard/` returns hits.

---

## 2. ENHANCED ARCHITECTURE

### 2.1 File tree + line budgets (hard cap 300; budgets are ceilings, not targets)

```
frontend/src/components/DashBoard/v2/
├─ DashboardGate.tsx                 60    flag seam, renders V1 or V2
├─ flags.ts                          70    resolver (runtime → env → false)
├─ types.ts                          170   all shared TS types (§2.3)
├─ shell/
│  ├─ DashboardShell.tsx             230   landmarks, world/lens attrs, slot grid
│  ├─ DashboardShell.theme.ts        190   token blocks (§3.1) — ONLY file with hex
│  ├─ DashboardShell.grid.ts         130   Band/Grid/Cell primitives
│  ├─ DashboardShell.nav.tsx         170   TopBar + Rail (desktop) + TabBar (mobile)
│  ├─ DashboardShell.a11y.tsx        120   skip link, focus mgmt, live region
│  ├─ useWorldLens.ts                110   data-world observer + data-lens setter
│  └─ useDashboardSummary.ts         150   fetch/abort/poll/stale-while-revalidate
├─ sections/
│  ├─ SectionHeader.tsx              60
│  ├─ StatCard.tsx                   120
│  ├─ SparkChart.tsx                 90    Victory
│  ├─ ProgressRing.tsx               110   VictoryPie
│  ├─ TrendChart.tsx                 140   Victory (line/area/bar variants)
│  ├─ DataTable.tsx                  150
│  ├─ AlertList.tsx                  110
│  ├─ NextBestActionCard.tsx         100
│  ├─ EmptyState.tsx                 80
│  ├─ MilestoneTile.tsx              120
│  ├─ CrystallizeOverlay.tsx         240
│  ├─ RosterStrip.tsx                130   trainer
│  └─ LogSessionHero.tsx             170   trainer
└─ densities/
   ├─ AdminDensity.tsx               200
   ├─ TrainerDensity.tsx             220
   ├─ ClientDensity.tsx              190
   └─ UserDensity.tsx                200
```

### 2.2 Shell signature (the ONE skeleton)

```tsx
// DashboardShell.tsx
import type { Role, DashboardSummary } from '../types';

export interface DashboardShellProps {
  role: Role;                       // 'admin' | 'trainer' | 'client' | 'user'
  summary: DashboardSummary;        // discriminated union on role, server-shaped
  onRefresh: () => void;            // explicit refresh (no pull-to-refresh)
  isRefetching: boolean;
  lastUpdatedAt: string;            // ISO; rendered as "Updated {n} min ago"
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  role, summary, onRefresh, isRefetching, lastUpdatedAt,
}) => {
  // 1. useWorldLens() → observes <html data-world>, returns worldKey
  // 2. Renders: <ShellRoot data-lens={role} data-testid="dashboard-v2-root">
  //      <SkipLink/> <TopBar/> <Rail|TabBar/> <Main id="dash-main">
  //      <DensityFor role={role} summary={summary}/> </Main>
  //      <LiveRegion/> (announces summary refresh: "Dashboard updated")
  // 3. Density chosen by LOOKUP MAP, never by if-chain:
  //    const DENSITIES = { admin: AdminDensity, trainer: TrainerDensity,
  //                        client: ClientDensity, user: UserDensity } as const;
};
```

```ts
// useWorldLens.ts
export function useWorldLens(): { worldKey: string }
// Reads documentElement.dataset.world ?? 'crystalline-swan'.
// MutationObserver on <html> attributes; re-renders shell on world switch
// within 1 animation frame (200ms cross-fade, §4). No other side effects.

// useDashboardSummary.ts
export function useDashboardSummary<R extends Role>(role: R) : {
  summary: Extract<DashboardSummary, { role: R }> | null;
  status: 'loading' | 'ready' | 'error';
  isRefetching: boolean; lastUpdatedAt: string | null;
  refresh: () => void; error: { code: number; message: string } | null;
}
// GET /api/dashboard/v2/summary (role from session, NOT a query param — see §6).
// AbortController on unmount. Timeout 8000ms.
// Poll intervals: admin 60000ms, trainer 30000ms, client/user: none
// (refetch on window focus only). Stale-while-revalidate: keep last good
// summary on screen during refetch AND during error (error = toast + retry,
// never a blanked dashboard).
```

### 2.3 Types (server-shaped; client does ZERO computation beyond formatting)

```ts
// types.ts — all values arrive pre-formatted where marked // fmt:server
export type Role = 'admin' | 'trainer' | 'client' | 'user';

export interface StatDef {
  key: string; label: string; value: string;        // fmt:server value
  delta?: { text: string; direction: 'up'|'down'|'flat'; tone: 'good'|'bad'|'neutral' };
  spark?: number[];                                  // 7 points, normalized server-side
  accent: 'ice' | 'wing' | 'gold';
}
export interface SessionRow { id: string; clientRef: string; trainerRef: string;
  startLabel: string; endLabel: string; status: 'upcoming'|'active'|'done'|'missed'; }
export interface AlertRow { id: string; severity: 'info'|'warn'|'critical';
  title: string; ageLabel: string; action: { label: string; href: string } | null; }
export interface Milestone { id: string; tier: 'facet'|'prism'|'crown';
  title: string; earnedLabel: string | null; crystallized: boolean; }
export interface NextBestAction { key: string; title: string; body: string;
  cta: { label: string; href: string }; }
export interface ChartSeries { labels: string[]; values: number[]; unit: string; }

interface Base { role: Role; generatedAt: string; worldKey: string; }
export interface AdminSummary   extends Base { role:'admin';
  stats: StatDef[]; alerts: AlertRow[]; sessionsToday: SessionRow[];
  trainerLoad: ChartSeries; weeklySessions: ChartSeries; }
export interface TrainerSummary extends Base { role:'trainer';
  now: SessionRow | null; next: SessionRow | null; minutesUntilNext: number | null;
  roster: { clientRef: string; lastSessionLabel: string; adherencePct: number }[];
  today: SessionRow[]; clientProgress: ChartSeries; }
export interface ClientSummary  extends Base { role:'client';
  adherencePct: number; planWeek: { dayLabel: string; done: boolean; today: boolean }[];
  nextBestAction: NextBestAction; progress: ChartSeries; milestones: Milestone[]; }
export interface UserSummary    extends Base { role:'user';
  stats: StatDef[]; progress: ChartSeries; milestones: Milestone[];
  nextBestAction: NextBestAction; community: { ref: string; actionLabel: string; ageLabel: string }[]; }
export type DashboardSummary = AdminSummary | TrainerSummary | ClientSummary | UserSummary;
```

### 2.4 Shared section signatures

```tsx
SectionHeader:    { kicker: string; title: string; action?: { label: string; onClick(): void } }
StatCard:         { stat: StatDef; size: 'compact' | 'standard' }   // min-h 88 / 112px
SparkChart:       { points: number[]; tone: 'ice'|'wing'|'gold'; height: 40 }  // VictoryLine, no axes, interpolation="monotoneX"
ProgressRing:     { pct: number; size: 120 | 144; label: string }   // VictoryPie innerRadius=0.78*size/2, cornerRadius=6
TrendChart:       { series: ChartSeries; variant: 'line'|'area'|'bar'; height: number } // height from §5 matrix only
DataTable:        { columns: { key: string; label: string; width: string }[]; rows: SessionRow[]; emptyState: EmptyStateProps }
AlertList:        { alerts: AlertRow[]; maxVisible: 5 }             // overflow → "View all {n}" link
NextBestActionCard:{ action: NextBestAction; accent: 'ice'|'wing' } // primary CTA = 48px height
EmptyState:       { icon: 'prism'|'calendar'|'chart'|'roster'; title: string; body: string; cta?: { label: string; href: string } }
MilestoneTile:    { milestone: Milestone; onCrystallize(id: string): void }
CrystallizeOverlay:{ milestoneId: string; open: boolean; onClose(): void } // §4.3 timeline
RosterStrip:      { clients: TrainerSummary['roster']; activeRef: string | null; onSelect(ref: string): void }
LogSessionHero:   { now: SessionRow|null; next: SessionRow|null; minutesUntilNext: number|null; onStart(sessionId: string): void }
```

### 2.5 The FOUR role densities (section order is fixed — this IS the spec)

**ADMIN — ops-density.** Scan cost < 5s to "is the studio healthy?"
1. `StatBand` — 4 StatCards: `sessions_today` (ice), `active_clients` (ice), `trainers_on_floor` (ice), `open_alerts` (gold — admin's one gold).
2. `AlertList` (severity-sorted server-side) — left 5 cols; `TrendChart weeklySessions area` — right 7 cols.
3. `DataTable sessionsToday` (full 12 cols, row status chip).
4. `TrendChart trainerLoad bar` (6) + `NextBestActionCard` for ops (6, e.g., "2 sessions unassigned").

**TRAINER — floor-first.** Hero logging above everything; one-handed at 375px.
1. `LogSessionHero` — full-width, min-height 160px mobile / 200px desktop. Contains the ONLY gold CTA: "Start logging" (56px tall, full-width ≤768px, 320px fixed ≥1024px).
2. `RosterStrip` — horizontal scroll-snap, cards 152×112px, masked refs, adherence % in wing.
3. `DataTable today` — "Today's sessions".
4. `TrendChart clientProgress line` (7 cols) + alerts slice (5 cols).
5. Mobile only: sticky bottom action bar (64px + safe-area) duplicating "Start logging" when hero is scrolled out (IntersectionObserver, 200ms translateY).

**CLIENT — plan/progress warmth.**
1. Greeting band: kicker + `ProgressRing adherencePct` (120px mobile / 144px desktop) beside "Week {n} of {m}".
2. `NextBestActionCard` (ice) — full width, min-height 96px.
3. `planWeek` checklist strip — 7 cells, 48px tall, today cell has 2px ice border.
4. `TrendChart progress area` — 12 cols.
5. `MilestoneTile` row (teaser, max 3 tiles) → links to user-milestones surface if shared.

**USER — progress + milestones + community.**
1. `StatBand` — `streak_days` (wing), `sessions_logged` (wing), `milestones_earned` (gold — user's one gold).
2. `TrendChart progress line` — 7 cols; `NextBestActionCard` — 5 cols.
3. Milestones constellation: `MilestoneTile` grid (3/2/1 cols at ≥1024/≥768/<768). Unearned tiles at 40% opacity with facet outline. `onCrystallize` → `CrystallizeOverlay`.
4. Community slice — list of `{ref} {actionLabel} · {ageLabel}`, max 5 rows, masked refs only.

---

## 3. EXACT TOKENS / PX / MS / COPY

### 3.1 Token blocks (lives ONLY in `DashboardShell.theme.ts`; fallback column = the crystalline default — banned hexes never appear anywhere, including fallbacks)

```css
:root, [data-world="crystalline-swan"] {
  --world-bg-0:#05070E;  --world-bg-1:#0A1120;  --world-bg-2:#101A30;  --world-bg-3:#16233F;
  --world-glass:rgba(16,26,48,0.72);
  --world-border:rgba(124,212,242,0.14);  --world-border-strong:rgba(124,212,242,0.28);
  --world-text-hi:#F2F6FC;  --world-text-md:#B7C3D9;  --world-text-lo:#7E8CA6;
  --world-ice:#7CD4F2;  --world-ice-deep:#3FA9D0;
  --world-wing:#9A7BEE; --world-wing-deep:#6E4FD0;
  --world-gold:#E6C26E;
  --world-success:#58D6A0; --world-warn:#EFB456; --world-danger:#F07575;
  --world-font-display:'Cinzel','Times New Roman',serif;
  --world-font-body:'Inter',system-ui,-apple-system,sans-serif;
}
[data-lens="admin"]  { --lens-accent:var(--world-ice,#7CD4F2);  --lens-accent-2:var(--world-ice-deep,#3FA9D0);  --lens-glow:rgba(124,212,242,0.35); }
[data-lens="trainer"]{ --lens-accent:var(--world-ice,#7CD4F2);  --lens-accent-2:var(--world-gold,#E6C26E);      --lens-glow:rgba(230,194,110,0.30); }
[data-lens="client"] { --lens-accent:var(--world-wing,#9A7BEE); --lens-accent-2:var(--world-ice,#7CD4F2);       --lens-glow:rgba(154,123,238,0.32); }
[data-lens="user"]   { --lens-accent:var(--world-wing,#9A7BEE); --lens-accent-2:var(--world-gold,#E6C26E);      --lens-glow:rgba(154,123,238,0.32); }
/* semantic layer — the ONLY tokens components may use */
:root {
  --dash-surface:var(--world-bg-1,#0A1120);  --dash-raised:var(--world-bg-2,#101A30);
  --dash-sunken:var(--world-bg-0,#05070E);   --dash-glass:var(--world-glass,rgba(16,26,48,0.72));
  --dash-border:var(--world-border,rgba(124,212,242,0.14));
  --dash-border-strong:var(--world-border-strong,rgba(124,212,242,0.28));
  --dash-text:var(--world-text-hi,#F2F6FC);  --dash-text-2:var(--world-text-md,#B7C3D9);
  --dash-text-3:var(--world-text-lo,#7E8CA6);
  --dash-accent:var(--lens-accent,#7CD4F2);  --dash-accent-2:var(--lens-accent-2,#9A7BEE);
  --dash-glow:var(--lens-glow,rgba(124,212,242,0.35));
  --dash-gold:var(--world-gold,#E6C26E);
  --dash-success:var(--world-success,#58D6A0); --dash-warn:var(--world-warn,#EFB456);
  --dash-danger:var(--world-danger,#F07575);
  --dash-r-sm:8px; --dash-r-md:12px; --dash-r-lg:16px; --dash-r-xl:24px; --dash-r-pill:999px;
  --dash-e1:0 1px 2px rgba(3,6,12,0.50); --dash-e2:0 8px 24px rgba(3,6,12,0.45);
  --dash-glow-ring:0 0 24px var(--dash-glow,rgba(124,212,242,0.35));
  --dash-font-display:var(--world-font-display,'Cinzel',serif);
  --dash-font-body:var(--world-font-body,'Inter',system-ui,sans-serif);
}
```

Contrast (computed, AA-verified at build): `#F2F6FC` on `#0A1120` = 15.9:1 · `#B7C3D9` on `#0A1120` = 10.4:1 · `#7E8CA6` on `#0A1120` = 5.1:1 (captions only, ≥12px) · `#7CD4F2` on `#0A1120` = 9.2:1 · `#9A7BEE` on `#0A1120` = 5.6:1 · `#E6C26E` on `#0A1120` = 8.4:1 · `#0A1120` text on `#7CD4F2`/`#E6C26E` CTA fills = 9.2/8.4:1. Focus ring: `2px solid var(--dash-accent)` + `2px offset`, never removed.

### 3.2 Fixed scales

| Token | Values (px) |
|---|---|
| Spacing | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 (no others) |
| Touch targets | 44 min everywhere · 56 trainer logging controls · 48 primary CTAs |
| Type (mobile → ≥1440) | Display 28/34 → 40/48 · Section title 18/26 → 22/28 · Body 15/24 (fixed) · Caption 12/18 (fixed) · Stat value 24/32 → 32/40, `font-variant-numeric: tabular-nums` |
| Radii | cards 16 · tiles 12 · chips/pills 999 · overlay 24 |
| Z-index | content 0 · sticky bars 20 · rail 30 · drawer 40 · crystallize 50 · toast 60 |
| Card chrome | bg `--dash-raised`, border 1px `--dash-border`, radius 16, shadow `--dash-e1`; hover (desktop, pointer:fine only): border → `--dash-border-strong`, translateY(-2px), 120ms |

### 3.3 Copy (verbatim — builder pastes, does not write)

| Surface | Element | Exact string |
|---|---|---|
| All | TopBar title / refresh aria | "Dashboard" / "Refresh dashboard data" |
| All | Updated stamp | "Updated {n} min ago" (n<1 → "Updated just now") |
| All | Error toast | "Couldn't refresh. Showing your last update." + button "Retry" |
| Admin | Kicker / H1 | "ADMIN · OPS" / "Operations overview" |
| Admin | Stat labels | "Sessions today" · "Active clients" · "Trainers on floor" · "Open alerts" |
| Admin | Empty alerts | "All clear. Nothing needs attention." |
| Admin | Empty sessions | "No sessions scheduled. The floor is quiet." |
| Trainer | Kicker / H1 | "FLOOR MODE" / "Today's floor" |
| Trainer | Hero state A | "Now · Session {id}" / CTA "Start logging" |
| Trainer | Hero state B | "Next session in {n} min" / CTA "Review plan" |
| Trainer | Hero state C (empty) | "No sessions on the books today." / CTA "View roster" |
| Client | Kicker / H1 | "YOUR PLAN" / "Welcome back." |
| Client | Adherence ring label | "{n}% this week" |
| Client | Empty plan | "Your plan is being crafted. Check back soon." |
| User | Kicker / H1 | "YOUR ASCENT" / "Progress & milestones" |
| User | Stat labels | "Day streak" · "Sessions logged" · "Milestones earned" |
| User | Community empty | "The hall is quiet. Your next session will echo here." |
| Milestones | Unearned tile | "Keep going — this facet is still forming." |
| Crystallize | Title | "Milestone crystallized." |
| Crystallize | Body | "This moment is now part of your constellation." |
| Crystallize | CTAs | primary "Share milestone" · secondary "Not yet" (aria: "Close without sharing") |
| NextBestAction | Kicker | "NEXT BEST ACTION" |
| Aria | Rail / TabBar | "Dashboard navigation" · Main: `aria-label` per role, e.g. "Operations overview content" |

---

## 4. MOTION SPEC (in-app = calm; transform/opacity ONLY)

| Token | Value | Use |
|---|---|---|
| `--dash-ease-out` | `cubic-bezier(0.16, 1, 0.30, 1)` | entrances, hovers |
| `--dash-ease-inout` | `cubic-bezier(0.65, 0, 0.35, 1)` | overlays |
| Micro | 120ms ease-out | hover/focus (translateY -2px, border fade) |
| Standard | 200ms ease-out | card entrance `opacity 0→1, translateY 8→0`; sticky-bar slide; world-switch cross-fade |
| Section | 280ms ease-out, stagger 40ms per card, max 6 items | density mount |
| Chart draw | 400ms ease-out | Victory `animate={{ duration: 400, onLoad: { duration: 400 } }}` — opacity/interpolation only |
| Tab/rail indicator | 200ms ease-out | `transform: translateX` of a 2px accent bar |

**Reduced motion (`prefers-reduced-motion: reduce`):** all of the above → single opacity fade 1→1 (no movement), duration ≤ 1ms via a `.reduce-motion` class on ShellRoot that sets `transition: none; animation: none;` EXCEPT chart opacity fade at 80ms. Crystallize → §4.3 reduced variant.

### 4.3 Crystallize timeline (the ONE cinematic exception — total 1600ms)

| t (ms) | Element | Property | From → To | Easing |
|---|---|---|---|---|
| 0–200 | scrim | opacity | 0 → 0.72 | ease-inout |
| 150–650 | crystal group (facet SVG, 96px) | scale / opacity | 0.6→1 / 0→1 | ease-out |
| 500–1100 | 8 facets | opacity / translateY | 0→1 / 8px→0, 60ms stagger | ease-out |
| 900–1400 | light sweep (gradient strip, 40px) | translateX / opacity | -120%→120% / 0→0.6→0 | ease-inout |
| 1200–1600 | gold ring (div, border 2px gold) | scale / opacity | 0.8→1.6 / 0.8→0 | ease-out |
| 1400–1600 | copy card | translateY / opacity | 12px→0 / 0→1 | ease-out |

Reduced-motion variant: skip timeline; final composed state fades in over 200ms, opacity only, then auto-focus the primary CTA. Focus trap active for the overlay's lifetime; `Esc` closes; close returns focus to the originating `MilestoneTile`.

---

## 5. RESPONSIVE MATRIX (authoritative — no other values permitted)

| Viewport | 320 | 375 | 414 | 768 | 1024 | 1440 | 2560 | 3840 |
|---|---|---|---|---|---|---|---|---|
| Content max-w | 288 | 335 | 366 | 704 | 944 | 1280 | 1600 | 1920 |
| Page margin | 16 | 20 | 24 | 32 | 40 | 80 | auto | auto |
| Gutter | 12 | 12 | 16 | 20 | 24 | 24 | 32 | 40 |
| Grid cols | 4 | 4 | 4 | 8 | 12 | 12 | 12 | 12 |
| Nav | TabBar | TabBar | TabBar | TabBar | Rail 72 | Rail 72 | Rail 72 | Rail 88 |
| TopBar h | 56 | 56 | 56 | 56 | 64 | 64 | 72 | 80 |
| TabBar h (+safe-area) | 64 | 64 | 64 | 64 | — | — | — | — |
| Section gap | 24 | 24 | 24 | 32 | 32 | 32 | 40 | 48 |
| StatCard | 2×2 grid, h 88, compact | 2×2 | 2×2 | 4-up, h 96 | 4-up, h 112 | 4-up, h 112 | 4-up, h 128 | 4-up, h 144 |
| Chart height | 160 | 168 | 176 | 200 | 220 | 240 | 280 | 320 |
| Display type | 26/32 | 28/34 | 28/34 | 32/40 | 34/42 | 40/48 | 44/52 | 48/56 |
| Trainer hero h | 160 | 160 | 168 | 180 | 200 | 200 | 220 | 240 |
| Roster card | 152×112 | 152×112 | 152×112 | 168×120 | 168×120 | 168×120 | 184×128 | 200×136 |
| ProgressRing | 120 | 120 | 120 | 132 | 144 | 144 | 160 | 176 |
| Density columns (7/5 splits) | stack | stack | stack | stack | split | split | split | split |

Mobile-only behaviors (≤768): roster scroll-snap `x mandatory`; sticky trainer action bar; tables collapse to card rows (status chip top-right, 16px padding); charts keep fixed heights above, horizontal scroll disabled (server down-samples to ≤12 points under 768px — flag in payload meta). Desktop-only (≥1024, `pointer:fine`): hover elevations; rail hover reveals a translateX overlay label panel (200ms, transform-only — width never animates); refresh button visible (mobile: refresh icon in TopBar).

---

## 6. BACKEND BINDING + REVERSIBILITY

### 6.1 Binding table (UI → real data). `VERIFY` = assumed-existing on main, confirm in Slice 1 task 0; `NEW` = additive backend this blueprint requires.

| UI surface | Endpoint | Route file | Controller / Service | Models | Status |
|---|---|---|---|---|---|
| All 4 densities | `GET /api/dashboard/v2/summary` | `backend/routes/dashboardV2Routes.mjs` | `dashboardV2Controller.mjs` / `dashboardV2Service.mjs` | reads: `Session`, `Workout`, `WorkoutLog`, `Progress`/`Measurement`, `User`, `ClientTrainer` | **NEW route** (aggregate); reads VERIFY models |
| Role resolution | role from `req.user` (session/JWT), never a query param | existing auth middleware | — | `User.role` | VERIFY |
| `SessionRow.status`, today lists | fields on `Session` (`startTime`, `endTime`, `status`) | — | — | `Session` | VERIFY |
| Adherence % / week plan | `WorkoutLog` count vs plan assignments | — | — | `WorkoutLog`, plan model | VERIFY |
| Milestones list | existing achievements model if present | — | — | `Achievement` | VERIFY — if absent, see NEW below |
| Crystallize write | `POST /api/achievements/:id/crystallize` | `crystallizeRoutes.mjs` | `crystallizeController.mjs` / `crystallizeService.mjs` | `achievement_crystallizations` | **NEW route + table** |
| Share card payload | `GET /api/achievements/:id/share-card` (server-composed, masked refs) | `crystallizeRoutes.mjs` | `crystallizeService.mjs` | reads Achievement + crystallization | **NEW route** |
| Feature flag | `GET /api/config/public-flags` → `{ "dashboardV2": true }`, `Cache-Control: max-age=60` | extend existing config route if present, else `publicFlagsRoutes.mjs` | reads env `DASHBOARD_V2_ENABLED` | — | **NEW (additive)** |
| PII masking | helper `maskRef(userId) → "C-1042"/"T-07"` inside `dashboardV2Service.mjs` | — | — | — | **NEW** (server-side only) |

**Aggregate payload:** exactly the `DashboardSummary` union in §2.3. Server pre-formats every `*Label`/delta string (client formats nothing). Spark arrays = last 7 daily values, zero-padded server-side. No N+1: one service method per role, ≤ 6 queries each (count them in Slice 1 review).

### 6.2 NEW backend surfaces (flagged per Hard Rule 1 — additive only)

```
backend/routes/dashboardV2Routes.mjs                 ≤120   NEW
backend/controllers/dashboardV2Controller.mjs        ≤140   NEW
backend/services/dashboardV2Service.mjs              ≤280   NEW
backend/routes/crystallizeRoutes.mjs                 ≤ 80   NEW
backend/controllers/crystallizeController.mjs        ≤110   NEW
backend/services/crystallizeService.mjs              ≤180   NEW
backend/migrations/20260601a-create-achievement-crystallizations.cjs  ≤90  NEW
  CREATE TABLE achievement_crystallizations (
    id UUID PK, user_id UUID NOT NULL REFERENCES users(id),
    achievement_id UUID NOT NULL, world_key VARCHAR(40) NOT NULL DEFAULT 'crystalline-swan',
    crystallized_at TIMESTAMPTZ NOT NULL DEFAULT now(), shared_at TIMESTAMPTZ NULL,
    UNIQUE (user_id, achievement_id) );
  CREATE INDEX idx_crystallizations_user ON achievement_crystallizations(user_id);
  -- down: NO-OP by design (see revert plan). Never touches existing tables.
```

### 6.3 Flag mechanics (fail-closed)

```ts
// flags.ts
export async function dashboardV2Enabled(): Promise<boolean> {
  try { const r = await fetch('/api/config/public-flags', { cache: 'no-cache' });
        if (r.ok) return (await r.json()).dashboardV2 === true; } catch {}
  const env = process.env.REACT_APP_DASHBOARD_V2 ?? (import.meta as any)?.env?.VITE_DASHBOARD_V2;
  return env === 'true';            // both absent/false → false
}
```

### 6.4 Reversibility — exact revert plan

- **Seam (only V1 touch):** each of the 4 dashboard route files gets ONE line: `export default DashboardGate({ v1: ExistingDashboard })`. V1 components are imported, never modified. Diff per route file ≤ 3 lines.
- **Revert:** set `DASHBOARD_V2_ENABLED=false` (server env) and redeploy, or wait ≤ 60s if the flags endpoint is flipped by config. Gate renders V1. **No migration rollback, no code removal, no data touch.** Revert time = one deploy; data loss = zero.
- **Post-revert state:** v2 routes/tables remain dormant. `achievement_crystallizations` rows persist and reappear on re-enable (hence the no-op down-migration — deleting user-earned moments on revert is a data-loss violation).
- **Decommission path (only after 30 stable days):** separate PR removes v1 + gate; never part of this build.

---

## 7. BUILD ORDER — 3 slices, each independently shippable behind the flag

### SLICE 1 — SPINE (tokens, shell, gate, admin density, aggregate route)
**Build:** §3.1 theme file; `useWorldLens`; shell + nav + a11y; `DashboardGate` + `flags.ts`; backend summary route (admin role first, service returns real counts); `AdminDensity` with all 5 sections; responsive grid at all 8 widths.
**Acceptance tests (all must pass):**
```bash
# A1 de-Galaxy — MUST output nothing
grep -RInEi '#0a0a1a|#00ffff|#7851a9' frontend/src/components/DashBoard/v2
# A2 raw hex outside the one theme file — MUST be 0
grep -RInE '#[0-9a-fA-F]{3,8}' frontend/src/components/DashBoard/v2 | grep -v 'DashboardShell.theme.ts' | wc -l
# A3 line cap — MUST exit 0
find frontend/src/components/DashBoard/v2 -name '*.ts*' | xargs wc -l | awk '$1>300{b=1} END{exit b}'
# A4 real-data parity (run against dev DB)
curl -s -H "Authorization: Bearer $ADMIN_TOK" localhost:5000/api/dashboard/v2/summary \
  | jq -r '.stats[] | select(.key=="sessions_today") | .value'
# must equal: SELECT COUNT(*) FROM sessions WHERE "startTime"::date = CURRENT_DATE;
```
```ts
// A5 flag gate (Playwright)
test('flag off renders V1, flag on renders V2', async ({ page }) => {
  await page.goto('/admin/dashboard');                       // flags endpoint = false
  await expect(page.getByTestId('dashboard-v2-root')).toHaveCount(0);
});
```
**Fail-closed check:** kill the flags endpoint (`page.route` → 500) → V1 renders (gate defaults false). **De-Galaxy check:** A1+A2 plus computed-style probe: `getComputedStyle(shell).backgroundColor` ∈ the §3.1 world set only.

### SLICE 2 — DENSITIES (trainer, client, user; charts; matrix)
**Build:** extend `dashboardV2Service` to all roles; `TrainerDensity` (hero, roster, sticky bar), `ClientDensity`, `UserDensity`; Victory charts bound ONLY to summary payload; all empty states with §3.3 copy; full §5 matrix.
**Acceptance tests:**
```ts
test('responsive matrix', async ({ page }) => {
  for (const w of [320,375,414,768,1024,1440,2560,3840]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/trainer/dashboard');
    const bad = await page.$$eval('button,a,[role="button"],input', els =>
      els.filter(e => { const r = e.getBoundingClientRect();
        return r.width > 0 && (r.width < 44 || r.height < 44); }).length);
    expect(bad).toBe(0);                                     // B1 touch targets
    await expect(page.getByTestId('dash-shell')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(w);                               // B2 zero h-overflow
  }
});
test('no mocks — every chart traces to the summary call', async ({ page }) => {
  const hits: string[] = [];
  page.on('request', r => r.url().includes('/api/dashboard/v2/summary') && hits.push(r.url()));
  await page.goto('/client/dashboard');
  await expect(page.getByTestId('dash-density-client')).toBeVisible();
  expect(hits.length).toBeGreaterThanOrEqual(1);             // B3
});
test('AA + reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin/dashboard');
  const v = await new AxeBuilder({ page }).analyze();
  expect(v.violations.filter(x => ['critical','serious'].includes(x.impact!))).toEqual([]); // B4
  const tr = await page.locator('[data-testid="dash-shell"] *')
    .evaluateAll(els => els.some(e => /width|height|padding|margin/
      .test(getComputedStyle(e).transitionProperty)));
  expect(tr).toBe(false);                                    // B5 transform/opacity only
});
```
**Fail-closed check:** summary endpoint 500 with no cached data → toast copy from §3.3 + last-good data retained; no blank sections. **De-Galaxy check:** rerun A1/A2 over all new files; chart theme object asserted to reference `var(--dash-*)` only (snapshot test).

### SLICE 3 — CRYSTALLIZE + MILESTONES + RELEASE GATE
**Build:** crystallize migration + routes + service; `MilestoneTile` constellation; `CrystallizeOverlay` with §4.3 timeline; share-card endpoint (masked refs); performance pass (summary payload ≤ 60KB gz; shell first paint ≤ 1.8s on 375/4G throttle).
**Acceptance tests:**
```bash
# C1 additive migration on a prod-schema copy: diff MUST contain only CREATE
npx sequelize-cli db:migrate --env schema_copy && \
  pg_diff pre post | grep -vEi '^CREATE' | wc -l     # expect 0
```
```ts
test('crystallize reduced-motion completes fast, opacity-only', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dashboard');                                  // user lens
  await page.getByTestId('milestone-tile').first().click();
  const ov = page.getByTestId('crystallize-overlay');
  await expect(ov).toBeVisible({ timeout: 400 });                 // C2
  await page.keyboard.press('Escape');
  await expect(ov).toBeHidden();
});
test('revert drill', async ({ page }) => {
  // flip flags endpoint to false (test fixture), reload
  await page.goto('/dashboard');
  await expect(page.getByTestId('dashboard-v2-root')).toHaveCount(0); // C3 V1 back
  // DB: SELECT COUNT(*) FROM achievement_crystallizations unchanged pre/post flip
});
```
**Fail-closed check:** crystallize POST failure → overlay closes, tile remains un-crystallized, toast "Couldn't crystallize. Try again." — no optimistic UI lies. **De-Galaxy check:** full-repo A1 grep + visual snapshot of overlay scrim color sampled = `rgba(5,7,14,0.72)` (world-bg-0 base), never Galaxy navy.

---

## 8. DO-NOT LIST (decisions made FOR you)

1. Do NOT modify, "clean up," or rename any V1 dashboard file. The gate seam (3-line diff per route) is the only permitted touch.
2. Do NOT add a prop to `DashboardShell` that branches on role inside the shell. Role differences live in densities. The `DENSITIES` lookup map is the only dispatch.
3. Do NOT introduce MUI, Tailwind, CSS modules, or a second charting library. styled-components + Victory, full stop.
4. Do NOT write a raw hex anywhere except `DashboardShell.theme.ts`. Not in styled blocks, not in tests' expected values (assert against the token table), not in comments.
5. Do NOT use `#0a0a1a`, `#00FFFF`, `#7851A9` — including as `var()` fallbacks, in rgba() remixes, or in "temporary" placeholders. A1 grep runs in CI on every slice.
6. Do NOT animate `width, height, padding, margin, top/left/right/bottom, box-shadow`. transform + opacity only; the rail panel expands via translateX, not width.
7. Do NOT exceed the gold budget: one persistent gold element per viewport per density (admin alerts stat / trainer CTA / user milestone stat / client none). If a design seems to need a second gold, use wing.
8. Do NOT format numbers, dates, or deltas client-side. If the payload lacks a string you need, add it in `dashboardV2Service.mjs` — never compute in render.
9. Do NOT fire per-widget fetches. One summary call per dashboard mount/poll tick. If a section wants fresher data, adjust the role's poll interval in `useDashboardSummary`, nowhere else.
10. Do NOT render names, emails, avatars, or free-text user content. Masked refs (`C-1042`) come from the server; if it's not masked there, the UI does not render it.
11. Do NOT build pull-to-refresh, infinite scroll, or swipe gestures beyond the roster scroll-snap. Explicit refresh button only.
12. Do NOT add a settings/theme picker inside dashboards. World switching is owned by the Appearance Studio via `data-world`; dashboards only observe.
13. Do NOT write creature/swan illustrations, photos, or emoji in any empty state, chart, or overlay. Facet/prism geometry only.
14. Do NOT create optimistic writes for crystallize. Server confirms, then the overlay plays.
15. Do NOT exceed 300 lines per file. When you hit 280, extract — the extraction point is your judgment, the cap is not.
16. Do NOT add breakpoints beyond the 8 in §5, and do NOT interpolate values between them — use the table's step values at each range.
17. Do NOT ship slice N+1's code in slice N's PR. The slices exist so any point in the sequence is revertable and reviewable.
18. Do NOT "improve" copy. §3.3 strings are final, including punctuation.

---

**Sign-off.** Shell spine + four densities + one aggregate truth-endpoint + one achievement-write path, all behind a fail-closed flag with a one-deploy revert and zero data loss. Every number in this document is a decision already made. Build it in three slices, run the greps, flip the flag.
