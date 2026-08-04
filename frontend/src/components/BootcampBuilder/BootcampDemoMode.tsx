/**
 * BootcampDemoMode
 * PURPOSE: TV/mobile floor board for showing station exercises and Rolodex demo media.
 * PARENTS: ClassPreviewPanel when Bootcamp floor mode is active.
 * STATE: Local station focus, preview fallback errors, and the active depth-video modal.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import BootcampDemoVideoModal from './BootcampDemoVideoModal';
import BootcampRunnerClock from './BootcampRunnerClock';
import { getFloorDirectorModel } from './BootcampDemoMode.floorDirector';
import { getBootcampFloorStationCount, getBootcampFloorStationIndex } from './BootcampDemoMode.stationCount';
import {
  DirectorButton,
  FloorDirectorActions,
  FloorDirectorRail,
  FloorDirectorSummary,
  StationJumpButton,
  StationJumpRail,
} from './BootcampDemoMode.floorStyles';
import { getVideoPoster, isDirectVideoFile, isEmbeddableVideoUrl } from './bootcampVideoEmbed';
import {
  DemoExerciseList,
  DemoExerciseMeta,
  DemoExerciseName,
  DemoExerciseSelectButton,
  DemoExerciseTile,
  DemoHeader,
  DemoImage,
  DemoMediaPill,
  DemoMediaStage,
  DemoPlaceholder,
  DemoShell,
  DemoSubline,
  DemoTitle,
  DemoVideo,
  DemoVideoLink,
  StationDemoCard,
  StationDemoCount,
  StationDemoGrid,
  StationDemoHeader,
  StationDemoName,
} from './BootcampDemoMode.styles';



interface BootcampDemoModeProps {
  bootcamp: GeneratedBootcamp;
  onSelectExercise: (ex: BootcampExercise) => void;
}

export function getExerciseDemoMedia(exercise: BootcampExercise) {
  const catalogVideoUrl = exercise.catalogVideoSample?.videoUrl || null;
  // The full-length video opened "for depth" (file plays inline in the modal,
  // YouTube/Vimeo plays via embed).
  const videoUrl = exercise.videoUrl || catalogVideoUrl;
  const poster = exercise.thumbnailUrl
    || exercise.imageUrl
    || exercise.catalogVideoSample?.thumbnailUrl
    || getVideoPoster(videoUrl)        // derive a YouTube thumbnail so the tile isn't empty
    || null;
  // The GIF-style looping preview: a dedicated short R2 loop (Codex's
  // previewVideoUrl column) when present, else fall back to looping the full
  // video ONLY when it's a direct file we can safely autoplay muted.
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

type DemoMedia = ReturnType<typeof getExerciseDemoMedia>;

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

const BootcampDemoMode: React.FC<BootcampDemoModeProps> = ({ bootcamp, onSelectExercise }) => {
  const stationExercises = useMemo(() => {
    const grouped: Record<number, BootcampExercise[]> = {};
    for (const exercise of bootcamp.exercises) {
      if (exercise.board && exercise.board !== 'main') continue;
      const stationIndex = getBootcampFloorStationIndex(exercise.stationIndex);
      grouped[stationIndex] = [...(grouped[stationIndex] ?? []), exercise];
    }
    Object.values(grouped).forEach((items) => items.sort((a, b) => a.sortOrder - b.sortOrder));
    return grouped;
  }, [bootcamp.exercises]);

  const stationCount = getBootcampFloorStationCount(bootcamp);
  const stations = Array.from({ length: stationCount }, (_, stationIndex) => ({
    station: bootcamp.stations[stationIndex],
    exercises: stationExercises[stationIndex] ?? [],
    stationIndex,
  }));

  // "Click for depth" full video + per-tile preview-error fallback to the poster.
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null);
  const [erroredPreviews, setErroredPreviews] = useState<Set<string>>(() => new Set());
  const [activeStationIndex, setActiveStationIndex] = useState(0);
  const [directorView, setDirectorView] = useState<'all' | 'focus'>('all');
  const floorDirector = useMemo(
    () => getFloorDirectorModel(bootcamp, activeStationIndex),
    [activeStationIndex, bootcamp],
  );
  const goToStation = useCallback((stationIndex: number) => {
    setActiveStationIndex(() => {
      const normalizedCount = Math.max(1, stationCount);
      return (stationIndex + normalizedCount) % normalizedCount;
    });
  }, [stationCount]);
  const handleDirectorKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToStation(floorDirector.activeStationIndex - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToStation(floorDirector.activeStationIndex + 1);
    }
  }, [floorDirector.activeStationIndex, goToStation]);
  const visibleStations = directorView === 'focus'
    ? stations.filter(({ stationIndex }) => stationIndex === floorDirector.activeStationIndex)
    : stations;
  const activeStationCard = floorDirector.stationCards[floorDirector.activeStationIndex];

  return (
    <DemoShell aria-label="Bootcamp station exercise demo mode">
      <BootcampRunnerClock bootcamp={bootcamp} />
      <DemoHeader>
        <div>
          <DemoTitle>Station Demo Board</DemoTitle>
          <DemoSubline>{stationCount} stations - {bootcamp.totalClassMin} min class</DemoSubline>
        </div>
      </DemoHeader>
      <FloorDirectorRail
        aria-label="Floor director controls"
        onKeyDown={handleDirectorKeyDown}
        role="group"
        tabIndex={0}
      >
        <FloorDirectorSummary aria-label="Floor director status" aria-live="polite" role="status">
          <strong>{floorDirector.activeStationName}</strong>
          <span> {activeStationCard?.readinessLabel ?? '0/0 demos'} | Class {floorDirector.summaryLabel} | {floorDirector.primaryCue}</span>
        </FloorDirectorSummary>
        <StationJumpRail aria-label="Station focus selector" role="group">
          {floorDirector.stationCards.map((card) => (
            <StationJumpButton
              key={card.stationIndex}
              type="button"
              $active={card.isActive}
              aria-pressed={card.isActive}
              aria-label={`Focus ${card.stationName}: ${card.readinessLabel}`}
              onClick={() => goToStation(card.stationIndex)}
            >
              <strong>{card.stationName}</strong>
              <span>{card.readinessLabel}</span>
            </StationJumpButton>
          ))}
        </StationJumpRail>
        <FloorDirectorActions>
          <DirectorButton type="button" aria-label="Previous station" onClick={() => goToStation(floorDirector.activeStationIndex - 1)}>
            <ChevronLeft size={16} aria-hidden="true" /> Prev
          </DirectorButton>
          <DirectorButton type="button" aria-label="Next station" onClick={() => goToStation(floorDirector.activeStationIndex + 1)}>
            Next <ChevronRight size={16} aria-hidden="true" />
          </DirectorButton>
          <DirectorButton type="button" $active={directorView === 'all'} aria-pressed={directorView === 'all'} onClick={() => setDirectorView('all')}>
            All
          </DirectorButton>
          <DirectorButton type="button" $active={directorView === 'focus'} aria-pressed={directorView === 'focus'} onClick={() => setDirectorView('focus')}>
            Focus
          </DirectorButton>
        </FloorDirectorActions>
      </FloorDirectorRail>
      <StationDemoGrid>
        {visibleStations.map(({ station, exercises, stationIndex }) => (
          <StationDemoCard
            key={`station-${stationIndex}`}
            $active={stationIndex === floorDirector.activeStationIndex}
          >
            <StationDemoHeader>
              <StationDemoName>{station?.stationName ?? `Station ${stationIndex + 1}`}</StationDemoName>
              <StationDemoCount>{getStationDemoReadiness(exercises)}</StationDemoCount>
            </StationDemoHeader>
            <DemoExerciseList>
              {exercises.length === 0 ? (
                <DemoPlaceholder>No exercises assigned to this station yet.</DemoPlaceholder>
              ) : exercises.map((exercise, exerciseIndex) => {
                const media = getExerciseDemoMedia(exercise);
                const tileKey = `${stationIndex}-${exercise.sortOrder}-${exercise.exerciseName}`;
                const previewFailed = erroredPreviews.has(tileKey);
                const showInlinePreview = media.previewIsFile
                  && Boolean(media.previewUrl)
                  && !previewFailed;
                const mediaPillLabel = previewFailed && media.previewIsFile
                  ? 'Preview unavailable'
                  : getDemoMediaPillLabel(media);
                return (
                  <DemoExerciseTile key={tileKey}>
                    <DemoExerciseSelectButton
                      type="button"
                      onClick={() => onSelectExercise(exercise)}
                      aria-label={`Select ${exercise.exerciseName}`}
                    >
                      <DemoMediaStage>
                        {showInlinePreview ? (
                          <DemoVideo
                            aria-label={`${exercise.exerciseName} exercise demo preview`}
                            autoPlay
                            loop
                            muted
                            playsInline
                            poster={media.poster ?? undefined}
                            preload="metadata"
                            src={media.previewUrl ?? undefined}
                            onError={() => setErroredPreviews((prev) => {
                              const next = new Set(prev);
                              next.add(tileKey);
                              return next;
                            })}
                          />
                        ) : previewFailed && media.previewUrl ? (
                          <DemoPlaceholder>Preview could not load. Update this loop from the SwanStudios Rolodex.</DemoPlaceholder>
                        ) : media.poster ? (
                          <DemoImage
                            alt={`${exercise.exerciseName} exercise demonstration`}
                            src={media.poster}
                            loading="lazy"
                          />
                        ) : (
                          <DemoPlaceholder>Demo media can be added from the SwanStudios Rolodex.</DemoPlaceholder>
                        )}
                        <DemoMediaPill>{mediaPillLabel}</DemoMediaPill>
                      </DemoMediaStage>
                      <DemoExerciseName>{exerciseIndex + 1}. {exercise.exerciseName}</DemoExerciseName>
                      <DemoExerciseMeta>
                        {exercise.durationSec}s work / {exercise.restSec}s rest
                      </DemoExerciseMeta>
                    </DemoExerciseSelectButton>
                    {media.videoUrl && (
                      <DemoVideoLink
                        href={media.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => {
                          // Plain click -> in-app depth modal; modified clicks
                          // (Ctrl/Cmd/Shift/Alt/middle) keep the new-tab fallback.
                          if (event.metaKey || event.ctrlKey || event.shiftKey
                            || event.altKey || event.button === 1) return;
                          event.preventDefault();
                          setActiveVideo({ title: exercise.exerciseName, url: media.videoUrl as string });
                        }}
                      >
                        {media.isCatalogVideo ? 'Open catalog video' : 'Open video'} <ExternalLink size={14} />
                      </DemoVideoLink>
                    )}
                  </DemoExerciseTile>
                );
              })}
            </DemoExerciseList>
          </StationDemoCard>
        ))}
      </StationDemoGrid>

      <BootcampDemoVideoModal
        open={Boolean(activeVideo)}
        title={activeVideo?.title ?? ''}
        videoUrl={activeVideo?.url ?? null}
        onClose={() => setActiveVideo(null)}
      />
    </DemoShell>
  );
};

export default BootcampDemoMode;
