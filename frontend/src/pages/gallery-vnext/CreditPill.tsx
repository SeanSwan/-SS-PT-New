/**
 * Gallery vNext — enhancement-credit pill. Kimi Q4 (binding): credits are an AFTER-the-gate concept, so the
 * shell mounts this ONLY once a galleryToken exists. There is no anonymous credit state to leak.
 * Secondary affordance only — the photos are the CTA on the grid, so this never wears the primary glow.
 */
import styled from 'styled-components';
import { totalCredits, type EnhancementCredits } from './gallery.types';

const Pill = styled.button`
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: var(--gallery-z-sticky, 40);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--gallery-target, 48px);
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--gallery-chrome-edge);
  background: var(--gallery-surface-1);
  color: var(--gallery-ink);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  box-shadow: var(--gallery-elev-2);
`;

const Dot = styled.span<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? 'var(--gallery-ice)' : 'var(--gallery-ink-2)')};
`;

export interface CreditPillProps {
  credits: EnhancementCredits;
  onUpgrade(): void;
}

/** Label parity with the shipped pill (GalleryPage.tsx:1718-1723): VIP → free passes → purchased → zero. */
function pillText(credits: EnhancementCredits): string {
  if (credits.isVip) return 'VIP - Unlimited Enhancements';
  if (credits.freeRemaining > 0)
    return `${credits.freeRemaining} Free Enhancement Pass${credits.freeRemaining !== 1 ? 'es' : ''}`;
  if (credits.purchasedCredits > 0)
    return `${credits.purchasedCredits} Enhancement Credit${credits.purchasedCredits !== 1 ? 's' : ''}`;
  return '0 Enhancement Credits';
}

export function CreditPill({ credits, onUpgrade }: CreditPillProps) {
  const active = credits.isVip || totalCredits(credits) > 0;
  const label = pillText(credits);

  return (
    <Pill type="button" onClick={onUpgrade} data-testid="gallery-credit-pill" aria-label={label}>
      <Dot $active={active} aria-hidden="true" />
      {label}
    </Pill>
  );
}

export default CreditPill;
