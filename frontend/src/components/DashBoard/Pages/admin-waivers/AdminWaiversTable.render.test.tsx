/**
 * Render regression for AdminWaiversTable (launch audit lane 2, 2026-08-03).
 * Mirror of AdminSpecialsTable.render.test.tsx after hostile R10 found the
 * waivers scroller had no biting assertion: the table must render inside the
 * labeled, keyboard-focusable scroll region so 320-414px scrolls instead of
 * clipping columns.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminWaiversTable from './AdminWaiversTable';
import type { WaiverRecordSummary } from './adminWaivers.types';

const record = {
  id: 'w1',
  fullName: 'Test Client',
  email: 'client@example.com',
  phone: null,
  status: 'pending_match',
  source: 'public_form',
  signedAt: '2026-08-01T00:00:00.000Z',
  pendingMatches: [],
  user: null,
} as unknown as WaiverRecordSummary;

describe('AdminWaiversTable', () => {
  it('renders the table inside the labeled keyboard-focusable scroll region', () => {
    render(<AdminWaiversTable records={[record]} onView={vi.fn()} />);

    const scroller = screen.getByRole('region', { name: 'Waiver records table' });
    const table = screen.getByRole('table');
    expect(scroller.contains(table)).toBe(true);
    expect(scroller).toHaveAttribute('tabindex', '0');
    // SWA-140: the row action now carries a per-row accessible name
    // ("View waiver record for <client>") instead of a bare "View". In a list
    // of 25 rows, 25 buttons all named "View" give a screen-reader user no way
    // to tell them apart. Same assertion intent — the action is present and
    // reachable by role — matched against the descriptive name.
    expect(screen.getByRole('button', { name: /^View waiver record for/ })).toBeTruthy();
  });

  it('renders the empty state without a table when no records exist', () => {
    render(<AdminWaiversTable records={[]} onView={vi.fn()} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/No waiver records found/i)).toBeTruthy();
  });
});
