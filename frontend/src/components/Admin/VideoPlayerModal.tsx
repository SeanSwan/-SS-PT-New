import React from 'react';
import styled from 'styled-components';
import { X, Play } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  video_type: 'upload' | 'youtube' | 'vimeo';
  phases?: number[];
}

interface VideoPlayerModalProps {
  video: Video;
  onClose: () => void;
}

/**
 * Full-screen video player modal with chapters and exercise details
 *
 * Features:
 * - HLS video playback
 * - YouTube embed support
 * - Chapter navigation
 * - Exercise details sidebar
 * - Form cues overlay
 * - Analytics tracking
 *
 * TODO: Implement full video player with video.js or react-player
 */
const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>{video.title}</Title>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>

        <PlayerContainer>
          <VideoPlaceholder>
            <PlayIcon>
              <Play size={64} />
            </PlayIcon>
            <PlaceholderText>Video Player - Coming Soon!</PlaceholderText>
            <PlaceholderSubtext>
              {video.video_type === 'youtube' ? 'YouTube Video' : 'Uploaded Video'}
              <br />
              Duration: {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}
            </PlaceholderSubtext>
          </VideoPlaceholder>
        </PlayerContainer>

        {video.phases && video.phases.length > 0 && (
          <Details>
            <DetailSection>
              <DetailLabel>NASM Phases:</DetailLabel>
              <PhaseBadges>
                {video.phases.map(phase => (
                  <PhaseBadge key={phase}>Phase {phase}</PhaseBadge>
                ))}
              </PhaseBadges>
            </DetailSection>
          </Details>
        )}
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
  background: var(--dark-bg, #0a0e1a);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 16px;
  width: 95%;
  max-width: 1200px;
  max-height: 95vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #B8B8B8);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: var(--primary-cyan, #00CED1);
  }
`;

const PlayerContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: #000000;
`;

const VideoPlaceholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #B8B8B8);
`;

const PlayIcon = styled.div`
  color: var(--primary-cyan, #00CED1);
  opacity: 0.5;
  margin-bottom: 16px;
`;

const PlaceholderText = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
  margin-bottom: 8px;
`;

const PlaceholderSubtext = styled.div`
  font-size: 14px;
  color: var(--text-secondary, #B8B8B8);
  text-align: center;
  line-height: 1.6;
`;

const Details = styled.div`
  padding: 24px;
  border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const DetailSection = styled.div`
  margin-bottom: 16px;
`;

const DetailLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #B8B8B8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const PhaseBadges = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const PhaseBadge = styled.span`
  background: var(--glass-bg, rgba(157, 78, 221, 0.2));
  border: 1px solid var(--accent-purple, #9D4EDD);
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-purple, #9D4EDD);
  text-transform: uppercase;
`;

export default VideoPlayerModal;
