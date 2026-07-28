import type { BootcampExercise } from '../../hooks/useBootcampAPI';
import { getVideoPoster, isDirectVideoFile, isEmbeddableVideoUrl } from './bootcampVideoEmbed';

export function getExerciseDemoMedia(exercise: BootcampExercise) {
  const catalogVideoUrl = exercise.catalogVideoSample?.videoUrl || null;
  const videoUrl = exercise.videoUrl || catalogVideoUrl;
  const poster = exercise.thumbnailUrl
    || exercise.imageUrl
    || exercise.catalogVideoSample?.thumbnailUrl
    || getVideoPoster(videoUrl)
    || null;
  const previewUrl = exercise.previewVideoUrl
    || (isDirectVideoFile(videoUrl) ? videoUrl : null);

  return {
    poster,
    videoUrl,
    previewUrl,
    previewIsFile: isDirectVideoFile(previewUrl),
    isCatalogVideo: !exercise.videoUrl && Boolean(catalogVideoUrl),
    canPreviewVideo: isDirectVideoFile(previewUrl),
    isEmbedVideo: isEmbeddableVideoUrl(videoUrl),
  };
}

export type DemoMedia = ReturnType<typeof getExerciseDemoMedia>;

export function getDemoMediaPillLabel(media: DemoMedia): string {
  if (media.previewIsFile) return media.isCatalogVideo ? 'Catalog clip' : 'Looping clip';
  if (!media.videoUrl) return 'Media slot';
  return media.isCatalogVideo ? 'Catalog video' : 'Tap to play';
}

export function getStationDemoReadiness(exercises: BootcampExercise[]) {
  const totalExercises = exercises.length;
  const readyVideos = exercises.filter((exercise) => {
    const media = getExerciseDemoMedia(exercise);
    return Boolean(media.videoUrl || media.previewUrl);
  }).length;
  return `${readyVideos}/${totalExercises} demos ready`;
}
