import React from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import {
  ActionButton,
  PhotoActions,
  PhotoCard,
  PhotoImage,
  PhotoOverlay,
  PhotoStats,
  PhotoTitle,
  StatItem,
} from './PhotoGalleryCard.styles';
import type { PhotoGalleryCardProps } from './PhotoGallery.types';

const PhotoGalleryCard: React.FC<PhotoGalleryCardProps> = ({ photo, index, onOpen, onShare }) => {
  const openPhoto = () => onOpen(photo);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPhoto();
    }
  };

  const handleShare = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void onShare(photo.url);
  };

  return (
    <PhotoCard
      role="button"
      tabIndex={0}
      aria-label={`Open photo: ${photo.title}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={openPhoto}
      onKeyDown={handleKeyDown}
    >
      <PhotoImage $image={photo.url} />
      <PhotoActions>
        <ActionButton type="button" aria-label={`Share photo: ${photo.title}`} onClick={handleShare} whileHover={{ scale: 1.1 }}>
          <Share2 size={16} />
        </ActionButton>
      </PhotoActions>
      <PhotoOverlay>
        <PhotoTitle>{photo.title}</PhotoTitle>
        <PhotoStats>
          <StatItem>
            <Heart size={16} aria-hidden="true" />
            {photo.likes}
          </StatItem>
          <StatItem>
            <MessageCircle size={16} aria-hidden="true" />
            {photo.comments}
          </StatItem>
        </PhotoStats>
      </PhotoOverlay>
    </PhotoCard>
  );
};

export default PhotoGalleryCard;
