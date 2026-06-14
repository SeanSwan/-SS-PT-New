import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createQuickCoachCommandClientMock,
  renderPage,
  resetCoachCommandCenterMocks,
  useCoachIntakeQueueMock,
} from './CoachCommandCenterPage.test.harness';

const PLACEHOLDER = 'Talk or type to Swan Coach…';
const composerInput = () => screen.getByPlaceholderText(PLACEHOLDER);
const openOpsRail = () => {
  fireEvent.click(screen.getByRole('button', { name: /^Ops$/i }));
  return screen.getByLabelText('Coach operations command surface');
};

describe('CoachCommandCenterPage Ops drawer', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('opens and closes the operator drawer with aria-expanded and Escape handling', () => {
    renderPage();

    const opsTrigger = screen.getByRole('button', { name: /^Ops$/i });
    expect(opsTrigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(opsTrigger);
    expect(opsTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(opsTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses the unified Coach intake queue and reaches the embedded PLAUD merge workflow', () => {
    renderPage('/dashboard/admin/coach-assistant?workspace=plaud&mergeRequestId=11111111-2222-3333-4444-555555555555');

    expect(useCoachIntakeQueueMock).toHaveBeenCalledWith({ scope: 'actionable', limit: 12, enabled: true });
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toHaveAttribute('data-embedded', 'true');
    expect(screen.getByTestId('mock-plaud-merge-workspace')).toHaveTextContent('11111111-2222-3333-4444-555555555555');

    fireEvent.click(screen.getByRole('button', { name: /^Intake/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toHaveTextContent('Unified actionable 9');
  });

  it('shows real queue counts in the operations rail instead of static prototype values', () => {
    renderPage();

    const operationsRail = openOpsRail();
    expect(within(operationsRail).getByRole('heading', { name: /Operator controls/i })).toBeInTheDocument();
    expect(within(operationsRail).getByRole('heading', { name: /Queue snapshot/i })).toBeInTheDocument();
    expect(within(operationsRail).queryByText(/Use Nutrition Context/i)).not.toBeInTheDocument();
    expect(within(operationsRail).queryByRole('heading', { name: /Next operator action/i })).not.toBeInTheDocument();
    expect(within(operationsRail).getByText('Ready drafts').closest('li')).toHaveTextContent('3');
    expect(within(operationsRail).getByText('Client confirmation holds').closest('li')).toHaveTextContent('1');
    expect(within(operationsRail).getByText('Clarification holds').closest('li')).toHaveTextContent('5');
    expect(within(operationsRail).getByText('Duplicate-risk holds').closest('li')).toHaveTextContent('2');
  });

  it('creates a minimal client stub from the operator drawer and stages the dock for approved follow-up', async () => {
    renderPage();
    const operationsRail = openOpsRail();

    expect(within(within(operationsRail).getByLabelText('Client source')).getByRole('option', { name: 'External' })).toBeInTheDocument();
    fireEvent.change(within(operationsRail).getByLabelText('Client name'), { target: { value: 'Ava Stone' } });
    fireEvent.change(within(operationsRail).getByLabelText('Client source'), { target: { value: 'external' } });
    fireEvent.click(within(operationsRail).getByRole('button', { name: /Create stub client/i }));

    await waitFor(() => {
      expect(createQuickCoachCommandClientMock).toHaveBeenCalledWith({ fullName: 'Ava Stone', clientSource: 'external' });
    });

    expect(composerInput()).toHaveValue('Continue Ava Stone with review-gated context.');
    expect(screen.getAllByText(/Ava Stone - client stub ready/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No workout log was written/i).length).toBeGreaterThan(0);
  });
});
