/**
 * Media card for the active UserDashboard V3 creative gallery.
 */

import React from 'react';
import { Eye, Play } from 'lucide-react';
import {
  CategoryStamp,
  CategoryStampRow,
  PlayButton,
  StatItem,
  VideoCard,
  VideoInfo,
  VideoStats,
  VideoThumbnail,
  VideoTitle,
} from './CreativeGalleryCard.styles';
import {
  normalizeCreativeMediaTitle,
  normalizeCreativeMetricCount,
} from './CreativeGallery.data';
import type { CreativeMediaItem } from './CreativeGallery.types';

interface CreativeGalleryCardProps {
  item: CreativeMediaItem;
  index: number;
  onPlay: (videoId: string) => void;
}

const CreativeGalleryCard: React.FC<CreativeGalleryCardProps> = ({ item, index, onPlay }) => {
  const safeTitle = normalizeCreativeMediaTitle(item.title);
  const safeViews = normalizeCreativeMetricCount(item.views);
  const safeDuration = item.duration.trim();
  const visibleTags = (item.tags?.length ? item.tags : ['Creative']).slice(0, 3);

  return (
    <VideoCard
      type="button"
      aria-label={`Play media: ${safeTitle}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onClick={() => onPlay(item.id)}
    >
      <VideoThumbnail $image={item.thumbnail}>
        <PlayButton aria-hidden="true">
          <Play size={24} aria-hidden="true" />
        </PlayButton>
      </VideoThumbnail>

      <VideoInfo>
        <VideoTitle>{safeTitle}</VideoTitle>
        <CategoryStampRow>
          {visibleTags.map((tag) => (
            <CategoryStamp key={tag}>{tag}</CategoryStamp>
          ))}
        </CategoryStampRow>
        <VideoStats>
          <StatItem>
            <Eye size={16} aria-hidden="true" />
            {safeViews.toLocaleString()}
          </StatItem>
          {safeDuration && <StatItem>{safeDuration}</StatItem>}
        </VideoStats>
      </VideoInfo>
    </VideoCard>
  );
};

export default CreativeGalleryCard;
