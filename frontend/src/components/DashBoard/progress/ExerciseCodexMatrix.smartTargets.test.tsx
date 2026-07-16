/**
 * ExerciseCodexMatrix smart-target deep-link — Slice 11 tests
 * ===========================================================
 * Locks: on the client surface, untouched smart targets are 44px buttons
 * that navigate to the logger with the exercise pre-queried; on the admin
 * surface they stay informational list items.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockPathname = vi.hoisted(() => ({ value: '/dashboard/client/progress' }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname.value }),
}));

const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockAxiosGet }));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 42 }, authAxios: mockAuthAxios }),
}));

import ExerciseCodexMatrix from './ExerciseCodexMatrix';

const catalog = [
  { id: 1, name: 'Face Pull', bodyPartCategory: 'Back', exerciseType: 'strength', primaryMuscles: ['Back'] },
  { id: 2, name: 'Goblet Squat', bodyPartCategory: 'Legs', exerciseType: 'strength', primaryMuscles: ['Quads'] },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockPathname.value = '/dashboard/client/progress';
  mockAxiosGet.mockResolvedValue({ data: { success: true, exercises: catalog } });
});

describe('ExerciseCodexMatrix smart targets', () => {
  it('client surface: untouched targets are buttons that deep-link to the logger', async () => {
    render(<ExerciseCodexMatrix loggedExercises={[{ exerciseName: 'Goblet Squat', sets: 12 }]} />);
    const target = await screen.findByRole('button', { name: 'Log Face Pull now' });
    await userEvent.click(target);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/dashboard/client/log-workout?exercise=Face%20Pull',
    );
  });

  it('admin surface: targets stay informational (no logger deep-link buttons)', async () => {
    mockPathname.value = '/dashboard/admin/client-progress';
    render(<ExerciseCodexMatrix loggedExercises={[{ exerciseName: 'Goblet Squat', sets: 12 }]} />);
    await waitFor(() => expect(mockAxiosGet).toHaveBeenCalled());
    await screen.findByText('Face Pull');
    expect(screen.queryByRole('button', { name: /Log .* now/ })).not.toBeInTheDocument();
  });
});
