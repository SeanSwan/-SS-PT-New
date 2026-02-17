import React from 'react';
import styled from 'styled-components';
import GlowButton from '../../ui/GlowButton';
import { Palette, Music, Video } from 'lucide-react';

const SectionContainer = styled.div``;

const SectionTitle = styled.h4`
  font-size: 2rem;
  font-weight: 600;
  color: white;
  margin: 0 0 16px;
`;

const SharePanel = styled.div`
  padding: 24px;
  margin-bottom: 24px;
  background: rgba(29, 31, 43, 0.8);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const ShareTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const ShareDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 16px;
  line-height: 1.6;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const FeaturedTitle = styled.h5`
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0 0 16px;
`;

const CreationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const CreationCard = styled.div`
  border-radius: 12px;
  overflow: hidden;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

const CreationImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
`;

const CreationContent = styled.div`
  padding: 16px;
`;

const CreationTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const CreationMeta = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0;
`;

const CreationDesc = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 8px 0 0;
`;

const CenterRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
`;

const CreativeHubSection: React.FC = () => {
  return (
    <SectionContainer>
      <SectionTitle>Creative Expression Hub</SectionTitle>

      <SharePanel>
        <ShareTitle>Share Your Creative Journey</ShareTitle>
        <ShareDescription>
          Express yourself through art, dance, and music. Share your creations with the community and get inspired by others.
        </ShareDescription>
        <ButtonRow>
          <GlowButton variant="primary" startIcon={<Palette size={18} />}>
            Share Artwork
          </GlowButton>
          <GlowButton variant="secondary" startIcon={<Video size={18} />}>
            Upload Dance Video
          </GlowButton>
          <GlowButton variant="info" startIcon={<Music size={18} />}>
            Share Music
          </GlowButton>
        </ButtonRow>
      </SharePanel>

      <FeaturedTitle>Featured Creations</FeaturedTitle>

      <CreationsGrid>
        <CreationCard>
          <CreationImage
            src="https://via.placeholder.com/400x200?text=Dance+Video"
            alt="Dance Video"
          />
          <CreationContent>
            <CreationTitle>Contemporary Dance</CreationTitle>
            <CreationMeta>By Sarah J. • 3 days ago</CreationMeta>
            <CreationDesc>Expressing emotions through movement and flow.</CreationDesc>
          </CreationContent>
        </CreationCard>

        <CreationCard>
          <CreationImage
            src="https://via.placeholder.com/400x200?text=Artwork"
            alt="Artwork"
          />
          <CreationContent>
            <CreationTitle>Abstract Painting</CreationTitle>
            <CreationMeta>By Michael T. • 1 week ago</CreationMeta>
            <CreationDesc>Inspired by the energy of morning workouts.</CreationDesc>
          </CreationContent>
        </CreationCard>

        <CreationCard>
          <CreationImage
            src="https://via.placeholder.com/400x200?text=Music+Track"
            alt="Music Track"
          />
          <CreationContent>
            <CreationTitle>Workout Rhythm</CreationTitle>
            <CreationMeta>By Jessica K. • 2 weeks ago</CreationMeta>
            <CreationDesc>A motivational beat to keep you moving.</CreationDesc>
          </CreationContent>
        </CreationCard>
      </CreationsGrid>

      <CenterRow>
        <GlowButton variant="secondary">
          View All Creations
        </GlowButton>
      </CenterRow>
    </SectionContainer>
  );
};

export default CreativeHubSection;
