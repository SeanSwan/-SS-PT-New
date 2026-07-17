import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import SupportReportRoomPage from './SupportReportRoomPage';
import type { SupportIssueClient } from '../../services/supportIssueService';

function createClient(overrides: Partial<SupportIssueClient> = {}): SupportIssueClient {
  return {
    createIssue: vi.fn().mockResolvedValue({
      id: 'issue-1',
      referenceCode: 'SWR-20260716-ABCDEF12',
      category: 'bug',
      severity: 'medium',
      status: 'new',
      source: 'text',
      title: 'Workout logger will not save',
      description: 'The Save session button returns an error every time.',
      expectedBehavior: '',
      impact: '',
      reproductionSteps: [],
      diagnostics: {},
      createdAt: '2026-07-16T18:00:00.000Z',
      updatedAt: '2026-07-16T18:00:00.000Z',
      lastActivityAt: '2026-07-16T18:00:00.000Z',
    }),
    listIssues: vi.fn().mockResolvedValue({
      issues: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }),
    getIssue: vi.fn(),
    addReply: vi.fn(),
    ...overrides,
  };
}

function renderPage(client: SupportIssueClient) {
  return render(
    <MemoryRouter>
      <SupportReportRoomPage client={client} />
    </MemoryRouter>,
  );
}

describe('SupportReportRoomPage', () => {
  it('submits a structured text report and shows a durable receipt', async () => {
    const user = userEvent.setup();
    const client = createClient();
    renderPage(client);

    expect(await screen.findByText(/No reports yet/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /The Report Room/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Short title/i), 'Workout logger will not save');
    await user.type(
      screen.getByLabelText(/^What happened\?$/i),
      'The Save session button returns an error every time.',
    );
    await user.type(screen.getByLabelText(/What did you expect/i), 'The workout should save once.');
    await user.type(screen.getByLabelText(/How did this affect you/i), 'I cannot finish my log.');
    await user.type(
      screen.getByLabelText(/Steps to repeat it/i),
      'Open Workout Logger\nSelect Save session',
    );
    await user.click(screen.getByRole('button', { name: /Send report/i }));

    await waitFor(() => expect(client.createIssue).toHaveBeenCalledTimes(1));
    expect(client.createIssue).toHaveBeenCalledWith(expect.objectContaining({
      category: 'bug',
      severity: 'medium',
      source: 'text',
      title: 'Workout logger will not save',
      reproductionSteps: ['Open Workout Logger', 'Select Save session'],
      diagnostics: expect.objectContaining({ path: '/' }),
    }));
    expect(await screen.findAllByText('SWR-20260716-ABCDEF12')).toHaveLength(2);
    expect(screen.getByText(/Your report is safely in the queue/i)).toBeInTheDocument();
  }, 15_000);

  it('loads older reporter receipts without replacing the newest page', async () => {
    const user = userEvent.setup();
    const newest = await createClient().createIssue({} as never);
    const older = { ...newest, id: 'issue-2', referenceCode: 'SWR-20260715-1234ABCD', title: 'Older access issue' };
    const listIssues = vi.fn()
      .mockResolvedValueOnce({ issues: [newest], pagination: { page: 1, pageSize: 20, total: 2, totalPages: 2 } })
      .mockResolvedValueOnce({ issues: [older], pagination: { page: 2, pageSize: 20, total: 2, totalPages: 2 } });
    const client = createClient({ listIssues });
    renderPage(client);

    expect(await screen.findByText(newest.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /load older reports/i }));

    await waitFor(() => expect(listIssues).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }));
    expect(screen.getByText(newest.title)).toBeInTheDocument();
    expect(await screen.findByText('Older access issue')).toBeInTheDocument();
  });

  it('keeps loaded receipts visible when loading an older page fails', async () => {
    const user = userEvent.setup();
    const newest = await createClient().createIssue({} as never);
    const listIssues = vi.fn()
      .mockResolvedValueOnce({ issues: [newest], pagination: { page: 1, pageSize: 20, total: 2, totalPages: 2 } })
      .mockRejectedValueOnce(new Error('Older reports could not be loaded.'))
      .mockResolvedValueOnce({ issues: [], pagination: { page: 2, pageSize: 20, total: 1, totalPages: 2 } });
    const client = createClient({ listIssues });
    renderPage(client);

    expect(await screen.findByText(newest.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /load older reports/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Older reports could not be loaded.');
    expect(screen.getByText(newest.title)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(listIssues).toHaveBeenCalledTimes(3));
    expect(listIssues).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 });
  });

  it('keeps the reporter draft when the request fails', async () => {
    const user = userEvent.setup();
    const client = createClient({
      createIssue: vi.fn().mockRejectedValue(new Error('The support request could not be completed.')),
    });
    renderPage(client);

    const title = screen.getByLabelText(/Short title/i);
    const description = screen.getByLabelText(/^What happened\?$/i);
    expect(screen.getByText('Your draft stays in this form if sending fails.')).toBeInTheDocument();
    await user.type(title, 'Progress page is blank');
    await user.type(description, 'The progress page stays blank after I open it.');
    await user.click(screen.getByRole('button', { name: /Send report/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The support request could not be completed.',
    );
    expect(title).toHaveValue('Progress page is blank');
    expect(description).toHaveValue('The progress page stays blank after I open it.');
  });
});
