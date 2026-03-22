/**
 * ┌─── SUB-COMPONENT: PostComments ────────────────────────────┐
 * │ PARENT: PostCard                                            │
 * │ PURPOSE: Renders the comment list (each with avatar, name,  │
 * │          body, timestamp) and the new-comment input bar.    │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ [Avatar] Author Name                                   │  │
 * │ │          Comment text here...                          │  │
 * │ │          2 hours ago                                   │  │
 * │ │ ─────────────────────────────────────────              │  │
 * │ │ [Avatar] [Write a comment...       ] [Send]            │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: PostCommentsProps                                    │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Send] -> onSubmitComment -> POST /api/social/comments      │
 * │ [Enter key] -> onCommentKeyPress -> submits if not shift    │
 * │ GAMIFICATION: Comment submission awards 15 pts (via parent) │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { PostCommentsProps } from '../types/PostCardTypes';
import { AvatarEl } from './PostHeader';
import {
  CommentsSection,
  CommentsList,
  CommentItem,
  CommentBubble,
  CommentAuthor,
  CommentBody,
  CommentTime,
  CommentInput,
  CommentTextarea,
  NoCommentsText,
  IconBtn,
} from '../styles/PostCardStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: PostComments Component
// ─────────────────────────────────────────────────────────────

const PostComments: React.FC<PostCommentsProps> = React.memo(({
  comments,
  currentUser,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  onCommentKeyPress,
}) => {
  return (
    <CommentsSection>
      {/* Comments List */}
      {comments && comments.length > 0 ? (
        <CommentsList>
          {comments.map(comment => (
            <CommentItem key={comment.id}>
              <AvatarEl
                src={comment.user.photo || undefined}
                alt={`${comment.user.firstName} ${comment.user.lastName}`}
                fallback={`${comment.user.firstName[0]}${comment.user.lastName[0]}`}
                size={32}
              />
              <div style={{ flex: 1 }}>
                <CommentBubble>
                  <CommentAuthor>
                    {comment.user.firstName} {comment.user.lastName}
                  </CommentAuthor>
                  <CommentBody>
                    {comment.content}
                  </CommentBody>
                </CommentBubble>
                <CommentTime>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </CommentTime>
              </div>
            </CommentItem>
          ))}
        </CommentsList>
      ) : (
        <NoCommentsText>
          No comments yet. Be the first to comment!
        </NoCommentsText>
      )}

      {/* Comment Input */}
      <CommentInput>
        <AvatarEl
          src={currentUser?.photo || undefined}
          alt={currentUser?.firstName || 'User'}
          fallback={currentUser?.firstName?.[0] || 'U'}
          size={32}
        />
        <CommentTextarea
          placeholder="Write a comment..."
          value={commentText}
          onChange={(e) => onCommentTextChange(e.target.value)}
          onKeyDown={onCommentKeyPress}
          rows={1}
        />
        <IconBtn
          $color="#60C0F0"
          $disabled={!commentText.trim()}
          onClick={onSubmitComment}
          title="Send comment"
        >
          <Send size={20} />
        </IconBtn>
      </CommentInput>
    </CommentsSection>
  );
});

PostComments.displayName = 'PostComments';

export default PostComments;
