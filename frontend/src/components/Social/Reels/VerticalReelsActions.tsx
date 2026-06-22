/**
 * Action rail for the Reels viewer.
 */
import React from 'react';
import { Heart, MessageSquare, Share } from 'lucide-react';
import type { ReelPost } from './VerticalReels.model';
import { safeCount } from './VerticalReels.model';
import { ActionBar, ActionButton } from './VerticalReels.styles';

interface VerticalReelsActionsProps {
  post: ReelPost;
  displayName: string;
  commentsOpen: boolean;
  onToggleLike: () => void;
  onToggleComments: () => void;
  onShare: () => void;
}

const VerticalReelsActions: React.FC<VerticalReelsActionsProps> = ({
  post,
  displayName,
  commentsOpen,
  onToggleLike,
  onToggleComments,
  onShare,
}) => (
  <ActionBar>
    <ActionButton
      type="button"
      $active={post.isLiked}
      onClick={onToggleLike}
      aria-label={post.isLiked ? `Remove Swan reaction from ${displayName}'s reel` : `Swan react to ${displayName}'s reel`}
      aria-pressed={!!post.isLiked}
    >
      <Heart size={26} fill={post.isLiked ? 'currentColor' : 'none'} />
      <span>{safeCount(post.likesCount)}</span>
    </ActionButton>

    <ActionButton
      type="button"
      onClick={onToggleComments}
      aria-label={`${commentsOpen ? 'Hide' : 'Show'} comments for ${displayName}'s reel`}
      aria-expanded={commentsOpen}
    >
      <MessageSquare size={24} />
      <span>{safeCount(post.commentsCount)}</span>
    </ActionButton>

    <ActionButton
      type="button"
      onClick={onShare}
      aria-label={`Copy share link for ${displayName}'s reel`}
    >
      <Share size={22} />
      <span>Share</span>
    </ActionButton>
  </ActionBar>
);

export default VerticalReelsActions;
