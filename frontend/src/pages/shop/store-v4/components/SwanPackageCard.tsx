/**
 * Store V4 — SwanPackageCard (KIMI-STORE-CORRECTED §2 + F5). A crystal-case card for the "drawer" grid
 * (non-flagship blocks; the flagship lives on the pedestal). F5 overflow fix: the SHELL keeps
 * `overflow: visible` (so any badge can sit at the edge) and an INNER CLIP layer (`overflow: hidden`)
 * owns the refraction sweep — one element can't be both. Eyebrow uses ice (D4: wing-as-text failed AA;
 * wing is reserved for borders/graphics). 48px+ CTA. Prices shown only when the server says so.
 */
import styled from 'styled-components';
import type { StorePackage } from '../storeV4.types';

const Shell = styled.article`
  position: relative;
  overflow: visible; /* F5: shell owns edge badges */
  border-radius: var(--store-r-card, 18px);
  padding: 1px; /* room for the chrome gradient border */
  background: linear-gradient(
    165deg,
    var(--store-chrome-edge),
    var(--store-chrome-10) 42%,
    transparent 70%
  );
  transition: transform 200ms var(--store-ease-standard), box-shadow 200ms var(--store-ease-standard);
  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--store-elev-2);
  }
`;
const Clip = styled.div`
  position: relative;
  overflow: hidden; /* F5: inner clip owns the sweep */
  border-radius: calc(var(--store-r-card, 18px) - 1px);
  background: linear-gradient(165deg, var(--store-card-hi), var(--store-card-lo));
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 260px;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 40%, var(--store-ice-soft) 50%, transparent 60%);
    transform: translateX(-140%) rotate(8deg);
    transition: transform 620ms var(--store-ease-crystallize);
    pointer-events: none;
  }
  ${Shell}:hover &::after {
    transform: translateX(140%) rotate(8deg);
  }
`;
const Eyebrow = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--store-ice);
`;
const Name = styled.h3`
  margin: 0;
  font: 700 20px / 1.15 var(--store-font-display, inherit);
  color: var(--store-ink);
`;
const Price = styled.div`
  font: 800 30px / 1 var(--store-font-display, inherit);
  color: var(--store-ink);
`;
const PerSession = styled.div`
  font-size: 13px;
  color: var(--store-ink-2);
`;
const Facts = styled.ul`
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 13px;
  color: var(--store-ink-2);
`;
const Spacer = styled.div`
  flex: 1;
`;
const CTA = styled.button`
  min-height: var(--store-target, 48px);
  border-radius: 999px;
  border: 1px solid var(--store-chrome-edge);
  background: color-mix(in oklab, var(--store-ice) 16%, transparent);
  color: var(--store-ink);
  font: 700 14px / 1 var(--store-font-display, inherit);
  cursor: pointer;
  transition: filter 160ms var(--store-ease-standard), transform 120ms var(--store-ease-standard);
  &:hover {
    filter: brightness(1.08);
  }
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;
const Locked = styled.div`
  font-size: 14px;
  color: var(--store-ink-2);
`;

export interface SwanPackageCardProps {
  pkg: StorePackage;
  pricesVisible: boolean;
  busy: boolean;
  onAdd: (id: string) => void;
}

export function SwanPackageCard({ pkg, pricesVisible, busy, onAdd }: SwanPackageCardProps) {
  return (
    <Shell data-testid={`store-card-${pkg.id}`}>
      <Clip>
        <Eyebrow>{pkg.packageType}</Eyebrow>
        <Name>{pkg.name}</Name>
        {pricesVisible ? (
          <>
            <Price>{pkg.priceLabel}</Price>
            {pkg.perSessionLabel ? <PerSession>{pkg.perSessionLabel}</PerSession> : null}
          </>
        ) : (
          <Locked>Sign in to view pricing</Locked>
        )}
        <Facts>
          {pkg.sessions ? <li>{pkg.sessions} sessions</li> : null}
          {pkg.months ? <li>{pkg.months} months</li> : null}
          {pkg.sessionsPerWeek ? <li>{pkg.sessionsPerWeek}×/week</li> : null}
        </Facts>
        <Spacer />
        <CTA type="button" disabled={!pricesVisible || busy} onClick={() => onAdd(pkg.id)}>
          {busy ? 'Adding…' : pricesVisible ? 'Add to cart' : 'View pricing'}
        </CTA>
      </Clip>
    </Shell>
  );
}
