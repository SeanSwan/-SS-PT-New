/**
 * ┌─── SUB-COMPONENT: PostHeader ──────────────────────────────┐
 * │ PARENT: PostCard                                            │
 * │ PURPOSE: Renders author avatar, name, timestamp, post-type  │
 * │          chip, and the 3-dot overflow menu with dropdown.    │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ [Avatar] Name          [Type Chip] [...]               │  │
 * │ │          2 hours ago              ┌──────────────┐     │  │
 * │ │                                   │ Copy Link    │     │  │
 * │ │                                   │ Mute User    │     │  │
 * │ │                                   │ Report Post  │     │  │
 * │ │                                   │ Delete Post  │     │  │
 * │ │                                   └──────────────┘     │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: PostHeaderProps                                      │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Menu dots] -> toggles dropdown menu                        │
 * │ [Copy Link] -> copies post URL to clipboard                 │
 * │ [Mute User] -> mutes user's posts (future: POST /api/mute) │
 * │ [Report Post] -> opens ReportPostModal                      │
 * │ [Delete Post] -> confirms & deletes (own-post/admin only)   │
 * │ GAMIFICATION: None                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { MoreVertical, User, Link2, VolumeX, Flag, Trash2, Pencil, ShieldCheck } from 'lucide-react';
import type { PostHeaderProps } from '../types/PostCardTypes';
import { isCoachRole, postTypeLabels, postTypeColors } from '../types/PostCardTypes';
import RPGProfileHeader from '../../../Social/RPGProfileHeader';
import swanLogoSrc from '../../../../assets/Logo.png';
import {
  PostHeaderRelative,
  PostHeaderBar,
  UserInfo,
  AvatarStyled,
  AvatarImage,
  CoachChip,
  PostType,
  UserName,
  AuthorLogoMark,
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
  milestone: Trophy,
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

export const AvatarEl: React.FC<{ src?: string; alt: string; fallback: string; size?: number; coach?: boolean }> = ({ src, alt, fallback, size, coach }) => (
  <AvatarStyled $size={size} $coach={coach} title={coach ? `${alt} — Coach` : alt}>
    {src ? (
      <AvatarImage src={src} alt={alt} />
    ) : (
      <AvatarImage src={swanLogoSrc} alt={`${fallback} SwanStudios profile fallback`} />
    )}
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
  onReport,
  onDelete,
  onEdit,
  onCopyLink,
  onMute,
  isOwnPost,
  readOnly = false,
}) => {
  const PostTypeIcon = postTypeIcons[post.type] || User;
  const isCoach = isCoachRole(post.user.role);

  return (
    <PostHeaderRelative>
      <PostHeaderBar>
        <UserInfo>
          <AvatarEl
            src={post.user.photo || undefined}
            alt={[post.user.firstName, post.user.lastName].filter(Boolean).join(' ')}
            fallback={`${post.user.firstName?.[0] ?? ''}${post.user.lastName?.[0] ?? ''}` || '?'}
            coach={isCoach}
          />
          <div>
            <UserName>
              {[post.user.firstName, post.user.lastName].filter(Boolean).join(' ')}
              {/* Coach presence — members see a real coach is here and can
                  ask questions right in the thread. */}
              {isCoach && (
                <CoachChip title="SwanStudios Coach — ask them anything">
                  <ShieldCheck size={11} aria-hidden="true" />
                  Coach
                </CoachChip>
              )}
              {!isCoach && post.user.clientSource === 'swanstudios' && (
                <AuthorLogoMark
                  src={swanLogoSrc}
                  alt="SwanStudios logo"
                  title="SwanStudios member"
                />
              )}
            </UserName>
            <TimeAgoText>
              {timeAgo}
            </TimeAgoText>
            {post.user.level && post.user.tier && (
              <RPGProfileHeader
                level={post.user.level}
                tier={post.user.tier as any}
                xp={post.user.points}
                jobClass={post.user.jobClass}
                compact
              />
            )}
          </div>
        </UserInfo>

        <HeaderRightGroup>
          <PostType $type={postTypeColors[post.type] || 'default'}>
            <PostTypeIcon size={14} />
            {postTypeLabels[post.type]}
          </PostType>

          {!readOnly && (
            <MenuWrapper ref={menuRef}>
            <IconBtn onClick={onMenuToggle} title="More options">
              <MoreVertical size={20} />
            </IconBtn>

            {menuOpen && (
              <DropdownMenu>
                <DropdownMenuItem onClick={() => { onCopyLink(); onMenuClose(); }}>
                  <Link2 size={16} />
                  Copy Link
                </DropdownMenuItem>

                {!isOwnPost && (
                  <DropdownMenuItem onClick={() => { onMute(); onMenuClose(); }}>
                    <VolumeX size={16} />
                    Mute User
                  </DropdownMenuItem>
                )}

                {!isOwnPost && (
                  <DropdownMenuItem onClick={() => { onReport(); onMenuClose(); }} $danger>
                    <Flag size={16} />
                    Report Post
                  </DropdownMenuItem>
                )}

                {isOwnPost && (
                  <DropdownMenuItem onClick={() => { onEdit(); onMenuClose(); }}>
                    <Pencil size={16} />
                    Edit Post
                  </DropdownMenuItem>
                )}

                {isOwnPost && (
                  <DropdownMenuItem onClick={() => { onDelete(); onMenuClose(); }} $danger>
                    <Trash2 size={16} />
                    Delete Post
                  </DropdownMenuItem>
                )}
              </DropdownMenu>
            )}
            </MenuWrapper>
          )}
        </HeaderRightGroup>
      </PostHeaderBar>
    </PostHeaderRelative>
  );
});

PostHeader.displayName = 'PostHeader';

export default PostHeader;
