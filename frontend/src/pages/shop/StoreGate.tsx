/**
 * Store V4 — StoreGate (KIMI-STORE-CORRECTED F2). The ONLY entry. Mirrors the shipped DashboardGate:
 * fail-closed to StoreV3 on every axis — flag off/unresolved, lazy-chunk error, or a failed world-
 * contract check (missing `--world-accent` / no `[data-style-lens-shell]` ancestor). StoreV3 is passed
 * in as children, untouched. `React.lazy()` keeps the V4 cinematic layer OUT of the store chunk while
 * the flag is off (perf budget), and the runtime `/api/config/public-flags` flag gives instant revert.
 */
import React, { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStoreV4Flag } from './store-v4/flags';

const LazyStoreV4 = lazy(() => import('./store-v4/StoreV4'));

class GateBoundary extends React.Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Post-mount world-contract probe. Missing lens scoping → onFail → StoreV3 (a real store over a dead skin). */
function ContractCheck({ onFail, children }: { onFail(): void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    // rAF-retry (backported from Home/About/Video/Contact): the shell mounts async (lazy chunk). Poll a few
    // frames for it, THEN check — a genuinely broken lens (present shell, no --world-accent) fails CLOSED,
    // while the lazy-load race just keeps waiting rather than false-failing (the old single-run failed OPEN).
    const check = () => {
      const shell = ref.current?.querySelector('.store-v4-shell');
      if (!shell) {
        if (tries++ < 30) raf = requestAnimationFrame(check);
        else onFail(); // exhausted: shell never rendered → fail closed to V-prev
        return;
      }
      const accent = getComputedStyle(shell).getPropertyValue('--world-accent').trim();
      const scoped = shell.closest('[data-style-lens-shell]');
      if (!accent || !scoped) onFail();
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [onFail]);
  return <div ref={ref}>{children}</div>;
}

export function StoreGate({ children }: { children: ReactNode }) {
  const { storeV4, resolved } = useStoreV4Flag();
  const [contractOk, setContractOk] = useState(true);

  if (!resolved || !storeV4 || !contractOk) return <>{children}</>;

  return (
    <GateBoundary fallback={<>{children}</>}>
      <Suspense fallback={<>{children}</>}>
        <ContractCheck onFail={() => setContractOk(false)}>
          <div data-testid="store-v4-root">
            <LazyStoreV4 />
          </div>
        </ContractCheck>
      </Suspense>
    </GateBoundary>
  );
}

export default StoreGate;
