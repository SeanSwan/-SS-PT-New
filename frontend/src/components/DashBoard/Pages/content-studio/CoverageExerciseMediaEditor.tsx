/**
 * CoverageExerciseMediaEditor
 * ===========================
 *
 * Inline Content Studio editor for shared Exercise/Rolodex media fields. The
 * parent owns persistence and re-fetching; this component owns only local URL
 * editing, validation, save state, and the add/edit affordance.
 */

import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import styled from 'styled-components';
import type { CoverageExerciseMediaRecord } from './CoverageExerciseMediaDetail';

const MEDIA_FIELDS = ['videoUrl', 'previewVideoUrl', 'thumbnailUrl'] as const;

export type CoverageMediaFields = {
  videoUrl: string | null;
  previewVideoUrl: string | null;
  thumbnailUrl: string | null;
};

interface CoverageExerciseMediaEditorProps {
  exercise: CoverageExerciseMediaRecord;
  hasSavedMedia: boolean;
  onSaveMedia: (id: string | number, fields: CoverageMediaFields) => Promise<void>;
}

type EditorForm = Record<(typeof MEDIA_FIELDS)[number], string>;

/** Empty -> null (clears the field); otherwise require http/https. */
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

const CoverageExerciseMediaEditor: React.FC<CoverageExerciseMediaEditorProps> = ({
  exercise,
  hasSavedMedia,
  onSaveMedia,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [form, setForm] = useState<EditorForm>({ videoUrl: '', previewVideoUrl: '', thumbnailUrl: '' });

  const exerciseId = exercise.id;
  useEffect(() => {
    setEditing(false);
    setMessage(null);
    setForm({
      videoUrl: exercise.videoUrl ?? '',
      previewVideoUrl: exercise.previewVideoUrl ?? '',
      thumbnailUrl: exercise.thumbnailUrl ?? '',
    });
  }, [exerciseId, exercise.videoUrl, exercise.previewVideoUrl, exercise.thumbnailUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validated: Partial<CoverageMediaFields> = {};
    for (const field of MEDIA_FIELDS) {
      const result = validateMediaUrl(form[field]);
      if ('error' in result) {
        setMessage({ text: result.error, error: true });
        return;
      }
      validated[field] = result.value;
    }

    setSaving(true);
    setMessage(null);
    try {
      await onSaveMedia(exercise.id, validated as CoverageMediaFields);
      setMessage({ text: 'Media saved.', error: false });
      setEditing(false);
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage({ text: apiMsg || (err instanceof Error ? err.message : 'Save failed'), error: true });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <EditorActions>
        <EditorButton type="button" $variant="ghost" onClick={() => setEditing(true)}>
          <Pencil size={14} aria-hidden="true" /> {hasSavedMedia ? 'Edit media' : 'Add media'}
        </EditorButton>
        {message && <EditorMessage $error={message.error}>{message.text}</EditorMessage>}
      </EditorActions>
    );
  }

  return (
    <EditorPanel onSubmit={handleSubmit}>
      <EditorField>
        Full video URL
        <EditorHint>The deep "click for depth" video (R2 .mp4/.webm, YouTube, or Vimeo).</EditorHint>
        <UrlInput
          value={form.videoUrl}
          onChange={(e) => setForm(f => ({ ...f, videoUrl: e.target.value }))}
          placeholder="https://... (blank clears it)"
          inputMode="url"
        />
      </EditorField>
      <EditorField>
        Short loop URL (GIF-style preview)
        <EditorHint>A short muted R2 .mp4/.webm that auto-loops on the demo board.</EditorHint>
        <UrlInput
          value={form.previewVideoUrl}
          onChange={(e) => setForm(f => ({ ...f, previewVideoUrl: e.target.value }))}
          placeholder="https://... (optional)"
          inputMode="url"
        />
      </EditorField>
      <EditorField>
        Thumbnail / poster URL
        <EditorHint>Shown before the clip plays.</EditorHint>
        <UrlInput
          value={form.thumbnailUrl}
          onChange={(e) => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
          placeholder="https://... (optional)"
          inputMode="url"
        />
      </EditorField>
      {message && <EditorMessage $error={message.error}>{message.text}</EditorMessage>}
      <EditorActions>
        <EditorButton type="submit" $variant="primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save media'}
        </EditorButton>
        <EditorButton type="button" $variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </EditorButton>
      </EditorActions>
    </EditorPanel>
  );
};

export default React.memo(CoverageExerciseMediaEditor);

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

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 1px;
  }
`;

const EditorActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const EditorButton = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--color-wing-purple, #8B5CF6);
    outline-offset: 2px;
  }
`;

const EditorMessage = styled.p<{ $error?: boolean }>`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
  color: ${({ $error }) => ($error ? 'var(--danger-text, #f87171)' : 'var(--accent-primary, #60C0F0)')};
`;
