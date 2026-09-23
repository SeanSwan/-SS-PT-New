/**
 * WorkoutPlannerBlendDialog — charter v3 P3 UI locks
 * ==================================================
 * Locks: closed renders nothing, primary defaults to Plan A, per-week A/B
 * picks (weeks a source lacks are disabled on that side), submit posts the
 * full pick list, and a backend rejection surfaces its message honestly.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockGet, post: mockPost }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'trainer' }, authAxios: mockAuthAxios }),
}));

import WorkoutPlannerBlendDialog from './WorkoutPlannerBlendDialog';
import type { SavedPlanSummary } from './SavedPlanCard';

const savedPlans: SavedPlanSummary[] = [
  { id: '11', name: 'Primary Strength Arc', status: 'active', createdAt: '', goal: 'strength', isPrimary: true },
  { id: '22', name: 'Backup - General Fitness', status: 'draft', createdAt: '', goal: 'general_fitness' },
];

const UUID_CASES = [
  {
    label: 'digit-start and letter-start IDs',
    planAId: '550e8400-e29b-41d4-a716-446655440000',
    planBId: 'a6ba7b81-9dad-41d1-80b4-00c04fd430c8',
  },
  {
    label: 'letter-start IDs',
    planAId: 'a50e8400-e29b-41d4-a716-446655440000',
    planBId: 'b6ba7b81-9dad-41d1-80b4-00c04fd430c8',
  },
] as const;

const planWeeks = (count: number) => ({
  data: { success: true, plan: { planData: { weeks: Array.from({ length: count }, (_, i) => ({ weekNumber: i + 1 })) } } },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) =>
    Promise.resolve(url.endsWith('/11') ? planWeeks(3) : planWeeks(2)));
  mockPost.mockResolvedValue({ data: { success: true, blendedPlanId: 99 } });
});

describe('WorkoutPlannerBlendDialog', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <WorkoutPlannerBlendDialog open={false} savedPlans={savedPlans} onClose={vi.fn()} onBlended={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('defaults Plan A to the primary, builds week rows, and disables sides past a source range', async () => {
    render(<WorkoutPlannerBlendDialog open savedPlans={savedPlans} onClose={vi.fn()} onBlended={vi.fn()} />);

    expect(await screen.findByText('Week 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Plan A source')).toHaveValue('11');
    expect(screen.getByLabelText('Plan B source')).toHaveValue('22');
    // Plan B only has 2 weeks — week 3 from B must be disabled.
    expect(screen.getByRole('button', { name: 'Week 3 from plan B' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Week 3 from plan A' })).toBeEnabled();
  });

  it('submits the full pick list and reports the new blended plan', async () => {
    const onBlended = vi.fn();
    const onClose = vi.fn();
    render(<WorkoutPlannerBlendDialog open savedPlans={savedPlans} onClose={onClose} onBlended={onBlended} />);

    await screen.findByText('Week 3');
    await userEvent.click(screen.getByRole('button', { name: 'Week 2 from plan B' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create blended plan' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/workout-plans/blend', {
      planAId: '11',
      planBId: '22',
      picks: [
        { source: 'A', weekNumber: 1 },
        { source: 'B', weekNumber: 2 },
        { source: 'A', weekNumber: 3 },
      ],
    }));
    expect(onBlended).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(UUID_CASES)('preserves canonical opaque IDs for $label', async ({ planAId, planBId }) => {
    mockGet.mockResolvedValue(planWeeks(1));
    const uuidPlans: SavedPlanSummary[] = [
      { id: planAId, name: 'Primary UUID Plan', status: 'active', createdAt: '', goal: 'strength', isPrimary: true },
      { id: planBId, name: 'Backup UUID Plan', status: 'draft', createdAt: '', goal: 'general_fitness' },
    ];

    render(<WorkoutPlannerBlendDialog open savedPlans={uuidPlans} onClose={vi.fn()} onBlended={vi.fn()} />);

    await screen.findByText('Week 1');
    await userEvent.click(screen.getByRole('button', { name: 'Create blended plan' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/workout-plans/blend', {
      planAId,
      planBId,
      picks: [{ source: 'A', weekNumber: 1 }],
    }));
  });

  it('trims an optional title before submitting the blend', async () => {
    render(<WorkoutPlannerBlendDialog open savedPlans={savedPlans} onClose={vi.fn()} onBlended={vi.fn()} />);

    await screen.findByText('Week 3');
    await userEvent.type(screen.getByLabelText('Blended plan title'), '  Spring hybrid  ');
    await userEvent.click(screen.getByRole('button', { name: 'Create blended plan' }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/workout-plans/blend', {
      planAId: '11',
      planBId: '22',
      picks: [
        { source: 'A', weekNumber: 1 },
        { source: 'A', weekNumber: 2 },
        { source: 'A', weekNumber: 3 },
      ],
      title: 'Spring hybrid',
    }));
  });

  it('surfaces the backend message when the blend is rejected', async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { message: 'Plans belong to different clients' } } });
    render(<WorkoutPlannerBlendDialog open savedPlans={savedPlans} onClose={vi.fn()} onBlended={vi.fn()} />);

    await screen.findByText('Week 3');
    await userEvent.click(screen.getByRole('button', { name: 'Create blended plan' }));

    expect(await screen.findByText('Plans belong to different clients')).toBeInTheDocument();
  });
});
