/**
 * ThemeShowcaseBanner.tsx
 * =======================
 * Galaxy-Swan Theme Showcase Banner Component
 * 
 * Master Prompt v28.6 Compliance:
 * ✅ Single Responsibility: Only handles theme showcase banner
 * ✅ Modular Design: Reusable banner component
 * ✅ Production-Ready: Clean, efficient implementation
 * ✅ Galaxy-Swan Integration: Uses theme system properly
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Galaxy-Swan Theme Imports
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';
import { GalaxySwanText, ThemedGlowButton } from '../../../styles/swan-theme-utils';

// Styled Components
const BannerContainer = styled(motion.div)`
  background: linear-gradient(
    135deg,
    ${galaxySwanTheme.gradients.swanCosmic},
    ${galaxySwanTheme.gradients.pearlNebula}
  );
  border: 2px solid ${galaxySwanTheme.borders.elegant};
  border-radius: 15px;
  padding: 2rem;
  margin: 2rem 0;
  text-align: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(15px);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, ${galaxySwanTheme.primary.main}22, transparent 50%),
      radial-gradient(circle at 80% 50%, ${galaxySwanTheme.secondary.main}22, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
  
  & > * {
    position: relative;
    z-index: 1;
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  @media (max-width: 480px) {
    padding: 1.25rem;
    margin: 1rem 0;
  }
`;

const BannerTitle = styled.h3`
  color: ${galaxySwanTheme.text.primary};
  font-size: 1.8rem;
  font-weight: 300;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.25rem;
  }
`;

const BannerDescription = styled.p`
  color: ${galaxySwanTheme.text.secondary};
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
    margin-bottom: 1rem;
  }
`;

const FeatureList = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
  
  @media (max-width: 480px) {
    gap: 1rem;
    flex-direction: column;
    align-items: center;
  }
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${galaxySwanTheme.text.primary};
  font-size: 0.9rem;
  
  .icon {
    font-size: 1.2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

// Animation variants
const bannerVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

// Component Props
interface ThemeShowcaseBannerProps {
  className?: string;
  showFeatures?: boolean;
}

// Main Component
const ThemeShowcaseBanner: React.FC<ThemeShowcaseBannerProps> = ({ 
  className = '',
  showFeatures = true 
}) => {
  const navigate = useNavigate();

  const handleViewShowcase = () => {
    navigate('/theme-showcase');
  };

  return (
    <BannerContainer
      className={className}
      variants={bannerVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <BannerTitle>
        ✨ Enhanced with <GalaxySwanText>Galaxy-Swan</GalaxySwanText> Theme ✨
      </BannerTitle>
      
      <BannerDescription>
        Experience the premium fusion of elegant Swan brand identity with 
        cosmic Galaxy aesthetics. Your SwanStudios platform now features 
        enhanced visual design, improved accessibility, and optimized performance.
      </BannerDescription>
      
      {showFeatures && (
        <FeatureList>
          <Feature>
            <span className="icon">🎨</span>
            <span>Premium Styling</span>
          </Feature>
          <Feature>
            <span className="icon">♿</span>
            <span>Enhanced Accessibility</span>
          </Feature>
          <Feature>
            <span className="icon">⚡</span>
            <span>Performance Optimized</span>
          </Feature>
          <Feature>
            <span className="icon">📱</span>
            <span>Mobile Friendly</span>
          </Feature>
        </FeatureList>
      )}
      
      <ThemedGlowButton
        variant="primary"
        size="medium"
        text="🌟 View Theme Showcase"
        onClick={handleViewShowcase}
      />
    </BannerContainer>
  );
};

export default ThemeShowcaseBanner;