import React from 'react';
import PostCard from '../PostCard';
import {
  EmptyFeedWelcome,
} from './SocialFeedPanels';
import {
  InfiniteScrollSentinel,
  Spinner,
} from '../styles/SocialFeedStyles';
import type {
  SocialFeedVariant,
  SocialFeedViewModel,
} from '../hooks/useSocialFeedViewModel';

interface SocialFeedPostStreamProps {
  variant: SocialFeedVariant;
  viewModel: SocialFeedViewModel;
}

const SocialFeedPostStream: React.FC<SocialFeedPostStreamProps> = ({
  variant,
  viewModel,
}) => {
  if (viewModel.posts.length === 0) {
    return (
      <EmptyFeedWelcome
        showActions={variant === 'full'}
        onBrowseChallenges={viewModel.handleBrowseChallenges}
        onFindFriends={viewModel.handleFindFriends}
      />
    );
  }

  return (
    <>
      {viewModel.posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={() => viewModel.handleLikeToggle(post.id, post.isLiked)}
          onReact={viewModel.reactToPost}
          onRemoveReaction={viewModel.removeReaction}
          onComment={viewModel.addComment}
          onEdit={viewModel.updatePost}
          onDelete={viewModel.deletePost}
          onReport={viewModel.reportPost}
          onRepost={viewModel.repostPost}
        />
      ))}

      {viewModel.hasMore && (
        <InfiniteScrollSentinel ref={viewModel.sentinelRef}>
          {viewModel.isLoadingMore && <Spinner $size={20} />}
        </InfiniteScrollSentinel>
      )}
    </>
  );
};

export default SocialFeedPostStream;
