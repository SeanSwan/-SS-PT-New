import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeachModeSidebar from './TeachModeSidebar';

const teachState = vi.hoisted(() => ({
  data: null as any,
}));

vi.mock('../../../../features/teach-mode/hooks/useExerciseTeachData', () => ({
  useExerciseTeachData: () => ({
    data: teachState.data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../../../features/teach-mode/components/tabs/HowToPerformTab', () => ({
  default: () => <div>How to perform content</div>,
}));

vi.mock('../../../../features/teach-mode/components/tabs/PhaseProgressionTab', () => ({
  default: () => <div>Phase content</div>,
}));

vi.mock('../../../../features/teach-mode/components/tabs/LearnWatchTab', () => ({
  default: () => <div>Learn content</div>,
}));

describe('TeachModeSidebar', () => {
  beforeEach(() => {
    teachState.data = null;
  });

  it('renders gear context when exercise equipment arrives as a JSON string', () => {
    render(
      <TeachModeSidebar
        exercise={{
          id: 'exercise-1',
          name: 'Cable Press',
          exerciseKey: 'cable_press',
          exerciseType: 'compound',
          bodyPartCategory: 'chest',
          primaryMuscles: ['chest'],
          difficulty: 500,
          equipment: '["Cable Machine","Dumbbell"]' as any,
        }}
        phaseNumber={1}
      />,
    );

    expect(screen.getByText('Gear: Cable Machine, Dumbbell')).toBeInTheDocument();
  });

  it('renders gear context when teach data equipment arrives as a single string', () => {
    teachState.data = {
      id: 'exercise-2',
      name: 'Medicine Ball Slam',
      equipmentNeeded: 'Medicine Ball',
    };

    render(
      <TeachModeSidebar
        exercise={{
          id: 'exercise-2',
          name: 'Medicine Ball Slam',
          exerciseKey: 'medicine_ball_slam',
          exerciseType: 'power',
          bodyPartCategory: 'full_body',
          primaryMuscles: ['core'],
          difficulty: 550,
          equipment: [],
        }}
        phaseNumber={1}
      />,
    );

    expect(screen.getByText('Gear: Medicine Ball')).toBeInTheDocument();
  });

  it('shows a mobile-friendly video preview for the selected exercise video', () => {
    render(
      <TeachModeSidebar
        exercise={{
          id: 'exercise-3',
          name: 'Push Up',
          exerciseKey: 'push_up',
          exerciseType: 'compound',
          bodyPartCategory: 'chest',
          primaryMuscles: ['chest'],
          difficulty: 350,
          equipment: [],
          videoUrl: 'https://example.com/videos/push-up.mp4',
          thumbnailUrl: 'https://example.com/videos/push-up.jpg',
        }}
        phaseNumber={1}
      />,
    );

    const playButton = screen.getByRole('button', { name: /play push up workout video/i });
    expect(playButton).toBeInTheDocument();
    expect(screen.getByText('Workout Video')).toBeInTheDocument();
    expect(screen.getByText('Custom video')).toBeInTheDocument();

    fireEvent.click(playButton);

    expect(screen.getByLabelText('Push Up workout video')).toBeInTheDocument();
  });
});
