/**
 * Owner inbox workflow tests: queue-to-detail, triage, prompt copy, and reply.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminSupportIssueClient, OwnerSupportIssue } from '../../../../services/adminSupportIssueService';
import OwnerSupportInboxPage from './OwnerSupportInboxPage';

const issue: OwnerSupportIssue = {
  id: '11111111-1111-4111-8111-111111111111',
  referenceCode: 'SWR-20260716-A1B2C3D4',
  reporterUserId: 42,
  category: 'workout', severity: 'high', status: 'new', source: 'voice',
  title: 'Workout logger will not save',
  description: 'The save action returns an error after the session.',
  expectedBehavior: 'The session appears in workout history.',
  impact: 'Progress is missing.',
  reproductionSteps: ['Open logger', 'Press Save'],
  diagnostics: { path: '/dashboard/client/log-workout' },
  events: [],
  lastActivityAt: '2026-07-16T17:00:00.000Z',
  createdAt: '2026-07-16T17:00:00.000Z',
  updatedAt: '2026-07-16T17:00:00.000Z',
};

function client(): AdminSupportIssueClient {
  return {
    listIssues: vi.fn().mockResolvedValue({
      issues: [issue], pagination: { page: 1, pageSize: 25, total: 1, pages: 1 },
    }),
    getIssue: vi.fn().mockResolvedValue(issue),
    updateIssue: vi.fn().mockImplementation(async (_id, changes) => ({ ...issue, ...changes })),
    addNote: vi.fn().mockResolvedValue({ id: 1, eventType: 'internal_note', visibility: 'owner', body: 'Investigating.', createdAt: '2026-07-16T17:10:00.000Z' }),
    addReply: vi.fn().mockResolvedValue({ id: 2, eventType: 'owner_reply', visibility: 'reporter', body: 'I am investigating.', createdAt: '2026-07-16T17:11:00.000Z' }),
    getRepairPrompt: vi.fn().mockResolvedValue({ referenceCode: issue.referenceCode, prompt: '# Fix the canonical issue' }),
  };
}

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  delete (document as Document & { execCommand?: unknown }).execCommand;
});

describe('OwnerSupportInboxPage', () => {
  it('loads the queue and copies a de-identified agent-ready prompt', async () => {
    const api = client();
    render(<OwnerSupportInboxPage client={api} />);

    expect(await screen.findByRole('heading', { name: /workout logger will not save/i })).toBeInTheDocument();
    expect(screen.getAllByText(issue.referenceCode).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /copy agent prompt/i }));
    await waitFor(() => expect(api.getRepairPrompt).toHaveBeenCalledWith(issue.id));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Fix the canonical issue');
    expect(screen.getByText(/agent prompt copied/i)).toBeInTheDocument();
  });

  it('requires and sends lifecycle details for resolved and duplicate reports', async () => {
    const api = client();
    render(<OwnerSupportInboxPage client={api} />);
    await screen.findByRole('heading', { name: /workout logger will not save/i });

    fireEvent.change(screen.getByLabelText(/issue status/i), { target: { value: 'resolved' } });
    fireEvent.change(screen.getByLabelText(/resolution summary/i), { target: { value: 'Fixed the canonical save transaction.' } });
    fireEvent.click(screen.getByRole('button', { name: /save triage/i }));
    await waitFor(() => expect(api.updateIssue).toHaveBeenCalledWith(issue.id, expect.objectContaining({
      status: 'resolved',
      resolutionSummary: 'Fixed the canonical save transaction.',
    })));

    fireEvent.change(screen.getByLabelText(/issue status/i), { target: { value: 'duplicate' } });
    fireEvent.change(screen.getByLabelText(/duplicate issue reference/i), { target: { value: 'SWR-20260715-A1B2C3D4' } });
    fireEvent.click(screen.getByRole('button', { name: /save triage/i }));
    await waitFor(() => expect(api.updateIssue).toHaveBeenLastCalledWith(issue.id, expect.objectContaining({
      status: 'duplicate',
      duplicateOfReferenceCode: 'SWR-20260715-A1B2C3D4',
    })));
  });

  it('uses an accessible clipboard fallback and displays the owner audit history', async () => {
    const api = client();
    vi.mocked(api.getIssue).mockResolvedValue({
      ...issue,
      events: [{
        id: 7,
        eventType: 'internal_note',
        visibility: 'owner',
        body: 'Verified on the canonical workout route.',
        createdAt: '2026-07-16T17:12:00.000Z',
      }],
    });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

    render(<OwnerSupportInboxPage client={api} />);
    expect(await screen.findByRole('heading', { name: /audit history/i })).toBeInTheDocument();
    expect(screen.getByText(/verified on the canonical workout route/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy agent prompt/i }));
    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'));
    expect(screen.getByText(/agent prompt copied/i)).toBeInTheDocument();
  });

  it('loads the next queue page without dropping the active filters', async () => {
    const api = client();
    vi.mocked(api.listIssues).mockResolvedValue({
      issues: [issue], pagination: { page: 1, pageSize: 25, total: 26, pages: 2 },
    });
    render(<OwnerSupportInboxPage client={api} />);
    await screen.findByRole('heading', { name: /workout logger will not save/i });

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => expect(api.listIssues).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('updates triage and sends distinct internal and reporter-visible messages', async () => {
    const api = client();
    render(<OwnerSupportInboxPage client={api} />);
    await screen.findByRole('heading', { name: /workout logger will not save/i });

    fireEvent.change(screen.getByLabelText(/issue status/i), { target: { value: 'in_progress' } });
    fireEvent.click(screen.getByRole('button', { name: /save triage/i }));
    await waitFor(() => expect(api.updateIssue).toHaveBeenCalledWith(issue.id, expect.objectContaining({ status: 'in_progress' })));

    fireEvent.change(screen.getByLabelText(/internal note/i), { target: { value: 'Investigating.' } });
    fireEvent.click(screen.getByRole('button', { name: /add private note/i }));
    await waitFor(() => expect(api.addNote).toHaveBeenCalledWith(issue.id, 'Investigating.'));

    fireEvent.change(screen.getByLabelText(/reply to reporter/i), { target: { value: 'I am investigating.' } });
    fireEvent.click(screen.getByRole('button', { name: /send reporter update/i }));
    await waitFor(() => expect(api.addReply).toHaveBeenCalledWith(issue.id, 'I am investigating.'));
  });
});
