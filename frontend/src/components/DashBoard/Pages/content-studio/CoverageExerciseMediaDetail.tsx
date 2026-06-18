/**
 * Selected Coverage Exercise Media Detail
 * =======================================
 *
 * Persistent media detail for the Content Studio Coverage Tracker. Tap/click a
 * coverage cell to inspect the Rolodex demo video state without relying on a
 * hover-only tooltip.
 */

import React, { useEffect, useState } from 'react';
import { ExternalLink, Film, Image as ImageIcon, PlayCircle, Pencil } from 'lucide-react';
import styled from 'styled-components';

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

  @media (max-width: 720px) {
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

  @media (max-width: 720px) {
    grid-column: 1 / -1;
    width: 100%;
  }
`;

// ── Media editor (Content Studio = single home for exercise media) ──

const MEDIA_FIELDS = ['videoUrl', 'previewVideoUrl', 'thumbnailUrl'] as const;

const EditorPanel = styled.form`
  grid-column: 1 / -1;
  display: grid;
  gap: 10px;
  margin-top: 4px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);
`;

const EditorField = styled.label`
  display: grid;
  gap: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-secondary, #c8d6e5);
`;

const EditorHint = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent));
  font-size: 0.7rem;
`;

const UrlInput = styled.input`
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: var(--input-bg, color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;

  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 1px; }
`;

const EditorActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const EditorButton = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid ${({ $variant }) => ($variant === 'primary'
    ? 'transparent'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)')};
  background: ${({ $variant }) => ($variant === 'primary'
    ? 'linear-gradient(135deg, var(--chart-primary, #50A0F0), var(--accent-primary, #60C0F0))'
    : 'transparent')};
  color: var(--text-primary, #E0ECF4);

  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--color-wing-purple, #8B5CF6); outline-offset: 2px; }
`;

const EditorMessage = styled.p<{ $error?: boolean }>`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
  color: ${({ $error }) => ($error ? 'var(--danger-text, #f87171)' : 'var(--accent-primary, #60C0F0)')};
`;

/** Empty -> null (clears the field); otherwise require http/https (matches the
 *  backend's normalizeMediaUrl so we fail fast before the request). */
function validateMediaUrl(raw: string): { value: string | null } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null };
  if (trimmed.length > 500) return { error: 'URLs must be 500 characters or fewer' };
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { error: 'URLs must start with http:// or https://' };
    }
  } catch {
    return { error: 'Enter a valid URL (or leave blank to clear)' };
  }
  return { value: trimmed };
}

function getStatusLabel(exercise: CoverageExerciseMediaRecord) {
  if (exercise.catalogVideoCount > 0) {
    const title = exercise.catalogVideoSample?.title;
    const count = `${exercise.catalogVideoCount} catalog video${exercise.catalogVideoCount === 1 ? '' : 's'}`;
    return title ? `${count}: ${title}` : count;
  }
  if (exercise.hasLegacyVideo) return 'Rolodex demo video';
  return 'Video gap';
}

type MediaFields = { videoUrl: string | null; previewVideoUrl: string | null; thumbnailUrl: string | null };

interface CoverageExerciseMediaDetailProps {
  exercise: CoverageExerciseMediaRecord | null;
  /** When provided, the panel becomes an editor: Save calls this with the
   *  validated media fields (parent owns the PUT + coverage re-fetch). */
  onSaveMedia?: (id: string | number, fields: MediaFields) => Promise<void>;
}

const CoverageExerciseMediaDetail: React.FC<CoverageExerciseMediaDetailProps> = ({ exercise, onSaveMedia }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [form, setForm] = useState({ videoUrl: '', previewVideoUrl: '', thumbnailUrl: '' });

  const exerciseId = exercise?.id ?? null;
  // Re-seed the editor whenever the pinned exercise (or its media) changes —
  // including after a save+re-fetch re-pins the freshened record.
  useEffect(() => {
    setEditing(false);
    setMessage(null);
    setForm({
      videoUrl: exercise?.videoUrl ?? '',
      previewVideoUrl: exercise?.previewVideoUrl ?? '',
      thumbnailUrl: exercise?.thumbnailUrl ?? '',
    });
  }, [exerciseId, exercise?.videoUrl, exercise?.previewVideoUrl, exercise?.thumbnailUrl]);

  if (!exercise) return null;

  const catalogVideoUrl = exercise.catalogVideoSample?.videoUrl || null;
  const openVideoUrl = exercise.videoUrl || catalogVideoUrl;
  const openLabel = exercise.videoUrl ? 'Open demo' : 'Open catalog demo';
  const previewUrl = exercise.mediaPreviewUrl
    || exercise.catalogVideoSample?.thumbnailUrl
    || exercise.thumbnailUrl
    || exercise.imageUrl
    || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveMedia) return;
    const validated: Partial<MediaFields> = {};
    for (const field of MEDIA_FIELDS) {
      const result = validateMediaUrl(form[field]);
      if ('error' in result) { setMessage({ text: result.error, error: true }); return; }
      validated[field] = result.value;
    }
    setSaving(true);
    setMessage(null);
    try {
      await onSaveMedia(exercise.id, validated as MediaFields);
      setMessage({ text: 'Media saved.', error: false });
      setEditing(false);
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage({ text: apiMsg || (err instanceof Error ? err.message : 'Save failed'), error: true });
    } finally {
      setSaving(false);
    }
  };

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
            {exercise.previewVideoUrl ? 'Loop' : 'Video'}
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

      {onSaveMedia && !editing && (
        <EditorActions style={{ gridColumn: '1 / -1' }}>
          <EditorButton type="button" $variant="ghost" onClick={() => setEditing(true)}>
            <Pencil size={14} aria-hidden="true" /> {openVideoUrl ? 'Edit media' : 'Add media'}
          </EditorButton>
          {message && <EditorMessage $error={message.error}>{message.text}</EditorMessage>}
        </EditorActions>
      )}

      {onSaveMedia && editing && (
        <EditorPanel onSubmit={handleSubmit}>
          <EditorField>
            Full video URL
            <EditorHint>The deep "click for depth" video (R2 .mp4/.webm, YouTube, or Vimeo).</EditorHint>
            <UrlInput
              value={form.videoUrl}
              onChange={(e) => setForm(f => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://…  (blank clears it)"
              inputMode="url"
            />
          </EditorField>
          <EditorField>
            Short loop URL (GIF-style preview)
            <EditorHint>A short muted R2 .mp4/.webm that auto-loops on the demo board.</EditorHint>
            <UrlInput
              value={form.previewVideoUrl}
              onChange={(e) => setForm(f => ({ ...f, previewVideoUrl: e.target.value }))}
              placeholder="https://…  (optional)"
              inputMode="url"
            />
          </EditorField>
          <EditorField>
            Thumbnail / poster URL
            <EditorHint>Shown before the clip plays.</EditorHint>
            <UrlInput
              value={form.thumbnailUrl}
              onChange={(e) => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
              placeholder="https://…  (optional)"
              inputMode="url"
            />
          </EditorField>
          {message && <EditorMessage $error={message.error}>{message.text}</EditorMessage>}
          <EditorActions>
            <EditorButton type="submit" $variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save media'}
            </EditorButton>
            <EditorButton type="button" $variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </EditorButton>
          </EditorActions>
        </EditorPanel>
      )}
    </DetailShell>
  );
};

export default React.memo(CoverageExerciseMediaDetail);
