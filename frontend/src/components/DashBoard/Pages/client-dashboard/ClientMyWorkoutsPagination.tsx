/**
 * ============================================================================
 * FILE: ClientMyWorkoutsPagination.tsx
 * PURPOSE: Pagination controls for ClientMyWorkoutsPage (extracted per rule 4)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-13
 * CANONICAL-SURFACE-AUDIT: 2026-04-13
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders Previous / Next workout-history page controls
 * for the canonical client workouts page. The canonical backend (workoutRoutes
 * → workoutController.getWorkoutSessions) accepts `{ limit, page }` query
 * params; before this component existed, no canonical surface sent page>1
 * from real UI, so the controller's page→offset translation was unreachable.
 *
 * HOW IT FITS IN THE APP:
 *   ClientMyWorkoutsPage → ClientMyWorkoutsPagination (stateless)
 *
 * KEY DECISIONS:
 *   - Stateless. Parent owns the page state. This component only renders
 *     controls and fires callbacks.
 *   - "Next" disables on the heuristic `currentPageCount < limit`. The
 *     canonical response does not include a total-count field, so we use
 *     "this page has fewer rows than the limit = last page". If exactly
 *     `limit` rows come back on the true last page, the user may click
 *     Next once and see an empty list, then can click Previous — acceptable
 *     tradeoff for not adding a total-count field to the service response.
 *   - 44px min touch target per CLAUDE.md rule 2.
 *   - Dark-first palette via var(--accent-primary, #60C0F0) per rule 3/6.
 */

import React from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled components
// ─────────────────────────────────────────────────────────────

const PaginationControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem 0.5rem;
  border-top: 1px solid rgba(96, 192, 240, 0.12);
`;

const PageBtn = styled.button`
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.15s;
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:not(:disabled):hover { background: rgba(96, 192, 240, 0.1); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const PageIndicator = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

export interface ClientMyWorkoutsPaginationProps {
  page: number;
  currentPageCount: number;
  limit: number;
  onPrev: () => void;
  onNext: () => void;
}

export const ClientMyWorkoutsPagination: React.FC<ClientMyWorkoutsPaginationProps> = ({
  page,
  currentPageCount,
  limit,
  onPrev,
  onNext,
}) => {
  // Show only when there's something to paginate. Parent component can also
  // choose to hide by not rendering this, but this gate is defensive.
  if (page <= 1 && currentPageCount < limit) {
    return null;
  }

  return (
    <PaginationControls aria-label="Workout history pagination">
      <PageBtn
        type="button"
        disabled={page <= 1}
        onClick={onPrev}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} /> Previous page
      </PageBtn>
      <PageIndicator aria-live="polite">Page {page}</PageIndicator>
      <PageBtn
        type="button"
        disabled={currentPageCount < limit}
        onClick={onNext}
        aria-label="Next page"
      >
        Next page <ChevronRight size={16} />
      </PageBtn>
    </PaginationControls>
  );
};

export default ClientMyWorkoutsPagination;
