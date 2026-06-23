import React from 'react';
import { Clock, Eye, Play, Upload, Youtube } from 'lucide-react';
import ScrollReveal from '../components/ui-kit/cinematic/ScrollReveal';
import { sanitizeImageUrl } from '../utils/imageUrl';
import { formatDuration, getVideoWatchPath, normalizeContentTypeLabel } from './VideoLibraryV3.logic';
import type { VideoItem } from './VideoLibraryV3.types';
import {
  CardBody, CardFooter, CardTitle, ContentTag, DurationBadge, LockedBadge, PlayOverlay,
  Thumbnail, ThumbnailPlaceholder, ThumbnailWrap, VideoCard, ViewCount,
} from './VideoLibraryV3.cardStyles';

interface VideoCardItemProps {
  video: VideoItem;
  index: number;
  onOpen: (path: string) => void;
}

const VideoCardItem: React.FC<VideoCardItemProps> = ({ video, index, onOpen }) => {
  const watchPath = getVideoWatchPath(video.slug);
  const thumbnail = sanitizeImageUrl(video.thumbnail);

  return (
    <ScrollReveal direction="up" delay={Math.min(index * 0.05, 0.4)}>
      <VideoCard
        type="button"
        disabled={!watchPath}
        onClick={() => watchPath && onOpen(watchPath)}
        aria-label={`Watch ${video.title}`}
      >
        <ThumbnailWrap>
          {thumbnail ? (
            <Thumbnail src={thumbnail} alt={video.title} loading="lazy" />
          ) : (
            <ThumbnailPlaceholder>
              {video.source === 'youtube' ? <Youtube size={40} /> : <Upload size={40} />}
            </ThumbnailPlaceholder>
          )}
          <PlayOverlay aria-hidden="true"><Play size={40} /></PlayOverlay>
          {video.durationSeconds > 0 && (
            <DurationBadge><Clock size={12} /> {formatDuration(video.durationSeconds)}</DurationBadge>
          )}
        </ThumbnailWrap>

        <CardBody>
          <CardTitle>{video.title}</CardTitle>
          {video.contentType && <ContentTag>{normalizeContentTypeLabel(video.contentType)}</ContentTag>}
          <CardFooter>
            <ViewCount><Eye size={14} /> {video.viewCount}</ViewCount>
            {video.locked && <LockedBadge>Members Only</LockedBadge>}
          </CardFooter>
        </CardBody>
      </VideoCard>
    </ScrollReveal>
  );
};

export default VideoCardItem;
