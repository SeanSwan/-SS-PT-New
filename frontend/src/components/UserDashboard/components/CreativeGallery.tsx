import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Upload, Video, Music, Plus } from 'lucide-react';

const GalleryContainer = styled(motion.div)`
  background: ${({ theme }) => theme.gradients?.card || 'rgba(255,255,255,0.05)'};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
`;

const GalleryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const GalleryTitle = styled.h3`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UploadButton = styled.button`
  background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #00ffff, #7851a9)'};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

const MediaItem = styled(motion.div)`
  aspect-ratio: 1;
  border-radius: 12px;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.1)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.2)'};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UploadPlaceholder = styled(motion.div)`
  aspect-ratio: 1;
  border-radius: 12px;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 2px dashed ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.3)'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};

  &:hover {
    background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.1)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#00ffff'};
    color: ${({ theme }) => theme.colors?.primary || '#00ffff'};
    transform: translateY(-2px);
  }
`;

const MediaOverlay = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  padding: 0.25rem;
  color: white;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const CategoryTags = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const CategoryTag = styled.button<{ $active?: boolean }>`
  padding: 0.25rem 0.75rem;
  background: ${({ $active, theme }) => 
    $active 
      ? theme.colors?.primary || '#00ffff'
      : theme.background?.elevated || 'rgba(255,255,255,0.1)'
  };
  color: ${({ $active, theme }) => 
    $active 
      ? '#000' 
      : theme.text?.secondary || 'rgba(255,255,255,0.7)'
  };
  border: none;
  border-radius: 16px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary || '#00ffff'};
    color: #000;
  }
`;

// Mock creative content
const mockCreativeContent = [
  { type: 'video', category: 'Dancing', thumbnail: 'https://picsum.photos/300/300?random=1' },
  { type: 'video', category: 'Singing', thumbnail: 'https://picsum.photos/300/300?random=2' },
  { type: 'video', category: 'Workout', thumbnail: 'https://picsum.photos/300/300?random=3' },
  { type: 'video', category: 'Yoga', thumbnail: 'https://picsum.photos/300/300?random=4' },
  { type: 'video', category: 'Dancing', thumbnail: 'https://picsum.photos/300/300?random=5' },
  { type: 'video', category: 'Motivation', thumbnail: 'https://picsum.photos/300/300?random=6' }
];

const categories = ['All', 'Dancing', 'Singing', 'Workout', 'Yoga', 'Motivation'];

/**
 * Optimized Creative Gallery Component
 * Displays user's creative content like dance videos, workout clips, etc.
 */
const CreativeGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = React.useState('All');
  
  const filteredContent = React.useMemo(() => {
    if (activeCategory === 'All') return mockCreativeContent;
    return mockCreativeContent.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  const handleUpload = () => {
    console.log('Upload creative content');
  };

  return (
    <GalleryContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GalleryHeader>
        <GalleryTitle>
          <Music size={24} />
          Creative Expression
        </GalleryTitle>
        <UploadButton onClick={handleUpload}>
          <Upload size={16} />
          Share Video
        </UploadButton>
      </GalleryHeader>

      <p style={{ 
        color: 'rgba(255,255,255,0.7)', 
        marginBottom: '1rem',
        fontSize: '0.9rem'
      }}>
        ✨ Share your dance moves, singing, workout creativity & positive energy!
      </p>

      <CategoryTags>
        {categories.map(category => (
          <CategoryTag
            key={category}
            $active={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          >
            #{category}
          </CategoryTag>
        ))}
      </CategoryTags>

      <MediaGrid>
        <UploadPlaceholder onClick={handleUpload}>
          <Video size={32} />
          <span style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Share Creative Video
          </span>
        </UploadPlaceholder>

        {filteredContent.map((item, index) => (
          <MediaItem
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <img 
              src={item.thumbnail} 
              alt={`Creative ${item.category} content`}
            />
            <MediaOverlay>
              <Video size={12} />
              {item.category}
            </MediaOverlay>
          </MediaItem>
        ))}
      </MediaGrid>
    </GalleryContainer>
  );
};

export default React.memo(CreativeGallery);
