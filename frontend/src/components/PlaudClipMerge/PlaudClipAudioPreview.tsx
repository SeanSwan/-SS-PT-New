/**
 * PlaudClipAudioPreview.tsx
 * ==========================
 * Authenticated, load-on-demand audio preview for PLAUD clip rows.
 *
 * The native <audio> element cannot send Swan's bearer auth header by
 * itself, so this component requests the clip bytes through apiService,
 * creates a local object URL, and then hands that URL to native controls.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AlertCircle, Headphones, Loader2 } from 'lucide-react';
import { fetchClipAudioBlob, type PlaudClip } from '../../services/plaudClipService';

const PLAYABLE_AUDIO_MIMES = new Set([
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/flac',
]);

const READY_STATUSES = new Set(['pending_merge', 'merged']);

const PreviewWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.5rem;
  width: 100%;
`;

const PreviewStatus = styled.div<{ $tone?: 'error' | 'muted' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.5rem;
  color: ${({ $tone }) => (
    $tone === 'error'
      ? 'rgba(252, 165, 165, 1)'
      : 'var(--text-secondary, rgba(224,236,244,0.72))'
  )};
  font-size: 0.75rem;
  line-height: 1.35;
`;

const LoadButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  width: 100%;
  padding: 0 0.875rem;
  border: 1px solid rgba(96,192,240,0.28);
  border-radius: 10px;
  background: rgba(96,192,240,0.1);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 150ms ease, background-color 150ms ease;

  &:hover:not(:disabled) {
    border-color: rgba(96,192,240,0.45);
    background: rgba(96,192,240,0.16);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  @media (min-width: 768px) {
    width: fit-content;
  }
`;

const AudioPlayer = styled.audio`
  width: 100%;
  max-width: 560px;
  min-height: 44px;
  accent-color: var(--accent-primary, #60C0F0);
`;

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface PlaudClipAudioPreviewProps {
  clip: PlaudClip;
  label: string;
}

function isPlayableAudioMime(mimetype: string): boolean {
  return PLAYABLE_AUDIO_MIMES.has(String(mimetype || '').toLowerCase());
}

function isPlaybackReady(clip: PlaudClip): boolean {
  return clip.playbackReady ?? READY_STATUSES.has(clip.status);
}

export function PlaudClipAudioPreview({
  clip,
  label,
}: PlaudClipAudioPreviewProps): JSX.Element {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    setLoadState('idle');
    setObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [clip.clipId]);

  if (!isPlayableAudioMime(clip.mimetype)) {
    return (
      <PreviewWrap>
        <PreviewStatus $tone="error">
          <AlertCircle size={14} aria-hidden="true" />
          <span>Playback unavailable for this format.</span>
        </PreviewStatus>
      </PreviewWrap>
    );
  }

  if (!isPlaybackReady(clip)) {
    return (
      <PreviewWrap>
        <PreviewStatus $tone="muted">
          <Loader2 size={14} aria-hidden="true" />
          <span>Audio is still processing.</span>
        </PreviewStatus>
      </PreviewWrap>
    );
  }

  const loadAudio = async () => {
    if (objectUrl || loadState === 'loading') return;
    setLoadState('loading');
    try {
      const blob = await fetchClipAudioBlob(clip.clipId);
      const nextUrl = URL.createObjectURL(blob);
      if (!mountedRef.current) {
        URL.revokeObjectURL(nextUrl);
        return;
      }
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      setLoadState('ready');
    } catch {
      if (mountedRef.current) setLoadState('error');
    }
  };

  const statusText = loadState === 'loading'
    ? 'Loading audio...'
    : 'Playable recording';

  return (
    <PreviewWrap>
      <PreviewStatus $tone={loadState === 'error' ? 'error' : undefined}>
        {loadState === 'error'
          ? <AlertCircle size={14} aria-hidden="true" />
          : <Headphones size={14} aria-hidden="true" />}
        <span>{loadState === 'error' ? 'Audio could not be loaded. Refresh and try again.' : statusText}</span>
      </PreviewStatus>

      {objectUrl ? (
        <AudioPlayer
          controls
          preload="metadata"
          src={objectUrl}
          aria-label={`Audio preview for ${label}`}
        />
      ) : (
        <LoadButton
          type="button"
          onClick={loadAudio}
          disabled={loadState === 'loading'}
          aria-label={`Load audio preview for ${label}`}
        >
          {loadState === 'loading' ? <Loader2 size={16} aria-hidden="true" /> : <Headphones size={16} aria-hidden="true" />}
          {loadState === 'loading' ? 'Loading audio...' : 'Load audio preview'}
        </LoadButton>
      )}
    </PreviewWrap>
  );
}

export default PlaudClipAudioPreview;
