/**
 * PackageCard.tsx - Package Card Component (EW Theme v2.0)
 * ================================================================
 * Ethereal Wilderness glass-morphism card system.
 * Matches homepage ProgramsOverview.V3 visual language.
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
 * - Reduced-motion gated animations
 */

import React, { memo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import GlowButton, { type GlowButtonColorScheme } from '../../../components/ui/GlowButton';
import { SpecialBadge } from './SpecialBadge';

// EW Design Tokens (shared with ProgramsOverview.V3 / FitnessStats V2)
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
} as const;

const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

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
  activeSpecial?: {
    id: number;
    name: string;
    bonusSessions: number;
    bonusDuration?: number;
    endsAt: string;
  };
}

// Subtle theme accent for card top-border glow
const getThemeAccent = (theme: string = 'purple') => {
  switch (theme) {
    case "cosmic":  return 'rgba(93, 63, 211, 0.3)';
    case "ruby":    return 'rgba(232, 80, 120, 0.3)';
    case "emerald": return 'rgba(0, 212, 170, 0.3)';
    case "purple":
    default:        return 'rgba(120, 81, 169, 0.3)';
  }
};

// Fallback gradient for video error
const getFallbackGradient = (theme: string = 'purple') => {
  switch (theme) {
    case "cosmic":  return `linear-gradient(135deg, rgba(93, 63, 211, 0.4), rgba(0, 212, 170, 0.2))`;
    case "ruby":    return `linear-gradient(135deg, rgba(232, 80, 120, 0.4), rgba(120, 81, 169, 0.2))`;
    case "emerald": return `linear-gradient(135deg, rgba(0, 212, 170, 0.4), rgba(72, 232, 200, 0.2))`;
    case "purple":
    default:        return `linear-gradient(135deg, rgba(120, 81, 169, 0.4), rgba(200, 148, 255, 0.2))`;
  }
};

// Dynamic movie matching utility
const getMatchingMovieFile = (packageName: string): string | null => {
  if (!packageName) return null;

  const nameLower = packageName.toLowerCase();

  const matchingRules = [
    { keywords: ['silver', 'elite'], movie: 'Swans.mp4' },
    { keywords: ['swans', 'multiple', 'platinum', 'premium'], movie: 'Swans.mp4' },
    { keywords: ['swan'], movie: 'swan.mp4' },
    { keywords: ['run', 'running', 'cardio'], movie: 'Run.mp4' },
    { keywords: ['wave', 'water', 'flow'], movie: 'Waves.mp4' },
    { keywords: ['forest', 'nature', 'outdoor'], movie: 'forest.mp4' },
    { keywords: ['smoke', 'intensity', 'transformation'], movie: 'smoke.mp4' },
    { keywords: ['fish', 'aqua', 'marine'], movie: 'fish.mp4' }
  ];

  for (const rule of matchingRules) {
    if (rule.keywords.some(keyword => nameLower.includes(keyword))) {
      return `/${rule.movie}`;
    }
  }

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

const getPackageMedia = (imageUrl: string | null, packageName: string): { type: 'video' | 'image'; url: string } => {
  const movieFile = getMatchingMovieFile(packageName);
  if (movieFile) {
    return { type: 'video', url: movieFile };
  }
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
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components — EW Glass-Morphism Card System
const CardContainer = styled(motion.div)<{ $theme?: string }>`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: ${T.surface};
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 170, 0.12);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  height: 100%;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  z-index: 20;
  ${noMotion}

  @media (max-width: 768px) {
    min-height: 480px;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => getThemeAccent(props.$theme)};
    z-index: 1;
  }

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      transform: translateY(-8px);
      border-color: rgba(0, 212, 170, 0.3);
      box-shadow:
        0 20px 50px -10px rgba(0, 212, 170, 0.15),
        0 0 30px rgba(0, 212, 170, 0.05);
      z-index: 25;
    }
  }

  &:focus-visible {
    outline: 2px solid ${T.primary};
    outline-offset: 3px;
  }
`;

const CardMedia = styled.div`
  width: 100%;
  height: 220px;
  position: relative;
  overflow: hidden;
  border-radius: 16px 16px 0 0;

  @media (max-width: 768px) {
    height: 180px;
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(10, 10, 26, 0) 0%,
      rgba(10, 10, 26, 0.4) 60%,
      rgba(10, 10, 26, 0.85) 100%
    );
    z-index: 2;
  }
`;

const MediaContentWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.4s ease;
  ${noMotion}

  ${CardContainer}:hover & {
    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
      transform: scale(1.05);
    }
  }
`;

const CardVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;

  &::-webkit-media-controls {
    display: none !important;
  }

  &::-webkit-media-controls-panel {
    display: none !important;
  }
`;

const CardImage = styled.div<{$imageUrl?: string | null; $theme?: string}>`
  width: 100%;
  height: 100%;
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: ${T.bg};
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
      <MediaContentWrapper>
        <CardVideo
          src={mediaInfo.url}
          autoPlay
          loop
          muted
          playsInline
          aria-label={`Video background for ${packageName}`}
          onError={(e) => {
            console.warn(`Video failed to load for ${packageName}:`, mediaInfo.url);
            const target = e.target as HTMLVideoElement;
            const parent = target.parentElement;
            if (parent) {
              parent.style.background = getFallbackGradient(theme);
              target.style.display = 'none';
            }
          }}
        />
      </MediaContentWrapper>
    );
  }

  return (
    <MediaContentWrapper>
      <CardImage $imageUrl={mediaInfo.url} $theme={theme} />
    </MediaContentWrapper>
  );
};

const CardContent = styled.div`
  padding: 1.75rem;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  z-index: 3;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(0, 212, 170, 0.3),
      transparent
    );
  }
`;

const CardTitle = styled.h3`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: ${T.text};
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.6rem;
  }

  @media (min-width: 1024px) {
    font-size: 1.9rem;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 212, 170, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 212, 170, 0.25);
  border-radius: 50px;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${T.primary};
  z-index: 3;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const CardDescription = styled.p`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.95rem;
  color: ${T.textSecondary};
  margin-bottom: 1.25rem;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const SessionInfo = styled.div`
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: rgba(15, 25, 35, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 170, 0.1);
  backdrop-filter: blur(8px);

  .session-details {
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    font-size: 0.95rem;
    color: rgba(240, 248, 255, 0.85);
    margin-bottom: 0.5rem;
  }

  .per-session-price {
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    font-size: 1.15rem;
    font-weight: 700;
    color: ${T.primary};
  }
`;

const PriceBox = styled(motion.div)`
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  border-radius: 12px;
  background: rgba(15, 25, 35, 0.6);
  border: 1px solid rgba(0, 212, 170, 0.12);
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 110px;
  isolation: isolate;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, transparent 0%, rgba(0, 212, 170, 0.03) 50%, transparent 100%);
    background-size: 200% 200%;
    pointer-events: none;

    @media (prefers-reduced-motion: no-preference) {
      animation: ${shimmer} 8s ease-in-out infinite;
    }
  }
  ${noMotion}
`;

const PriceContent = styled(motion.div)`
  position: relative;
  z-index: 1;
`;

const PriceLabel = styled.div`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.85rem;
  color: ${T.textSecondary};
  margin-bottom: 0.5rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
`;

const Price = styled.div`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: ${T.text};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
`;

const ValueBadge = styled.div<{ $isGoodValue?: boolean }>`
  display: inline-block;
  padding: 0.4rem 0.85rem;
  border-radius: 50px;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  ${props => props.$isGoodValue ? `
    background: rgba(0, 212, 170, 0.15);
    color: ${T.primary};
    border: 1px solid rgba(0, 212, 170, 0.25);
  ` : `
    background: rgba(240, 248, 255, 0.06);
    color: ${T.textSecondary};
    border: 1px solid rgba(240, 248, 255, 0.08);
  `}
`;

const LoginMessage = styled.div`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-style: italic;
  color: ${T.textSecondary};
  font-size: 0.95rem;
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
  onAddToCart,
  activeSpecial
}) => {
  const cardTheme = (pkg.theme || 'purple') as GlowButtonColorScheme;

  const handleCardClick = useCallback(() => {
    onTogglePrice(pkg.id);
  }, [onTogglePrice, pkg.id]);

  const handleAddToCart = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!pkg || !pkg.id) {
      console.error('BUTTON CLICK ERROR: Invalid package data!', { pkg, pkgId: pkg?.id });
      return;
    }

    console.log('Button clicked for package:', { id: pkg.id, name: pkg.name });
    onAddToCart(pkg);
  }, [onAddToCart, pkg]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onTogglePrice(pkg.id);
    }
  }, [onTogglePrice, pkg.id]);

  let badgeDisplay = '';
  if (pkg.packageType === 'fixed' && pkg.sessions) {
    badgeDisplay = `${pkg.sessions} Session${pkg.sessions > 1 ? 's' : ''}`;
  } else if (pkg.packageType === 'monthly' && pkg.months) {
    badgeDisplay = `${pkg.months} Month${pkg.months > 1 ? 's' : ''}`;
  }

  const valueBadge = getValueBadge(pkg);
  const mediaInfo = getPackageMedia(pkg.imageUrl, pkg.name);

  return (
    <CardContainer
      $theme={pkg.theme}
      onClick={handleCardClick}
      aria-label={`View details for ${pkg.name}`}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      variants={itemVariants}
    >
      {activeSpecial && (
        <SpecialBadge
          name={activeSpecial.name}
          bonusSessions={activeSpecial.bonusSessions}
          endsAt={activeSpecial.endsAt}
        />
      )}
      <CardMedia>
        <MediaContent
          mediaInfo={mediaInfo}
          packageName={pkg.name}
          theme={pkg.theme}
        />
        {badgeDisplay && <Badge>{badgeDisplay}</Badge>}
      </CardMedia>

      <CardContent>
        <CardTitle>{pkg.name}</CardTitle>
        <CardDescription>
          {pkg.description || 'Premium training package designed for stellar results.'}
        </CardDescription>

        {canViewPrices && pkg.pricePerSession && (
          <SessionInfo>
            <div className="session-details">
              {pkg.packageType === 'fixed'
                ? `${pkg.sessions}${activeSpecial ? ` + ${activeSpecial.bonusSessions} Bonus ` : ' '}training sessions`
                : `${pkg.months} months \u2022 ${pkg.sessionsPerWeek} sessions/week \u2022 ${pkg.totalSessions} total sessions`}
            </div>
            <div className="per-session-price">
              {formatPrice(pkg.pricePerSession)} per session
            </div>
          </SessionInfo>
        )}

        <PriceBox variants={itemVariants} aria-live="polite">
          <AnimatePresence mode="wait">
            {canViewPrices ? (
              isPriceRevealed ? (
                <PriceContent
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
                </PriceContent>
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
                    color: T.textSecondary
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
        </PriceBox>

        <CardActions>
          <motion.div {...buttonMotionProps} style={{ width: '100%'}}>
            <GlowButton
              text={isAdding ? "Adding..." : "Add to Cart"}
              theme={cardTheme}
              size="medium"
              isLoading={isAdding}
              disabled={isAdding || !canPurchase}
              onClick={handleAddToCart}
              aria-busy={isAdding}
              aria-label={`Add ${pkg.name} to cart`}
            />
          </motion.div>
        </CardActions>
      </CardContent>
    </CardContainer>
  );
});

PackageCard.displayName = 'PackageCard';

export default PackageCard;
