import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

const GalleryContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1.5rem;
`;

const BadgeCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  }
`;

const BadgeImage = styled.img`
  width: 80px;
  height: 80px;
  margin-bottom: 1rem;
  object-fit: contain;
`;

const BadgeName = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: white;
`;

const BadgeDescription = styled.p`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
`;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

const AchievementGallery: React.FC<{ achievements: any[] }> = ({ achievements }) => {
  if (!achievements || achievements.length === 0) {
    return <p>No achievements unlocked yet. Keep going!</p>;
  }

  return (
    <GalleryContainer variants={{ visible: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="visible">
      {achievements.map((ach, index) => (
        <BadgeCard key={index} variants={itemVariants}>
          {ach.imageUrl ? <BadgeImage src={ach.imageUrl} alt={ach.name} /> : <div style={{ width: 80, height: 80, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Award size={48} color="#fbbf24" /></div>}
          <BadgeName>{ach.name}</BadgeName>
          <BadgeDescription>{ach.description}</BadgeDescription>
        </BadgeCard>
      ))}
    </GalleryContainer>
  );
};

export default AchievementGallery;