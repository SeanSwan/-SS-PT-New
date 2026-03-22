/**
 * ┌─── SUB-COMPONENT: PostActions ─────────────────────────────┐
 * │ PARENT: PostCard                                            │
 * │ PURPOSE: Renders the reaction buttons (like, heart, swan),  │
 * │          comment toggle, and share button with counts.      │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ [ThumbsUp 3] [Heart 1] [Swan 0] | [Comment 5] [Share] │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: PostActionsProps                                     │
 * │ CLICK-OUTCOMES:                                             │
 * │ [ThumbsUp] -> onReaction('thumbs_up') -> toggle + XP toast  │
 * │ [Heart]    -> onReaction('heart') -> toggle + XP toast      │
 * │ [Swan]     -> onReaction('swan') -> toggle + XP toast       │
 * │ [Comment]  -> onToggleComments -> shows/hides comment panel │
 * │ [Share]    -> onShareClick -> opens share modal             │
 * │ GAMIFICATION: Reactions trigger point awards (via parent)   │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { ThumbsUp, Heart, MessageSquare, Share } from 'lucide-react';
import SwanIcon from '../../SwanIcon';
import type { PostActionsProps } from '../types/PostCardTypes';
import {
  CardActionsBar,
  ActionButton,
  ReactionGroup,
} from '../styles/PostCardStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: PostActions Component
// ─────────────────────────────────────────────────────────────

const PostActions: React.FC<PostActionsProps> = React.memo(({
  post,
  userReactions,
  reactionCounts,
  onReaction,
  showComments,
  onToggleComments,
  onShareClick,
}) => {
  return (
    <CardActionsBar>
      <ReactionGroup>
        <ActionButton
          $active={userReactions.includes('thumbs_up')}
          $activeColor="#60C0F0"
          onClick={(e) => onReaction('thumbs_up', e)}
          title="Like"
          aria-label="Like post"
        >
          <ThumbsUp
            size={20}
            fill={userReactions.includes('thumbs_up') ? '#60C0F0' : 'none'}
            stroke={userReactions.includes('thumbs_up') ? 'none' : '#60C0F0'}
            strokeWidth={2}
          />
          {reactionCounts.thumbs_up > 0 && reactionCounts.thumbs_up}
        </ActionButton>

        <ActionButton
          $active={userReactions.includes('heart')}
          $activeColor="#EC4899"
          onClick={(e) => onReaction('heart', e)}
          title="Love"
          aria-label="Love post"
        >
          <Heart
            size={20}
            fill={userReactions.includes('heart') ? '#EC4899' : 'none'}
            stroke={userReactions.includes('heart') ? 'none' : '#EC4899'}
            strokeWidth={2}
          />
          {reactionCounts.heart > 0 && reactionCounts.heart}
        </ActionButton>

        <ActionButton
          $active={userReactions.includes('swan')}
          $activeColor="#8B5CF6"
          onClick={(e) => onReaction('swan', e)}
          title="Swan Elevate"
          aria-label="Swan post"
        >
          <SwanIcon size={20} elevated={userReactions.includes('swan')} />
          {reactionCounts.swan > 0 && reactionCounts.swan}
        </ActionButton>
      </ReactionGroup>

      <ActionButton onClick={onToggleComments}>
        <MessageSquare size={18} />
        {post.commentsCount} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
      </ActionButton>

      <ActionButton onClick={onShareClick}>
        <Share size={18} />
        Share
      </ActionButton>
    </CardActionsBar>
  );
});

PostActions.displayName = 'PostActions';

export default PostActions;
