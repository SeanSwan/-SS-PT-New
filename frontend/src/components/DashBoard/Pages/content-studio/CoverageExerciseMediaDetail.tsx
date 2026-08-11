/**
 * Selected Coverage Exercise Media Detail
 * =======================================
 *
 * Persistent media detail for the Content Studio Coverage Tracker. Tap/click a
 * coverage cell to inspect or edit the shared Exercise/Rolodex demo media
 * without relying on a hover-only tooltip.
 */

import React from 'react';
import { ExternalLink, Film, Image as ImageIcon, PlayCircle } from 'lucide-react';
import styled from 'styled-components';
import CoverageExerciseMediaEditor, { type CoverageMediaFields } from './CoverageExerciseMediaEditor';

export interface CoverageExerciseMediaRecord {
  id: string | number;
  name: string;
  exerciseType: string;
  bodyPartCategory: string;
  difficulty: number;
  source: string;
  videoUrl?: string | null;
  previewVideoUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaPreviewUrl?: string | null;
  catalogVideoSample?: {
    title?: string | null;
    source?: string | null;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
  } | null;
  hasLegacyVideo: boolean;
  catalogVideoCount: number;
  covered: boolean;
}

interface CoverageExerciseMediaDetailProps {
  exercise: CoverageExerciseMediaRecord | null;
  onSaveMedia?: (id: string | number, fields: CoverageMediaFields) => Promise<void>;
}

function getStatusLabel(exercise: CoverageExerciseMediaRecord) {
  if (exercise.videoUrl && exercise.previewVideoUrl) return 'Uploaded demo + preview loop';
  if (exercise.videoUrl) return 'Uploaded demo video';
  if (exercise.previewVideoUrl) return 'Uploaded preview loop';
  if (exercise.catalogVideoCount > 0) {
    const title = exercise.catalogVideoSample?.title;
    const count = `${exercise.catalogVideoCount} catalog reference${exercise.catalogVideoCount === 1 ? '' : 's'}`;
    return title ? `${count}: ${title}` : count;
  }
  return 'No uploaded media yet';
}

function getVideoBadgeLabel(exercise: CoverageExerciseMediaRecord) {
  if (exercise.videoUrl && exercise.previewVideoUrl) return 'Video + loop';
  if (exercise.videoUrl) return 'Video';
  if (exercise.previewVideoUrl) return 'Loop';
  return 'Reference';
}

const CoverageExerciseMediaDetail: React.FC<CoverageExerciseMediaDetailProps> = ({ exercise, onSaveMedia }) => {
  if (!exercise) return null;

  const catalogVideoUrl = exercise.catalogVideoSample?.videoUrl || null;
  const uploadedVideoUrl = exercise.videoUrl || exercise.previewVideoUrl || null;
  const openVideoUrl = uploadedVideoUrl || catalogVideoUrl;
  const openLabel = exercise.videoUrl
    ? 'Open demo'
    : exercise.previewVideoUrl
      ? 'Open preview loop'
      : 'Open catalog reference';
  const hasSavedMedia = Boolean(exercise.videoUrl || exercise.previewVideoUrl || exercise.thumbnailUrl);
  const previewUrl = exercise.mediaPreviewUrl
    || exercise.thumbnailUrl
    || exercise.imageUrl
    || exercise.catalogVideoSample?.thumbnailUrl
    || null;

  return (
    <DetailShell aria-live="polite">
      <PreviewFrame>
        {previewUrl ? (
          <PreviewImage src={previewUrl} alt="" loading="lazy" />
        ) : (
          <ImageIcon size={28} aria-hidden="true" />
        )}
        {openVideoUrl && (
          <VideoBadge>
            <PlayCircle size={12} aria-hidden="true" />
            {getVideoBadgeLabel(exercise)}
          </VideoBadge>
        )}
      </PreviewFrame>

      <DetailCopy>
        <ExerciseName>{exercise.name}</ExerciseName>
        <MetaLine>
          {exercise.bodyPartCategory} / {exercise.exerciseType || 'exercise'} / Diff {exercise.difficulty || 0}
        </MetaLine>
        <MetaLine>Source: {exercise.source || 'swanstudios'}</MetaLine>
        <StatusLine $covered={exercise.covered}>{getStatusLabel(exercise)}</StatusLine>
      </DetailCopy>

      {openVideoUrl && (
        <OpenLink href={openVideoUrl} target="_blank" rel="noopener noreferrer">
          <Film size={16} aria-hidden="true" />
          {openLabel}
          <ExternalLink size={14} aria-hidden="true" />
        </OpenLink>
      )}

      {onSaveMedia && (
        <CoverageExerciseMediaEditor
          exercise={exercise}
          hasSavedMedia={hasSavedMedia}
          onSaveMedia={onSaveMedia}
        />
      )}
    </DetailShell>
  );
};

export default React.memo(CoverageExerciseMediaDetail);

const DetailShell = styled.aside`
  display: grid;
  grid-template-columns: minmax(88px, 128px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(
    --border-soft,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)
  );
  background: linear-gradient(135deg, var(--bg-elevated, #141419), var(--bg-secondary, #1A1A24));

  @media (max-width: 768px) {
    grid-template-columns: 96px minmax(0, 1fr);
  }
`;

const PreviewFrame = styled.div`
  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 16 / 10;
  min-height: 72px;
  border-radius: 8px;
  border: 1px solid var(
    --border-soft,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)
  );
  background: var(
    --coverage-preview-surface,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)
  );
  display: grid;
  place-items: center;
  color: var(--accent-primary, #60C0F0);
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const VideoBadge = styled.span`
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 999px;
  background: var(
    --coverage-video-badge-bg,
    color-mix(in srgb, var(--bg-base, #0A0A0F) 76%, transparent)
  );
  border: 1px solid var(--accent-primary, #60C0F0);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
`;

const DetailCopy = styled.div`
  min-width: 0;
`;

const ExerciseName = styled.h3`
  margin: 0 0 6px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1rem, 1.4vw, 1.35rem);
  line-height: 1.15;
`;

const MetaLine = styled.p`
  margin: 0;
  color: var(
    --text-secondary,
    color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent)
  );
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  line-height: 1.5;
`;

const StatusLine = styled.p<{ $covered: boolean }>`
  margin: 6px 0 0;
  color: ${({ $covered }) => (
    $covered ? 'var(--accent-primary, #60C0F0)' : 'var(--color-wing-purple, #8B5CF6)'
  )};
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
`;

const OpenLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: var(
    --coverage-action-bg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)
  );
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: var(
      --coverage-action-bg-hover,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)
    );
  }

  &:focus-visible {
    outline: 2px solid var(--color-wing-purple, #8B5CF6);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    grid-column: 1 / -1;
    width: 100%;
  }
`;
