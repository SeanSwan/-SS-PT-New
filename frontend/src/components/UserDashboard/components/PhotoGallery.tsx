/**
 * SwanStudios Photo Gallery Component
 * ==================================
 * 
 * Professional photo gallery with upload functionality and filtering
 */

import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Upload,
  Image as ImageIcon,
  Heart,
  Eye,
  Download,
  Share2,
  Filter,
  Search,
  X
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

const SearchAndFilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.5)'};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors?.primary + '20' || 'rgba(59, 130, 246, 0.2)'};
  }
`;

const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
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
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    color: white;
    transform: translateY(-1px);
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

const PhotoCard = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  aspect-ratio: 1;
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${({ theme }) => theme.colors?.primary + '60' || 'rgba(59, 130, 246, 0.6)'};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
`;

const PhotoImage = styled.div<{ $image: string }>`
  width: 100%;
  height: 100%;
  background: url(${props => props.$image});
  background-size: cover;
  background-position: center;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      180deg,
      transparent 0%,
      transparent 60%,
      rgba(0, 0, 0, 0.8) 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  ${PhotoCard}:hover &::before {
    opacity: 1;
  }
`;

const PhotoOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  color: white;
  opacity: 0;
  transform: translateY(100%);
  transition: all 0.3s ease;
  z-index: 2;
  
  ${PhotoCard}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
`;

const PhotoTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  line-height: 1.2;
`;

const PhotoStats = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const PhotoActions = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  ${PhotoCard}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled(motion.button)`
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    transform: scale(1.1);
  }
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
  aspect-ratio: 1;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.02)'};
  
  &:hover {
    background: ${({ theme }) => theme.gradients?.card || 'rgba(255,255,255,0.05)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    transform: translateY(-2px);
  }
`;

const UploadIcon = styled.div`
  width: 60px;
  height: 60px;
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
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
`;

const UploadSubtext = styled.p`
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.4;
`;

const HiddenInput = styled.input`
  display: none;
`;

const PhotoModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 12px;
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 2rem;
  right: 2rem;
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }
`;

// Mock photo data
const mockPhotos = [
  {
    id: 1,
    title: 'Morning Workout Session',
    image: 'https://picsum.photos/400/400?random=1',
    category: 'fitness',
    views: 234,
    likes: 45,
    createdAt: '2 days ago'
  },
  {
    id: 2,
    title: 'Healthy Meal Prep',
    image: 'https://picsum.photos/400/400?random=2',
    category: 'nutrition',
    views: 567,
    likes: 89,
    createdAt: '3 days ago'
  },
  {
    id: 3,
    title: 'Dance Studio Vibes',
    image: 'https://picsum.photos/400/400?random=3',
    category: 'dance',
    views: 432,
    likes: 67,
    createdAt: '5 days ago'
  },
  {
    id: 4,
    title: 'Outdoor Yoga Flow',
    image: 'https://picsum.photos/400/400?random=4',
    category: 'fitness',
    views: 345,
    likes: 78,
    createdAt: '1 week ago'
  },
  {
    id: 5,
    title: 'Progress Photo',
    image: 'https://picsum.photos/400/400?random=5',
    category: 'progress',
    views: 123,
    likes: 34,
    createdAt: '1 week ago'
  },
  {
    id: 6,
    title: 'Team Workout',
    image: 'https://picsum.photos/400/400?random=6',
    category: 'community',
    views: 678,
    likes: 123,
    createdAt: '2 weeks ago'
  }
];

const categories = ['All', 'Fitness', 'Nutrition', 'Dance', 'Progress', 'Community'];

const PhotoGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [photos, setPhotos] = useState(mockPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState<typeof mockPhotos[0] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPhotos = photos.filter(photo => {
    const matchesCategory = activeCategory === 'All' || 
      photo.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a new photo object
      const newPhoto = {
        id: Date.now(),
        title: 'New Upload',
        image: URL.createObjectURL(file),
        category: 'fitness',
        views: 0,
        likes: 0,
        createdAt: 'Just now'
      };
      
      setPhotos(prev => [newPhoto, ...prev]);
    }
  };

  const handlePhotoClick = (photo: typeof mockPhotos[0]) => {
    setSelectedPhoto(photo);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
  };

  const handleLike = (photoId: number) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, likes: photo.likes + 1 }
        : photo
    ));
  };

  return (
    <>
      <GalleryContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GalleryHeader>
          <GalleryTitle>
            <ImageIcon size={24} />
            Photo Gallery
          </GalleryTitle>
          <UploadButton
            onClick={handleUpload}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Upload size={18} />
            Upload Photo
          </UploadButton>
        </GalleryHeader>

        <SearchAndFilterContainer>
          <SearchInput
            type="text"
            placeholder="Search photos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {categories.map((category) => (
            <FilterButton
              key={category}
              $active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Filter size={16} />
              {category}
            </FilterButton>
          ))}
        </SearchAndFilterContainer>

        <PhotoGrid>
          <UploadCard
            onClick={handleUpload}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <UploadIcon>
              <Plus size={24} />
            </UploadIcon>
            <UploadText>Add Photo</UploadText>
            <UploadSubtext>
              Share your fitness journey
            </UploadSubtext>
          </UploadCard>

          <AnimatePresence>
            {filteredPhotos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handlePhotoClick(photo)}
              >
                <PhotoImage $image={photo.image} />
                
                <PhotoActions>
                  <ActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(photo.id);
                    }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Heart size={16} />
                  </ActionButton>
                  <ActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Share photo:', photo.id);
                    }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Share2 size={16} />
                  </ActionButton>
                </PhotoActions>
                
                <PhotoOverlay>
                  <PhotoTitle>{photo.title}</PhotoTitle>
                  <PhotoStats>
                    <StatItem>
                      <Eye size={16} />
                      {photo.views}
                    </StatItem>
                    <StatItem>
                      <Heart size={16} />
                      {photo.likes}
                    </StatItem>
                  </PhotoStats>
                </PhotoOverlay>
              </PhotoCard>
            ))}
          </AnimatePresence>
        </PhotoGrid>

        <HiddenInput
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </GalleryContainer>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <PhotoModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <ModalImage
              src={selectedPhoto.image}
              alt={selectedPhoto.title}
              onClick={(e) => e.stopPropagation()}
            />
            <CloseButton
              onClick={handleCloseModal}
              whileHover={{ scale: 1.1 }}
            >
              <X size={24} />
            </CloseButton>
          </PhotoModal>
        )}
      </AnimatePresence>
    </>
  );
};

export default PhotoGallery;