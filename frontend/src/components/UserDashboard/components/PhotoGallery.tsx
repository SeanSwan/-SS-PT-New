import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Upload, Plus, Image as ImageIcon } from 'lucide-react';

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
  margin-bottom: 1rem;
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

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
`;

const PhotoItem = styled(motion.div)`
  aspect-ratio: 1;
  border-radius: 12px;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.1)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.2)'};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  img {
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

// Mock photos
const mockPhotos = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  url: `https://picsum.photos/300/300?random=${index + 10}`,
  caption: `Fitness photo ${index + 1}`
}));

/**
 * Optimized Photo Gallery Component
 * Displays user's photo collection
 */
const PhotoGallery: React.FC = () => {
  const [photos] = React.useState(mockPhotos);

  const handleUpload = () => {
    console.log('Upload photo');
  };

  return (
    <GalleryContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GalleryHeader>
        <GalleryTitle>
          <ImageIcon size={24} />
          Photo Gallery
        </GalleryTitle>
        <UploadButton onClick={handleUpload}>
          <Upload size={16} />
          Upload Photo
        </UploadButton>
      </GalleryHeader>

      <PhotoGrid>
        <UploadPlaceholder onClick={handleUpload}>
          <Plus size={32} />
          <span style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Add Photo
          </span>
        </UploadPlaceholder>

        {photos.map((photo, index) => (
          <PhotoItem
            key={photo.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <img src={photo.url} alt={photo.caption} />
          </PhotoItem>
        ))}
      </PhotoGrid>
    </GalleryContainer>
  );
};

export default React.memo(PhotoGallery);
