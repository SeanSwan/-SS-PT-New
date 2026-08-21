import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PostContent from './components/PostContent';
import PostHeader from './components/PostHeader';
import PostMediaDisplay from './components/PostMediaDisplay';
import type { Post } from './types/PostCardTypes';
import { CATEGORY_GRADIENTS, postTypeColors, postTypeLabels } from './types/PostCardTypes';

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
    title: 'First Flight',
    description: 'Completed the first training milestone.',
    points: 30,
  },
};

const milestonePost: Post = {
  id: 'post-2',
  content: 'Progress proof level: Apex. 8/15 SwanStudios charts are populated from verified logged workouts. Next unlock: 7 charts to full proof. #ProgressProof #SwanProgress #SwanStudios',
  type: 'milestone',
  createdAt: new Date().toISOString(),
  user: {
    id: 'user-2',
    firstName: 'Avery',
    lastName: 'Swan',
    username: 'averyswan',
    clientSource: 'swanstudios',
  },
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
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
        isOwnPost={false}
      />
    );

    expect(screen.getByAltText('SwanStudios logo')).toBeInTheDocument();
    expect(screen.getByText('Achievement')).toBeInTheDocument();
  });

  it('opens a mobile-friendly achievement summary on tap', async () => {
    const user = userEvent.setup();
    render(<PostContent post={achievementPost} />);

    expect(screen.queryByText('Completed the first training milestone.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /first flight achievement summary/i }));

    expect(screen.getByText(/Completed the first training milestone/i)).toBeInTheDocument();
    expect(screen.getByText(/Unlocked for reaching this SwanStudios milestone/i)).toBeInTheDocument();
  });

  it('renders milestone posts as premium progress proof cards', () => {
    render(<PostContent post={milestonePost} />);

    expect(screen.getByRole('group', { name: /apex progress proof milestone/i })).toBeInTheDocument();
    expect(screen.getByText('Progress Proof')).toBeInTheDocument();
    expect(screen.getByText('8 of 15')).toBeInTheDocument();
    expect(screen.getByText('53%')).toBeInTheDocument(); // 8 / 15
    expect(screen.getByText('7 charts to full proof')).toBeInTheDocument();
  });

  it('has social feed display metadata for milestone proof posts', () => {
    expect(CATEGORY_GRADIENTS.milestone).toContain('var(--accent-gold');
    expect(postTypeLabels.milestone).toBe('Progress Proof');
    expect(postTypeColors.milestone).toBe('warning');
  });
});
