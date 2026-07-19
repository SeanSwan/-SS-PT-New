/**
 * Store V4 — "The Crystal Case" orchestrator (KIMI-STORE-CORRECTED). Renders THROUGH the lens frame
 * (so `--world-*`/`--lens-*` resolve + `[data-style-lens-shell]` exists for the gate's contract check),
 * then the `.store-v4-shell` token scope. DESIGN-ONLY: binds the real money path (`/api/storefront` read
 * via useStorePackages, `useCart` write via useCartBinding) and NEVER redesigns it.
 *
 * The reground's #1 change: a flagship PEDESTAL (not a tag) lit steadily; the shipped Crystallize fires
 * exactly once that matters — on flagship add-to-cart SUCCESS (confirm-first) — with the lens overlay's
 * `announcement` doing the a11y work. Drawer grid = the rest. activeSpecials surfaced (F4d, not dropped).
 */
import { useCallback, useRef } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { StoreLensFrame } from './storeManifest';
import { StoreV4Tokens } from './storeV4.tokens';
import { useStorePackages } from './hooks/useStorePackages';
import { useCartBinding } from './hooks/useCartBinding';
import { useCrystallizeTransition, CrystallizeOverlay } from './lensBindings';
import { StoreV4Hero } from './components/StoreV4Hero';
import { StoreV4FlagshipPedestal } from './components/StoreV4FlagshipPedestal';
import { StoreV4PackageGrid } from './components/StoreV4PackageGrid';
import { StoreV4CartPill } from './components/StoreV4CartPill';
import { StoreV4Skeleton } from './components/StoreV4Skeleton';

const Shell = styled.main`
  min-height: 100vh;
  background: var(--store-bg);
  color: var(--store-ink);
  padding: 0 var(--store-pad, 24px) 96px;
`;
const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;
const Packages = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
  scroll-margin-top: 16px;
`;
const Specials = styled.aside`
  margin-top: 24px;
  padding: 16px 18px;
  border-radius: var(--store-r-card, 16px);
  background: var(--store-glass);
  border: 1px solid var(--store-line);
  color: var(--store-ink-2);
  font-size: 14px;
`;
const State = styled.p`
  margin: 12vh auto;
  text-align: center;
  color: var(--store-ink-2);
`;

export default function StoreV4() {
  const load = useStorePackages();
  const { add, busyId, count } = useCartBinding();
  const { overlayProps, crystallizeTo } = useCrystallizeTransition({ surfaceId: 'store.flagship' });
  const packagesRef = useRef<HTMLElement>(null);

  const flagshipId = load.status === 'ready' ? load.data.flagshipId : null;

  const handleAdd = useCallback(
    async (id: string) => {
      const ok = await add(id);
      if (!ok) {
        toast.error('Couldn’t add to cart. Try again.');
        return;
      }
      // confirm-first: the Crystallize plays only after the flagship cart write succeeds
      if (id === flagshipId) crystallizeTo(() => {}, { settleAnnouncement: 'Flagship block added to cart' });
    },
    [add, flagshipId, crystallizeTo],
  );

  const onExplore = useCallback(() => {
    const el = packagesRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.focus({ preventScroll: true }); // F7b: hand focus off, don't strand it in the hero
  }, []);

  return (
    <StoreLensFrame>
      <StoreV4Tokens />
      <div className="store-v4-shell" data-testid="store-v4-shell">
        <Shell>
          <Content>
            <StoreV4Hero onExplore={onExplore} />

            <Packages ref={packagesRef} id="packages" tabIndex={-1} aria-label="Training blocks">
              {load.status === 'loading' && <StoreV4Skeleton />}
              {load.status === 'error' && (
                <State data-testid="store-error">We couldn’t load the packages. Please refresh.</State>
              )}
              {load.status === 'ready' && (
                <>
                  {load.data.packages
                    .filter((p) => p.isFlagship)
                    .map((p) => (
                      <StoreV4FlagshipPedestal
                        key={p.id}
                        pkg={p}
                        pricesVisible={load.data.pricesVisible}
                        busy={busyId === p.id}
                        onAdd={handleAdd}
                      />
                    ))}

                  <StoreV4PackageGrid
                    packages={load.data.packages.filter((p) => !p.isFlagship)}
                    pricesVisible={load.data.pricesVisible}
                    busyId={busyId}
                    onAdd={handleAdd}
                  />

                  {load.data.activeSpecials.length > 0 && (
                    <Specials data-testid="store-specials" aria-label="Active offers">
                      <strong>Current offers:</strong>{' '}
                      {load.data.activeSpecials
                        .map((s) => (s.priceLabel ? `${s.name} — ${s.priceLabel}` : s.name))
                        .join(' · ')}
                    </Specials>
                  )}
                </>
              )}
            </Packages>
          </Content>
        </Shell>
        <StoreV4CartPill count={count} />
        <CrystallizeOverlay {...overlayProps} />
      </div>
    </StoreLensFrame>
  );
}
