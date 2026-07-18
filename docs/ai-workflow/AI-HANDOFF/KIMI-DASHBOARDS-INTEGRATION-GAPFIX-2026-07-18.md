# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/ss-build-swan-lens/docs/ai-workflow/AI-HANDOFF/KIMI-DASHBOARDS-CORRECTED-2026-07-18.md
**Seed:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/5fc53ba5-c4c0-459b-90db-02db460a54ce/scratchpad/kimi-dashboards-integration-gapfix-seed.md
**Tokens:** 11127 in / 6324 out · **Cost:** ~$0.1282 · **Wall:** 177.0s

---

## §2.2 — Shell render (CORRECTED): `makeLensFrame` + dash-owned manifest; two surfaceId vocabularies

```tsx
// shell/dashboardManifests.ts — DASH-OWNED. Lane-A's v2/surfaceManifests.ts is NOT touched.
// SurfaceCapabilityManifest TYPE + makeLensFrame arrive via lensBindings (still the ONLY Lane-A import site).
import { makeLensFrame, type SurfaceCapabilityManifest } from '../../lensBindings';

const dashHost = { hostId: 'dashboard-v2' } as const;
// minimal slots: kebab variant names, lens slot refs only — ZERO raw colors (schema-verified Slice 1 task 0)
const dashSlots = { surface: 'default', main: 'default', panel: 'default' } as const;

export const DASHBOARD_MANIFESTS = {
  admin:   { ...dashHost, surfaceId: 'dashboard-admin',   slots: dashSlots },
  trainer: { ...dashHost, surfaceId: 'dashboard-trainer', slots: dashSlots },
  client:  { ...dashHost, surfaceId: 'dashboard-client',  slots: dashSlots },
  user:    { ...dashHost, surfaceId: 'dashboard-user',    slots: dashSlots },
} as const satisfies Record<Role, SurfaceCapabilityManifest>;

export const DENSITY_FRAMES = {
  admin:   makeLensFrame(DASHBOARD_MANIFESTS.admin,   'Admin dashboard',   'DashboardAdminFrame'),
  trainer: makeLensFrame(DASHBOARD_MANIFESTS.trainer, 'Trainer dashboard', 'DashboardTrainerFrame'),
  client:  makeLensFrame(DASHBOARD_MANIFESTS.client,  'Client dashboard',  'DashboardClientFrame'),
  user:    makeLensFrame(DASHBOARD_MANIFESTS.user,    'Your dashboard',    'DashboardUserFrame'),
} as const;
```

```tsx
// DashboardShell.tsx — no role branching in this file; <SurfaceLensGate surfaceId=...> DELETED (prop never existed)
const DENSITIES = { admin: AdminDensity, trainer: TrainerDensity,
                    client: ClientDensity, user: UserDensity } as const;

// TWO DISTINCT surfaceId vocabularies — never conflate:
//  · MANIFEST surfaceId (kebab):  'dashboard-admin'  → lives INSIDE DASHBOARD_MANIFESTS, frame identity only
//  · MOTION surfaceId  (dotted):  'dashboard.admin'  → Lane-A tier key for resolveMotionTier /
//                                                      useDensityMotion / useCrystallizeTransition ONLY
export type MotionSurfaceId = 'dashboard.admin' | 'dashboard.trainer' | 'dashboard.client' | 'dashboard.user';
const DENSITY_CONFIG: Record<Role, { motionSurfaceId: MotionSurfaceId; pollMs: number }> = {
  admin:   { motionSurfaceId: 'dashboard.admin',   pollMs: 60_000 },
  trainer: { motionSurfaceId: 'dashboard.trainer', pollMs: 30_000 },
  client:  { motionSurfaceId: 'dashboard.client',  pollMs: 0 },   // focus-refetch
  user:    { motionSurfaceId: 'dashboard.user',    pollMs: 0 },
};

// Render:
// const Frame = DENSITY_FRAMES[role];            // dispatch map — role === count stays 0
// <Frame>                                         {/* wraps the real gate; NO surfaceId prop anywhere */}
//   <div className="dash-shell" data-density={role} data-testid="dash-shell">
//     <SkipLink/><TopBar/><Rail|TabBar/>
//     <Main id="dash-main">{createElement(DENSITIES[role], { summary })}</Main>
//     <LiveRegion/>
//   </div>
// </Frame>
```

- Densities read `DENSITY_CONFIG[role].motionSurfaceId` (dotted) for `useDensityMotion` / `useCrystallizeMilestone`; the kebab id never leaves the manifest file.
- World-contract check is unchanged and still valid: the Frame renders the real gate internally, so `closest('[data-style-lens-shell]')` + non-empty `--world-accent` still gate fail-closed → V1.
- File-plan delta (one line): add `shell/dashboardManifests.ts` (≤60 lines); `lensBindings.ts` additionally re-exports `makeLensFrame` + the manifest type.

---

## §4 — Crystallize wiring (CORRECTED): overlay and panel are SIBLINGS; panel owns a11y + testid

```tsx
// sections/useCrystallizeMilestone.ts
import { useCrystallizeTransition } from '../../lensBindings';

export function useCrystallizeMilestone(motionSurfaceId: MotionSurfaceId, refresh: () => void) {
  const { phase, reduced, variant, overlayProps, crystallizeTo } =
    useCrystallizeTransition({ surfaceId: motionSurfaceId });   // DOTTED tier key — not the kebab manifest id
  const worldKey = useWorldKey();
  const onCrystallize = async (m: Milestone) => {
    try {
      await api.post(`/api/achievements/${m.id}/crystallize`, { worldKey });  // server confirms FIRST (rule 14)
    } catch {
      toast("Couldn't crystallize. Try again.");                              // no optimistic lie
      return;                                                                 // no animation, tile unchanged
    }
    crystallizeTo(() => refresh(), { settleAnnouncement: 'Milestone crystallized.' });
    // commit at the cinematic beat; announcement spoken by the OVERLAY's own live region on settle
  };
  return { onCrystallize, phase, reduced, variant, overlayProps };
}
```

```tsx
// in UserDensity (and any density rendering milestones) — SIBLINGS, never parent/child:
const c = useCrystallizeMilestone(DENSITY_CONFIG[role].motionSurfaceId, refresh);
<>
  <CrystallizeOverlay {...c.overlayProps} />   {/* sheen + visually-hidden live region ONLY.
      NO children, NO data-testid passthrough, NO focus trap, NO Esc — self-nulls when idle */}
  <CrystallizePanel
    open={c.phase !== 'idle'}                  {/* POST-failure path never leaves 'idle' → panel never opens */}
    phase={c.phase}                            {/* CTAs disabled mid-flight (charge/settle) */}
    variant={c.variant}                        {/* M1 minimal / M2 full pass-through — never hardcoded */}
    reduced={c.reduced}                        {/* appears instantly; no sheen dependency */}
    data-testid="crystallize-overlay"          {/* contract testid rides the PANEL, unchanged for §7 tests */}
  />
</>
```

```tsx
// sections/CrystallizePanel.tsx — CONTENT + A11Y layer (fixed-position sibling, dash-owned)
// root: position:fixed; inset:0; z-index: var(--dash-z-modal);  — focus trap + Esc + auto-focus
// primary CTA on open + focus returned to the milestone tile on close: ALL panel-owned.
// Content per §3.3: "Milestone crystallized." / "This moment is now part of your constellation."
// CTAs "Share milestone" / "Not yet". No live region here — the overlay speaks the announcement.
```

**Locked behaviors (corrected set):**
- **Overlay owns:** sheen timeline, portal to `document.body`, settle announcement via its own visually-hidden live region, reduced-motion honoring (from the hook).
- **Panel owns:** focus trap, Esc dismiss, `data-testid="crystallize-overlay"`, z-order (`--dash-z-modal`), CTA disablement while `phase` is mid-flight, instant appearance under `reduced`.
- **Theme delta (one line):** `DashboardShell.theme.ts` gains `--dash-z-modal: var(--lens-z-modal);` — it remains the only file naming lens tokens; the panel consumes only `var(--dash-z-modal)`.
- **Deleted verification item:** old Slice-3 task-0 (a) "overlay forwards children/testid" is void — verified against the shipped API that it forwards nothing; the testid rides the panel by contract.
- **Unchanged:** confirm-first POST before `crystallizeTo`; idempotent replay → 200 plays the moment; POST failure → toast, no animation, tile unchanged; `motionMode`/variant pass-through from `useDensityMotion`.

---

## Dashboard-manifest note (2 lines)

Each density binds its own dash-owned `SurfaceCapabilityManifest` — kebab `surfaceId` (`dashboard-admin|trainer|client|user`), `hostId: 'dashboard-v2'`, minimal `slots` (kebab variant names, lens slot refs only, zero raw colors) — defined in `DashBoard/v2/shell/dashboardManifests.ts`, never in Lane-A's `v2/surfaceManifests.ts`. The dotted ids (`dashboard.admin` …) remain a separate motion-tier vocabulary consumed only by `resolveMotionTier` / `useCrystallizeTransition`; the two never cross.

Everything else in the blueprint stands unchanged.
