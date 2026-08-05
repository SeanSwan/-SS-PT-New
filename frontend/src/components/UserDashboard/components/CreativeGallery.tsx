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
import {
  CREATIVE_GALLERY_ACCEPT,
  CREATIVE_GALLERY_TAGS,
  mapPostsToCreativeMedia,
  validateCreativeMediaFile,
} from './CreativeGallery.data';
import CreativeGalleryCard from './CreativeGalleryCard';
import CreativeGalleryEmptyState from './CreativeGalleryEmptyState';
import CreativeGalleryModal from './CreativeGalleryModal';
import CreativeGalleryUploadCard from './CreativeGalleryUploadCard';
import { buildUserDashboardMediaPost } from './UserDashboardMediaPostIntent';
import {
  GalleryContainer,
  GalleryGrid,
  GalleryHeader,
  GalleryTitle,
  HiddenFileInput,
  Tag,
  TagsContainer,
  UploadButton,
  UploadStatus,
} from './CreativeGallery.styles';
import type { ProfileMediaPost } from './CreativeGallery.types';

const CreativeGallery: React.FC = () => {
  const [activeTag, setActiveTag] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const { posts, refreshProfile, postsStatus } = useProfile();
  const { createPost, refreshPosts } = useSocialFeed();
  const videoInputRef = useRef<HTMLInputElement>(null);

  const mediaItems = useMemo(
    () => mapPostsToCreativeMedia(posts as ProfileMediaPost[] | null),
    [posts],
  );
  const visibleMediaItems = useMemo(
    () => (activeTag === 'All' ? mediaItems : mediaItems.filter((item) => item.tags.includes(activeTag))),
    [activeTag, mediaItems],
  );
  const selectedMedia = useMemo(
    () => mediaItems.find((item) => item.id === selectedMediaId) ?? null,
    [mediaItems, selectedMediaId],
  );
  // "No media yet" is a claim about the member's library. A failed fetch is not
  // that claim, and a pending one certainly is not.
  const emptyStateTitle = postsStatus === 'unavailable'
    ? "We couldn't load your media just now"
    : postsStatus === 'loading'
      ? 'Loading your media…'
      : mediaItems.length === 0
        ? 'No media yet'
        : `No ${activeTag.toLowerCase()} media yet`;
  const emptyStateDescription = mediaItems.length === 0
    ? 'Share photos and videos to build your creative gallery'
    : 'Try another filter or share new creative media for this category.';

  const handleUpload = () => {
    videoInputRef.current?.click();
  };

  const handleVideoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationMessage = validateCreativeMediaFile(file);
    if (validationMessage) {
      setUploadMessage(validationMessage);
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadMessage('');

    try {
      await createPost(buildUserDashboardMediaPost('Shared creative media', 'art', file));
      await Promise.all([refreshPosts?.(), refreshProfile?.()]);
      setUploadMessage('Creative media shared to your gallery.');
    } catch {
      logger.warn('Unable to upload creative media');
      setUploadMessage('Creative media upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleVideoPlay = (videoId: string) => {
    setSelectedMediaId(videoId);
  };

  return (
    <GalleryContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <GalleryHeader>
        <GalleryTitle>
          <Video size={24} aria-hidden="true" />
          Creative Gallery
        </GalleryTitle>
        <UploadButton type="button" onClick={handleUpload} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isUploading}>
          <Upload size={18} aria-hidden="true" />
          {isUploading ? 'Uploading...' : 'Upload Media'}
        </UploadButton>
      </GalleryHeader>

      <TagsContainer role="group" aria-label="Creative media filters">
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

      {uploadMessage && (
        <UploadStatus role="status" aria-label="Creative media status">
          {uploadMessage}
        </UploadStatus>
      )}

      <HiddenFileInput
        ref={videoInputRef}
        type="file"
        accept={CREATIVE_GALLERY_ACCEPT}
        aria-label="Creative media upload"
        onChange={handleVideoFile}
      />

      {visibleMediaItems.length === 0 ? (
        <CreativeGalleryEmptyState title={emptyStateTitle} description={emptyStateDescription} />
      ) : (
        <GalleryGrid>
          <CreativeGalleryUploadCard onUpload={handleUpload} disabled={isUploading} />
          <AnimatePresence>
            {visibleMediaItems.map((item, index) => (
              <CreativeGalleryCard key={item.id} item={item} index={index} onPlay={handleVideoPlay} />
            ))}
          </AnimatePresence>
        </GalleryGrid>
      )}

      <CreativeGalleryModal item={selectedMedia} onClose={() => setSelectedMediaId(null)} />
    </GalleryContainer>
  );
};

export default CreativeGallery;
