import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreatePostCard from './CreatePostCard';

const {
  mockCreatePost,
  mockUseExerciseSearch,
  mockSetQuery,
  mockAuthGet,
} = vi.hoisted(() => ({
  mockCreatePost: vi.fn(),
  mockUseExerciseSearch: vi.fn(),
  mockSetQuery: vi.fn(),
  mockAuthGet: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      firstName: 'Sean',
      lastName: 'Swan',
      photo: '',
    },
    authAxios: {
      get: mockAuthGet,
    },
  }),
}));

vi.mock('../../../hooks/social/useSocialFeed', () => ({
  useSocialFeed: () => ({
    createPost: mockCreatePost,
    isCreatingPost: false,
  }),
}));

vi.mock('../../../hooks/useCelebrationTriggers', () => ({
  useCelebrationTriggers: () => ({
    triggerFromResult: vi.fn(),
  }),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    error: vi.fn(),
  }),
}));

vi.mock('../../WorkoutLogger/useExerciseSearch', () => ({
  useExerciseSearch: () => mockUseExerciseSearch(),
}));

describe('CreatePostCard workout attachment builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePost.mockResolvedValue({ id: 'post-1', pointsAwarded: 0 });
    mockAuthGet.mockResolvedValue({ data: { data: [] } });
    mockUseExerciseSearch.mockReturnValue({
      results: [
        {
          id: 'bench-press',
          name: 'Bench Press',
          exerciseType: 'strength',
          bodyPartCategory: 'Chest',
          primaryMuscles: ['Chest'],
          equipment: ['Barbell'],
          recommendedSets: 4,
          recommendedReps: 8,
          defaultRestSeconds: 90,
        },
      ],
      allExercises: [],
      isSearching: false,
      isLoading: false,
      setQuery: mockSetQuery,
      setCategory: vi.fn(),
      query: '',
      category: null,
      refresh: vi.fn(),
    });
  });

  it('loads workout history from the mounted workout session API', async () => {
    const user = userEvent.setup();
    mockAuthGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          sessions: [{
            id: 'history-1',
            title: 'Push Session',
            duration: 42,
            exerciseCount: 4,
            totalWeight: 6200,
            date: '2026-06-20',
          }],
        },
      },
    });
    render(<CreatePostCard />);

    await user.click(screen.getAllByRole('button', { name: /more options/i }).find(button => button.textContent?.includes('More Options'))!);
    await user.click(screen.getByRole('button', { name: /^workout$/i }));
    await user.click(screen.getByRole('button', { name: /pull from workout history/i }));

    await waitFor(() => expect(mockAuthGet).toHaveBeenCalledWith(
      '/api/workout/sessions',
      expect.objectContaining({
        params: { limit: 20, status: 'completed' },
        signal: expect.any(AbortSignal),
      }),
    ));
    expect(await screen.findByText('Push Session')).toBeInTheDocument();
  });

  it('lets a workout post attach Rolodex exercises before publishing', async () => {
    const user = userEvent.setup();
    render(<CreatePostCard />);

    await user.click(screen.getAllByRole('button', { name: /more options/i }).find(button => button.textContent?.includes('More Options'))!);
    await user.click(screen.getByRole('button', { name: /^workout$/i }));

    const attachment = screen.getByRole('region', { name: /workout attachment builder/i });
    await user.type(within(attachment).getByLabelText(/find exercise/i), 'bench');

    expect(mockSetQuery).toHaveBeenLastCalledWith('bench');

    await user.click(within(attachment).getByRole('button', { name: /add bench press/i }));
    expect(within(attachment).getByText('Bench Press')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/share your workout achievements/i), 'Upper body builder');
    await user.click(screen.getByRole('button', { name: /post \(\+25 pts\)/i }));

    await waitFor(() => expect(mockCreatePost).toHaveBeenCalledTimes(1));
    expect(mockCreatePost).toHaveBeenCalledWith(expect.objectContaining({
      type: 'workout',
      workoutData: expect.objectContaining({
        source: 'composer',
        title: 'Upper body builder',
        exerciseCount: '1',
        exercises: [
          expect.objectContaining({
            name: 'Bench Press',
            sourceExerciseId: 'bench-press',
            sets: '4',
            reps: '8',
            rest: '90 sec',
          }),
        ],
      }),
    }));
  });
});
