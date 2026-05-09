/**
 * Media card for the active UserDashboard V3 creative gallery.
 */

import React from 'react';
import { Eye, Play } from 'lucide-react';
import {
  PlayButton,
  StatItem,
  VideoCard,
  VideoInfo,
  VideoStats,
  VideoThumbnail,
  VideoTitle,
} from './CreativeGalleryCard.styles';
import type { CreativeMediaItem } from './CreativeGallery.types';

interface CreativeGalleryCardProps {
  item: CreativeMediaItem;
  index: number;
  onPlay: (videoId: string) => void;
}

const CreativeGalleryCard: React.FC<CreativeGalleryCardProps> = ({ item, index, onPlay }) => (
  <VideoCard
    type="button"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
    onClick={() => onPlay(item.id)}
  >
    <VideoThumbnail $image={item.thumbnail}>
      <PlayButton whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Play size={24} />
      </PlayButton>
    </VideoThumbnail>

    <VideoInfo>
      <VideoTitle>{item.title}</VideoTitle>
      <VideoStats>
        <StatItem>
          <Eye size={16} />
          {item.views.toLocaleString()}
        </StatItem>
        {item.duration && <StatItem>{item.duration}</StatItem>}
      </VideoStats>
    </VideoInfo>
  </VideoCard>
);

export default CreativeGalleryCard;
