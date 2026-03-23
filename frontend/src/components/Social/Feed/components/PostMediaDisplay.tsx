/**
 * ┌─── SUB-COMPONENT: PostMediaDisplay ────────────────────────┐
 * │ PARENT: PostCard                                            │
 * │ PURPOSE: Renders the hero area — user-uploaded image/video  │
 * │          with category gradient overlay, or the SwanStudios │
 * │          logo watermark for text-only posts.                │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │           ┌──────────────┐                             │  │
 * │ │           │  [Category]  │  (top-right badge)          │  │
 * │ │           └──────────────┘                             │  │
 * │ │                                                        │  │
 * │ │     [User Image / Video / Swan Logo Watermark]         │  │
 * │ │                                                        │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: PostMediaDisplayProps                                │
 * │ CLICK-OUTCOMES: None (display-only, video has native ctrls) │
 * │ GAMIFICATION: None                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { User } from 'lucide-react';
import type { PostMediaDisplayProps } from '../types/PostCardTypes';
import { postTypeLabels, SWAN_LOGO_URL } from '../types/PostCardTypes';
import {
  HeroArea,
  SwanWatermark,
  PostTypeIndicator,
} from '../styles/PostCardStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Post type icon lookup (duplicated from PostHeader
// to avoid circular dependency — small cost for clean imports)
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
// SECTION: PostMediaDisplay Component
// ─────────────────────────────────────────────────────────────

const PostMediaDisplay: React.FC<PostMediaDisplayProps> = React.memo(({ post, gradient }) => {
  const PostTypeIcon = postTypeIcons[post.type] || User;

  // Determine media state
  const hasUserMedia = !!post.mediaUrl && post.type !== 'transformation';
  const isVideo = post.mediaType === 'video' || (hasUserMedia && /\.(mp4|mov|webm)$/i.test(post.mediaUrl || ''));
  const heroImage = (hasUserMedia && !isVideo) ? post.mediaUrl : null;

  // Video posts get inline video player
  if (hasUserMedia && isVideo) {
    return (
      <div style={{ position: 'relative', background: '#000', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
        <video
          src={post.mediaUrl}
          controls
          preload="metadata"
          playsInline
          style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', display: 'block' }}
        />
        <PostTypeIndicator $postType={post.type} style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2 }}>
          <PostTypeIcon size={12} />
          {postTypeLabels[post.type]}
        </PostTypeIndicator>
      </div>
    );
  }

  // Image or text-only hero area
  return (
    <HeroArea $bgImage={heroImage} $gradient={gradient} $hasImage={!!heroImage}>
      {/* SwanStudios Logo watermark when no user image */}
      {!heroImage && (
        <SwanWatermark>
          <img
            src={SWAN_LOGO_URL}
            alt=""
            style={{ borderRadius: '50%', filter: 'drop-shadow(0 0 30px rgba(96, 192, 240, 0.4))' }}
          />
        </SwanWatermark>
      )}

      <PostTypeIndicator $postType={post.type}>
        <PostTypeIcon size={12} />
        {postTypeLabels[post.type]}
      </PostTypeIndicator>
    </HeroArea>
  );
});

PostMediaDisplay.displayName = 'PostMediaDisplay';

export default PostMediaDisplay;
