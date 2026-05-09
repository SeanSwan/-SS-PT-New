import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AchievementManager from './AchievementManager';
import type { AchievementManagerProps } from './AchievementManager.types';

const baseProps = (): AchievementManagerProps => ({
  achievements: [
    {
      id: 'achievement-1',
      name: 'Workout Starter',
      description: 'Complete a workout',
      icon: 'Trophy',
      pointValue: 100,
      requirementType: 'session_count',
      requirementValue: 1,
      tier: 'bronze',
      isActive: true,
    },
  ],
  onCreateAchievement: vi.fn(),
  onUpdateAchievement: vi.fn(),
  onDeleteAchievement: vi.fn(),
  onToggleStatus: vi.fn(),
});

describe('AchievementManager', () => {
  it('saves edited achievement drafts through the existing update callback contract', () => {
    const props = baseProps();

    render(<AchievementManager {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /edit workout starter/i }));
    fireEvent.change(screen.getByLabelText('Achievement Name'), { target: { value: 'Workout Finisher' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    expect(props.onUpdateAchievement).toHaveBeenCalledWith(
      'achievement-1',
      expect.objectContaining({
        name: 'Workout Finisher',
        pointValue: 100,
        tier: 'bronze',
      })
    );
  });
});
