/**
 * About V-next — AboutGate. The ONLY entry. Mirrors the shipped Home/Store gates: fail-closed to About.V4
 * on every axis (flag off/unresolved, lazy-chunk error, failed world-contract check). Uses the improved
 * rAF-retry ContractCheck (waits for the async lazy shell to mount, THEN checks — a broken lens fails CLOSED).
 */
import React, { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAboutVNextFlag } from './v-next/flags';

const LazyAboutVNext = lazy(() => import('./v-next/AboutVNext'));

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
    let raf = 0;
    let tries = 0;
    const check = () => {
      const shell = ref.current?.querySelector('.about-vnext-shell');
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

export function AboutGate({ children }: { children: ReactNode }) {
  const { aboutVNext, resolved } = useAboutVNextFlag();
  const [contractOk, setContractOk] = useState(true);

  if (!resolved || !aboutVNext || !contractOk) return <>{children}</>;

  return (
    <GateBoundary fallback={<>{children}</>}>
      <Suspense fallback={<>{children}</>}>
        <ContractCheck onFail={() => setContractOk(false)}>
          <LazyAboutVNext />
        </ContractCheck>
      </Suspense>
    </GateBoundary>
  );
}

export default AboutGate;
