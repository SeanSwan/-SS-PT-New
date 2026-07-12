/**
 * FILE: CoachCommandCenterReviewPanelLazy.tsx
 * PURPOSE: Code-split boundary for the Review workspace. Talk is the
 * default tab and clients never see Review, so the heaviest subtree in
 * the page chunk (PLAUD merge + intake + review hub) loads only when an
 * operator actually opens the tab.
 */
import React, { Suspense, type ComponentProps } from 'react';

const CoachCommandCenterReviewPanel = React.lazy(
  () => import('./CoachCommandCenterReviewPanel'),
);

type ReviewPanelProps = ComponentProps<typeof CoachCommandCenterReviewPanel>;

const CoachCommandCenterReviewPanelLazy: React.FC<ReviewPanelProps> = (props) => (
  <Suspense
    fallback={
      <article className="panel" aria-busy="true">
        Loading review workspace...
      </article>
    }
  >
    <CoachCommandCenterReviewPanel {...props} />
  </Suspense>
);

export default CoachCommandCenterReviewPanelLazy;
