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
    levelCap: 1000,
    enableLevelCap: true,
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

  it('renders the Swan 1-1000 progression truth instead of old metal tier copy', () => {
    render(<GamificationSettings {...baseProps()} />);

    expect(screen.getByText('Swan Progression Tuning')).toBeInTheDocument();
    expect(screen.getAllByText('Level = Math.floor(0.1 * Math.sqrt(totalPoints))')).toHaveLength(2);
    expect(screen.getByText('Cygnus Initiate')).toBeInTheDocument();
    expect(screen.getByText('Frostwing Ascendant')).toBeInTheDocument();
    expect(screen.queryByText('Bronze')).not.toBeInTheDocument();
    expect(screen.queryByText('Silver')).not.toBeInTheDocument();
  });

  it('clamps admin level cap edits to the public Swan ladder', () => {
    const props = baseProps();
    render(<GamificationSettings {...props} />);

    fireEvent.change(screen.getByLabelText('Level Cap'), { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(props.onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        levelSettings: expect.objectContaining({ levelCap: 1000 }),
      })
    );
  });

  it('falls back gracefully when a legacy threshold key has no public label', () => {
    render(<GamificationSettings {...baseProps()} tierThresholds={[{ tier: 'ancient' as any, pointsRequired: 1 }]} />);

    expect(screen.getByText('Swan Arc')).toBeInTheDocument();
    expect(screen.getByLabelText('Swan Arc Points Required')).toBeInTheDocument();
  });
});