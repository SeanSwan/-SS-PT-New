/** Error-boundary handoff prefill contract. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { SupportIssueClient } from '../../services/supportIssueService';
import SupportReportRoomPage from './SupportReportRoomPage';

describe('Report Room error-boundary handoff', () => {
  it('prefills only safe route context and submits as an error-boundary report', async () => {
    const client: SupportIssueClient = {
      listIssues: vi.fn().mockResolvedValue({ issues: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
      createIssue: vi.fn().mockImplementation(async (request) => ({
        id: 'issue-1', referenceCode: 'SWR-20260716-ERROR001', status: 'new',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString(),
        ...request,
      })),
      getIssue: vi.fn(), addReply: vi.fn(),
    };
    render(
      <MemoryRouter initialEntries={['/support?source=error_boundary&code=ROUTE_RENDER_ERROR&path=%2Fcheckout&token=private']}>
        <SupportReportRoomPage client={client} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/short title/i)).toHaveValue('Problem on /checkout');
    expect(screen.getByLabelText(/^what happened\?$/i)).toHaveValue('An application error interrupted what I was doing on /checkout.');
    fireEvent.click(screen.getByRole('button', { name: /^send report$/i }));

    await waitFor(() => expect(client.createIssue).toHaveBeenCalledWith(expect.objectContaining({
      source: 'error_boundary',
      diagnostics: expect.objectContaining({ path: '/checkout', errorCode: 'ROUTE_RENDER_ERROR' }),
    })));
    expect(JSON.stringify(client.createIssue.mock.calls)).not.toContain('private');
  });
});
