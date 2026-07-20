/**
 * Gallery vNext — enhancement pricing modal. PARITY with the shipped inline upgrade modal
 * (GalleryPage.tsx:2082-2131): same three packages + prices + copy, same chains — the VIP card CLOSES this
 * modal and OPENS the in-gallery VIP conversion modal (never a signup bounce), and the referral link closes
 * this and opens the referral modal. Purchase posts through the same bind-only hook (`{ package }` body).
 * Esc + backdrop click close; the dialog is labelled; every card is a >=48px real button.
 */
import { useEffect, useId } from 'react';
import styled from 'styled-components';
import type { CreditPackage } from './gallery.types';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: var(--gallery-z-overlay, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--gallery-scrim-solid);
`;

const Card = styled.div`
  width: 100%;
  max-width: 520px;
  max-height: 90dvh;
  overflow-y: auto;
  padding: 26px 22px;
  border-radius: var(--gallery-r-panel, 16px);
  background: var(--gallery-surface-1);
  border: 1px solid var(--gallery-chrome-edge);
  box-shadow: var(--gallery-elev-3);
  color: var(--gallery-ink);
`;

const Title = styled.h2`
  margin: 0 0 6px;
  font-family: var(--gallery-font-display);
  font-size: 1.4rem;
`;

const Sub = styled.p`
  margin: 0 0 18px;
  color: var(--gallery-ink-2);
  font-size: 0.95rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
`;

const PriceCard = styled.button<{ $highlighted?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-height: 112px;
  padding: 14px;
  text-align: left;
  border-radius: var(--gallery-r-card, 12px);
  border: 1px solid ${(p) => (p.$highlighted ? 'var(--gallery-ice)' : 'var(--gallery-line)')};
  background: var(--gallery-surface-2);
  color: var(--gallery-ink);
  cursor: pointer;
  /* Kimi b4: the ice border alone reads "recommended" — glow trimmed so it never competes with the CTA */
  box-shadow: ${(p) => (p.$highlighted ? '0 0 8px var(--gallery-ice-soft)' : 'none')};
  &:disabled { opacity: 0.65; cursor: progress; }
`;

const PriceLabel = styled.span`
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gallery-ink-2);
`;

const Price = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

const Desc = styled.span`
  font-size: 0.82rem;
  color: var(--gallery-ink-2);
`;

const Redirecting = styled.span`
  font-size: 0.78rem;
  color: var(--gallery-ice);
`;

const ReferralLink = styled.button`
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 16px;
  border: 0;
  background: none;
  color: var(--gallery-ice);
  font-size: 0.9rem;
  text-decoration: underline;
  cursor: pointer;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--gallery-ink-2);
  font-size: 1.15rem;
  cursor: pointer;
`;

const CardShell = styled.div`
  position: relative;
`;

export interface UpgradeModalProps {
  isOpen: boolean;
  purchaseLoading: CreditPackage | null;
  onPurchase(pkg: CreditPackage): void;
  /** VIP chain: close this modal, open the in-gallery VIP conversion modal (truth-locked flow) */
  onOpenVip(): void;
  /** Referral chain: close this modal, open the referral modal (truth-locked flow) */
  onOpenReferral(): void;
  onClose(): void;
}

export function UpgradeModal({
  isOpen,
  purchaseLoading,
  onPurchase,
  onOpenVip,
  onOpenReferral,
  onClose,
}: UpgradeModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Backdrop
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="gallery-upgrade-modal"
    >
      <Card role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <CardShell>
          <CloseBtn type="button" onClick={onClose} aria-label="Close">
            ✕
          </CloseBtn>
          <Title id={titleId}>Enhance Your Photos</Title>
          <Sub>Professional AI enhancement makes your photos pop. Choose a package:</Sub>

          <Grid>
            <PriceCard
              type="button"
              disabled={purchaseLoading !== null}
              onClick={() => onPurchase('single')}
            >
              <PriceLabel>Single</PriceLabel>
              <Price>$15</Price>
              <Desc>1 Photo Enhancement</Desc>
              {purchaseLoading === 'single' && <Redirecting>Redirecting…</Redirecting>}
            </PriceCard>

            <PriceCard
              type="button"
              $highlighted
              disabled={purchaseLoading !== null}
              onClick={() => onPurchase('bundle5')}
            >
              <PriceLabel>Bundle</PriceLabel>
              <Price>$50</Price>
              <Desc>5 Photo Enhancements</Desc>
              {purchaseLoading === 'bundle5' && <Redirecting>Redirecting…</Redirecting>}
            </PriceCard>

            <PriceCard type="button" onClick={onOpenVip}>
              <PriceLabel>VIP</PriceLabel>
              <Price>$175</Price>
              <Desc>2 Sessions + 90-Day Plan + Unlimited Enhancements</Desc>
            </PriceCard>
          </Grid>

          <ReferralLink type="button" onClick={onOpenReferral}>
            Want 5 free passes? Refer a teammate to SwanStudios.
          </ReferralLink>
        </CardShell>
      </Card>
    </Backdrop>
  );
}

export default UpgradeModal;
