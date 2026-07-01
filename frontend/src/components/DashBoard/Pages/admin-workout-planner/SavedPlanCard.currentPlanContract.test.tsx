import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SavedPlanCard, { type SavedPlanSummary } from './SavedPlanCard';

const draftPlan: SavedPlanSummary = {
  id: 'p-50',
  name: 'Phase 1 Plan',
  status: 'draft',
  createdAt: '2026-04-30T00:00:00Z',
  goal: 'general_fitness',
  horizonKey: 'one_month',
  horizonLabel: '1 Month',
  isPrimary: false,
};

const activePlan: SavedPlanSummary = {
  id: 'p-51',
  name: 'Phase 2 Plan',
  status: 'active',
  createdAt: '2026-05-01T00:00:00Z',
  goal: 'hypertrophy',
  horizonKey: 'six_month',
  horizonLabel: '6 Month',
  isPrimary: true,
};

const handlers = () => ({
  onLoad: vi.fn(),
  onActivate: vi.fn(),
  onRename: vi.fn(),
  onDuplicate: vi.fn(),
  onArchive: vi.fn(),
  onViewPdf: vi.fn(),
  onUpdatePdf: vi.fn(),
  onSetPrimary: vi.fn(),
});

beforeEach(() => {
  cleanup();
});

describe('SavedPlanCard current-plan primary contract', () => {
  it('does not show a primary badge for inactive plans with stale primary metadata', () => {
    const h = handlers();
    render(
      <SavedPlanCard
        plan={{ ...draftPlan, isPrimary: true }}
        loaded={false}
        archiveBlocked={false}
        {...h}
      />,
    );

    expect(screen.queryByTestId('primary-arc-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('action-activate-p-50')).toBeInTheDocument();
  });

  it('does not expose Set Primary on draft cards because Make Current activates and promotes them', () => {
    const h = handlers();
    render(<SavedPlanCard plan={draftPlan} loaded={false} archiveBlocked={false} {...h} />);

    expect(screen.queryByTestId('action-set-primary-p-50')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('action-activate-p-50'));

    expect(h.onActivate).toHaveBeenCalledWith('p-50', 'Phase 1 Plan');
    expect(h.onSetPrimary).not.toHaveBeenCalled();
    expect(h.onLoad).not.toHaveBeenCalled();
  });

  it('lets trainers mark an active non-primary saved plan as the primary arc', () => {
    const h = handlers();
    render(
      <SavedPlanCard
        plan={{ ...activePlan, isPrimary: false }}
        loaded={false}
        archiveBlocked={false}
        {...h}
      />,
    );

    fireEvent.click(screen.getByTestId('action-set-primary-p-51'));

    expect(h.onSetPrimary).toHaveBeenCalledWith('p-51', 'Phase 2 Plan');
    expect(h.onActivate).not.toHaveBeenCalled();
    expect(h.onLoad).not.toHaveBeenCalled();
  });
});