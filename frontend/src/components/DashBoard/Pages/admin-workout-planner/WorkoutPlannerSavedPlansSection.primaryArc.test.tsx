import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

const clients = [
  { id: 42, firstName: 'Ava', lastName: 'Stone', username: 'ava' },
  { id: 77, firstName: 'Swan', lastName: 'Sean Bot', username: 'swan_sean_bot' },
];

const props = {
  clients,
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

  it('lets trainers choose the primary training arc from the saved-plan section header', () => {
    const onSetPrimary = vi.fn();
    render(<WorkoutPlannerSavedPlansSection {...props} onSetPrimary={onSetPrimary} />);

    const selector = screen.getByLabelText(/select primary training arc/i);
    expect(selector).toHaveValue('plan-6m');

    fireEvent.change(selector, { target: { value: 'plan-9m' } });

    expect(onSetPrimary).toHaveBeenCalledWith('plan-9m', 'Nine Month Strength Arc');
  });

  it('falls back to the 6 Month default when no active or primary arc exists', () => {
    render(<WorkoutPlannerSavedPlansSection
      {...props}
      savedPlans={[
        { ...plans[1], status: 'draft', isPrimary: false },
        { ...plans[0], status: 'draft', isPrimary: false },
      ]}
    />);

    expect(screen.getByLabelText(/select primary training arc/i)).toHaveValue('plan-6m');
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

  it('duplicates a saved plan into the selected copy target and span', () => {
    const onDuplicate = vi.fn();
    render(<WorkoutPlannerSavedPlansSection {...props} onDuplicate={onDuplicate} />);

    fireEvent.change(screen.getByLabelText(/copy duplicate target client/i), { target: { value: '77' } });
    fireEvent.change(screen.getByLabelText(/copy duplicate span/i), { target: { value: '52' } });
    fireEvent.click(screen.getByTestId('action-duplicate-plan-6m'));

    expect(onDuplicate).toHaveBeenCalledWith('plan-6m', 'Six Month Foundation', 77, 52);
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
