/**
 * Contact V-next — ContactGate. The ONLY entry. Mirrors the shipped surfaces' gates: fail-closed to
 * ContactV3 on every axis (flag off/unresolved, lazy-chunk error, failed world-contract check). rAF-retry
 * ContractCheck (waits for the async lazy shell, then checks — broken lens fails CLOSED). ContactV3 is the
 * untouched children.
 */
import React, { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useContactVNextFlag } from './vnext/flags';

const LazyContactVNext = lazy(() => import('./vnext/ContactVNext'));

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
      const shell = ref.current?.querySelector('.contact-vnext-shell');
      if (!shell) {
        if (tries++ < 30) raf = requestAnimationFrame(check);
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

export function ContactGate({ children }: { children: ReactNode }) {
  const { contactVNext, resolved } = useContactVNextFlag();
  const [contractOk, setContractOk] = useState(true);

  if (!resolved || !contactVNext || !contractOk) return <>{children}</>;

  return (
    <GateBoundary fallback={<>{children}</>}>
      <Suspense fallback={<>{children}</>}>
        <ContractCheck onFail={() => setContractOk(false)}>
          <LazyContactVNext />
        </ContractCheck>
      </Suspense>
    </GateBoundary>
  );
}

export default ContactGate;
