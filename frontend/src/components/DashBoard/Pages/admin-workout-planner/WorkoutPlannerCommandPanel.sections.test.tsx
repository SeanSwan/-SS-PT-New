import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkoutPlannerHeaderSection } from './WorkoutPlannerCommandPanel.sections';

describe('WorkoutPlannerHeaderSection', () => {
  it('labels trainer logger return targets as Workout Logger instead of Client Hub', () => {
    render(
      <WorkoutPlannerHeaderSection
        plannerReturnTo="/dashboard/trainer/log-workout?clientId=42"
        teachModeOpen={false}
        onReturnToClientHub={vi.fn()}
        onTeachModeToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /back to workout logger/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back to client hub/i })).not.toBeInTheDocument();
  });
});