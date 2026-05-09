import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CommunityTab from './CommunityTab';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('CommunityTab', () => {
  it('routes the live community feed card back to the feed tab', () => {
    const onTabChange = vi.fn();

    render(<CommunityTab onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Community Feed' }));

    expect(onTabChange).toHaveBeenCalledWith('feed');
  });

  it('keeps non-live roadmap cards from firing navigation actions', () => {
    const onTabChange = vi.fn();
    mockNavigate.mockClear();

    render(<CommunityTab onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: /challenges coming soon/i }));

    expect(onTabChange).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
