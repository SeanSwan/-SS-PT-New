/**
 * Store V4 — FlagshipPedestal (KIMI-STORE-CORRECTED §d: "build the pedestal, not the tag"). The single
 * highest-price block, pulled OUT of the drawer grid and lit steadily "under the light": full-width
 * ≥1024px, deeper elevation, the ONLY persistent gold on the page (gold-spend #1; the Crystallize ring
 * is #2), the per-session anchor given weight, and the bullet story allowed to breathe. On mobile it's
 * simply the first (un-min-height'd) card — DOM order unchanged, no a11y reordering. Presentational:
 * `onAdd` bubbles to the parent, which does the cart write then fires the shipped Crystallize on success.
 */
import styled from 'styled-components';
import type { StorePackage } from '../storeV4.types';

const Pedestal = styled.section`
  position: relative;
  overflow: visible;
  border-radius: var(--store-r-panel, 22px);
  padding: 1px;
  background: linear-gradient(150deg, var(--store-gold-28), var(--store-chrome-edge) 40%, transparent 72%);
  box-shadow: var(--store-elev-3), 0 0 60px -30px var(--store-gold-28);
`;
const Inner = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: calc(var(--store-r-panel, 22px) - 1px);
  background:
    radial-gradient(120% 90% at 78% 0%, var(--store-gold-28), transparent 55%),
    linear-gradient(155deg, var(--store-card-hi), var(--store-card-lo));
  padding: clamp(22px, 4vw, 40px);
  display: grid;
  gap: 20px;
  @media (min-width: 1024px) {
    grid-template-columns: 1.7fr 1fr;
    align-items: center;
  }
`;
const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--store-gold);
`;
const Name = styled.h2`
  margin: 8px 0 0;
  font: 800 clamp(26px, 4vw, 40px) / 1.05 var(--store-font-display, inherit);
  color: var(--store-ink);
`;
const Story = styled.ul`
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 15px;
  color: var(--store-ink-2);
  li::before {
    content: '◆ ';
    color: var(--store-ice);
  }
`;
const Money = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
const Price = styled.div`
  font: 800 clamp(34px, 6vw, 52px) / 1 var(--store-font-display, inherit);
  color: var(--store-ink);
`;
const Anchor = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: var(--store-ice);
`;
const CTA = styled.button`
  margin-top: 8px;
  min-height: 56px;
  padding: 0 28px;
  border-radius: 999px;
  border: 1px solid var(--store-chrome-edge);
  background: color-mix(in oklab, var(--store-ice) 22%, transparent);
  color: var(--store-ink);
  font: 800 16px / 1 var(--store-font-display, inherit);
  cursor: pointer;
  transition: filter 160ms var(--store-ease-standard), transform 120ms var(--store-ease-standard);
  &:hover {
    filter: brightness(1.08);
  }
  &:active {
    transform: scale(0.99);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;
const Locked = styled.div`
  font-size: 15px;
  color: var(--store-ink-2);
`;

export interface FlagshipPedestalProps {
  pkg: StorePackage;
  pricesVisible: boolean;
  busy: boolean;
  onAdd: (id: string) => void;
}

export function StoreV4FlagshipPedestal({ pkg, pricesVisible, busy, onAdd }: FlagshipPedestalProps) {
  return (
    <Pedestal data-testid="store-flagship-pedestal">
      <Inner>
        <div>
          <Eyebrow>✦ The flagship block</Eyebrow>
          <Name>{pkg.name}</Name>
          <Story>
            {pkg.months ? <li>{pkg.months} months of coached training</li> : null}
            {pkg.sessions ? <li>{pkg.sessions} one-on-one sessions</li> : null}
            {pkg.sessionsPerWeek ? <li>{pkg.sessionsPerWeek} sessions every week</li> : null}
            <li>The deepest commitment in the case — and the best per-session rate.</li>
          </Story>
        </div>
        <Money>
          {pricesVisible ? (
            <>
              <Price>{pkg.priceLabel}</Price>
              {pkg.perSessionLabel ? <Anchor>{pkg.perSessionLabel}</Anchor> : null}
            </>
          ) : (
            <Locked>Sign in to view pricing</Locked>
          )}
          <CTA type="button" disabled={!pricesVisible || busy} onClick={() => onAdd(pkg.id)}>
            {busy ? 'Adding…' : pricesVisible ? 'Add to cart' : 'View pricing'}
          </CTA>
        </Money>
      </Inner>
    </Pedestal>
  );
}
