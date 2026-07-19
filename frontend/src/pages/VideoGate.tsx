/**
 * Video V-next — VideoGate. The ONLY entry. Mirrors the shipped Home/Store/About gates: fail-closed to
 * VideoLibraryV3 on every axis (flag off/unresolved, lazy-chunk error, failed world-contract check). Uses
 * the rAF-retry ContractCheck (waits for the async lazy shell, then checks — broken lens fails CLOSED).
 * VideoLibraryV3 is passed in as children, untouched.
 */
import React, { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useVideoVNextFlag } from './video-vnext/flags';

const LazyVideoVNext = lazy(() => import('./video-vnext/VideoLibraryVNext'));

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
      const shell = ref.current?.querySelector('.video-vnext-shell');
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

export function VideoGate({ children }: { children: ReactNode }) {
  const { videoVNext, resolved } = useVideoVNextFlag();
  const [contractOk, setContractOk] = useState(true);

  if (!resolved || !videoVNext || !contractOk) return <>{children}</>;

  return (
    <GateBoundary fallback={<>{children}</>}>
      <Suspense fallback={<>{children}</>}>
        <ContractCheck onFail={() => setContractOk(false)}>
          <LazyVideoVNext />
        </ContractCheck>
      </Suspense>
    </GateBoundary>
  );
}

export default VideoGate;
