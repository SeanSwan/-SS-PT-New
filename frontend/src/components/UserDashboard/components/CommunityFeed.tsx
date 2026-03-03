/**
 * SwanStudios Community Feed Component
 * ===================================
 *
 * Community feed wired to real social API via useSocialFeed hook.
 * Shows real posts from the user's feed with like/comment/share interactions.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Star,
  Image as ImageIcon,
  Video,
  Smile,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { useAuth } from '../../../context/AuthContext';

// ─── Styled Components ─────────────────────────────────────────────────────

const FeedContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.12)'};
  border-radius: 20px;
  padding: 2rem;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
`;

const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const FeedTitle = styled.h2`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    justify-content: center;
  }
`;

const RefreshButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.colors?.primary + '20' || 'rgba(59, 130, 246, 0.2)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
  }
`;

const CreatePostSection = styled.div`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const PostInput = styled.textarea`
  width: 100%;
  min-height: 100px;
  background: ${({ theme }) => theme.background?.primary || 'rgba(0,0,0,0.3)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  padding: 1rem;
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.3s ease;

  &::placeholder {
    color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.5)'};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors?.primary + '20' || 'rgba(59, 130, 246, 0.2)'};
  }
`;

const PostActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const PostOptions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const PostOptionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    background: ${({ theme }) => theme.colors?.primary + '20' || 'rgba(59, 130, 246, 0.2)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    transform: translateY(-1px);
  }
`;

const PostButton = styled(motion.button)`
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const PostsStream = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PostCard = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
  }
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0;
`;

const PostAuthorImage = styled.div<{ $image?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $image, theme }) =>
    $image ? `url(${$image})` : theme.gradients?.primary || 'linear-gradient(135deg, #3B82F6, #8B5CF6)'
  };
  background-size: cover;
  background-position: center;
  border: 2px solid ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
`;

const PostAuthorInfo = styled.div`
  flex: 1;
`;

const PostAuthorName = styled.h4`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
`;

const PostTimestamp = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.9rem;
  margin: 0;
`;

const PostContent = styled.div`
  padding: 1rem 1.5rem;
`;

const PostText = styled.p`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1rem;
  word-wrap: break-word;
`;

const PostMedia = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  margin-top: 0.5rem;
  border-radius: 8px;
`;

const PostFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  margin-top: 1rem;
  padding-top: 1rem;
`;

const PostInteractions = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`;

const InteractionButton = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: ${({ $active, theme }) =>
    $active ? theme.colors?.primary || '#3B82F6' : theme.text?.secondary || 'rgba(255,255,255,0.7)'
  };
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.colors?.primary + '10' || 'rgba(59, 130, 246, 0.1)'};
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    transform: scale(1.05);
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.5)'};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.5)'};
  text-align: center;
  line-height: 1.6;
`;

const LoadMoreButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.colors?.primary + '15' || 'rgba(59, 130, 246, 0.15)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
  }
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string, username?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (username) return username.substring(0, 2).toUpperCase();
  return '??';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─── Component ──────────────────────────────────────────────────────────────

const CommunityFeed: React.FC = () => {
  const { user } = useAuth();
  const {
    posts,
    isLoading,
    error,
    hasMore,
    loadMore,
    isLoadingMore,
    refreshPosts,
    createPost,
    isCreatingPost,
    likePost,
    unlikePost,
  } = useSocialFeed();

  const [newPostContent, setNewPostContent] = useState('');

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isCreatingPost) return;

    await createPost({
      content: newPostContent,
      type: 'general',
      visibility: 'friends',
    });

    setNewPostContent('');
  };

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      await unlikePost(postId);
    } else {
      await likePost(postId);
    }
  };

  return (
    <FeedContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <FeedHeader>
        <FeedTitle>
          <Star size={24} />
          Community Feed
        </FeedTitle>
        <RefreshButton
          onClick={refreshPosts}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw size={16} />
          Refresh
        </RefreshButton>
      </FeedHeader>

      {/* Create New Post */}
      <CreatePostSection>
        <PostInput
          placeholder="Share your positive energy with the SwanStudios community... ✨"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          maxLength={500}
        />
        <PostActions>
          <PostOptions>
            <PostOptionButton whileHover={{ scale: 1.05 }}>
              <ImageIcon size={18} />
              Photo
            </PostOptionButton>
            <PostOptionButton whileHover={{ scale: 1.05 }}>
              <Video size={18} />
              Video
            </PostOptionButton>
            <PostOptionButton whileHover={{ scale: 1.05 }}>
              <Smile size={18} />
              Feeling
            </PostOptionButton>
          </PostOptions>
          <PostButton
            onClick={handleCreatePost}
            disabled={!newPostContent.trim() || isCreatingPost}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isCreatingPost ? 'Posting...' : 'Share'}
          </PostButton>
        </PostActions>
      </CreatePostSection>

      {/* Loading State */}
      {isLoading && (
        <LoadingState>
          <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          Loading feed...
        </LoadingState>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <EmptyState>
          <AlertCircle size={32} />
          Unable to load feed. Please try refreshing.
        </EmptyState>
      )}

      {/* Empty State */}
      {!isLoading && !error && posts.length === 0 && (
        <EmptyState>
          <Star size={32} />
          No posts yet! Be the first to share something with the community.
        </EmptyState>
      )}

      {/* Posts Stream */}
      {!isLoading && posts.length > 0 && (
        <PostsStream>
          <AnimatePresence>
            {posts.map((post, index) => {
              const authorName = post.user
                ? `${post.user.firstName || ''} ${post.user.lastName || ''}`.trim() || post.user.username
                : 'Unknown';
              const initials = post.user
                ? getInitials(post.user.firstName, post.user.lastName, post.user.username)
                : '??';

              return (
                <PostCard
                  key={post.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <PostHeader>
                    <PostAuthorImage $image={post.user?.photo || undefined}>
                      {!post.user?.photo && initials}
                    </PostAuthorImage>
                    <PostAuthorInfo>
                      <PostAuthorName>{authorName}</PostAuthorName>
                      <PostTimestamp>
                        @{post.user?.username || 'unknown'} &bull; {formatRelativeTime(post.createdAt)}
                      </PostTimestamp>
                    </PostAuthorInfo>
                  </PostHeader>

                  <PostContent>
                    <PostText>{post.content}</PostText>
                    {post.mediaUrl && <PostMedia src={post.mediaUrl} alt="Post media" />}
                  </PostContent>

                  <PostFooter>
                    <PostInteractions>
                      <InteractionButton
                        $active={post.isLiked}
                        onClick={() => handleLikeToggle(post.id, post.isLiked)}
                        whileHover={{ scale: 1.1 }}
                      >
                        <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
                        {post.likesCount}
                      </InteractionButton>
                      <InteractionButton
                        whileHover={{ scale: 1.1 }}
                      >
                        <MessageCircle size={18} />
                        {post.commentsCount}
                      </InteractionButton>
                      <InteractionButton
                        whileHover={{ scale: 1.1 }}
                      >
                        <Share2 size={18} />
                      </InteractionButton>
                    </PostInteractions>
                  </PostFooter>
                </PostCard>
              );
            })}
          </AnimatePresence>

          {/* Load More */}
          {hasMore && (
            <LoadMoreButton
              onClick={loadMore}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Loading more...
                </>
              ) : (
                'Load more posts'
              )}
            </LoadMoreButton>
          )}
        </PostsStream>
      )}
    </FeedContainer>
  );
};

export default CommunityFeed;
