import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Play } from 'lucide-react';

interface LazyYouTubeEmbedProps {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
}

/**
 * LazyYouTubeEmbed -- facade pattern for YouTube videos.
 * Renders a static thumbnail + play button. The actual YouTube
 * iframe is only loaded after the user clicks, keeping LCP fast.
 */
const LazyYouTubeEmbed: React.FC<LazyYouTubeEmbedProps> = ({
  videoId,
  title,
  thumbnailUrl,
}) => {
  const [activated, setActivated] = useState(false);

  const thumb =
    thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const handlePlay = useCallback(() => {
    setActivated(true);
  }, []);

  if (activated) {
    return (
      <IframeWrapper>
        <StyledIframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </IframeWrapper>
    );
  }

  return (
    <FacadeWrapper onClick={handlePlay}>
      <ThumbnailImage src={thumb} alt={`Thumbnail for ${title}`} loading="lazy" />
      <Overlay />
      <PlayButton
        type="button"
        aria-label={`Play video: ${title}`}
      >
        <PlayIconCircle>
          <Play size={28} fill="white" strokeWidth={0} />
        </PlayIconCircle>
      </PlayButton>
    </FacadeWrapper>
  );
};

/* ========== Animations ========== */

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
`;

/* ========== Styled Components ========== */

const IframeWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background: #000;
  border-radius: 12px;
  overflow: hidden;
`;

const StyledIframe = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
`;

const FacadeWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;

  &:hover > button {
    transform: translate(-50%, -50%) scale(1.1);
  }
`;

const ThumbnailImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 40%,
    rgba(0, 0, 0, 0.6) 100%
  );
`;

const PlayButton = styled.button`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  z-index: 2;
  min-width: 72px;
  min-height: 72px;
  transition: transform 0.2s ease;
`;

const PlayIconCircle = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 26, 0.65);
  backdrop-filter: blur(12px);
  border: 2px solid rgba(0, 255, 255, 0.4);
  animation: ${pulseGlow} 2.5s ease-in-out infinite;
  padding-left: 4px; /* optical center for play icon */

  @media (max-width: 430px) {
    width: 56px;
    height: 56px;
  }
`;

export default LazyYouTubeEmbed;
