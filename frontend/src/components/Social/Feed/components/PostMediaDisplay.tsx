/**
 * SUB-COMPONENT: PostMediaDisplay
 * Parent: PostCard
 * Purpose: Renders uploaded image/video media or the SwanStudios watermark for
 * text-only posts. Category labels live in PostHeader so they never cover media.
 */

import React from 'react';
import type { PostMediaDisplayProps } from '../types/PostCardTypes';
import { SWAN_LOGO_URL } from '../types/PostCardTypes';
import {
  HeroArea,
  SwanWatermark,
  VideoMediaShell,
  PostVideo,
} from '../styles/PostCardStyles';

const PostMediaDisplay: React.FC<PostMediaDisplayProps> = React.memo(({ post, gradient }) => {
  const hasUserMedia = !!post.mediaUrl && post.type !== 'transformation';
  const isVideo = post.mediaType === 'video' || (hasUserMedia && /\.(mp4|mov|webm)$/i.test(post.mediaUrl || ''));
  const heroImage = (hasUserMedia && !isVideo) ? post.mediaUrl : null;

  if (hasUserMedia && isVideo) {
    return (
      <VideoMediaShell>
        <PostVideo
          src={post.mediaUrl}
          controls
          preload="metadata"
          playsInline
        />
      </VideoMediaShell>
    );
  }

  return (
    <HeroArea $bgImage={heroImage} $gradient={gradient} $hasImage={!!heroImage}>
      {!heroImage && (
        <SwanWatermark>
          <img src={SWAN_LOGO_URL} alt="" />
        </SwanWatermark>
      )}
    </HeroArea>
  );
});

PostMediaDisplay.displayName = 'PostMediaDisplay';

export default PostMediaDisplay;
