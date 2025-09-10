/**
 * SwanStudios Creative Gallery Component
 * =====================================
 * 
 * Professional creative content showcase for dance, music, and fitness videos
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Video,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Eye,
  Share2,
  Upload
} from 'lucide-react';

// Professional styled components
const GalleryContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.12)'};
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
`;

const GalleryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const GalleryTitle = styled.h2`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    justify-content: center;
  }
`;

const UploadButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const TagsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const Tag = styled(motion.div)<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  background: ${({ $active, theme }) => 
    $active 
      ? theme.colors?.primary || '#3B82F6'
      : theme.background?.elevated || 'rgba(255,255,255,0.05)'
  };
  color: ${({ $active, theme }) => 
    $active 
      ? 'white'
      : theme.text?.secondary || 'rgba(255,255,255,0.7)'
  };
  border: 1px solid ${({ $active, theme }) => 
    $active 
      ? theme.colors?.primary || '#3B82F6'
      : theme.borders?.subtle || 'rgba(255,255,255,0.1)'
  };
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: white;
    transform: translateY(-1px);
  }
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const VideoCard = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${({ theme }) => theme.colors?.primary + '60' || 'rgba(59, 130, 246, 0.6)'};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
`;

const VideoThumbnail = styled.div<{ $image: string }>`
  height: 200px;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.3),
    rgba(0, 0, 0, 0.1)
  ), url(${props => props.$image});
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PlayButton = styled(motion.div)`
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1a1a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  &:hover {
    background: white;
    transform: scale(1.1);
  }
`;

const VideoTypeTag = styled.div<{ $type: string }>`
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 0.25rem 0.75rem;
  background: ${({ $type }) => {
    switch ($type) {
      case 'dance': return 'linear-gradient(135deg, #FF6B9D, #C44569)';
      case 'music': return 'linear-gradient(135deg, #4ECDC4, #44A08D)';
      case 'workout': return 'linear-gradient(135deg, #FFD93D, #FF6B35)';
      default: return 'linear-gradient(135deg, #667eea, #764ba2)';
    }
  }};
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const VideoInfo = styled.div`
  padding: 1.25rem;
`;

const VideoTitle = styled.h3`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  line-height: 1.3;
`;

const VideoDescription = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0 0 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const VideoStats = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.875rem;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const UploadCard = styled(motion.div)`
  border: 2px dashed ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.2)'};
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 280px;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.02)'};
  
  &:hover {
    background: ${({ theme }) => theme.gradients?.card || 'rgba(255,255,255,0.05)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    transform: translateY(-2px);
  }
`;

const UploadIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: white;
`;

const UploadText = styled.h3`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
`;

const UploadSubtext = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
`;

// Mock video data
const mockVideos = [
  {
    id: 1,
    title: 'Morning Dance Flow',
    description: 'Starting the day with positive energy and movement',
    type: 'dance',
    thumbnail: 'https://picsum.photos/400/300?random=1',
    duration: '3:24',
    views: 1234,
    likes: 89,
    createdAt: '2 days ago'
  },
  {
    id: 2,
    title: 'HIIT Workout Motivation',
    description: 'High-intensity interval training for maximum results',
    type: 'workout',
    thumbnail: 'https://picsum.photos/400/300?random=2',
    duration: '15:30',
    views: 2156,
    likes: 134,
    createdAt: '4 days ago'
  },
  {
    id: 3,
    title: 'Acoustic Wellness Session',
    description: 'Calming music for meditation and relaxation',
    type: 'music',
    thumbnail: 'https://picsum.photos/400/300?random=3',
    duration: '8:45',
    views: 876,
    likes: 67,
    createdAt: '1 week ago'
  },
  {
    id: 4,
    title: 'Freestyle Dance Battle',
    description: 'Showcasing creativity and rhythm in movement',
    type: 'dance',
    thumbnail: 'https://picsum.photos/400/300?random=4',
    duration: '5:12',
    views: 3421,
    likes: 245,
    createdAt: '1 week ago'
  }
];

const tags = ['All', 'Dance', 'Music', 'Workout', 'Motivation', 'Wellness'];

const CreativeGallery: React.FC = () => {
  const [activeTag, setActiveTag] = useState('All');
  const [videos] = useState(mockVideos);

  const filteredVideos = videos.filter(video => 
    activeTag === 'All' || video.type.toLowerCase() === activeTag.toLowerCase()
  );

  const handleUpload = () => {
    console.log('Upload video clicked');
    // TODO: Implement video upload functionality
  };

  const handleVideoPlay = (videoId: number) => {
    console.log('Play video:', videoId);
    // TODO: Implement video player
  };

  return (
    <GalleryContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <GalleryHeader>
        <GalleryTitle>
          <Video size={24} />
          Creative Gallery
        </GalleryTitle>
        <UploadButton
          onClick={handleUpload}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Upload size={18} />
          Upload Video
        </UploadButton>
      </GalleryHeader>

      <TagsContainer>
        {tags.map((tag) => (
          <Tag
            key={tag}
            $active={activeTag === tag}
            onClick={() => setActiveTag(tag)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tag}
          </Tag>
        ))}
      </TagsContainer>

      <GalleryGrid>
        <UploadCard
          onClick={handleUpload}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <UploadIcon>
            <Plus size={32} />
          </UploadIcon>
          <UploadText>Share Your Creativity</UploadText>
          <UploadSubtext>
            Upload your dance moves, workout videos, or musical performances to inspire the community
          </UploadSubtext>
        </UploadCard>

        <AnimatePresence>
          {filteredVideos.map((video, index) => (
            <VideoCard
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => handleVideoPlay(video.id)}
            >
              <VideoThumbnail $image={video.thumbnail}>
                <VideoTypeTag $type={video.type}>
                  {video.type}
                </VideoTypeTag>
                <PlayButton
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play size={24} />
                </PlayButton>
              </VideoThumbnail>
              
              <VideoInfo>
                <VideoTitle>{video.title}</VideoTitle>
                <VideoDescription>{video.description}</VideoDescription>
                
                <VideoStats>
                  <StatItem>
                    <Eye size={16} />
                    {video.views.toLocaleString()}
                  </StatItem>
                  <StatItem>
                    <Heart size={16} />
                    {video.likes}
                  </StatItem>
                  <StatItem>
                    {video.duration}
                  </StatItem>
                </VideoStats>
              </VideoInfo>
            </VideoCard>
          ))}
        </AnimatePresence>
      </GalleryGrid>
    </GalleryContainer>
  );
};

export default CreativeGallery;