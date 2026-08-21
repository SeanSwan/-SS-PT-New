import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PostContent from './components/PostContent';
import type { Post } from './types/PostCardTypes';

const baseWorkoutPost: Post = {
  id: 'post-workout',
  content: 'Push day felt strong. #SwanProgress',
  type: 'workout',
  createdAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    firstName: 'Sean',
    lastName: 'Swan',
    username: 'seanswan',
  },
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
};

describe('PostContent Try This Workout action', () => {
  it('opens the attached workout details in a modal', async () => {
    const user = userEvent.setup();
    const workoutPost: Post = {
      ...baseWorkoutPost,
      workoutData: {
        title: 'Upper Push Builder',
        focus: 'Chest and triceps',
        duration: '42',
        exerciseCount: '4',
        totalWeight: '6200',
        caloriesBurned: '310',
        notes: 'Keep tempo controlled.',
        exercises: [
          {
            name: 'Incline Dumbbell Press',
            sets: '4',
            reps: '8-10',
            weight: '55 lb',
            rest: '90 sec',
          },
          {
            name: 'Cable Fly',
            sets: '3',
            reps: '12',
          },
        ],
      },
    };

    render(<PostContent post={workoutPost} />);

    const trigger = screen.getByRole('button', { name: /try this workout/i });
    trigger.focus();
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: /try this workout/i });
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(dialog).getByRole('button', { name: /close workout details/i })).toHaveFocus();
    expect(within(dialog).getByText('Upper Push Builder')).toBeInTheDocument();
    expect(within(dialog).getByText('Chest and triceps')).toBeInTheDocument();
    expect(within(dialog).getByText('Incline Dumbbell Press')).toBeInTheDocument();
    expect(within(dialog).getByText(/4 sets/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/8-10 reps/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Keep tempo controlled.')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /try this workout/i })).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });

  it('explains when an auto-tagged workout post has no attached workout details', async () => {
    const user = userEvent.setup();

    render(<PostContent post={baseWorkoutPost} />);

    await user.click(screen.getByRole('button', { name: /try this workout/i }));

    const dialog = screen.getByRole('dialog', { name: /try this workout/i });
    expect(within(dialog).getByText(/No workout details attached/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/tagged as Workout from the post text/i)).toBeInTheDocument();
  });
});
