/**
 * Retry contract: one logical report keeps one client request UUID until the
 * server confirms creation, preventing duplicate tickets after lost responses.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SupportIssue, SupportIssueClient } from '../../services/supportIssueService';
import SupportReportComposer from './SupportReportComposer';

const issue = {
  id: '11111111-1111-4111-8111-111111111111',
  referenceCode: 'SWR-20260716-A1B2C3D4',
  category: 'bug', severity: 'medium', status: 'new', source: 'text',
  title: 'Progress page is blank', description: 'The progress page stays blank after opening it.',
  reproductionSteps: [], diagnostics: {}, lastActivityAt: new Date().toISOString(),
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
} satisfies SupportIssue;

describe('SupportReportComposer retry idempotency', () => {
  it('reuses the same client request UUID after a failed response', async () => {
    const createIssue = vi.fn()
      .mockRejectedValueOnce(new Error('Connection interrupted.'))
      .mockResolvedValueOnce(issue);
    const client: SupportIssueClient = {
      createIssue,
      listIssues: vi.fn(),
      getIssue: vi.fn(),
      addReply: vi.fn(),
    };
    render(<SupportReportComposer client={client} onSubmitted={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/short title/i), { target: { value: issue.title } });
    fireEvent.change(screen.getByLabelText(/^what happened\?$/i), { target: { value: issue.description } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await screen.findByText('Connection interrupted.');
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(createIssue).toHaveBeenCalledTimes(2));

    const first = createIssue.mock.calls[0][0].clientRequestId;
    const second = createIssue.mock.calls[1][0].clientRequestId;
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second).toBe(first);
  });
});
