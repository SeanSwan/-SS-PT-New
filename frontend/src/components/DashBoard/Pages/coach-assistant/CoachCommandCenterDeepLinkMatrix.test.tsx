import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
} from './CoachCommandCenterPage.test.harness';

type ExpectedTab = 'chat' | 'intake' | 'plaud';

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
  const chat = screen.getByRole('tab', { name: /^Chat$/i });
  const intake = screen.getByRole('tab', { name: /^Intake/i });
  const plaud = screen.getByRole('tab', { name: /^PLAUD/i });
  expect(chat).toHaveAttribute('aria-selected', String(tab === 'chat'));
  expect(intake).toHaveAttribute('aria-selected', String(tab === 'intake'));
  expect(plaud).toHaveAttribute('aria-selected', String(tab === 'plaud'));
  expect(chat).toHaveAttribute('aria-pressed', String(tab === 'chat'));
  expect(intake).toHaveAttribute('aria-pressed', String(tab === 'intake'));
  expect(plaud).toHaveAttribute('aria-pressed', String(tab === 'plaud'));
}

function expectMountedWorkspace(tab: ExpectedTab, activeIntakeId?: string, mergeLabel?: string) {
  expectActiveTab(tab);

  if (tab === 'chat') {
    expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    return;
  }

  if (tab === 'intake') {
    expect(screen.getByTestId('mock-coach-intake-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-plaud-merge-workspace')).not.toBeInTheDocument();
    expect(screen.getByText(`Active intake ${activeIntakeId || 'none'}`)).toBeInTheDocument();
    return;
  }

  expect(screen.getByTestId('mock-plaud-merge-workspace')).toBeInTheDocument();
  expect(screen.queryByTestId('mock-coach-intake-workspace')).not.toBeInTheDocument();
  if (mergeLabel) {
    expect(screen.getByText(mergeLabel)).toBeInTheDocument();
  }
}

describe('CoachCommandCenterPage deep-link matrix', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it.each([
    ['default actionable intake', '/dashboard/admin/coach-assistant', 'intake'],
    ['explicit chat workspace', '/dashboard/admin/coach-assistant?workspace=chat', 'chat'],
    ['direct intake', '/dashboard/admin/coach-assistant?intake=clip-111', 'intake', 'clip-111'],
    ['direct proposal', '/dashboard/admin/coach-assistant?proposal=proposal-123', 'intake'],
    ['proposal for intake', '/dashboard/admin/coach-assistant?intake=clip-111&proposal=proposal-123', 'intake', 'clip-111'],
    ['PLAUD workspace', '/dashboard/admin/coach-assistant?workspace=plaud', 'plaud'],
    ['review next PLAUD', '/dashboard/admin/coach-assistant?review=next', 'plaud'],
    ['direct PLAUD merge', `/dashboard/admin/coach-assistant?mergeRequestId=${MERGE_ID}`, 'plaud', undefined, MERGE_ID],
    ['PLAUD wins over proposal', '/dashboard/admin/coach-assistant?workspace=plaud&proposal=proposal-123', 'plaud'],
    ['merge wins over intake', `/dashboard/admin/coach-assistant?mergeRequestId=${MERGE_ID}&intake=clip-111`, 'plaud', undefined, MERGE_ID],
    ['review-next wins over proposal', '/dashboard/admin/coach-assistant?review=next&proposal=proposal-123', 'plaud'],
  ] as const)(
    'routes %s to %s',
    (_label, route, tab, activeIntakeId, mergeLabel) => {
      renderPage(route);

      expectMountedWorkspace(tab, activeIntakeId, mergeLabel);
    },
  );

  it('keeps client deep links on Chat when an operator-only tab hint is present', () => {
    renderPage('/dashboard/client/coach-assistant?workspace=plaud&review=next', 'client');

    expect(screen.getByRole('tab', { name: /^Chat$/i })).toHaveAttribute('aria-selected', 'true');
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
    fireEvent.click(screen.getByRole('button', { name: /operations/i }));

    await waitFor(() => {
      const rail = screen.getByRole('dialog', { name: 'Coach operations command surface' });
      expect(rail).toHaveAttribute('aria-modal', 'true');
      expect(rail).toHaveAttribute('aria-hidden', 'false');
    });
  });
});
