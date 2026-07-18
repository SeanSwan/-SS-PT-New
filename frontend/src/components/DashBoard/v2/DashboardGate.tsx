/**
 * Dashboards v2 — DashboardGate (KIMI-DASHBOARDS §2.1/§2.2/§6.3). The ONLY entry. Fail-closed to V1
 * on every axis: flag off/unresolved, lazy chunk error, or a failed world-contract check (missing
 * `--world-accent` / no `[data-style-lens-shell]` ancestor). V1 is passed in as children, untouched.
 */
import React, { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useDashboardV2Flags } from './flags';
import type { Role } from './types';

const LazyShell = lazy(() => import('./shell/DashboardShell'));

class GateBoundary extends React.Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Post-mount world-contract probe. Missing lens scoping → onFail → V1 (data-truth over a broken skin). */
function ContractCheck({ onFail, children }: { onFail(): void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const shell = ref.current?.querySelector('.dash-shell');
    if (!shell) return; // still resolving; the loading state renders inside
    const accent = getComputedStyle(shell).getPropertyValue('--world-accent').trim();
    const scoped = shell.closest('[data-style-lens-shell]');
    if (!accent || !scoped) onFail();
  });
  return <div ref={ref}>{children}</div>;
}

export function DashboardGate({ role, children }: { role: Role; children: ReactNode }) {
  const { v2, resolved } = useDashboardV2Flags();
  const [contractOk, setContractOk] = useState(true);

  if (!resolved || !v2 || !contractOk) return <>{children}</>;

  return (
    <GateBoundary fallback={<>{children}</>}>
      <Suspense fallback={<>{children}</>}>
        <ContractCheck onFail={() => setContractOk(false)}>
          <div data-testid="dashboard-v2-root">
            <LazyShell role={role} />
          </div>
        </ContractCheck>
      </Suspense>
    </GateBoundary>
  );
}

export default DashboardGate;
