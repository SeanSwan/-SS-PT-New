/** Reporter detail and follow-up contract. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SupportIssue, SupportIssueClient } from '../../services/supportIssueService';
import SupportReporterIssueDetail from './SupportReporterIssueDetail';

const issue: SupportIssue = {
  id: 'issue-1', referenceCode: 'SWR-20260716-A1B2C3D4',
  category: 'bug', severity: 'high', status: 'waiting_on_reporter', source: 'voice',
  title: 'Checkout froze', description: 'Checkout froze after payment.',
  expectedBehavior: 'Show a receipt.', impact: 'Could not confirm purchase.',
  reproductionSteps: ['Open checkout', 'Submit payment'], diagnostics: {},
  events: [
    { id: 1, eventType: 'owner_reply', visibility: 'reporter', body: 'What browser were you using?', createdAt: '2026-07-16T18:00:00.000Z' },
  ],
  lastActivityAt: '2026-07-16T18:00:00.000Z', createdAt: '2026-07-16T17:00:00.000Z', updatedAt: '2026-07-16T18:00:00.000Z',
};

describe('SupportReporterIssueDetail', () => {
  it('shows reporter-visible history and adds a follow-up without exposing owner notes', async () => {
    const client: SupportIssueClient = {
      createIssue: vi.fn(), listIssues: vi.fn(),
      getIssue: vi.fn().mockResolvedValue(issue),
      addReply: vi.fn().mockResolvedValue({ id: 2, eventType: 'reporter_reply', visibility: 'reporter', body: 'Safari 18 on my phone.', createdAt: '2026-07-16T18:05:00.000Z' }),
    };
    render(<SupportReporterIssueDetail issueId="issue-1" client={client} onClose={vi.fn()} />);

    expect(await screen.findByText(/what browser were you using/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/add more detail/i), { target: { value: 'Safari 18 on my phone.' } });
    fireEvent.click(screen.getByRole('button', { name: /send follow-up/i }));

    await waitFor(() => expect(client.addReply).toHaveBeenCalledWith('issue-1', 'Safari 18 on my phone.'));
    expect(await screen.findByText('Safari 18 on my phone.')).toBeInTheDocument();
  });
});
