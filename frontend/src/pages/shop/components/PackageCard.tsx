/**
 * PackageCard.tsx - Decomposed Package Card Component
 * ================================================================
 * Extracted from monolithic GalaxyThemedStoreFront.tsx
 * 
 * Responsibilities:
 * - Individual package display and styling
 * - Price reveal/hide functionality
 * - Add to cart interaction
 * - Theme-based visual styling
 * - Accessibility features
 * 
 * Performance Optimized:
 * - Memoized to prevent unnecessary re-renders
 * - Stable event handlers
 * - Optimized animations
 */

import React, { memo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import GlowButton from '../../../components/ui/GlowButton';

// Galaxy Theme Constants
const GALAXY_COLORS = {
  deepSpace: '#0a0a0f',
  nebulaPurple: '#1e1e3f',
  cyberCyan: '#00ffff',
  stellarWhite: '#ffffff',
  cosmicPurple: '#7851a9',
  starGold: '#ffd700',
  energyBlue: '#00c8ff',
  plasmaGreen: '#00ff88',
  warningRed: '#ff416c'
};

// Package Interface
interface StoreItem {
  id: number;
  name: string;
  description: string;
  packageType: 'fixed' | 'monthly';
  pricePerSession?: number;
  sessions?: number;
  months?: number;
  sessionsPerWeek?: number;
  totalSessions?: number;
  price?: number;
  totalCost?: number;
  displayPrice: number;
  theme?: string;
  isActive: boolean;
  imageUrl: string | null;
  displayOrder?: number;
  includedFeatures?: string | null;
}

// Component Props Interface
interface PackageCardProps {
  package: StoreItem;
  canViewPrices: boolean;
  canPurchase: boolean;
  isPriceRevealed: boolean;
  isAdding: boolean;
  onTogglePrice: (packageId: number) => void;
  onAddToCart: (pkg: StoreItem) => void;
}

// Utility Functions
const getGalaxyGradient = (theme: string = 'purple') => {
  switch (theme) {
    case "cosmic":  return 'linear-gradient(135deg, rgba(93, 63, 211, 0.4), rgba(0, 255, 255, 0.3), rgba(255, 46, 99, 0.2))';
    case "ruby":    return 'linear-gradient(135deg, rgba(232, 0, 70, 0.4), rgba(253, 0, 159, 0.3), rgba(120, 81, 169, 0.2))';
    case "emerald": return 'linear-gradient(135deg, rgba(0, 232, 176, 0.4), rgba(0, 253, 159, 0.3), rgba(0, 255, 255, 0.2))';
    case "purple":
    default:        return 'linear-gradient(135deg, rgba(120, 0, 245, 0.4), rgba(120, 81, 169, 0.3), rgba(200, 148, 255, 0.2))';
  }
};

// Available movie files in public folder (verified via directory listing)
const AVAILABLE_MOVIES = [
  'fish.mp4',
  'forest.mp4', 
  'Run.mp4',
  'smoke.mp4',
  'swan.mp4',
  'Swans.mp4',
  'Waves.mp4'
];

// Dynamic movie matching utility
const getMatchingMovieFile = (packageName: string): string | null => {
  if (!packageName) return null;
  
  const nameLower = packageName.toLowerCase();
  
  // Direct name matching with priority (using only available files)
  const matchingRules = [
    { keywords: ['silver', 'elite'], movie: 'Swans.mp4' }, // Silver packages get premium Swans video
    { keywords: ['swans', 'multiple', 'platinum', 'premium'], movie: 'Swans.mp4' },
    { keywords: ['swan'], movie: 'swan.mp4' },
    { keywords: ['run', 'running', 'cardio'], movie: 'Run.mp4' },
    { keywords: ['wave', 'water', 'flow'], movie: 'Waves.mp4' },
    { keywords: ['forest', 'nature', 'outdoor'], movie: 'forest.mp4' },
    { keywords: ['smoke', 'intensity', 'transformation'], movie: 'smoke.mp4' },
    { keywords: ['fish', 'aqua', 'marine'], movie: 'fish.mp4' }
  ];
  
  // Find best match based on keywords in package name
  for (const rule of matchingRules) {
    if (rule.keywords.some(keyword => nameLower.includes(keyword))) {
      return `/${rule.movie}`;
    }
  }
  
  // Fallback strategy - use default based on package type or position
  const fallbackMovies = ['Waves.mp4', 'forest.mp4', 'smoke.mp4', 'swan.mp4'];
  const fallbackIndex = Math.abs(packageName.length % fallbackMovies.length);
  return `/${fallbackMovies[fallbackIndex]}`;
};

const formatPrice = (price: number | null | undefined): string => {
  if (typeof price !== 'number' || isNaN(price)) { return '$0'; }
  return price.toLocaleString("en-US", { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
};

// Enhanced function to get package media (video or image)
const getPackageMedia = (imageUrl: string | null, packageName: string): { type: 'video' | 'image'; url: string } => {
  // First try to find a matching movie file
  const movieFile = getMatchingMovieFile(packageName);
  if (movieFile) {
    return { type: 'video', url: movieFile };
  }
  
  // Fallback to provided image or default texture
  return { 
    type: 'image', 
    url: imageUrl || '/marble-texture.png' 
  };
};

const getValueBadge = (pkg: StoreItem): { text: string; isGoodValue: boolean } => {
  if (!pkg.pricePerSession) return { text: '', isGoodValue: false };
  
  if (pkg.pricePerSession <= 142) {
    return { text: 'Best Value', isGoodValue: true };
  } else if (pkg.pricePerSession <= 150) {
    return { text: 'Great Value', isGoodValue: true };
  } else if (pkg.pricePerSession <= 165) {
    return { text: 'Good Value', isGoodValue: false };
  }
  return { text: '', isGoodValue: false };
};

// Keyframe animations
const galacticShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const CosmicPackageCard = styled(motion.div)<{ $theme?: string }>`
  position: relative;
  border-radius: 25px;
  overflow: hidden;
  background: ${props => getGalaxyGradient(props.$theme)};
  border: 2px solid rgba(0, 255, 255, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  height: 100%;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  z-index: 20;
  will-change: transform;
  
  @media (max-width: 768px) {
    min-height: 480px;
    border-radius: 20px;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.05) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(0, 255, 255, 0.7);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), 0 0 25px rgba(0, 255, 255, 0.3);
    z-index: 25;
  }
  
  &:focus {
    outline: 3px solid rgba(0, 255, 255, 0.8);
    outline-offset: 4px;
  }
`;

const CosmicCardMedia = styled.div`
  width: 100%;
  height: 220px;
  position: relative;
  overflow: hidden;
  border-radius: 25px 25px 0 0;
  
  @media (max-width: 768px) {
    height: 180px;
    border-radius: 20px 20px 0 0;
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0) 0%,
      rgba(30, 30, 60, 0.4) 60%,
      rgba(30, 30, 60, 0.8) 100%
    );
    z-index: 2;
  }
`;

// Enhanced media container that supports both video and image
const CosmicCardMediaContent = styled.div<{$theme?: string}>`
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.4s ease;
  
  ${CosmicPackageCard}:hover & {
    transform: scale(1.08);
  }
`;

const CosmicCardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.4s ease;
  
  &::-webkit-media-controls {
    display: none !important;
  }
  
  &::-webkit-media-controls-panel {
    display: none !important;
  }
`;

const CosmicCardImage = styled.div<{$imageUrl?: string | null; $theme?: string}>`
  width: 100%;
  height: 100%;
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};
  background-size: ${props => props.$imageUrl ? 'cover' : '200% 200%'};
  background-position: center;
  background-repeat: no-repeat;
  background: ${props => !props.$imageUrl && getGalaxyGradient(props.$theme)};
`;

// Video/Image wrapper component
interface MediaContentProps {
  mediaInfo: { type: 'video' | 'image'; url: string };
  packageName: string;
  theme?: string;
}

const MediaContent: React.FC<MediaContentProps> = ({ mediaInfo, packageName, theme }) => {
  if (mediaInfo.type === 'video') {
    return (
      <CosmicCardMediaContent $theme={theme}>
        <CosmicCardVideo
          src={mediaInfo.url}
          autoPlay
          loop
          muted
          playsInline
          aria-label={`Video background for ${packageName}`}
          onError={(e) => {
            console.warn(`Video failed to load for ${packageName}:`, mediaInfo.url);
            // Fallback to image background
            const target = e.target as HTMLVideoElement;
            const parent = target.parentElement;
            if (parent) {
              parent.style.background = getGalaxyGradient(theme);
              target.style.display = 'none';
            }
          }}
        />
      </CosmicCardMediaContent>
    );
  }
  
  return (
    <CosmicCardMediaContent $theme={theme}>
      <CosmicCardImage $imageUrl={mediaInfo.url} $theme={theme} />
    </CosmicCardMediaContent>
  );
};

const CosmicCardContent = styled.div`
  padding: 2rem;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  z-index: 3;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 2px;
    background: linear-gradient(
      to right, 
      transparent, 
      rgba(0, 255, 255, 0.5), 
      transparent
    );
  }
`;

const CosmicCardTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: ${GALAXY_COLORS.stellarWhite};
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
  font-weight: 600;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
  
  @media (min-width: 1024px) {
    font-size: 1.9rem;
  }
`;

const CosmicBadge = styled.span<{ $theme?: string }>`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(30, 30, 60, 0.8));
  border-radius: 25px;
  font-size: 0.85rem;
  color: ${GALAXY_COLORS.cyberCyan};
  z-index: 3;
  border: 1px solid rgba(0, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
`;

const CosmicDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  font-weight: 300;
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
    margin-bottom: 1.25rem;
  }
  
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const SessionInfo = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(30, 30, 60, 0.4));
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  
  .session-details {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 0.5rem;
  }
  
  .per-session-price {
    font-size: 1.2rem;
    font-weight: 700;
    color: ${GALAXY_COLORS.cyberCyan};
    text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
  }
`;

const CosmicPriceBox = styled(motion.div)`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 15px;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.4));
  border: 2px solid rgba(0, 255, 255, 0.4);
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 120px;
  isolation: isolate;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
    background-size: 200% 200%;
    animation: ${galacticShimmer} 8s ease-in-out infinite;
    pointer-events: none;
  }
`;

const CosmicPriceContent = styled(motion.div)`
  position: relative;
  z-index: 1;
`;

const PriceLabel = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.75rem;
  letter-spacing: 1px;
`;

const Price = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${GALAXY_COLORS.stellarWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
`;

const ValueBadge = styled.div<{ $isGoodValue?: boolean }>`
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  ${props => props.$isGoodValue ? `
    background: linear-gradient(45deg, ${GALAXY_COLORS.plasmaGreen}, #00ffaa);
    color: #003322;
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  `}
`;

const LoginMessage = styled.div`
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const CardActions = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  position: relative;
  z-index: 30;
  
  & > div {
    width: 90%;
    max-width: 260px;
  }
`;

// Animation variants
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const buttonMotionProps = {
  whileHover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  whileTap: {
    scale: 0.95
  }
};

// Memoized PackageCard Component
const PackageCard: React.FC<PackageCardProps> = memo(({
  package: pkg,
  canViewPrices,
  canPurchase,
  isPriceRevealed,
  isAdding,
  onTogglePrice,
  onAddToCart
}) => {
  // Stable event handlers
  const handleCardClick = useCallback(() => {
    onTogglePrice(pkg.id);
  }, [onTogglePrice, pkg.id]);

  const handleAddToCart = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    // Validate package ID before calling handler
    if (!pkg || !pkg.id) {
      console.error('🚨 BUTTON CLICK ERROR: Invalid package data!', { pkg, pkgId: pkg?.id });
      return;
    }
    
    console.log('🔘 Button clicked for package:', { id: pkg.id, name: pkg.name });
    onAddToCart(pkg);
  }, [onAddToCart, pkg]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onTogglePrice(pkg.id);
    }
  }, [onTogglePrice, pkg.id]);

  // Calculate badge display text
  let badgeDisplay = '';
  if (pkg.packageType === 'fixed' && pkg.sessions) {
    badgeDisplay = `${pkg.sessions} Session${pkg.sessions > 1 ? 's' : ''}`;
  } else if (pkg.packageType === 'monthly' && pkg.months) {
    badgeDisplay = `${pkg.months} Month${pkg.months > 1 ? 's' : ''}`;
  }

  const valueBadge = getValueBadge(pkg);
  const mediaInfo = getPackageMedia(pkg.imageUrl, pkg.name);

  return (
    <CosmicPackageCard 
      $theme={pkg.theme}
      onClick={handleCardClick}
      aria-label={`View details for ${pkg.name}`}
      role="button"
      tabIndex={0}
      onKeyPress={handleKeyPress}
      variants={itemVariants}
    >
      <CosmicCardMedia>
        <MediaContent 
          mediaInfo={mediaInfo}
          packageName={pkg.name}
          theme={pkg.theme}
        />
        {badgeDisplay && <CosmicBadge $theme={pkg.theme}>{badgeDisplay}</CosmicBadge>}
      </CosmicCardMedia>
      
      <CosmicCardContent>
        <CosmicCardTitle>{pkg.name}</CosmicCardTitle>
        <CosmicDescription>
          {pkg.description || 'Premium training package designed for stellar results.'}
        </CosmicDescription>
        
        {canViewPrices && pkg.pricePerSession && (
          <SessionInfo>
            <div className="session-details">
              {pkg.packageType === 'fixed' 
                ? `${pkg.sessions} training sessions`
                : `${pkg.months} months • ${pkg.sessionsPerWeek} sessions/week • ${pkg.totalSessions} total sessions`}
            </div>
            <div className="per-session-price">
              {formatPrice(pkg.pricePerSession)} per session
            </div>
          </SessionInfo>
        )}
        
        <CosmicPriceBox variants={itemVariants} aria-live="polite">
          <AnimatePresence mode="wait">
            {canViewPrices ? (
              isPriceRevealed ? (
                <CosmicPriceContent 
                  key="price" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  transition={{ duration: 0.3 }}
                >
                  <PriceLabel>Total Investment</PriceLabel>
                  <Price>{formatPrice(pkg.displayPrice)}</Price>
                  {valueBadge.text && (
                    <ValueBadge $isGoodValue={valueBadge.isGoodValue}>
                      {valueBadge.text}
                    </ValueBadge>
                  )}
                </CosmicPriceContent>
              ) : (
                <motion.div 
                  key="reveal" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  transition={{ duration: 0.3 }} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%', 
                    color: 'rgba(255,255,255,0.7)'
                  }}
                >
                  Click to reveal price
                </motion.div>
              )
            ) : (
              <motion.div 
                key="login" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.3 }} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%'
                }}
              >
                <LoginMessage>Login to view premium prices and purchase</LoginMessage>
              </motion.div>
            )}
          </AnimatePresence>
        </CosmicPriceBox>
        
        <CardActions>
          <motion.div {...buttonMotionProps} style={{ width: '100%'}}>
            <GlowButton 
              text={isAdding ? "Adding..." : "Add to Cart"} 
              theme={pkg.theme || "purple"}
              size="medium" 
              isLoading={isAdding}
              disabled={isAdding || !canPurchase}
              onClick={handleAddToCart}
              aria-busy={isAdding}
              aria-label={`Add ${pkg.name} to cart`}
            />
          </motion.div>
        </CardActions>
      </CosmicCardContent>
    </CosmicPackageCard>
  );
});

PackageCard.displayName = 'PackageCard';

export default PackageCard;