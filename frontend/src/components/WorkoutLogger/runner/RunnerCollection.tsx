/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ RunnerCollection — the Runner Style switch point.           │
 * │ Consumes the persisted Swan Lens runner selection and       │
 * │ renders the matching skin around the SAME engine. A skin    │
 * │ crash never loses the session: the error boundary falls     │
 * │ back to the Classic Ledger render (engine state lives in    │
 * │ WorkoutLogger, above this boundary — nothing unmounts it).  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import type { RunnerEngine } from './RunnerEngine.types';
import type { RunnerStyleId } from './runnerStyles';
import { useRunnerStyle } from './useRunnerStyle';
import FocusFlowSkin from './FocusFlowSkin';
import LedgerProSkin from './LedgerProSkin';
import SheetStackSkin from './SheetStackSkin';

/** Shipped skin components by style id (classic renders host-side). */
const SKIN_BY_STYLE: Partial<Record<RunnerStyleId, React.ComponentType<{ engine: RunnerEngine }>>> = {
  'focus-flow': FocusFlowSkin,
  'ledger-pro': LedgerProSkin,
  'sheet-stack': SheetStackSkin,
};

interface RunnerCollectionProps {
  engine: RunnerEngine;
  /** The proven full-stack render (every card) — Classic Ledger + crash fallback. */
  renderClassicList: () => React.ReactNode;
  /** Quick Log (3-tap legacy view). Only honored under Classic Ledger — a
   *  Runner skin owns its own presentation, so quick mode never silently
   *  hides a selected skin (the "looks the same" failure mode). */
  quickLogActive?: boolean;
  renderQuickLog?: () => React.ReactNode;
}

interface BoundaryProps {
  fallback: () => React.ReactNode;
  resetKey: RunnerStyleId;
  children: React.ReactNode;
}

class RunnerSkinBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error('[RunnerSkin] skin crashed — falling back to Classic Ledger', error);
  }

  componentDidUpdate(prev: BoundaryProps): void {
    // Picking a different style in the Lens re-arms the boundary.
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback() : this.props.children;
  }
}

const RunnerCollection: React.FC<RunnerCollectionProps> = ({
  engine, renderClassicList, quickLogActive = false, renderQuickLog,
}) => {
  const [styleId] = useRunnerStyle();

  if (styleId === 'classic-ledger') {
    return <>{quickLogActive && renderQuickLog ? renderQuickLog() : renderClassicList()}</>;
  }

  const Skin = SKIN_BY_STYLE[styleId] ?? FocusFlowSkin;
  return (
    <RunnerSkinBoundary resetKey={styleId} fallback={renderClassicList}>
      <Skin engine={engine} />
    </RunnerSkinBoundary>
  );
};

export default RunnerCollection;
