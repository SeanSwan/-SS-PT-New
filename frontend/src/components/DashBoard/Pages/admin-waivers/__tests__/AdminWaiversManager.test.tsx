/**
 * AdminWaiversManager Tests — Phase 5W-D
 * ========================================
 * Verifies list rendering, filter behaviour, detail modal, and actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Mock apiService ──────────────────────────────────────────
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../../../../services/api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

// ── Import after mocks ──────────────────────────────────────
import AdminWaiversManager from '../AdminWaiversManager';

// ── Fixtures ─────────────────────────────────────────────────
const makeRecord = (overrides: any = {}) => ({
  id: 1,
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-0001',
  status: 'pending_match',
  source: 'qr',
  signedAt: '2026-02-27T10:00:00Z',
  createdAt: '2026-02-27T10:00:00Z',
  user: null,
  consentFlags: { aiConsentAccepted: false, liabilityAccepted: true, mediaConsentAccepted: false, guardianAcknowledged: false },
  pendingMatches: [],
  ...overrides,
});

const listResponse = (records: any[] = [makeRecord()], total = 1) => ({
  data: {
    data: {
      records,
      pagination: { page: 1, limit: 25, total, pages: Math.ceil(total / 25) || 1 },
    },
  },
});

const detailResponse = (record: any = makeRecord(), badges: string[] = []) => ({
  data: { data: { record: { ...record, dateOfBirth: '1990-05-15', activityTypes: [], versionLinks: [], submittedByGuardian: false, guardianName: null, ipAddress: null, userAgent: null }, badges } },
});

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

// ── Reset ────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  // Default: list returns one record
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith('/api/admin/waivers?')) return Promise.resolve(listResponse());
    if (url.match(/\/api\/admin\/waivers\/\d+$/)) return Promise.resolve(detailResponse());
    return Promise.resolve({ data: {} });
  });
  mockPost.mockResolvedValue({ data: { success: true } });
});

// ═════════════════════════════════════════════════════════════
describe('AdminWaiversManager', () => {
  it('W1 — renders loading state initially', () => {
    // Never resolve the GET
    mockGet.mockReturnValue(new Promise(() => {}));
    wrap(<AdminWaiversManager />);
    expect(screen.getByText('Loading waiver records...')).toBeInTheDocument();
  });

  it('W2 — renders table with records after fetch', async () => {
    wrap(<AdminWaiversManager />);
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  it('W3 — renders empty state when no records', async () => {
    mockGet.mockResolvedValue(listResponse([], 0));
    wrap(<AdminWaiversManager />);
    await waitFor(() => {
      expect(screen.getByText('No waiver records found.')).toBeInTheDocument();
    });
  });

  it('W4 — calls API with status filter param', async () => {
    wrap(<AdminWaiversManager />);
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

    const select = screen.getByDisplayValue('All Statuses');
    fireEvent.change(select, { target: { value: 'linked' } });

    await waitFor(() => {
      const calls = mockGet.mock.calls.filter((c: any[]) => c[0].includes('status=linked'));
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it('W5 — opens detail modal when View clicked', async () => {
    wrap(<AdminWaiversManager />);
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

    fireEvent.click(screen.getByText('View'));

    await waitFor(() => {
      expect(screen.getByText(/Waiver Record #1/)).toBeInTheDocument();
    });
  });

  it('W6 — calls approve endpoint when approve button clicked', async () => {
    const record = makeRecord({
      pendingMatches: [{
        id: 99, confidenceScore: 0.85, matchMethod: 'email', status: 'pending_review',
        candidateUser: { id: 42, firstName: 'John', lastName: 'Smith', email: 'john@example.com' },
        reviewedByUser: null, reviewedAt: null,
      }],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/waivers?')) return Promise.resolve(listResponse([record]));
      if (url.match(/\/api\/admin\/waivers\/\d+$/)) return Promise.resolve(detailResponse(record, ['Pending Match']));
      return Promise.resolve({ data: {} });
    });

    wrap(<AdminWaiversManager />);
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByText('View'));

    await waitFor(() => expect(screen.getByText('John Smith')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/admin/waivers/matches/99/approve');
    });
  });

  it('W7 — calls revoke endpoint with confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    wrap(<AdminWaiversManager />);
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByText('View'));

    await waitFor(() => expect(screen.getByText('Revoke')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Revoke'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/admin/waivers/1/revoke');
    });

    (window.confirm as any).mockRestore();
  });

  it('W8 — uses contract endpoint for attach-user (not /link)', async () => {
    const record = makeRecord();
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/waivers?')) return Promise.resolve(listResponse([record]));
      if (url.match(/\/api\/admin\/waivers\/\d+$/)) return Promise.resolve(detailResponse(record));
      if (url.startsWith('/api/admin/clients')) return Promise.resolve({ data: { data: { clients: [{ id: 42, firstName: 'John', lastName: 'Smith', email: 'john@test.com' }] } } });
      return Promise.resolve({ data: {} });
    });

    wrap(<AdminWaiversManager />);
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByText('View'));

    await waitFor(() => expect(screen.getByText('Manual Link')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Manual Link'));

    await waitFor(() => expect(screen.getByText(/Attach User to Waiver/)).toBeInTheDocument());

    // Select user
    await waitFor(() => expect(screen.getByText('John Smith')).toBeInTheDocument());
    fireEvent.click(screen.getByText('John Smith'));
    fireEvent.click(screen.getByText('Attach User'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/admin/waivers/1/attach-user', { userId: 42 });
    });
  });

  it('W9 — manual-link modal passes limit and search params to server', async () => {
    const record = makeRecord();
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/waivers?')) return Promise.resolve(listResponse([record]));
      if (url.match(/\/api\/admin\/waivers\/\d+$/)) return Promise.resolve(detailResponse(record));
      if (url.startsWith('/api/admin/clients')) return Promise.resolve({ data: { data: { clients: [{ id: 42, firstName: 'John', lastName: 'Smith', email: 'john@test.com' }] } } });
      return Promise.resolve({ data: {} });
    });

    wrap(<AdminWaiversManager />);
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByText('View'));
    await waitFor(() => expect(screen.getByText('Manual Link')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Manual Link'));

    // Initial load: should request with limit=50
    await waitFor(() => {
      const clientCalls = mockGet.mock.calls.filter((c: any[]) => c[0].startsWith('/api/admin/clients'));
      expect(clientCalls.length).toBeGreaterThan(0);
      expect(clientCalls[0][0]).toContain('limit=50');
    });
  });
});
