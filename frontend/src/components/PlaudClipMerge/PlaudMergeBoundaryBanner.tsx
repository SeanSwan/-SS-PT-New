/**
 * PlaudMergeBoundaryBanner.tsx
 * =============================
 * Warning banner shown when the merged audio appears to span multiple
 * client names (boundary detector flagged a multi-client risk).
 *
 * Phase 3 Slice 3.11 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.
 *
 * Non-blocking by design (Codex Round 1 §5.3 — warn, don't block);
 * trainer can choose Continue or Go Back to re-select clips.
 *
 * role="alert" so screen readers announce the warning when it appears.
 */

import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import type { BoundaryWarning } from '../../services/plaudMergeService';

const Banner = styled.div`
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  padding: 0.875rem 1rem;
  background: rgba(198, 168, 75, 0.12);
  border: 1px solid rgba(198, 168, 75, 0.4);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
`;

const Body = styled.div`
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.45;
`;

const Title = styled.div`
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--accent-gold, #C6A84B);
`;

const Names = styled.span`
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.625rem;

  @media (min-width: 768px) {
    margin-top: 0.75rem;
  }
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.875rem;
  min-height: 44px;
  background: ${({ $primary }) => ($primary ? 'var(--accent-purple, #8B5CF6)' : 'transparent')};
  color: var(--text-primary, #E0ECF4);
  border: 1px solid ${({ $primary }) => ($primary ? 'rgba(96,192,240,0.45)' : 'rgba(198,168,75,0.5)')};
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  box-shadow: ${({ $primary }) => ($primary ? '0 0 14px rgba(96,192,240,0.35)' : 'none')};
  transition: box-shadow 200ms ease, background-color 200ms ease;

  &:hover {
    box-shadow: ${({ $primary }) => ($primary ? '0 0 22px rgba(96,192,240,0.5)' : '0 0 14px rgba(198,168,75,0.3)')};
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

export interface PlaudMergeBoundaryBannerProps {
  boundaryWarning: BoundaryWarning;
  onContinue?: () => void;
  onReSelect?: () => void;
}

export function PlaudMergeBoundaryBanner({
  boundaryWarning,
  onContinue,
  onReSelect,
}: PlaudMergeBoundaryBannerProps): JSX.Element | null {
  if (!boundaryWarning?.warning) return null;
  const names = boundaryWarning.detectedNames || [];
  const renderedNames = names
    .map((n) => `${n.firstName || ''}${n.lastName ? ` ${n.lastName}` : ''}`.trim())
    .filter(Boolean)
    .join(', ');

  return (
    <Banner role="alert" data-testid="plaud-boundary-banner">
      <AlertTriangle size={20} aria-hidden="true" color="#C6A84B" />
      <Body>
        <Title>Multiple client names detected</Title>
        <div>
          The merged audio mentions: <Names>{renderedNames || 'multiple clients'}</Names>.
          Did you mean to merge clips from different sessions?
        </div>
        <Actions>
          {onReSelect ? (
            <ActionButton type="button" onClick={onReSelect}>
              Go back and re-select
            </ActionButton>
          ) : null}
          {onContinue ? (
            <ActionButton type="button" $primary onClick={onContinue}>
              Continue anyway
            </ActionButton>
          ) : null}
        </Actions>
      </Body>
    </Banner>
  );
}

export default PlaudMergeBoundaryBanner;
