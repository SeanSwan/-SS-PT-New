import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailFooterActions from './SessionDetailFooterActions';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

const baseProps = {
  loading: false,
  lateCancelLoading: false,
  attendanceLoading: false,
  canCancel: true,
  showCancelOptions: false,
  showLateCancelWarning: false,
  canRecordAttendance: true,
  showNoShowReason: false,
  canComplete: true,
  canOpenWorkoutLogger: true,
  canViewWorkouts: true,
  mode: 'admin' as const,
  onClose: vi.fn(),
  onCancelClick: vi.fn(),
  onHideCancelOptions: vi.fn(),
  onCancel: vi.fn(),
  onRecordAttendance: vi.fn(),
  onBackFromNoShowReason: vi.fn(),
  onComplete: vi.fn(),
  onLogWorkout: vi.fn(),
  onViewWorkouts: vi.fn(),
};

describe('SessionDetailFooterActions', () => {
  it('routes the primary session action buttons without owning modal state', () => {
    const props = { ...baseProps };

    render(<SessionDetailFooterActions {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel session/i }));
    fireEvent.click(screen.getByRole('button', { name: /^present$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^late$/i }));
    fireEvent.click(screen.getByRole('button', { name: /no-show/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }));
    fireEvent.click(screen.getByRole('button', { name: /view workouts/i }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onCancelClick).toHaveBeenCalledTimes(1);
    expect(props.onRecordAttendance).toHaveBeenCalledWith('present');
    expect(props.onRecordAttendance).toHaveBeenCalledWith('late');
    expect(props.onRecordAttendance).toHaveBeenCalledWith('no_show');
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(props.onLogWorkout).toHaveBeenCalledTimes(1);
    expect(props.onViewWorkouts).toHaveBeenCalledTimes(1);
  });

  it('switches to confirmation controls while manager cancellation options are open', () => {
    const props = { ...baseProps, showCancelOptions: true };

    render(<SessionDetailFooterActions {...props} />);

    expect(screen.queryByRole('button', { name: /cancel session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^present$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log workout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view workouts/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm cancellation/i }));

    expect(props.onHideCancelOptions).toHaveBeenCalledTimes(1);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('switches to no-show confirmation controls while collecting a reason', () => {
    const props = { ...baseProps, showNoShowReason: true };

    render(<SessionDetailFooterActions {...props} />);

    expect(screen.queryByRole('button', { name: /cancel session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log workout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view workouts/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm no-show/i }));

    expect(props.onBackFromNoShowReason).toHaveBeenCalledTimes(1);
    expect(props.onRecordAttendance).toHaveBeenCalledWith('no_show');
  });

  it('keeps workout logging admin/trainer only while keeping workout history available', () => {
    const props = { ...baseProps, mode: 'client' as const };

    render(<SessionDetailFooterActions {...props} />);

    expect(screen.queryByRole('button', { name: /log workout/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view workouts/i })).toBeInTheDocument();
  });

  it('keeps workout history visible when schedule-origin logging is not allowed', () => {
    const props = { ...baseProps, canOpenWorkoutLogger: false, canViewWorkouts: true };

    render(<SessionDetailFooterActions {...props} />);

    expect(screen.queryByRole('button', { name: /log workout/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view workouts/i })).toBeInTheDocument();
  });

  it('keeps the footer action matrix out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const footerSource = read('SessionDetailFooterActions.tsx');

    expect(modalSource).toContain("from './SessionDetailFooterActions'");
    expect(modalSource).not.toContain('Cancel Session');
    expect(modalSource).not.toContain('Schedule to Workout Logger entry points');
    expect(footerSource).toContain('Cancel Session');
    expect(footerSource).toContain('Log Workout');
    expect(footerSource.split(/\r?\n/).length).toBeLessThanOrEqual(150);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(690);
  });
});
