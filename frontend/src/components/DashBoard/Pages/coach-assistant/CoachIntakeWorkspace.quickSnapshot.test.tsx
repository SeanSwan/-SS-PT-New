import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function makeQueue() {
  return {
    items: [],
    summary: {
      total: 6,
      actionable: 2,
      today: 1,
      unprocessed: 1,
      processing: 0,
      readyReview: 3,
      failed: 1,
      needsClient: 4,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace quick snapshot', () => {
  it('puts queue pressure near the top without removing the detailed summary', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeQueue()}
        />
      </MemoryRouter>,
    );

    const quickSnapshot = screen.getByLabelText('Coach intake quick snapshot');
    const detailedSummary = screen.getByLabelText('Coach intake summary');
    const workQueue = screen.getByLabelText('Coach intake work queue');

    expect(within(quickSnapshot).getByText('Actionable').closest('div')).toHaveTextContent('2');
    expect(within(quickSnapshot).getByText('Ready').closest('div')).toHaveTextContent('3');
    expect(within(quickSnapshot).getByText('Needs client').closest('div')).toHaveTextContent('4');
    expect(within(quickSnapshot).getByText('Failed').closest('div')).toHaveTextContent('1');
    expect(workQueue.compareDocumentPosition(detailedSummary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(quickSnapshot.compareDocumentPosition(workQueue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
