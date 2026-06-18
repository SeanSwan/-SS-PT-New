import React, { memo, useMemo, useState } from 'react';
import { ExternalLink, PlayCircle, Video } from 'lucide-react';
import {
  VideoFallbackLink,
  VideoMediaFrame,
  VideoPlayBadge,
  VideoPreviewHeader,
  VideoPreviewMeta,
  VideoPreviewShell,
  VideoPreviewTitle,
  VideoStageButton,
} from './TeachModeVideoPreview.styles';

interface TeachModeVideoPreviewProps {
  exerciseName: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  sourceLabel?: string;
}

function youtubeEmbedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function isDirectVideo(rawUrl: string): boolean {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(rawUrl);
}

const TeachModeVideoPreview: React.FC<TeachModeVideoPreviewProps> = ({
  exerciseName,
  videoUrl,
  thumbnailUrl = null,
  sourceLabel = 'Exercise video',
}) => {
  const [open, setOpen] = useState(false);
  const embedUrl = useMemo(() => youtubeEmbedUrl(videoUrl), [videoUrl]);
  const directVideo = useMemo(() => isDirectVideo(videoUrl), [videoUrl]);
  const title = `${exerciseName} workout video`;

  return (
    <VideoPreviewShell aria-label={`${title} preview`}>
      <VideoPreviewHeader>
        <VideoPreviewTitle>
          <Video size={15} aria-hidden="true" />
          Workout Video
        </VideoPreviewTitle>
        <VideoPreviewMeta>{sourceLabel}</VideoPreviewMeta>
      </VideoPreviewHeader>

      {!open ? (
        <VideoStageButton
          type="button"
          aria-label={`Play ${title}`}
          onClick={() => setOpen(true)}
          $poster={thumbnailUrl}
        >
          <VideoPlayBadge>
            <PlayCircle size={26} aria-hidden="true" />
          </VideoPlayBadge>
        </VideoStageButton>
      ) : (
        <>
          <VideoMediaFrame>
            {directVideo ? (
              <video controls preload="metadata" poster={thumbnailUrl || undefined} aria-label={title}>
                <source src={videoUrl} />
              </video>
            ) : (
              <iframe
                src={embedUrl || videoUrl}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            )}
          </VideoMediaFrame>
          {!directVideo && !embedUrl && (
            <VideoFallbackLink href={videoUrl} target="_blank" rel="noreferrer">
              Open video source <ExternalLink size={14} aria-hidden="true" />
            </VideoFallbackLink>
          )}
        </>
      )}
    </VideoPreviewShell>
  );
};

export default memo(TeachModeVideoPreview);
