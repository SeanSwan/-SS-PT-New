/**
 * ExerciseMediaPreview
 * ====================
 *
 * Media-aware preview for the shared WorkoutLogger Rolodex. Hosted demo
 * videos are playable in place, uploaded GIFs/images stay lightweight, and
 * exercises without media keep a branded at-a-glance placeholder.
 */
import React from 'react';
import type { ExerciseSlim } from './useExerciseSearch';
import {
  FallbackPreview,
  FallbackText,
  FallbackTitle,
  MediaFrame,
  MediaImage,
  MediaVideo,
} from './ExerciseMediaPreview.styles';

interface ExerciseMediaPreviewProps {
  exercise: ExerciseSlim;
}

const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg)(?:[?#].*)?$/i;

const getPoster = (exercise: ExerciseSlim): string | undefined => (
  exercise.thumbnailUrl || exercise.imageUrl || undefined
);

const isHostedVideo = (url?: string | null): url is string => (
  typeof url === 'string' && (VIDEO_FILE_PATTERN.test(url) || url.includes('/video/'))
);

const ExerciseMediaPreview: React.FC<ExerciseMediaPreviewProps> = ({ exercise }) => {
  const poster = getPoster(exercise);

  if (isHostedVideo(exercise.videoUrl)) {
    return (
      <MediaFrame>
        <MediaVideo
          aria-label={`${exercise.name} exercise demo media`}
          controls
          playsInline
          preload="metadata"
          poster={poster}
          src={exercise.videoUrl}
        />
      </MediaFrame>
    );
  }

  if (poster) {
    return (
      <MediaFrame>
        <MediaImage
          alt={`${exercise.name} exercise demonstration`}
          src={poster}
          loading="lazy"
        />
      </MediaFrame>
    );
  }

  return (
    <MediaFrame>
      <FallbackPreview role="img" aria-label={`${exercise.name} exercise demo placeholder`}>
        <FallbackTitle>SwanStudios form preview</FallbackTitle>
        <FallbackText>Demo media ready when uploaded</FallbackText>
      </FallbackPreview>
    </MediaFrame>
  );
};

export default ExerciseMediaPreview;
