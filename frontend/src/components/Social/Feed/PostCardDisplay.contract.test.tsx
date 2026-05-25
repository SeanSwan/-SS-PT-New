import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PostContent from './components/PostContent';
import PostHeader from './components/PostHeader';
import PostMediaDisplay from './components/PostMediaDisplay';
import type { Post } from './types/PostCardTypes';

vi.mock('../RPGProfileHeader', () => ({
  default: () => <div data-testid="rpg-profile-header" />,
}));

const achievementPost: Post = {
  id: 'post-1',
  content: 'Unlocked a new milestone today.',
  type: 'achievement',
  createdAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    firstName: 'Sean',
    lastName: 'Swan',
    username: 'seanswan',
    clientSource: 'swanstudios',
  },
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
  mediaUrl: '/uploads/progress.jpg',
  mediaType: 'image',
  achievementData: {
    title: 'Bronze Forge',
    description: 'Completed the first training milestone.',
    points: 30,
  },
};

describe('PostCard feed display contract', () => {
  it('does not duplicate category labels over uploaded media', () => {
    render(<PostMediaDisplay post={achievementPost} gradient="linear-gradient(#000, #111)" />);

    expect(screen.queryByText('Achievement')).not.toBeInTheDocument();
  });

  it('uses the SwanStudios logo mark beside SwanStudios authors', () => {
    render(
      <PostHeader
        post={achievementPost}
        timeAgo="now"
        onMenuToggle={vi.fn()}
        menuOpen={false}
        menuRef={{ current: null }}
        onMenuClose={vi.fn()}
        onReport={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onCopyLink={vi.fn()}
        onMute={vi.fn()}
        isOwnPost={false}
      />
    );

    expect(screen.getByAltText('SwanStudios logo')).toBeInTheDocument();
    expect(screen.getByText('Achievement')).toBeInTheDocument();
  });

  it('opens a mobile-friendly achievement summary on tap', async () => {
    const user = userEvent.setup();
    render(<PostContent post={achievementPost} transformationSliderValue={50} />);

    expect(screen.queryByText('Completed the first training milestone.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /bronze forge achievement summary/i }));

    expect(screen.getByText(/Completed the first training milestone/i)).toBeInTheDocument();
    expect(screen.getByText(/Unlocked for reaching this SwanStudios milestone/i)).toBeInTheDocument();
  });
});
