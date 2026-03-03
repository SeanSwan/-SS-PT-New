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
import { useProfile } from '../../../hooks/profile/useProfile';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';

// Professional styled components
const GalleryContainer = styled(motion.div)`
  background: var(--bg-elevated);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  padding: 2rem;
  color: var(--text-primary);
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
  color: var(--text-primary);
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
  background: var(--bg-base);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;

  &::placeholder {
    color: var(--text-muted);
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary) 20%, transparent);
  }
`;

const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ $active }) =>
    $active
      ? 'var(--accent-primary)'
      : 'var(--bg-elevated)'
  };
  color: ${({ $active }) =>
    $active
      ? 'white'
      : 'var(--text-secondary)'
  };
  border: 1px solid ${({ $active }) =>
    $active
      ? 'var(--accent-primary)'
      : 'var(--border-soft)'
  };
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--accent-primary);
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
  background: var(--bg-surface, var(--bg-elevated));
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  aspect-ratio: 1;

  &:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--accent-primary) 60%, transparent);
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
  border: 2px dashed var(--border-soft);
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
  background: var(--bg-surface, var(--bg-elevated));

  &:hover {
    background: var(--bg-elevated);
    border-color: var(--accent-primary);
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
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
`;

const UploadSubtext = styled.p`
  color: var(--text-secondary);
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

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-muted);

  h3 {
    margin: 1rem 0 0.5rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }
`;

// Photos are now loaded from useProfile hook

const categories = ['All', 'Fitness', 'Nutrition', 'Dance', 'Progress', 'Community'];

interface PhotoItem {
  id: string;
  url: string;
  title: string;
  likes: number;
  comments: number;
  createdAt: string;
}

const PhotoGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { posts } = useProfile();
  const { createPost } = useSocialFeed();

  const photos = React.useMemo(() => {
    if (!posts || posts.length === 0) return [];
    return posts
      .filter(post => post.mediaUrl && !post.mediaUrl.match(/\.(mp4|webm|mov)$/i))
      .map(post => ({
        id: post.id,
        url: post.mediaUrl!,
        title: post.content?.substring(0, 30) || 'Photo',
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
        createdAt: post.createdAt,
      }));
  }, [posts]);

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      await createPost({ content: 'Shared a photo', type: 'general' });
    } catch (err) {
      console.error('Error uploading photo:', err);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const handlePhotoClick = (photo: PhotoItem) => {
    setSelectedPhoto(photo);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
  };

  const handleShare = async (photoUrl: string) => {
    const shareData = { title: 'Check out this photo on SwanStudios', url: photoUrl };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(photoUrl);
      } catch { /* fallback */ }
    }
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

        {filteredPhotos.length === 0 && searchTerm === '' ? (
          <EmptyState>
            <ImageIcon size={48} />
            <h3>No photos yet</h3>
            <p>Upload photos or share moments with the community</p>
          </EmptyState>
        ) : (
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
                  <PhotoImage $image={photo.url} />

                  <PhotoActions>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        // Like handled via social feed
                      }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Heart size={16} />
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(photo.url);
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
                        <Heart size={16} />
                        {photo.likes}
                      </StatItem>
                      <StatItem>
                        <Eye size={16} />
                        {photo.comments}
                      </StatItem>
                    </PhotoStats>
                  </PhotoOverlay>
                </PhotoCard>
              ))}
            </AnimatePresence>
          </PhotoGrid>
        )}

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
              src={selectedPhoto.url}
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