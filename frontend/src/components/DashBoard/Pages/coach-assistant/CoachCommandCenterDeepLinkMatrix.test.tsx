import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
} from './CoachCommandCenterPage.test.harness';

type ExpectedTab = 'talk' | 'review';

const MERGE_ID = '11111111-2222-3333-4444-555555555555';

function setDrawerViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query === '(max-width: 1279px)' ? matches : false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  });
}

function expectActiveTab(tab: ExpectedTab) {
  const talk = screen.getByRole('tab', { name: /^Talk$/i });
  const review = screen.getByRole('tab', { name: /^Review/i });
  const history = screen.getByRole('tab', { name: /^History$/i });

  expect(talk).toHaveAttribute('aria-selected', String(tab === 'talk'));
  expect(review).toHaveAttribute('aria-selected', String(tab === 'review'));
  expect(history).toHaveAttribute('aria-selected', 'false');
  expect(talk).toHaveAttribute('aria-pressed', String(tab === 'talk'));
  expect(review).toHaveAttribute('aria-pressed', String(tab === 'review'));
  expect(history).toHaveAttribute('aria-pressed', 'false');

  expect(screen.queryByRole('tab', { name: /^Intake/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: /^PLAUD/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: /^Workbench/i })).not.toBeInTheDocument();
}

async function expectMountedWorkspace(tab: ExpectedTab, section?: 'intake' | 'audio' | 'drafts', activeIntakeId?: string, mergeLabel?: string) {
  expectActiveTab(tab);

  if (tab === 'talk') {
    expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    return;
  }

  expect(screen.getByRole('heading', { name: /^Review$/i })).toBeInTheDocument();

  if (section === 'drafts') {
    fireEvent.click(screen.getByRole('button', { name: /open drafts/i }));
    expect(await screen.findByRole('region', { name: /^Drafts$/i })).toBeInTheDocument();
    return;
  }

  if (section === 'intake') {
    fireEvent.click(screen.getByRole('button', { name: /open intake review/i }));
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    expect(screen.getByText(`Active intake ${activeIntakeId || 'none'}`)).toBeInTheDocument();
    return;
  }

  fireEvent.click(screen.getByRole('button', { name: /open audio review/i }));
  expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
  expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
  if (mergeLabel) {
    expect(screen.getByText(mergeLabel)).toBeInTheDocument();
  }
}

describe('CoachCommandCenterPage deep-link matrix', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it.each([
    ['default actionable talk', '/dashboard/admin/coach-assistant', 'talk'],
    ['explicit chat workspace', '/dashboard/admin/coach-assistant?workspace=chat', 'talk'],
    ['direct intake', '/dashboard/admin/coach-assistant?intake=clip-111', 'review', 'intake', 'clip-111'],
    ['direct proposal', '/dashboard/admin/coach-assistant?proposal=proposal-123', 'review', 'intake', 'none'],
    ['proposal for intake', '/dashboard/admin/coach-assistant?intake=clip-111&proposal=proposal-123', 'review', 'intake', 'clip-111'],
    ['PLAUD workspace', '/dashboard/admin/coach-assistant?workspace=plaud', 'review', 'audio'],
    ['onboarding workbench', '/dashboard/admin/coach-assistant?workspace=onboarding&clientId=77', 'review', 'drafts'],
    ['review next PLAUD', '/dashboard/admin/coach-assistant?review=next', 'review', 'audio'],
    ['direct PLAUD merge', `/dashboard/admin/coach-assistant?mergeRequestId=${MERGE_ID}`, 'review', 'audio', undefined, MERGE_ID],
    ['PLAUD wins over proposal', '/dashboard/admin/coach-assistant?workspace=plaud&proposal=proposal-123', 'review', 'audio'],
    ['merge wins over intake', `/dashboard/admin/coach-assistant?mergeRequestId=${MERGE_ID}&intake=clip-111`, 'review', 'audio', undefined, MERGE_ID],
    ['review-next wins over proposal', '/dashboard/admin/coach-assistant?review=next&proposal=proposal-123', 'review', 'audio'],
  ] as const)(
    'routes %s to %s',
    async (_label, route, tab, section, activeIntakeId, mergeLabel) => {
      renderPage(route);

      await expectMountedWorkspace(tab, section, activeIntakeId, mergeLabel);
    },
  );

  it('keeps client deep links on Talk when an operator-only tab hint is present', () => {
    renderPage('/dashboard/client/coach-assistant?workspace=plaud&review=next', 'client');

    expect(screen.getByRole('tab', { name: /^Talk$/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: /^Review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^PLAUD/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
  });

  it('keeps the operations rail available as an inline desktop landmark', async () => {
    setDrawerViewport(false);
    renderPage();

    const rail = screen.getByLabelText('Coach operations command surface');

    await waitFor(() => {
      expect(rail).toHaveAttribute('role', 'complementary');
      expect(rail).toHaveAttribute('aria-hidden', 'false');
    });
    expect((rail as HTMLElement & { inert?: boolean }).inert).toBe(false);
  });

  it('uses modal drawer semantics for operations below the desktop breakpoint', async () => {
    setDrawerViewport(true);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^More coach actions$/i }));

    await waitFor(() => {
      const rail = screen.getByRole('dialog', { name: 'Coach operations command surface' });
      expect(rail).toHaveAttribute('aria-modal', 'true');
      expect(rail).toHaveAttribute('aria-hidden', 'false');
    });
  });
});
