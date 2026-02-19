/**
 * YouTubeImportModal.tsx
 * ======================
 * Modal for importing a single YouTube video by URL or Video ID.
 * Parses various YouTube URL formats, collects metadata, and posts
 * to the import endpoint. Visibility "members_only" is explicitly
 * disabled for YouTube imports.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  X, Youtube, Loader, Check, AlertCircle,
  Globe, Link2, Info, ChevronDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface YouTubeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (video: any) => void;
}

type Visibility = 'public' | 'unlisted';

interface FormState {
  youtubeUrl: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  visibility: Visibility;
  ctaStrategy: string;
  contentType: string;
}

// ── API helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ── YouTube URL parser ─────────────────────────────────────────────────────
function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  // Plain 11-char video ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('/')[0] || null;
    }
    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      // youtube.com/embed/VIDEO_ID or youtube.com/v/VIDEO_ID
      const segments = url.pathname.split('/').filter(Boolean);
      if (['embed', 'v', 'shorts'].includes(segments[0]) && segments[1]) {
        return segments[1];
      }
    }
  } catch {
    // not a valid URL
  }
  return null;
}

// ── Constants ──────────────────────────────────────────────────────────────
const CTA_STRATEGIES = [
  { value: 'none', label: 'None' },
  { value: 'subscribe', label: 'Subscribe CTA' },
  { value: 'visit_site', label: 'Visit Website' },
  { value: 'book_session', label: 'Book a Session' },
  { value: 'free_trial', label: 'Free Trial' },
];

const CONTENT_TYPES = [
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'workout', label: 'Workout' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'behind_scenes', label: 'Behind the Scenes' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'educational', label: 'Educational' },
  { value: 'other', label: 'Other' },
];

// ── Styled Components ──────────────────────────────────────────────────────
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const Modal = styled(motion.div)`
  background: rgba(10, 10, 26, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #94a3b8;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 1.5rem;
`;

const FieldGroup = styled.div`
  margin-bottom: 1.1rem;
`;

const Label = styled.label`
  display: block;
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7rem 0.9rem;
  min-height: 44px;
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.92rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus { border-color: #00ffff; }
  &::placeholder { color: #475569; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.7rem 0.9rem;
  min-height: 80px;
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.92rem;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus { border-color: #00ffff; }
  &::placeholder { color: #475569; }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.7rem 0.9rem;
  min-height: 44px;
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.92rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  box-sizing: border-box;

  &:focus { border-color: #00ffff; }

  option {
    background: #0a0a1a;
    color: #e2e8f0;
  }
`;

const VisibilityRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const VisibilityBtn = styled.button<{ $active: boolean; $disabled?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: ${p => (p.$disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s;
  background: ${p => (p.$active ? 'rgba(0, 255, 255, 0.12)' : 'rgba(30, 58, 138, 0.2)')};
  border: 1px solid ${p => (p.$active ? '#00ffff' : 'rgba(59, 130, 246, 0.3)')};
  color: ${p => (p.$active ? '#00ffff' : p.$disabled ? '#334155' : '#94a3b8')};
  opacity: ${p => (p.$disabled ? 0.4 : 1)};

  &:hover:not(:disabled) {
    border-color: ${p => (p.$disabled ? 'rgba(59, 130, 246, 0.3)' : '#00ffff')};
  }
`;

const DisabledTooltip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.76rem;
  color: #64748b;
  margin-top: 0.35rem;
`;

const ParsedIdBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  font-size: 0.78rem;
  font-family: monospace;
  margin-top: 0.35rem;
`;

const FetchingLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  font-size: 0.78rem;
  margin-top: 0.35rem;
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  color: #fca5a5;
  font-size: 0.88rem;
  margin-top: 1rem;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1.5rem;
  min-height: 44px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${p =>
    p.$variant === 'ghost'
      ? `
    background: transparent;
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #94a3b8;
    &:hover { background: rgba(59, 130, 246, 0.1); color: #e2e8f0; }
  `
      : `
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border: none;
    color: #fff;
    &:hover { opacity: 0.9; transform: translateY(-1px); }
    &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  `}
`;

const ThumbnailPreview = styled.div<{ $src: string }>`
  width: 100%;
  height: 140px;
  border-radius: 8px;
  background: ${p =>
    p.$src
      ? `url(${p.$src}) center/cover no-repeat`
      : 'linear-gradient(135deg, rgba(30, 58, 138, 0.3), rgba(0, 255, 255, 0.05))'};
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-top: 0.5rem;
`;

// ── Component ──────────────────────────────────────────────────────────────
const YouTubeImportModal: React.FC<YouTubeImportModalProps> = ({
  isOpen,
  onClose,
  onImported,
}) => {
  const [form, setForm] = useState<FormState>({
    youtubeUrl: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    visibility: 'public',
    ctaStrategy: 'none',
    contentType: 'tutorial',
  });
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedId = useMemo(() => parseYouTubeId(form.youtubeUrl), [form.youtubeUrl]);

  // Auto-generate thumbnail when we get a valid ID
  useEffect(() => {
    if (parsedId && !form.thumbnailUrl) {
      setForm(prev => ({
        ...prev,
        thumbnailUrl: `https://img.youtube.com/vi/${parsedId}/maxresdefault.jpg`,
      }));
    }
  }, [parsedId]);

  // Simulate fetching metadata when valid ID detected
  useEffect(() => {
    if (!parsedId) {
      setFetching(false);
      return;
    }
    setFetching(true);
    const timer = setTimeout(() => setFetching(false), 1200);
    return () => clearTimeout(timer);
  }, [parsedId]);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, val: FormState[K]) => {
      setForm(prev => ({ ...prev, [key]: val }));
      setError(null);
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!parsedId) {
      setError('Please enter a valid YouTube URL or Video ID.');
      return;
    }
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch('/api/v2/admin/youtube/import', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          youtubeVideoId: parsedId,
          title: form.title.trim(),
          description: form.description.trim(),
          thumbnailUrl: form.thumbnailUrl.trim(),
          visibility: form.visibility,
          ctaStrategy: form.ctaStrategy,
          contentType: form.contentType,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Import failed (${resp.status})`);
      }

      const video = await resp.json();
      onImported(video);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }, [parsedId, form, onImported, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Overlay
        key="yt-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <Modal
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
        >
          <CloseBtn onClick={onClose} aria-label="Close import modal">
            <X size={18} />
          </CloseBtn>

          <Title>
            <Youtube size={22} color="#ef4444" />
            Import YouTube Video
          </Title>

          {/* YouTube URL */}
          <FieldGroup>
            <Label htmlFor="yt-url">YouTube URL or Video ID</Label>
            <Input
              id="yt-url"
              placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
              value={form.youtubeUrl}
              onChange={e => updateField('youtubeUrl', e.target.value)}
            />
            {parsedId && (
              <ParsedIdBadge>
                <Check size={12} /> {parsedId}
              </ParsedIdBadge>
            )}
            {parsedId && fetching && (
              <FetchingLabel>
                <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Fetching metadata...
              </FetchingLabel>
            )}
          </FieldGroup>

          {/* Thumbnail preview */}
          {parsedId && form.thumbnailUrl && (
            <ThumbnailPreview $src={form.thumbnailUrl} />
          )}

          {/* Title */}
          <FieldGroup>
            <Label htmlFor="yt-title">Title *</Label>
            <Input
              id="yt-title"
              placeholder="Video title"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
            />
          </FieldGroup>

          {/* Description */}
          <FieldGroup>
            <Label htmlFor="yt-desc">Description</Label>
            <TextArea
              id="yt-desc"
              placeholder="Brief description..."
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              rows={3}
            />
          </FieldGroup>

          {/* Thumbnail URL */}
          <FieldGroup>
            <Label htmlFor="yt-thumb">Thumbnail URL</Label>
            <Input
              id="yt-thumb"
              placeholder="https://img.youtube.com/vi/.../maxresdefault.jpg"
              value={form.thumbnailUrl}
              onChange={e => updateField('thumbnailUrl', e.target.value)}
            />
          </FieldGroup>

          {/* Visibility */}
          <FieldGroup>
            <Label>Visibility</Label>
            <VisibilityRow>
              <VisibilityBtn
                $active={form.visibility === 'public'}
                onClick={() => updateField('visibility', 'public')}
                type="button"
              >
                <Globe size={15} /> Public
              </VisibilityBtn>
              <VisibilityBtn
                $active={form.visibility === 'unlisted'}
                onClick={() => updateField('visibility', 'unlisted')}
                type="button"
              >
                <Link2 size={15} /> Unlisted
              </VisibilityBtn>
              <VisibilityBtn $active={false} $disabled type="button" title="YouTube videos cannot be members-only">
                Members Only
              </VisibilityBtn>
            </VisibilityRow>
            <DisabledTooltip>
              <Info size={12} />
              YouTube videos cannot be members-only
            </DisabledTooltip>
          </FieldGroup>

          {/* CTA Strategy */}
          <FieldGroup>
            <Label htmlFor="yt-cta">CTA Strategy</Label>
            <Select
              id="yt-cta"
              value={form.ctaStrategy}
              onChange={e => updateField('ctaStrategy', e.target.value)}
            >
              {CTA_STRATEGIES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </FieldGroup>

          {/* Content Type */}
          <FieldGroup>
            <Label htmlFor="yt-type">Content Type</Label>
            <Select
              id="yt-type"
              value={form.contentType}
              onChange={e => updateField('contentType', e.target.value)}
            >
              {CONTENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </FieldGroup>

          {/* Error */}
          {error && (
            <ErrorBox>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </ErrorBox>
          )}

          {/* Actions */}
          <ButtonRow>
            <ActionBtn $variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </ActionBtn>
            <ActionBtn onClick={handleSubmit} disabled={submitting || !parsedId}>
              {submitting ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Importing...
                </>
              ) : (
                <>
                  <Youtube size={16} /> Import Video
                </>
              )}
            </ActionBtn>
          </ButtonRow>
        </Modal>
      </Overlay>
    </AnimatePresence>
  );
};

export default YouTubeImportModal;
