/**
 * SUB-COMPONENT: PostMediaDisplay
 * Parent: PostCard
 * Purpose: Renders uploaded image/video media or the SwanStudios watermark for
 * text-only posts. Category labels live in PostHeader so they never cover media.
 */

import React, { useCallback, useState } from 'react';
import { sanitizeImageUrl } from '../../../../utils/imageUrl';
import type { PostMediaDisplayProps } from '../types/PostCardTypes';
import { SWAN_LOGO_URL } from '../types/PostCardTypes';
import {
  HeroArea,
  SwanWatermark,
  VideoMediaShell,
  PostVideo,
} from '../styles/PostCardStyles';
import { ImageMedia, ImageMediaButton } from './PostMediaDisplay.styles';
import PostMediaLightbox from './PostMediaLightbox';

const VIDEO_URL_PATTERN = /\.(mp4|mov|webm)(?:$|[?#])/i;

const buildImageAlt = (post: PostMediaDisplayProps['post']) => {
  const caption = post.content.replace(/\s+/g, ' ').trim();
  return caption ? `Post image: ${caption.slice(0, 120)}` : 'Post image';
};

const PostMediaDisplay: React.FC<PostMediaDisplayProps> = React.memo(({ post, gradient }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const safeMediaUrl = post.mediaUrl ? sanitizeImageUrl(post.mediaUrl) : null;
  const hasUserMedia = !!safeMediaUrl && post.type !== 'transformation';
  const isVideo = !!safeMediaUrl && (post.mediaType === 'video' || VIDEO_URL_PATTERN.test(safeMediaUrl));
  const heroImage = hasUserMedia && !isVideo ? safeMediaUrl : null;
  const imageAlt = buildImageAlt(post);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  if (safeMediaUrl && hasUserMedia && isVideo) {
    return (
      <VideoMediaShell>
        <PostVideo
          src={safeMediaUrl}
          controls
          preload="metadata"
          playsInline
        />
      </VideoMediaShell>
    );
  }

  if (heroImage) {
    return (
      <>
        <ImageMediaButton
          type="button"
          aria-label="View full image"
          onClick={() => setLightboxOpen(true)}
        >
          <ImageMedia src={heroImage} alt={imageAlt} loading="lazy" />
        </ImageMediaButton>
        <PostMediaLightbox
          src={heroImage}
          alt={imageAlt}
          open={lightboxOpen}
          onClose={closeLightbox}
        />
      </>
    );
  }

  return (
    <HeroArea $bgImage={null} $gradient={gradient} $hasImage={false}>
      <SwanWatermark>
        <img src={SWAN_LOGO_URL} alt="" />
      </SwanWatermark>
    </HeroArea>
  );
});

PostMediaDisplay.displayName = 'PostMediaDisplay';

export default PostMediaDisplay;
