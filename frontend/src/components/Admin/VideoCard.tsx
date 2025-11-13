import React from 'react';
import styled from 'styled-components';
import { Play, Clock, Eye, Edit, Trash2, Youtube, Upload, Video } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  views: number;
  phases: number[];
  equipment?: string;
  primary_muscle?: string;
  video_type: 'upload' | 'youtube' | 'vimeo';
  created_at: string;
}

interface VideoCardProps {
  video: Video;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onDelete: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, viewMode, onClick, onDelete }) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number): string => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  const getPhaseLabel = (phase: number): string => {
    const phaseLabels: Record<number, string> = {
      1: 'Phase 1',
      2: 'Phase 2',
      3: 'Phase 3',
      4: 'Phase 4',
      5: 'Phase 5',
    };
    return phaseLabels[phase] || `Phase ${phase}`;
  };

  const getVideoTypeIcon = () => {
    switch (video.video_type) {
      case 'youtube':
        return <Youtube size={16} />;
      case 'upload':
        return <Upload size={16} />;
      case 'vimeo':
        return <Video size={16} />;
      default:
        return <Video size={16} />;
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent video click
    onDelete();
  };

  if (viewMode === 'list') {
    return (
      <ListCard onClick={onClick}>
        <ListThumbnailContainer>
          <ListThumbnail src={video.thumbnail_url} alt={video.title} />
          <PlayOverlay>
            <Play size={32} />
          </PlayOverlay>
          <DurationBadge>
            <Clock size={12} />
            {formatDuration(video.duration_seconds)}
          </DurationBadge>
        </ListThumbnailContainer>

        <ListContent>
          <ListHeader>
            <Title>{video.title}</Title>
            <VideoTypeIcon>{getVideoTypeIcon()}</VideoTypeIcon>
          </ListHeader>

          <MetaInfo>
            {video.primary_muscle && <MetaItem>{video.primary_muscle}</MetaItem>}
            {video.equipment && <MetaItem>{video.equipment}</MetaItem>}
            {video.phases.length > 0 && (
              <MetaItem>
                {video.phases.map(p => getPhaseLabel(p)).join(', ')}
              </MetaItem>
            )}
          </MetaInfo>

          <Stats>
            <StatItem>
              <Eye size={14} />
              {formatViews(video.views)} views
            </StatItem>
            <StatItem>
              {new Date(video.created_at).toLocaleDateString()}
            </StatItem>
          </Stats>
        </ListContent>

        <ListActions>
          <ActionButton onClick={handleDelete} variant="danger">
            <Trash2 size={18} />
          </ActionButton>
        </ListActions>
      </ListCard>
    );
  }

  // Grid view (default)
  return (
    <GridCard onClick={onClick}>
      <ThumbnailContainer>
        <Thumbnail src={video.thumbnail_url} alt={video.title} />
        <PlayOverlay>
          <Play size={48} />
        </PlayOverlay>
        <DurationBadge>
          <Clock size={12} />
          {formatDuration(video.duration_seconds)}
        </DurationBadge>
        <VideoTypeBadge>
          {getVideoTypeIcon()}
        </VideoTypeBadge>
      </ThumbnailContainer>

      <CardContent>
        <Title>{video.title}</Title>

        {video.phases.length > 0 && (
          <PhaseBadges>
            {video.phases.map(phase => (
              <PhaseBadge key={phase}>{getPhaseLabel(phase)}</PhaseBadge>
            ))}
          </PhaseBadges>
        )}

        <MetaInfo>
          {video.primary_muscle && <MetaItem>{video.primary_muscle}</MetaItem>}
          {video.equipment && <MetaItem>{video.equipment}</MetaItem>}
        </MetaInfo>

        <Footer>
          <Stats>
            <StatItem>
              <Eye size={14} />
              {formatViews(video.views)}
            </StatItem>
          </Stats>

          <Actions>
            <ActionButton onClick={handleDelete} variant="danger">
              <Trash2 size={16} />
            </ActionButton>
          </Actions>
        </Footer>
      </CardContent>
    </GridCard>
  );
};

// Styled Components
const GridCard = styled.div`
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  backdrop-filter: blur(10px);

  &:hover {
    transform: translateY(-4px);
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const ListCard = styled.div`
  display: flex;
  gap: 16px;
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.2s;
  backdrop-filter: blur(10px);

  &:hover {
    border-color: var(--primary-cyan, #00CED1);
  }

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ThumbnailContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: var(--dark-bg, #0a0e1a);
  overflow: hidden;
`;

const ListThumbnailContainer = styled.div`
  position: relative;
  width: 240px;
  height: 135px; /* 16:9 aspect ratio */
  flex-shrink: 0;
  background: var(--dark-bg, #0a0e1a);
  border-radius: 8px;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    padding-top: 56.25%;
  }
`;

const Thumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ListThumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlayOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.9);
  opacity: 0;
  transition: opacity 0.2s;

  ${GridCard}:hover &,
  ${ListCard}:hover & {
    opacity: 1;
  }
`;

const DurationBadge = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.8);
  color: #FFFFFF;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
`;

const VideoTypeBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.8);
  color: #FFFFFF;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
`;

const VideoTypeIcon = styled.div`
  display: flex;
  align-items: center;
  color: var(--text-secondary, #B8B8B8);
`;

const CardContent = styled.div`
  padding: 16px;
`;

const ListContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PhaseBadges = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const PhaseBadge = styled.span`
  background: var(--glass-bg, rgba(157, 78, 221, 0.2));
  border: 1px solid var(--accent-purple, #9D4EDD);
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-purple, #9D4EDD);
  text-transform: uppercase;
`;

const MetaInfo = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-secondary, #B8B8B8);
  margin-bottom: 8px;
`;

const MetaItem = styled.span`
  &:not(:last-child)::after {
    content: '•';
    margin-left: 8px;
    color: var(--glass-border, rgba(0, 206, 209, 0.2));
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const Stats = styled.div`
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary, #B8B8B8);
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const ListActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: flex-end;
  }
`;

const ActionButton = styled.button<{ variant?: 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.variant === 'danger' ? 'rgba(255, 68, 68, 0.1)' : 'rgba(0, 206, 209, 0.1)'};
  border: 1px solid ${props => props.variant === 'danger' ? 'var(--error, #FF4444)' : 'var(--primary-cyan, #00CED1)'};
  border-radius: 6px;
  padding: 8px;
  color: ${props => props.variant === 'danger' ? 'var(--error, #FF4444)' : 'var(--primary-cyan, #00CED1)'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.variant === 'danger' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(0, 206, 209, 0.2)'};
    transform: scale(1.05);
  }
`;

export default VideoCard;
