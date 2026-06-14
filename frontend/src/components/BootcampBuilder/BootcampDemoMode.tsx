import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
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

const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg)(?:[?#].*)?$/i;

interface BootcampDemoModeProps {
  bootcamp: GeneratedBootcamp;
  onSelectExercise: (ex: BootcampExercise) => void;
}

export function getExerciseDemoMedia(exercise: BootcampExercise) {
  const poster = exercise.thumbnailUrl || exercise.imageUrl || null;
  const videoUrl = exercise.videoUrl || null;
  return {
    poster,
    videoUrl,
    canPreviewVideo: Boolean(videoUrl && VIDEO_FILE_PATTERN.test(videoUrl)),
  };
}

const BootcampDemoMode: React.FC<BootcampDemoModeProps> = ({ bootcamp, onSelectExercise }) => {
  const stationExercises = useMemo(() => {
    const grouped: Record<number, BootcampExercise[]> = {};
    for (const exercise of bootcamp.exercises) {
      if (exercise.board && exercise.board !== 'main') continue;
      const stationIndex = exercise.stationIndex ?? 0;
      grouped[stationIndex] = [...(grouped[stationIndex] ?? []), exercise];
    }
    Object.values(grouped).forEach((items) => items.sort((a, b) => a.sortOrder - b.sortOrder));
    return grouped;
  }, [bootcamp.exercises]);

  const stationCount = bootcamp.stations.length || Math.max(1, bootcamp.stationCount || 1);
  const stations = Array.from({ length: stationCount }, (_, stationIndex) => ({
    station: bootcamp.stations[stationIndex],
    exercises: stationExercises[stationIndex] ?? [],
    stationIndex,
  }));

  return (
    <DemoShell aria-label="Bootcamp station exercise demo mode">
      <DemoHeader>
        <div>
          <DemoTitle>Station Demo Board</DemoTitle>
          <DemoSubline>{stationCount} stations - {bootcamp.totalClassMin} min class</DemoSubline>
        </div>
      </DemoHeader>
      <StationDemoGrid>
        {stations.map(({ station, exercises, stationIndex }) => (
          <StationDemoCard key={station?.stationNumber ?? stationIndex}>
            <StationDemoHeader>
              <StationDemoName>{station?.stationName ?? `Station ${stationIndex + 1}`}</StationDemoName>
              <StationDemoCount>{exercises.length} videos</StationDemoCount>
            </StationDemoHeader>
            <DemoExerciseList>
              {exercises.length === 0 ? (
                <DemoPlaceholder>No exercises assigned to this station yet.</DemoPlaceholder>
              ) : exercises.map((exercise, exerciseIndex) => {
                const media = getExerciseDemoMedia(exercise);
                return (
                  <DemoExerciseTile
                    key={`${stationIndex}-${exercise.sortOrder}-${exercise.exerciseName}`}
                  >
                    <DemoExerciseSelectButton
                      type="button"
                      onClick={() => onSelectExercise(exercise)}
                      aria-label={`Select ${exercise.exerciseName}`}
                    >
                      <DemoMediaStage>
                        {media.canPreviewVideo && media.videoUrl ? (
                          <DemoVideo
                            aria-label={`${exercise.exerciseName} exercise demo video`}
                            autoPlay
                            loop
                            muted
                            playsInline
                            poster={media.poster ?? undefined}
                            preload="metadata"
                            src={media.videoUrl}
                          />
                        ) : media.poster ? (
                          <DemoImage
                            alt={`${exercise.exerciseName} exercise demonstration`}
                            src={media.poster}
                            loading="lazy"
                          />
                        ) : (
                          <DemoPlaceholder>Demo media can be added from the SwanStudios Rolodex.</DemoPlaceholder>
                        )}
                        <DemoMediaPill>{media.videoUrl ? 'Video ready' : 'Media slot'}</DemoMediaPill>
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
                      >
                        Open video <ExternalLink size={14} />
                      </DemoVideoLink>
                    )}
                  </DemoExerciseTile>
                );
              })}
            </DemoExerciseList>
          </StationDemoCard>
        ))}
      </StationDemoGrid>
    </DemoShell>
  );
};

export default BootcampDemoMode;
