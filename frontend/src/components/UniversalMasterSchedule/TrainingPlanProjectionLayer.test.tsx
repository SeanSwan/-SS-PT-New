/**
 * ============================================================================
 * FILE: TrainingPlanProjectionLayer.test.tsx
 * PURPOSE: Verify accessible, read-only plan cards stay outside appointments.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrainingPlanProjections } from './hooks/useTrainingPlanProjections';
import TrainingPlanProjectionLayer from './TrainingPlanProjectionLayer';

vi.mock('./hooks/useTrainingPlanProjections', () => ({
  useTrainingPlanProjections: vi.fn(),
}));

const planItem = {
  projectionId: 'plan-1:w1:d1:2026-07-15:o1:r3',
  kind: 'training_plan_projection',
  source: 'training_plan',
  billingImpact: 'none',
  readOnly: true,
  planId: 'plan-1',
  clientId: 42,
  trainerId: 7,
  planStatus: 'active',
  scheduledDate: '2026-07-15',
  dateBasis: 'plan_start',
  timeZone: 'America/Los_Angeles',
  weekNumber: 1,
  dayNumber: 1,
  title: 'Foundation Arc',
  dayLabel: 'Stability Base',
  focus: 'Movement quality',
  assignmentType: 'homework',
  exerciseCount: 2,
  exercisePreview: ['Goblet Squat', 'Pallof Press'],
  prescribedRevision: 3,
  prescribedHash: 'a'.repeat(64),
  completionState: 'planned',
  completedAt: null,
  coexistenceKey: '42:2026-07-15',
} as const;

const baseState = {
  enabled: true,
  status: 'ready',
  items: [planItem],
  error: null,
  total: 1,
  hasMore: false,
  loadingMore: false,
  clientScopeLimited: false,
  totalScopedClients: 1,
  retry: vi.fn(),
  loadMore: vi.fn(),
} as any;

const props = {
  mode: 'trainer' as const,
  activeView: 'week' as const,
  currentDate: new Date(2026, 6, 15, 12),
  clients: [{ id: '42', firstName: 'Ava', lastName: 'Stone' }],
  sessions: [{ id: 99, userId: 42, sessionDate: '2026-07-15T10:00:00' }],
  clientRosterLoading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useTrainingPlanProjections).mockReturnValue(baseState);
});

describe('TrainingPlanProjectionLayer', () => {
  it('renders a separate read-only plan region with appointment coexistence truth', () => {
    render(<TrainingPlanProjectionLayer {...props as any} />);

    expect(screen.getByRole('region', { name: /planned training/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Planned Training' })).toBeInTheDocument();
    expect(screen.getByText('Read only · No credit impact')).toBeInTheDocument();
    expect(screen.getByText('Ava Stone')).toBeInTheDocument();
    expect(screen.getByText('Stability Base')).toBeInTheDocument();
    expect(screen.getByText('Goblet Squat · Pallof Press')).toBeInTheDocument();
    expect(screen.getByText('Appointment also scheduled')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /book|edit|pay|drag|reschedule/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('uses a 44px toggle to hide and restore projection cards', () => {
    render(<TrainingPlanProjectionLayer {...props as any} />);

    fireEvent.click(screen.getByRole('button', { name: /hide planned training/i }));
    expect(screen.queryByText('Stability Base')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show planned training/i }));
    expect(screen.getByText('Stability Base')).toBeInTheDocument();
  });

  it('shows bounded-scope and pagination truth with an explicit load-more action', () => {
    const loadMore = vi.fn();
    vi.mocked(useTrainingPlanProjections).mockReturnValue({
      ...baseState,
      clientScopeLimited: true,
      totalScopedClients: 61,
      total: 150,
      hasMore: true,
      loadMore,
    });
    render(<TrainingPlanProjectionLayer {...props as any} />);

    expect(screen.getByText(/first 50 of 61 authorized clients/i)).toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 150 planned assignments/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /load more planned training/i }));
    expect(loadMore).toHaveBeenCalledOnce();
  });

  it('renders a safe retry state and disappears entirely when disabled', () => {
    const retry = vi.fn();
    vi.mocked(useTrainingPlanProjections).mockReturnValue({
      ...baseState,
      status: 'error',
      items: [],
      error: 'Could not load planned training.',
      retry,
    });
    const { rerender } = render(<TrainingPlanProjectionLayer {...props as any} />);
    expect(screen.getByText('Could not load planned training.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry planned training/i }));
    expect(retry).toHaveBeenCalledOnce();

    vi.mocked(useTrainingPlanProjections).mockReturnValue({
      ...baseState,
      enabled: false,
      status: 'disabled',
      items: [],
    });
    rerender(<TrainingPlanProjectionLayer {...props as any} />);
    expect(screen.queryByRole('region', { name: /planned training/i })).not.toBeInTheDocument();
  });
  it('surfaces a later-page failure without hiding already loaded plans', () => {
    vi.mocked(useTrainingPlanProjections).mockReturnValue({
      ...baseState,
      error: 'Could not load more planned training.',
      hasMore: true,
    });
    render(<TrainingPlanProjectionLayer {...props as any} />);

    expect(screen.getByText('Stability Base')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load more planned training.');
    expect(screen.getByRole('button', { name: /load more planned training/i })).toBeEnabled();
  });
});