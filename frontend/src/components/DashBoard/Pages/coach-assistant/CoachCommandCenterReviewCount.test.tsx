import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  renderPage,
  resetCoachCommandCenterMocks,
  useCoachIntakeQueueMock,
} from './CoachCommandCenterPage.test.harness';

describe('CoachCommandCenter review count truth', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('counts one pending proposal as one prepared draft', () => {
    const queue = useCoachIntakeQueueMock();
    useCoachIntakeQueueMock.mockReturnValue({
      ...queue,
      summary: {
        ...queue.summary,
        actionable: 0,
        preparedDrafts: 1,
        pendingDrafts: 1,
        readyReview: 0,
      },
    });

    renderPage('/dashboard/admin/coach-assistant');

    expect(screen.getByRole('tab', { name: 'Review, 1 waiting' })).toBeInTheDocument();
  });

  it('does not count a completed proposal as waiting review work', () => {
    const queue = useCoachIntakeQueueMock();
    useCoachIntakeQueueMock.mockReturnValue({
      ...queue,
      summary: { ...queue.summary, actionable: 0, preparedDrafts: 1, pendingDrafts: 0, appliedDrafts: 1, readyReview: 0 },
    });

    renderPage();
    const reviewTab = screen.getByRole('tab', { name: /^Review/ });
    expect(reviewTab).not.toHaveAccessibleName(/waiting/i);
    fireEvent.click(reviewTab);
    expect(screen.getByRole('button', { name: 'Open prepared draft review' })).toHaveTextContent('Clear');
  });
});
