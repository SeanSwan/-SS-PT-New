/**
 * WorkoutPlannerBackupPanel — charter v3 P2 UI locks
 * ==================================================
 * Locks: hidden-without-client, no-backup generate CTA, staleness chip truth,
 * load-into-builder wiring, generate reload + vault refresh, and the two-tap
 * promote confirm (first tap arms, second tap posts the transactional swap).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockAuthAxios = vi.hoisted(() => ({ get: mockGet, post: mockPost }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'trainer' }, authAxios: mockAuthAxios }),
}));

import WorkoutPlannerBackupPanel from './WorkoutPlannerBackupPanel';

const freshVerdict = {
  success: true,
  hasBackup: true,
  stale: false,
  sessionsSince: 1,
  generatedAt: '2026-07-01T00:00:00.000Z',
  backup: { id: 314, name: 'Backup - General Fitness' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ data: freshVerdict });
  mockPost.mockResolvedValue({ data: { success: true } });
});

describe('WorkoutPlannerBackupPanel', () => {
  it('renders nothing until a client is selected', () => {
    const { container } = render(
      <WorkoutPlannerBackupPanel selectedClientId={null} onLoad={vi.fn()} onPlansChanged={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('offers a generate CTA when the client has no backup yet', async () => {
    mockGet.mockResolvedValue({ data: { success: true, hasBackup: false, stale: true, sessionsSince: 0, backup: null } });
    render(<WorkoutPlannerBackupPanel selectedClientId={42} onLoad={vi.fn()} onPlansChanged={vi.fn()} />);

    expect(await screen.findByText(/No backup plan yet/)).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/workout-plans/backup/42');
    expect(screen.getByRole('button', { name: /Generate backup/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Promote/ })).not.toBeInTheDocument();
  });

  it('shows the staleness verdict truthfully and loads the backup into the builder', async () => {
    mockGet.mockResolvedValue({ data: { ...freshVerdict, stale: true, sessionsSince: 5 } });
    const onLoad = vi.fn();
    render(<WorkoutPlannerBackupPanel selectedClientId={42} onLoad={onLoad} onPlansChanged={vi.fn()} />);

    expect(await screen.findByText('Stale - 5 sessions since')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load into builder' }));
    expect(onLoad).toHaveBeenCalledWith('314', 'Backup - General Fitness');
  });

  it('generate posts, reloads the verdict, and refreshes the plan vault', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, hasBackup: false, stale: true, sessionsSince: 0, backup: null } });
    mockGet.mockResolvedValue({ data: freshVerdict });
    const onPlansChanged = vi.fn();
    render(<WorkoutPlannerBackupPanel selectedClientId={42} onLoad={vi.fn()} onPlansChanged={onPlansChanged} />);

    await userEvent.click(await screen.findByRole('button', { name: /Generate backup/ }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/workout-plans/backup/42/generate', {}));
    await waitFor(() => expect(onPlansChanged).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Fresh')).toBeInTheDocument();
  });

  it('promote is two-tap: first tap arms the confirm, second tap posts the swap', async () => {
    const onPlansChanged = vi.fn();
    render(<WorkoutPlannerBackupPanel selectedClientId={42} onLoad={vi.fn()} onPlansChanged={onPlansChanged} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Promote to primary' }));
    expect(mockPost).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm swap to primary' }));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/workout-plans/314/promote-backup', {}));
    await waitFor(() => expect(onPlansChanged).toHaveBeenCalledTimes(1));
  });
});
