import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CommunityTab from './CommunityTab';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('CommunityTab', () => {
  it('keeps the already-mounted feed surface from becoming a duplicate button', () => {
    render(<CommunityTab />);

    expect(screen.getByText('Community Feed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Community Feed' })).toBeNull();
  });

  it('keeps non-live roadmap cards from firing navigation actions', () => {
    mockNavigate.mockClear();

    render(<CommunityTab />);
    expect(screen.getByText('Challenges')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /challenges/i })).toBeNull();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the unique friends route as a real action', () => {
    mockNavigate.mockClear();

    render(<CommunityTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Find Friends' }));

    expect(mockNavigate).toHaveBeenCalledWith('/user-dashboard/friends');
  });
});
