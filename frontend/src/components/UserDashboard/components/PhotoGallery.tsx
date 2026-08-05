/**
 * COMPONENT: PhotoGallery
 * PURPOSE: Active UserDashboard V3 profile photo gallery.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [Photo Gallery] [Upload Photo]
 * [search] [category filters]
 * [empty state or upload card + photo cards]
 *
 * DATA FLOW:
 * Props In: none.
 * State: activeCategory, searchTerm, selectedPhoto, upload status.
 * API Calls: useProfile posts; useSocialFeed createPost with image file.
 * Children: PhotoGalleryUploadCard, PhotoGalleryCard, PhotoGalleryModal.
 */

import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Filter, Image as ImageIcon, Upload } from 'lucide-react';
import { useProfile } from '../../../hooks/profile/useProfile';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { logger } from '@/utils/logger';
import {
  filterPhotoItems,
  mapPostsToPhotoItems,
  PHOTO_GALLERY_CATEGORIES,
  validatePhotoFile,
} from './PhotoGallery.data';
import PhotoGalleryCard from './PhotoGalleryCard';
import PhotoGalleryEmptyState from './PhotoGalleryEmptyState';
import PhotoGalleryModal from './PhotoGalleryModal';
import PhotoGalleryUploadCard from './PhotoGalleryUploadCard';
import { buildUserDashboardMediaPost } from './UserDashboardMediaPostIntent';
import {
  FilterButton,
  GalleryContainer,
  GalleryHeader,
  GalleryTitle,
  HiddenInput,
  PhotoGrid,
  SearchAndFilterContainer,
  SearchInput,
  StatusMessage,
  UploadButton,
} from './PhotoGallery.styles';
import type { PhotoGalleryPost, PhotoItem } from './PhotoGallery.types';

const PhotoGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { posts, refreshProfile, postsStatus } = useProfile();
  const { createPost, refreshPosts } = useSocialFeed();

  const photos = useMemo(
    () => mapPostsToPhotoItems(posts as PhotoGalleryPost[] | null),
    [posts],
  );

  const filteredPhotos = useMemo(
    () => filterPhotoItems(photos, searchTerm, activeCategory),
    [activeCategory, photos, searchTerm],
  );

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (file: File) => {
    const validationMessage = validatePhotoFile(file);
    if (validationMessage) {
      setUploadMessage(validationMessage);
      return;
    }

    setIsUploading(true);
    setUploadMessage('');

    try {
      const createdPost = await createPost(buildUserDashboardMediaPost('Shared a progress photo', 'general', file));
      if (!createdPost) {
        throw new Error('Photo post creation returned empty');
      }
      await Promise.all([refreshPosts?.(), refreshProfile?.()]);
      setUploadMessage('Photo shared to your gallery.');
    } catch {
      logger.error('Unable to upload gallery photo');
      setUploadMessage('Photo upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handlePhotoUpload(file);
    }
    event.target.value = '';
  };

  const handleShare = async (photoUrl: string) => {
    const shareData = { title: 'Check out this photo on SwanStudios', url: photoUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard?.writeText(photoUrl);
      }
    } catch {
      logger.error('Unable to share gallery photo');
    }
  };

  return (
    <>
      <GalleryContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <GalleryHeader>
          <GalleryTitle>
            <ImageIcon size={24} />
            Photo Gallery
          </GalleryTitle>
          <UploadButton type="button" onClick={handleUpload} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isUploading}>
            <Upload size={18} />
            {isUploading ? 'Uploading...' : 'Upload Photo'}
          </UploadButton>
        </GalleryHeader>

        <SearchAndFilterContainer>
          <SearchInput
            type="text"
            placeholder="Search photos..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search photos"
          />
          {PHOTO_GALLERY_CATEGORIES.map((category) => (
            <FilterButton
              key={category}
              type="button"
              $active={activeCategory === category}
              aria-pressed={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Filter size={16} />
              {category}
            </FilterButton>
          ))}
        </SearchAndFilterContainer>

        {uploadMessage && <StatusMessage role="status">{uploadMessage}</StatusMessage>}

        {filteredPhotos.length === 0 && searchTerm === '' ? (
          <PhotoGalleryEmptyState status={postsStatus} />
        ) : (
          <PhotoGrid>
            <PhotoGalleryUploadCard onUpload={handleUpload} />
            <AnimatePresence>
              {filteredPhotos.map((photo, index) => (
                <PhotoGalleryCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  onOpen={setSelectedPhoto}
                  onShare={handleShare}
                />
              ))}
            </AnimatePresence>
          </PhotoGrid>
        )}

        <HiddenInput
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label="Photo gallery upload"
          onChange={handleFileChange}
        />
      </GalleryContainer>

      <PhotoGalleryModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </>
  );
};

export default PhotoGallery;
