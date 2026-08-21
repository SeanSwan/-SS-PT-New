/**
 * Routing + honesty guard for the workout details modal.
 *
 * WHY: both action links hard-coded `/dashboard/client/log-workout`, so a
 * trainer or admin opening a workout post was sent to a route that is not
 * theirs. The second link was additionally labelled "Log This Style" while
 * pointing at the identical generic destination — the logger accepts only a
 * single `?exercise=` deep-link, never a routine, so nothing about the post's
 * workout could transfer.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import type { WorkoutPostData } from './types/PostCardTypes';

import { AuthContext } from '../../../context/authContextState';
import PostWorkoutDetailsModal from './components/PostWorkoutDetailsModal';

const mockUser: { current: { role: string } | null } = { current: { role: 'client' } };

const workoutData: WorkoutPostData = {
  title: 'Upper Push Builder',
  focus: 'Chest and triceps',
  exercises: [{ name: 'Incline Dumbbell Press', sets: '4', reps: '8-10' }],
};

const renderModal = () =>
  render(
    <AuthContext.Provider value={{ user: mockUser.current } as never}>
      <PostWorkoutDetailsModal
        open
        workoutData={workoutData}
        postContent="Push day."
        onClose={() => {}}
      />
    </AuthContext.Provider>
  );

/** The modal is a leaf display component and must survive with no provider. */
const renderModalWithoutProvider = () =>
  render(
    <PostWorkoutDetailsModal
      open
      workoutData={workoutData}
      postContent="Push day."
      onClose={() => {}}
    />
  );

describe('PostWorkoutDetailsModal role-aware routing', () => {
  beforeEach(() => {
    mockUser.current = { role: 'client' };
  });

  it('sends a client to the client logger', () => {
    renderModal();
    const link = screen.getByRole('link', { name: /open workout logger/i });
    expect(link).toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
  });

  it('does not send a trainer to the client route', () => {
    mockUser.current = { role: 'trainer' };
    renderModal();
    const href = screen.getByRole('link', { name: /open workout logger/i }).getAttribute('href');
    expect(href).not.toContain('/dashboard/client/');
    expect(href).toBe('/dashboard/trainer/clients?intent=log_workout');
  });

  it('does not send an admin to the client route', () => {
    mockUser.current = { role: 'admin' };
    renderModal();
    const href = screen.getByRole('link', { name: /open workout logger/i }).getAttribute('href');
    expect(href).not.toContain('/dashboard/client/');
    expect(href).toBe('/dashboard/admin/client-management?intent=log_workout');
  });

  it('falls back to the client route when the role is unknown', () => {
    mockUser.current = null;
    renderModal();
    expect(screen.getByRole('link', { name: /open workout logger/i }))
      .toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
  });

  it('renders without an AuthProvider instead of throwing', () => {
    expect(() => renderModalWithoutProvider()).not.toThrow();
    expect(screen.getByRole('link', { name: /open workout logger/i }))
      .toHaveAttribute('href', '/dashboard/client/log-workout?loadPlan=today');
  });

  it('no longer offers a "Log This Style" action it cannot perform', () => {
    renderModal();
    expect(screen.queryByRole('link', { name: /log this style/i })).not.toBeInTheDocument();
  });
});
