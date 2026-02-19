import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Youtube, Bell, ListVideo, ExternalLink } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface YouTubeCTAProps {
  videoId: string;
  strategy: string;
  youtubeVideoId: string;
  youtubePlaylistUrl?: string;
}

/**
 * YouTubeCTA -- renders contextual call-to-action buttons for YouTube
 * content. Tracks outbound clicks via the analytics endpoint.
 */
const YouTubeCTA: React.FC<YouTubeCTAProps> = ({
  videoId,
  strategy,
  youtubeVideoId,
  youtubePlaylistUrl,
}) => {
  const trackClick = useCallback(
    async (destination: string) => {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/api/v2/videos/${videoId}/outbound-click`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ destination }),
        });
      } catch {
        // fire-and-forget analytics
      }
    },
    [videoId],
  );

  if (strategy === 'none' || !strategy) return null;

  return (
    <CTARow>
      {(strategy === 'watch_on_youtube' || strategy === 'all') && (
        <CTALink
          href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick('youtube_watch')}
        >
          <Youtube size={18} />
          Watch on YouTube
          <ExternalLink size={14} />
        </CTALink>
      )}

      {(strategy === 'subscribe' || strategy === 'all') && (
        <CTALink
          href={`https://www.youtube.com/channel/${youtubeVideoId}?sub_confirmation=1`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick('youtube_subscribe')}
          $variant="subscribe"
        >
          <Bell size={18} />
          Subscribe
        </CTALink>
      )}

      {(strategy === 'playlist_cta' || strategy === 'all') && youtubePlaylistUrl && (
        <CTALink
          href={youtubePlaylistUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick('youtube_playlist')}
          $variant="playlist"
        >
          <ListVideo size={18} />
          View Playlist
          <ExternalLink size={14} />
        </CTALink>
      )}
    </CTARow>
  );
};

/* ========== Styled Components ========== */

const CTARow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 430px) {
    flex-direction: column;
  }
`;

const CTALink = styled.a<{ $variant?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  background: ${({ $variant }) =>
    $variant === 'subscribe'
      ? 'linear-gradient(45deg, #ff0000, #cc0000)'
      : $variant === 'playlist'
        ? 'rgba(120, 81, 169, 0.25)'
        : 'rgba(255, 0, 0, 0.12)'};

  color: ${({ $variant }) =>
    $variant === 'subscribe'
      ? '#ffffff'
      : $variant === 'playlist'
        ? '#b794f4'
        : '#ff4444'};

  border: 1px solid
    ${({ $variant }) =>
      $variant === 'subscribe'
        ? 'transparent'
        : $variant === 'playlist'
          ? 'rgba(120, 81, 169, 0.4)'
          : 'rgba(255, 0, 0, 0.25)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
`;

export default YouTubeCTA;
