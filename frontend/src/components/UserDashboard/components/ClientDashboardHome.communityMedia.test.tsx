import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CommunityFeedCard } from './ClientDashboardHome.feedSections';

const latestPost = {
  id: 'home-post-photo',
  caption: 'Little cutie #SwanProgress #Milestone',
  mediaUrl: '/api/serve-photo/social-photos/little-cutie.jpg',
  isVideo: false,
  likes: 7,
  comments: 2,
  timeAgo: 'about 2 hours ago',
};

describe('ClientDashboardHome community media', () => {
  it('opens the latest post image in a full-image dialog', async () => {
    const user = userEvent.setup();

    render(
      <CommunityFeedCard
        latestPost={latestPost}
        feedLoading={false}
        feedError={null}
        avatarSrc="/avatar.jpg"
        displayName="Sean Swan"
      />,
    );

    await user.click(screen.getByRole('button', { name: /view latest post image/i }));

    expect(screen.getByRole('dialog', { name: /full post image/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /full post image/i })).toHaveAttribute('src', latestPost.mediaUrl);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /full post image/i })).not.toBeInTheDocument();
    });
  });
});
