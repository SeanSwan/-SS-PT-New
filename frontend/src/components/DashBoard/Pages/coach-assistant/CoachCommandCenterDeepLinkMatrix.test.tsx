import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
} from './CoachCommandCenterPage.test.harness';

type ExpectedTab = 'chat' | 'intake' | 'plaud';

const MERGE_ID = '11111111-2222-3333-4444-555555555555';

function expectActiveTab(tab: ExpectedTab) {
  expect(screen.getByRole('button', { name: /^Chat$/i }))
    .toHaveAttribute('aria-pressed', String(tab === 'chat'));
  expect(screen.getByRole('button', { name: /^Intake/i }))
    .toHaveAttribute('aria-pressed', String(tab === 'intake'));
  expect(screen.getByRole('button', { name: /^PLAUD/i }))
    .toHaveAttribute('aria-pressed', String(tab === 'plaud'));
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
    ['default chat', '/dashboard/admin/coach-assistant', 'chat'],
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
});
