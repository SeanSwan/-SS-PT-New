/**
 * Phase 3 Slice 3.12 — PlaudPendingReviewsList locks
 * ====================================================
 * Source-text + render locks. Hook (usePlaudPendingReviews) is mocked
 * via vi.mock so we can drive different list states.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { PlaudApiError } from '../../services/plaudClipService';

vi.mock('../../hooks/usePlaudPendingReviews', () => ({
  usePlaudPendingReviews: vi.fn(),
}));

import { PlaudPendingReviewsList } from './PlaudPendingReviewsList';
import { usePlaudPendingReviews } from '../../hooks/usePlaudPendingReviews';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = readFileSync(resolve(__dirname, 'PlaudPendingReviewsList.tsx'), 'utf8');

describe('Slice 3.12 — PlaudPendingReviewsList source contract', () => {
  it('uses styled-components + Crystalline Swan tokens (Rule 1 + Rule 6)', () => {
    expect(SRC).toMatch(/import\s+styled\s+from\s+['"]styled-components['"]/);
    expect(SRC).toMatch(/var\(--text-primary,\s*#E0ECF4\)/);
    expect(SRC).not.toMatch(/from\s+['"]@mui/);
  });

  it('44px touch targets on action buttons (Rule 2)', () => {
    expect(SRC).toMatch(/height:\s*44px/);
  });

  it('mobile-first responsive: media query at 768px+', () => {
    expect(SRC).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
  });

  it('uses usePlaudPendingReviews hook (NOT direct service calls)', () => {
    expect(SRC).toMatch(/usePlaudPendingReviews/);
  });

  it('Open review button only for status=completed AND !cipherPurged', () => {
    expect(SRC).toMatch(/r\.status\s*===\s*['"]completed['"]\s*&&\s*!r\.cipherPurged/);
  });

  it('failed merges show "Interrupted" disabled button', () => {
    expect(SRC).toMatch(/Interrupted/);
    expect(SRC).toMatch(/disabled\s+aria-label/);
  });

  it('cipher-purged rows are flagged with red pill', () => {
    expect(SRC).toMatch(/CIPHER PURGED/);
  });

  it('boundary warning surfaced via gold "multi-client" pill', () => {
    expect(SRC).toMatch(/multi-client/);
  });

  it('discard button has descriptive aria-label including client', () => {
    expect(SRC).toMatch(/Discard merge for/);
  });

  it('alert role on error banner', () => {
    expect(SRC).toMatch(/role="alert"/);
  });
});

describe('Slice 3.12 — PlaudPendingReviewsList render', () => {
  beforeEach(() => {
    vi.mocked(usePlaudPendingReviews).mockReset();
  });

  it('renders empty state when no reviews', () => {
    vi.mocked(usePlaudPendingReviews).mockReturnValue({
      reviews: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      loadDetail: vi.fn(),
      discard: vi.fn(),
    });
    render(<PlaudPendingReviewsList onOpen={() => {}} />);
    expect(screen.getByText(/No pending reviews/i)).toBeTruthy();
  });

  it('renders loading state', () => {
    vi.mocked(usePlaudPendingReviews).mockReturnValue({
      reviews: [],
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      loadDetail: vi.fn(),
      discard: vi.fn(),
    });
    render(<PlaudPendingReviewsList onOpen={() => {}} />);
    expect(screen.getByText(/Loading pending reviews/i)).toBeTruthy();
  });

  it('renders completed merge with Open review button', () => {
    vi.mocked(usePlaudPendingReviews).mockReturnValue({
      reviews: [{
        mergeRequestId: '11111111-1111-1111-1111-111111111111',
        status: 'completed',
        clientId: 42,
        clientName: 'Sarah Johnson',
        clipCount: 3,
        parsedExerciseCount: 6,
        boundaryWarning: null,
        hasCipher: true,
        cipherPurged: false,
        errorCode: null,
        createdAt: '2026-05-04T10:00:00Z',
        completedAt: '2026-05-04T10:01:00Z',
        expiresAt: '2026-05-05T10:01:00Z',
      }],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      loadDetail: vi.fn(),
      discard: vi.fn(),
    });
    render(<PlaudPendingReviewsList onOpen={() => {}} />);
    expect(screen.getByText(/Sarah Johnson/i)).toBeTruthy();
    expect(screen.getByText(/Open review/i)).toBeTruthy();
    expect(screen.getByText(/6 exercises/i)).toBeTruthy();
  });

  it('renders failed merge with Interrupted button (no Open review)', () => {
    vi.mocked(usePlaudPendingReviews).mockReturnValue({
      reviews: [{
        mergeRequestId: '22222222-2222-2222-2222-222222222222',
        status: 'failed',
        clientId: 7,
        clientName: 'Test Client',
        clipCount: 2,
        parsedExerciseCount: null,
        boundaryWarning: null,
        hasCipher: false,
        cipherPurged: false,
        errorCode: 'MERGE_PROCESSING_STALE',
        createdAt: '2026-05-04T08:00:00Z',
        completedAt: null,
        expiresAt: '2026-05-05T08:00:00Z',
      }],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      loadDetail: vi.fn(),
      discard: vi.fn(),
    });
    render(<PlaudPendingReviewsList onOpen={() => {}} />);
    expect(screen.getByText(/MERGE_PROCESSING_STALE/i)).toBeTruthy();
    expect(screen.getByText(/Interrupted/i)).toBeTruthy();
    expect(screen.queryByText(/Open review/i)).toBeNull();
  });

  it('renders cipher-purged completed merge WITHOUT Open review button', () => {
    vi.mocked(usePlaudPendingReviews).mockReturnValue({
      reviews: [{
        mergeRequestId: '33333333-3333-3333-3333-333333333333',
        status: 'completed',
        clientId: 99,
        clientName: 'Old Client',
        clipCount: 4,
        parsedExerciseCount: 5,
        boundaryWarning: null,
        hasCipher: false,
        cipherPurged: true,
        errorCode: null,
        createdAt: '2026-05-03T00:00:00Z',
        completedAt: '2026-05-03T00:01:00Z',
        expiresAt: '2026-05-04T00:01:00Z',
      }],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      loadDetail: vi.fn(),
      discard: vi.fn(),
    });
    render(<PlaudPendingReviewsList onOpen={() => {}} />);
    expect(screen.getByText(/CIPHER PURGED/i)).toBeTruthy();
    expect(screen.queryByText(/Open review/i)).toBeNull();
  });

  it('renders boundary warning pill when present', () => {
    vi.mocked(usePlaudPendingReviews).mockReturnValue({
      reviews: [{
        mergeRequestId: '44444444-4444-4444-4444-444444444444',
        status: 'completed',
        clientId: 1,
        clientName: 'Client A',
        clipCount: 3,
        parsedExerciseCount: 4,
        boundaryWarning: { warning: true, confidence: 'medium', detectedNames: [] },
        hasCipher: true,
        cipherPurged: false,
        errorCode: null,
        createdAt: '2026-05-04T11:00:00Z',
        completedAt: '2026-05-04T11:01:00Z',
        expiresAt: '2026-05-05T11:01:00Z',
      }],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      loadDetail: vi.fn(),
      discard: vi.fn(),
    });
    render(<PlaudPendingReviewsList onOpen={() => {}} />);
    expect(screen.getByText(/multi-client/i)).toBeTruthy();
  });

  it('does not expose arbitrary pending-list error detail', () => {
    vi.mocked(usePlaudPendingReviews).mockReturnValue({
      reviews: [],
      isLoading: false,
      error: new PlaudApiError('UNSAFE_BACKEND_DETAIL', 'do-not-render-private-detail', 500),
      refresh: vi.fn(),
      loadDetail: vi.fn(),
      discard: vi.fn(),
    });

    render(<PlaudPendingReviewsList onOpen={() => {}} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('PLAUD_ERROR');
    expect(alert).toHaveTextContent('Failed to load pending reviews.');
    expect(alert).not.toHaveTextContent('UNSAFE_BACKEND_DETAIL');
    expect(alert).not.toHaveTextContent('do-not-render-private-detail');
  });

  it('does not expose arbitrary row error codes from failed merge summaries', () => {
    vi.mocked(usePlaudPendingReviews).mockReturnValue({
      reviews: [{
        mergeRequestId: '55555555-5555-4555-8555-555555555555',
        status: 'failed',
        clientId: 8,
        clientName: 'Test Client',
        clipCount: 1,
        parsedExerciseCount: null,
        boundaryWarning: null,
        hasCipher: false,
        cipherPurged: false,
        errorCode: 'UNSAFE_BACKEND_DETAIL',
        createdAt: '2026-05-04T08:00:00Z',
        completedAt: null,
        expiresAt: '2026-05-05T08:00:00Z',
      }],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      loadDetail: vi.fn(),
      discard: vi.fn(),
    });

    render(<PlaudPendingReviewsList onOpen={() => {}} />);

    expect(screen.getByText(/PLAUD_ERROR/i)).toBeTruthy();
    expect(screen.queryByText(/UNSAFE_BACKEND_DETAIL/i)).toBeNull();
  });
});
