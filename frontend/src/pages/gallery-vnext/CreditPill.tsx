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
  hasCredits: boolean;
  onUpgrade(): void;
}

export function CreditPill({ credits, hasCredits, onUpgrade }: CreditPillProps) {
  const total = totalCredits(credits);
  const label = credits.isVip ? 'VIP — unlimited enhancements' : `${total} enhancement ${total === 1 ? 'pass' : 'passes'}`;

  return (
    <Pill type="button" onClick={onUpgrade} data-testid="gallery-credit-pill" aria-label={label}>
      <Dot $active={hasCredits} aria-hidden="true" />
      {label}
    </Pill>
  );
}

export default CreditPill;
