/**
 * COMPONENT: CreativeGallery
 * PURPOSE: Active UserDashboard V3 profile media showcase.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [Creative Gallery] [Upload Video]
 * [tag filters]
 * [empty state or upload card + media cards]
 *
 * DATA FLOW:
 * Props In: none.
 * State: activeTag.
 * API Calls: useProfile posts; useSocialFeed createPost on upload.
 * Children: CreativeGalleryUploadCard, CreativeGalleryCard, CreativeGalleryEmptyState.
 */

import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Upload, Video } from 'lucide-react';
import { useProfile } from '../../../hooks/profile/useProfile';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { logger } from '@/utils/logger';
import { CREATIVE_GALLERY_TAGS, mapPostsToCreativeMedia } from './CreativeGallery.data';
import CreativeGalleryCard from './CreativeGalleryCard';
import CreativeGalleryEmptyState from './CreativeGalleryEmptyState';
import CreativeGalleryUploadCard from './CreativeGalleryUploadCard';
import {
  GalleryContainer,
  GalleryGrid,
  GalleryHeader,
  GalleryTitle,
  HiddenFileInput,
  Tag,
  TagsContainer,
  UploadButton,
} from './CreativeGallery.styles';
import type { ProfileMediaPost } from './CreativeGallery.types';

const CreativeGallery: React.FC = () => {
  const [activeTag, setActiveTag] = useState('All');
  const { posts } = useProfile();
  const { createPost } = useSocialFeed();
  const videoInputRef = useRef<HTMLInputElement>(null);

  const mediaItems = useMemo(
    () => mapPostsToCreativeMedia(posts as ProfileMediaPost[] | null),
    [posts],
  );

  const handleUpload = () => {
    videoInputRef.current?.click();
  };

  const handleVideoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await createPost({ content: 'Shared media', type: 'general' });
      event.target.value = '';
    } catch {
      logger.error('Unable to upload creative media');
    }
  };

  const handleVideoPlay = (videoId: string) => {
    logger.log('Play video:', videoId);
  };

  return (
    <GalleryContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <GalleryHeader>
        <GalleryTitle>
          <Video size={24} />
          Creative Gallery
        </GalleryTitle>
        <UploadButton type="button" onClick={handleUpload} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Upload size={18} />
          Upload Video
        </UploadButton>
      </GalleryHeader>

      <TagsContainer>
        {CREATIVE_GALLERY_TAGS.map((tag) => (
          <Tag
            key={tag}
            type="button"
            $active={activeTag === tag}
            aria-pressed={activeTag === tag}
            onClick={() => setActiveTag(tag)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tag}
          </Tag>
        ))}
      </TagsContainer>

      <HiddenFileInput
        ref={videoInputRef}
        type="file"
        accept="image/*,video/*"
        aria-label="Creative media upload"
        onChange={handleVideoFile}
      />

      {mediaItems.length === 0 ? (
        <CreativeGalleryEmptyState />
      ) : (
        <GalleryGrid>
          <CreativeGalleryUploadCard onUpload={handleUpload} />
          <AnimatePresence>
            {mediaItems.map((item, index) => (
              <CreativeGalleryCard key={item.id} item={item} index={index} onPlay={handleVideoPlay} />
            ))}
          </AnimatePresence>
        </GalleryGrid>
      )}
    </GalleryContainer>
  );
};

export default CreativeGallery;
