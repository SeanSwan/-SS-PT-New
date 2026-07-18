/**
 * Home V-next — HomeGate. The ONLY entry. Mirrors the shipped StoreGate/DashboardGate: fail-closed to the
 * current HomePage (V4→V3) on every axis — flag off/unresolved, lazy-chunk error, or a failed world-contract
 * check (missing `--world-accent` / no `[data-style-lens-shell]` ancestor). The current Home is passed in as
 * children, untouched. `React.lazy()` keeps the V-next optics chunk OUT of the bundle while the flag is off.
 */
import React, { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useHomeVNextFlag } from './v-next/flags';

const LazyHomeVNext = lazy(() => import('./v-next/HomeVNext'));

class GateBoundary extends React.Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function ContractCheck({ onFail, children }: { onFail(): void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const shell = ref.current?.querySelector('.home-vnext-shell');
    if (!shell) return;
    const accent = getComputedStyle(shell).getPropertyValue('--world-accent').trim();
    const scoped = shell.closest('[data-style-lens-shell]');
    if (!accent || !scoped) onFail();
  });
  return <div ref={ref}>{children}</div>;
}

export function HomeGate({ children }: { children: ReactNode }) {
  const { homeVNext, resolved } = useHomeVNextFlag();
  const [contractOk, setContractOk] = useState(true);

  if (!resolved || !homeVNext || !contractOk) return <>{children}</>;

  return (
    <GateBoundary fallback={<>{children}</>}>
      <Suspense fallback={<>{children}</>}>
        <ContractCheck onFail={() => setContractOk(false)}>
          <LazyHomeVNext />
        </ContractCheck>
      </Suspense>
    </GateBoundary>
  );
}

export default HomeGate;
