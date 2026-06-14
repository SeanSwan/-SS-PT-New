/**
 * LeadPipelinePanel — B1 actionable Leads tab.
 * Verifies the operator can work a lead without leaving the panel: change status
 * (PUT), set a follow-up date (PUT ISO), one-click email/call links, and that a
 * failed save reverts + surfaces an error. authAxios is mocked (no real network).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// authAxios MUST be a stable reference across renders (matches production, where
// it comes from context). A fresh object each render would destabilize the
// fetchLeadData useCallback -> re-fire its effect forever (max update depth).
const { authAxios, authGet, authPut } = vi.hoisted(() => {
  const authGet = vi.fn();
  const authPut = vi.fn();
  return { authGet, authPut, authAxios: { get: authGet, put: authPut } };
});
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios }),
}));

import LeadPipelinePanel from './LeadPipelinePanel';

const LEAD = {
  id: 7, firstName: 'Ava', lastName: 'Stone', email: 'ava@x.com', phone: '+15551234567',
  source: 'website', status: 'new', score: 30, nextFollowUpAt: null,
};

describe('LeadPipelinePanel — actionable (B1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGet.mockImplementation((url: string) =>
      url.includes('/stats')
        ? Promise.resolve({ data: { stats: { total: 1, new: 1, hotLeads: 0, needsFollowUp: 0, conversionRate: 0 } } })
        : Promise.resolve({ data: { leads: [LEAD] } })
    );
    authPut.mockResolvedValue({ data: { success: true } });
  });

  it('changing status PUTs /api/leads/:id with the new status', async () => {
    render(<LeadPipelinePanel />);
    const select = await screen.findByLabelText(/Status for Ava Stone/i);
    fireEvent.change(select, { target: { value: 'contacted' } });
    await waitFor(() => expect(authPut).toHaveBeenCalledTimes(1));
    expect(authPut).toHaveBeenCalledWith('/api/leads/7', { status: 'contacted' });
  });

  it('setting a follow-up date PUTs an ISO nextFollowUpAt', async () => {
    render(<LeadPipelinePanel />);
    const dateInput = await screen.findByLabelText(/Set follow-up date for Ava Stone/i);
    fireEvent.change(dateInput, { target: { value: '2026-07-01' } });
    await waitFor(() => expect(authPut).toHaveBeenCalledTimes(1));
    const [url, body] = authPut.mock.calls[0];
    expect(url).toBe('/api/leads/7');
    expect(body.nextFollowUpAt).toContain('2026-07-01');
  });

  it('exposes one-click email + call links', async () => {
    render(<LeadPipelinePanel />);
    await screen.findByText('Ava Stone');
    expect(screen.getByLabelText(/Email Ava Stone/i).getAttribute('href')).toBe('mailto:ava@x.com');
    expect(screen.getByLabelText(/Call Ava Stone/i).getAttribute('href')).toBe('tel:+15551234567');
  });

  it('reverts the row + shows an error when the save fails', async () => {
    authPut.mockRejectedValue(new Error('500'));
    render(<LeadPipelinePanel />);
    const select = await screen.findByLabelText(/Status for Ava Stone/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'lost' } });
    await screen.findByRole('alert');
    expect(select.value).toBe('new'); // reverted from optimistic 'lost'
  });
});
