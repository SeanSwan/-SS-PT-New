/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ShellZoneBoundary — hardening (hostile-review Batch 3).     │
 * │ A crash in ONE shell zone must never take the session down: │
 * │ the boundary swallows the zone and renders its fallback     │
 * │ (default: nothing). The canvas + save path live outside     │
 * │ each boundary, so logging always survives chrome failures.  │
 * │ Mirrors RunnerSkinBoundary's crash-safety doctrine.         │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';

interface ShellZoneBoundaryProps {
  /** Zone name for the crash log. */
  zone: string;
  /** What to render instead on crash (default: nothing). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

class ShellZoneBoundary extends React.Component<ShellZoneBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error(`[SessionShell] zone "${this.props.zone}" crashed — degrading, session continues`, error);
  }

  render(): React.ReactNode {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

export default ShellZoneBoundary;
