/**
 * ┌─── SUB-COMPONENT: PostHeader ──────────────────────────────┐
 * │ PARENT: PostCard                                            │
 * │ PURPOSE: Renders author avatar, name, timestamp, post-type  │
 * │          chip, and the 3-dot overflow menu with dropdown.    │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ [Avatar] Name          [Type Chip] [...]               │  │
 * │ │          2 hours ago              ┌──────────┐         │  │
 * │ │                                   │ Report   │         │  │
 * │ │                                   │ Delete   │         │  │
 * │ │                                   └──────────┘         │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: PostHeaderProps                                      │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Menu dots] -> toggles dropdown menu                        │
 * │ [Report Post] -> closes menu (handler TBD)                  │
 * │ [Delete Post] -> closes menu (handler TBD, own-post only)   │
 * │ GAMIFICATION: None                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { MoreVertical, User } from 'lucide-react';
import type { PostHeaderProps } from '../types/PostCardTypes';
import { postTypeLabels, postTypeColors } from '../types/PostCardTypes';
import {
  PostHeaderRelative,
  PostHeaderBar,
  UserInfo,
  AvatarStyled,
  AvatarImage,
  PostType,
  UserName,
  TimeAgoText,
  HeaderRightGroup,
  MenuWrapper,
  DropdownMenu,
  DropdownMenuItem,
  IconBtn,
} from '../styles/PostCardStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Post type icon lookup
// PURPOSE: Maps post.type to its lucide-react icon component
// ─────────────────────────────────────────────────────────────

import {
  Dumbbell, Award, Trophy, Camera, Music2, Mic2, Mic,
  Palette, Gamepad2, Laugh, Star,
} from 'lucide-react';

const postTypeIcons: Record<string, React.ElementType> = {
  general: User,
  workout: Dumbbell,
  achievement: Award,
  challenge: Trophy,
  transformation: Camera,
  dance: Music2,
  music: Mic2,
  singing: Mic,
  art: Palette,
  gaming: Gamepad2,
  comedy: Laugh,
  creative: Star,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Avatar helper
// ─────────────────────────────────────────────────────────────

export const AvatarEl: React.FC<{ src?: string; alt: string; fallback: string; size?: number }> = ({ src, alt, fallback, size }) => (
  <AvatarStyled $size={size} title={alt}>
    {src ? <AvatarImage src={src} alt={alt} /> : fallback}
  </AvatarStyled>
);

// ─────────────────────────────────────────────────────────────
// SECTION: PostHeader Component
// ─────────────────────────────────────────────────────────────

const PostHeader: React.FC<PostHeaderProps> = React.memo(({
  post,
  timeAgo,
  onMenuToggle,
  menuOpen,
  menuRef,
  onMenuClose,
  currentUserId,
}) => {
  const PostTypeIcon = postTypeIcons[post.type] || User;

  return (
    <PostHeaderRelative>
      <PostHeaderBar>
        <UserInfo>
          <AvatarEl
            src={post.user.photo || undefined}
            alt={`${post.user.firstName} ${post.user.lastName}`}
            fallback={`${post.user.firstName[0]}${post.user.lastName[0]}`}
          />
          <div>
            <UserName>
              {post.user.firstName} {post.user.lastName}
            </UserName>
            <TimeAgoText>
              {timeAgo}
            </TimeAgoText>
          </div>
        </UserInfo>

        <HeaderRightGroup>
          <PostType $type={postTypeColors[post.type] || 'default'}>
            <PostTypeIcon size={14} />
            {postTypeLabels[post.type]}
          </PostType>

          <MenuWrapper ref={menuRef}>
            <IconBtn onClick={onMenuToggle} title="More options">
              <MoreVertical size={20} />
            </IconBtn>

            {menuOpen && (
              <DropdownMenu>
                <DropdownMenuItem onClick={() => { onMenuClose(); }}>
                  Report Post
                </DropdownMenuItem>
                {currentUserId && currentUserId === post.user.id && (
                  <DropdownMenuItem onClick={() => { onMenuClose(); }}>
                    Delete Post
                  </DropdownMenuItem>
                )}
              </DropdownMenu>
            )}
          </MenuWrapper>
        </HeaderRightGroup>
      </PostHeaderBar>
    </PostHeaderRelative>
  );
});

PostHeader.displayName = 'PostHeader';

export default PostHeader;
