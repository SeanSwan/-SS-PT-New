import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GamificationSettings from './GamificationSettings';
import type { GamificationSettingsProps } from './GamificationSettings.types';

const baseProps = (): GamificationSettingsProps => ({
  pointValues: [
    {
      id: 'workout_complete',
      name: 'Workout Complete',
      description: 'Complete a workout',
      pointValue: 50,
    },
  ],
  tierThresholds: [
    { tier: 'bronze', pointsRequired: 100 },
    { tier: 'silver', pointsRequired: 500 },
  ],
  levelSettings: {
    pointsPerLevel: 500,
    levelCap: 100,
    enableLevelCap: false,
  },
  systemSettings: {
    enableGamification: true,
    enableAchievements: true,
    enableRewards: true,
    enableLeaderboard: true,
    enableLevels: true,
    enableTiers: true,
    enableStreaks: true,
    notifyOnAchievement: true,
    notifyOnLevelUp: true,
    notifyOnReward: true,
    streakExpirationDays: 3,
    pointsExpiration: { enabled: false, expirationDays: 365 },
  },
  onUpdatePointValues: vi.fn(),
  onUpdateTierThresholds: vi.fn(),
  onUpdateLevelSettings: vi.fn(),
  onUpdateSystemSettings: vi.fn(),
  onSaveSettings: vi.fn(),
  onRestoreDefaults: vi.fn(),
});

describe('GamificationSettings', () => {
  it('saves the edited point value draft through the existing callback contract', () => {
    const props = baseProps();

    render(<GamificationSettings {...props} />);

    fireEvent.change(screen.getByLabelText('Workout Complete Points'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(props.onUpdatePointValues).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'workout_complete', pointValue: 80 }),
    ]);
    expect(props.onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        pointValues: [expect.objectContaining({ id: 'workout_complete', pointValue: 80 })],
      })
    );
  });
});
