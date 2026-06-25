import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePhotoLibraryPreview from './HomePhotoLibraryPreview';

const { mockNavigate, mockUseProfile } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseProfile: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../hooks/profile/useProfile', () => ({
  useProfile: mockUseProfile,
}));

describe('HomePhotoLibraryPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProfile.mockReturnValue({
      posts: [
        { id: 'clip', content: 'Training clip', mediaUrl: '/uploads/training.mp4' },
        { id: 'one', content: 'Progress photo', mediaUrl: '/uploads/progress.jpg', likesCount: 8, commentsCount: 2 },
        { id: 'two', content: 'Meal prep', mediaUrl: '/uploads/meal.png', likesCount: 3, commentsCount: 1 },
        { id: 'bad', content: 'Unsafe', mediaUrl: 'javascript:alert(1)' },
      ],
    });
  });

  it('surfaces uploaded photos on Home and opens the full photo library', async () => {
    const user = userEvent.setup();

    render(<HomePhotoLibraryPreview />);

    expect(screen.getByRole('region', { name: 'Photo Library' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Progress photo' })).toHaveAttribute('src', '/uploads/progress.jpg');
    expect(screen.getByRole('img', { name: 'Meal prep' })).toHaveAttribute('src', '/uploads/meal.png');
    expect(screen.queryByAltText('Training clip')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Unsafe')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open full photo library' }));

    expect(mockNavigate).toHaveBeenCalledWith('/user-dashboard/photos');
  });

  it('keeps the Home entry useful when no photos have been uploaded', async () => {
    const user = userEvent.setup();
    mockUseProfile.mockReturnValue({ posts: [] });

    render(<HomePhotoLibraryPreview />);

    expect(screen.getByText('Your uploaded photos will live here, ready to reuse across SwanStudios.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open full photo library' }));

    expect(mockNavigate).toHaveBeenCalledWith('/user-dashboard/photos');
  });
});
