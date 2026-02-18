import React from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

interface VideoData {
  id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  video_type: 'upload' | 'youtube' | 'vimeo';
  video_id?: string;
  video_url?: string;
  phases?: number[];
  description?: string;
  primary_muscle?: string;
  equipment?: string;
}

interface VideoPlayerModalProps {
  video: VideoData;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const renderPlayer = () => {
    if (video.video_type === 'youtube' && video.video_id) {
      return (
        <YouTubeEmbed
          src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    if (video.video_type === 'upload' && (video.video_url || video.video_id)) {
      const src = video.video_url || `/uploads/videos/${video.video_id}`;
      return (
        <HTML5Video controls autoPlay>
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </HTML5Video>
      );
    }
    // Fallback — try YouTube ID pattern (11 chars)
    if (video.video_id && /^[a-zA-Z0-9_-]{11}$/.test(video.video_id)) {
      return (
        <YouTubeEmbed
          src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    return <NoVideoMsg>No video source available</NoVideoMsg>;
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>{video.title}</Title>
          <CloseButton onClick={onClose} aria-label="Close video">
            <X size={24} />
          </CloseButton>
        </Header>

        <PlayerContainer>
          {renderPlayer()}
        </PlayerContainer>

        <Details>
          {video.description && (
            <DetailSection>
              <DetailLabel>Description</DetailLabel>
              <DetailText>{video.description}</DetailText>
            </DetailSection>
          )}
          <MetaRow>
            {video.primary_muscle && (
              <MetaBadge>{video.primary_muscle.replace(/_/g, ' ')}</MetaBadge>
            )}
            {video.equipment && (
              <MetaBadge>{video.equipment.replace(/_/g, ' ')}</MetaBadge>
            )}
            {video.phases && video.phases.length > 0 && video.phases.map(phase => (
              <PhaseBadge key={phase}>Phase {phase}</PhaseBadge>
            ))}
          </MetaRow>
        </Details>
      </Modal>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Modal = styled.div`
  background: #0a0e1a;
  border: 1px solid rgba(0, 206, 209, 0.2);
  border-radius: 16px;
  width: 95%;
  max-width: 1200px;
  max-height: 95vh;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 206, 209, 0.2);
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #B8B8B8;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  &:hover { color: #00CED1; }
`;

const PlayerContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
`;

const YouTubeEmbed = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const HTML5Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const NoVideoMsg = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #B8B8B8;
  font-size: 18px;
`;

const Details = styled.div`
  padding: 20px 24px;
  border-top: 1px solid rgba(0, 206, 209, 0.2);
`;

const DetailSection = styled.div`
  margin-bottom: 16px;
`;

const DetailLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #B8B8B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const DetailText = styled.p`
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaBadge = styled.span`
  background: rgba(0, 206, 209, 0.1);
  border: 1px solid rgba(0, 206, 209, 0.3);
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #00CED1;
  text-transform: capitalize;
`;

const PhaseBadge = styled.span`
  background: rgba(157, 78, 221, 0.2);
  border: 1px solid #9D4EDD;
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #9D4EDD;
  text-transform: uppercase;
`;

export default VideoPlayerModal;
