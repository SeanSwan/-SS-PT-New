/**
 * Gallery vNext — GalleryGate. The ONLY entry. Mirrors the shipped StoreGate/DashboardGate verbatim:
 * fail-closed to the current GalleryPage on EVERY axis — flag off/unresolved, lazy-chunk error, or a failed
 * world-contract check (missing `--world-accent` / no `[data-style-lens-shell]` ancestor). The current
 * GalleryPage is passed in as children and stays byte-for-byte untouched, so its money-path truth tests keep
 * passing. `React.lazy()` keeps the vNext chunk out of the bundle while the flag is off, and the runtime
 * `/api/config/public-flags` flag gives an instant revert with no rebuild.
 *
 * This surface is billing-critical (credits, VIP, referral, donation, print) — fail-closed is the whole point.
 */
import React, { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useGalleryVNextFlag } from './gallery-vnext/flags';

const LazyGalleryVNext = lazy(() => import('./gallery-vnext/GalleryVNext'));

class GateBoundary extends React.Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Post-mount world-contract probe. Missing lens scoping → onFail → the real gallery over a dead skin. */
function ContractCheck({ onFail, children }: { onFail(): void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    // rAF-retry: the shell mounts async (lazy chunk). Poll a few frames for it, THEN check — a genuinely
    // broken lens (shell present, no --world-accent) fails CLOSED, while the lazy-load race just waits.
    const check = () => {
      const shell = ref.current?.querySelector('.gallery-vnext-shell');
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

export function GalleryGate({ children }: { children: ReactNode }) {
  const { galleryVNext, resolved } = useGalleryVNextFlag();
  const [contractOk, setContractOk] = useState(true);

  if (!resolved || !galleryVNext || !contractOk) return <>{children}</>;

  return (
    <GateBoundary fallback={<>{children}</>}>
      {/* Suspense fallback is NULL, not the old page: mounting the old page live during the chunk load
          double-runs its side effects — its checkout-return handler fires and STRIPS the ?credits/?donation
          params, eating the vNext's toast (caught by Kimi probe P3). Flag-off / chunk error / contract-fail
          still fall back to the untouched old page via the branches above and GateBoundary. */}
      <Suspense fallback={null}>
        <ContractCheck onFail={() => setContractOk(false)}>
          <div data-testid="gallery-vnext-root">
            <LazyGalleryVNext />
          </div>
        </ContractCheck>
      </Suspense>
    </GateBoundary>
  );
}

export default GalleryGate;
