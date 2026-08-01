/**
 * COMPONENT: PlannerLensHost (S19 — JARVIS blueprint §5.4)
 * PURPOSE: Resolves the active lens id (validated preference), lazy-loads it
 * from the registry inside Suspense + an ErrorBoundary, and falls back to
 * `studio-classic` on ANY failure — a broken lens can never take down the
 * planner. Lenses receive the slot contract only; they never fetch (L1) and
 * cannot reach the save/gate surfaces to diverge (L2/L3 by construction).
 */

import React from 'react';
import { plannerLensRegistry, PLANNER_LENS_DEFAULT_ID, type PlannerLensId } from './registry';
import { readPlannerLensId, writePlannerLensId } from './plannerLensPreference';
import PlannerLensSwitcher from './PlannerLensSwitcher';
import StudioClassic from './styles/studio-classic';
import type { PlannerLensSlots, PlannerLensComponent } from './slots';
import { PlannerSkeleton } from '../PlannerStateViews';

class LensErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const lazyCache = new Map<string, React.LazyExoticComponent<PlannerLensComponent>>();

const resolveLens = (id: string): PlannerLensComponent | React.LazyExoticComponent<PlannerLensComponent> => {
  const entry = plannerLensRegistry[id as keyof typeof plannerLensRegistry];
  if (!entry) return StudioClassic;
  if (id === PLANNER_LENS_DEFAULT_ID) return StudioClassic;
  let lazy = lazyCache.get(id);
  if (!lazy) {
    lazy = React.lazy(async () => {
      const loaded = await entry.load();
      return loaded;
    });
    lazyCache.set(id, lazy);
  }
  return lazy;
};

const PlannerLensHost: React.FC<PlannerLensSlots> = (slots) => {
  const [lensId, setLensId] = React.useState(readPlannerLensId);
  const selectLens = React.useCallback((id: PlannerLensId) => {
    writePlannerLensId(id);
    setLensId(id);
  }, []);
  const Lens = resolveLens(lensId);
  return (
    <>
      <PlannerLensSwitcher activeLensId={lensId} onSelect={selectLens} />
      <LensErrorBoundary key={lensId} fallback={<StudioClassic {...slots} />}>
        <React.Suspense fallback={<PlannerSkeleton variant="panel" />}>
          <Lens {...slots} />
        </React.Suspense>
      </LensErrorBoundary>
    </>
  );
};

export default PlannerLensHost;
