import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockAuthAxios = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ data: { success: false } }),
  post: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'admin' }, authAxios: mockAuthAxios }),
}));
vi.mock('./WorkoutPlannerBackupPanel', () => ({
  default: () => null,
}));

import WorkoutPlannerSavedPlansSection, { type SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';

const plans: SavedPlanSummary[] = [
  {
    id: 'plan-6m',
    name: 'Six Month Foundation',
    status: 'active',
    createdAt: '2026-06-07T12:00:00.000Z',
    goal: 'strength',
    horizonKey: 'six_month',
    horizonLabel: '6 Month',
    isPrimary: true,
  },
  {
    id: 'plan-9m',
    name: 'Nine Month Strength Arc',
    status: 'draft',
    createdAt: '2026-06-07T12:00:00.000Z',
    goal: 'strength',
    horizonKey: 'nine_month',
    horizonLabel: '9 Month',
  },
];

const props = {
  selectedClientId: 42,
  savedPlans: plans,
  savedPlansLoading: false,
  loadedPlanId: null,
  archiveBlockedFor: () => false,
  onLoad: vi.fn(),
  onActivate: vi.fn(),
  onRename: vi.fn(),
  onDuplicate: vi.fn(),
  onArchive: vi.fn(),
  onSetPrimary: vi.fn(),
  pdfDialogPlan: null,
  pdfDialogMode: 'view' as const,
  pdfSaving: false,
  pdfOpening: false,
  onViewPdf: vi.fn(),
  onUpdatePdf: vi.fn(),
  onSavePdf: vi.fn(),
  onUploadPdf: vi.fn(),
  onClosePdfDialog: vi.fn(),
};

describe('WorkoutPlannerSavedPlansSection primary arc selector', () => {
  it('numbers saved plan cards in list order', () => {
    render(<WorkoutPlannerSavedPlansSection {...props} />);

    expect(screen.getByTestId('saved-plan-number-plan-6m')).toHaveTextContent('Plan 1');
    expect(screen.getByTestId('saved-plan-number-plan-9m')).toHaveTextContent('Plan 2');
  });

  it('uses profile-neutral empty copy for admin self planner gaps', () => {
    render(
      <WorkoutPlannerSavedPlansSection
        {...props}
        savedPlans={[]}
        activePlanLoggerRoute="/dashboard/admin/log-my-workout?loadPlan=today&source=workout-planner"
      />,
    );

    expect(screen.getByText(/no saved plans for this training profile yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/this client/i)).not.toBeInTheDocument();
  });

  it('activates draft plans selected from the primary-arc header so clients can see them', () => {
    const onActivate = vi.fn();
    const onSetPrimary = vi.fn();
    render(
      <WorkoutPlannerSavedPlansSection
        {...props}
        onActivate={onActivate}
        onSetPrimary={onSetPrimary}
      />,
    );

    const selector = screen.getByLabelText(/select primary training arc/i);
    expect(selector).toHaveValue('plan-6m');

    fireEvent.change(selector, { target: { value: 'plan-9m' } });

    expect(onActivate).toHaveBeenCalledWith('plan-9m', 'Nine Month Strength Arc');
    expect(onSetPrimary).not.toHaveBeenCalled();
  });

  it('uses the primary endpoint only when switching between current active arcs', () => {
    const onActivate = vi.fn();
    const onSetPrimary = vi.fn();
    render(
      <WorkoutPlannerSavedPlansSection
        {...props}
        savedPlans={[plans[0], { ...plans[1], status: 'ACTIVE', isPrimary: false }]}
        onActivate={onActivate}
        onSetPrimary={onSetPrimary}
      />,
    );

    fireEvent.change(screen.getByLabelText(/select primary training arc/i), {
      target: { value: 'plan-9m' },
    });

    expect(onSetPrimary).toHaveBeenCalledWith('plan-9m', 'Nine Month Strength Arc');
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('leaves the selector unclaimed when all saved plans are drafts so selecting one activates it', () => {
    const onActivate = vi.fn();
    render(<WorkoutPlannerSavedPlansSection
      {...props}
      savedPlans={[
        { ...plans[1], status: 'draft', isPrimary: false },
        { ...plans[0], status: 'draft', isPrimary: false },
      ]}
      onActivate={onActivate}
    />);

    const selector = screen.getByLabelText(/select primary training arc/i);
    expect(selector).toHaveValue('');

    fireEvent.change(selector, { target: { value: 'plan-6m' } });

    expect(onActivate).toHaveBeenCalledWith('plan-6m', 'Six Month Foundation');
  });

  it('prefers a legacy uppercase active arc before the 6 Month default', () => {
    render(<WorkoutPlannerSavedPlansSection
      {...props}
      savedPlans={[
        { ...plans[1], status: 'ACTIVE', isPrimary: false },
        { ...plans[0], status: 'draft', isPrimary: false },
      ]}
    />);

    expect(screen.getByLabelText(/select primary training arc/i)).toHaveValue('plan-9m');
  });

  it('does not offer a current-plan logger link when saved plans are drafts only', () => {
    render(
      <WorkoutPlannerSavedPlansSection
        {...props}
        savedPlans={plans.map(plan => ({ ...plan, status: 'draft' }))}
        activePlanLoggerRoute="/dashboard/trainer/log-workout?clientId=42&source=workout-planner&loadPlan=today"
      />,
    );

    expect(screen.queryByRole('link', { name: /open workout logger for the current plan/i }))
      .not.toBeInTheDocument();
  });

  it('offers a direct logger link for the current selected-client plan', () => {
    render(
      <WorkoutPlannerSavedPlansSection
        {...props}
        activePlanLoggerRoute="/dashboard/trainer/log-workout?clientId=42&source=workout-planner&loadPlan=today"
      />,
    );

    expect(screen.getByRole('link', { name: /open workout logger for the current plan/i }))
      .toHaveAttribute('href', '/dashboard/trainer/log-workout?clientId=42&source=workout-planner&loadPlan=today');
  });
});
