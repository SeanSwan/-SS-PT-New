/**
 * PackageCard.tsx - Package Card Component (EW Theme v2.0)
 * ================================================================
 * Ethereal Wilderness glass-morphism card system.
 * Matches homepage ProgramsOverview.V3 visual language.
 *
 * Responsibilities:
 * - Individual package display and styling
 * - Total package investment and session math display
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
import { sanitizeImageUrl, cssUrlValue } from '../../../utils/imageUrl';
import { motion } from 'framer-motion';
import GlowButton, { type GlowButtonColorScheme } from '../../../components/ui/GlowButton';
import { SpecialBadge } from './SpecialBadge';
import { logger } from '@/utils/logger';
import { VIDEO } from '../../../config/videoAssets';
import type { StoreItem } from './storeCatalog.types';

// EW Design Tokens (shared with ProgramsOverview.V3 / FitnessStats V2)
const T = {
  bg: '#002060',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#8B5CF6',
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

// Component Props Interface
interface PackageCardProps {
  package: StoreItem;
  canViewPrices: boolean;
  canPurchase: boolean;
  isAdding: boolean;
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
const THEME_ACCENTS: Record<string, string> = {
  cosmic: 'rgba(93, 63, 211, 0.3)',
  ruby: 'rgba(232, 80, 120, 0.3)',
  emerald: 'rgba(0, 212, 170, 0.3)',
  purple: 'rgba(139, 92, 246, 0.3)',
};

const getThemeAccent = (theme: string = 'purple') => THEME_ACCENTS[theme] ?? THEME_ACCENTS.purple;

// Fallback gradient for video error
const FALLBACK_GRADIENTS: Record<string, string> = {
  cosmic: 'linear-gradient(135deg, rgba(93, 63, 211, 0.4), rgba(0, 212, 170, 0.2))',
  ruby: 'linear-gradient(135deg, rgba(232, 80, 120, 0.4), rgba(139, 92, 246, 0.2))',
  emerald: 'linear-gradient(135deg, rgba(0, 212, 170, 0.4), rgba(72, 232, 200, 0.2))',
  purple: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(200, 148, 255, 0.2))',
};

const getFallbackGradient = (theme: string = 'purple') => FALLBACK_GRADIENTS[theme] ?? FALLBACK_GRADIENTS.purple;

// Dynamic movie matching utility
const getMatchingMovieFile = (packageName: string): string | null => {
  if (!packageName) return null;

  const nameLower = packageName.toLowerCase();

  const matchingRules = [
    { keywords: ['silver', 'elite'], movie: VIDEO.swans },
    { keywords: ['swans', 'multiple', 'platinum', 'premium'], movie: VIDEO.swans },
    { keywords: ['swan'], movie: VIDEO.swan },
    { keywords: ['run', 'running', 'cardio'], movie: VIDEO.run },
    { keywords: ['wave', 'water', 'flow'], movie: VIDEO.waves },
    { keywords: ['forest', 'nature', 'outdoor'], movie: VIDEO.forest },
    { keywords: ['smoke', 'intensity', 'transformation'], movie: VIDEO.smoke },
    { keywords: ['fish', 'aqua', 'marine'], movie: VIDEO.fish }
  ];

  for (const rule of matchingRules) {
    if (rule.keywords.some(keyword => nameLower.includes(keyword))) {
      return rule.movie;
    }
  }

  const fallbackMovies = [VIDEO.waves, VIDEO.forest, VIDEO.smoke, VIDEO.swan];
  const fallbackIndex = Math.abs(packageName.length % fallbackMovies.length);
  return fallbackMovies[fallbackIndex];
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

const EMPTY_VALUE_BADGE = { text: '', isGoodValue: false };
const VALUE_BADGES = [
  { maxPrice: 142, badge: { text: 'Best Value', isGoodValue: true } },
  { maxPrice: 150, badge: { text: 'Great Value', isGoodValue: true } },
  { maxPrice: 165, badge: { text: 'Good Value', isGoodValue: false } },
] as const;

const getValueBadge = (pkg: StoreItem): { text: string; isGoodValue: boolean } => (
  VALUE_BADGES.find(({ maxPrice }) => Number(pkg.pricePerSession) <= maxPrice)?.badge ?? EMPTY_VALUE_BADGE
);

const getFixedSessionSummary = (sessionCount: number, bonusSessions = 0): string => (
  bonusSessions > 0
    ? `${sessionCount} sessions included + ${bonusSessions} bonus training sessions`
    : `${sessionCount} sessions included`
);

const getMonthlySessionSummary = (pkg: StoreItem): string => (
  `${pkg.months ?? 0} months - ${pkg.sessionsPerWeek ?? 0} sessions/week - ${pkg.totalSessions ?? 0} total sessions`
);

const getFixedSessionCount = (pkg: StoreItem): number => pkg.sessions ?? pkg.totalSessions ?? 0;
const getBonusSessionCount = (activeSpecial?: PackageCardProps['activeSpecial']): number => activeSpecial?.bonusSessions ?? 0;

const getSessionSummary = (
  pkg: StoreItem,
  activeSpecial?: PackageCardProps['activeSpecial'],
): string => (
  pkg.packageType === 'monthly'
    ? getMonthlySessionSummary(pkg)
    : getFixedSessionSummary(getFixedSessionCount(pkg), getBonusSessionCount(activeSpecial))
);

const getPerSessionLabel = (pkg: StoreItem): string | null => (
  pkg.pricePerSession ? `${formatPrice(pkg.pricePerSession)}/session` : null
);

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
  cursor: default;
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
      rgba(0, 32, 96, 0) 0%,
      rgba(0, 32, 96, 0.4) 60%,
      rgba(0, 32, 96, 0.85) 100%
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
  background-image: ${({ $imageUrl }) => {
    const safe = $imageUrl ? sanitizeImageUrl($imageUrl) : null;
    return safe ? `url(${cssUrlValue(safe)})` : 'none';
  }};
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
            logger.warn(`Video failed to load for ${packageName}:`, mediaInfo.url);
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
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(15, 25, 35, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 170, 0.1);
  backdrop-filter: blur(8px);

  .session-details {
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    font-size: 0.88rem;
    color: rgba(240, 248, 255, 0.85);
    margin-bottom: 0.5rem;
  }

  .per-session-price {
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    font-size: 0.95rem;
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
  isAdding,
  onAddToCart,
  activeSpecial
}) => {
  const cardTheme = (pkg.theme || 'purple') as GlowButtonColorScheme;

  const handleAddToCart = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!pkg || !pkg.id) {
      console.error('BUTTON CLICK ERROR: Invalid package data!', { pkg, pkgId: pkg?.id });
      return;
    }

    logger.log('Button clicked for package:', { id: pkg.id, name: pkg.name });
    onAddToCart(pkg);
  }, [onAddToCart, pkg]);

  let badgeDisplay = '';
  if (pkg.packageType === 'fixed' && pkg.sessions) {
    badgeDisplay = `${pkg.sessions} Session${pkg.sessions > 1 ? 's' : ''}`;
  } else if (pkg.packageType === 'monthly' && pkg.months) {
    badgeDisplay = `${pkg.months} Month${pkg.months > 1 ? 's' : ''}`;
  }

  const valueBadge = getValueBadge(pkg);
  const mediaInfo = getPackageMedia(pkg.imageUrl, pkg.name);
  const sessionSummary = getSessionSummary(pkg, activeSpecial);
  const perSessionLabel = getPerSessionLabel(pkg);

  return (
    <CardContainer
      $theme={pkg.theme}
      aria-label={`View details for ${pkg.name}`}
      role="group"
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

        <PriceBox variants={itemVariants} aria-live="polite">
          {canViewPrices ? (
            <PriceContent
              key="price"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <LoginMessage>Pricing is by invitation — contact SwanStudios for access</LoginMessage>
            </motion.div>
          )}
        </PriceBox>

        {canViewPrices && (
          <SessionInfo aria-label="Package pricing details">
            <div className="session-details">{sessionSummary}</div>
            {perSessionLabel && (
              <div className="per-session-price">{perSessionLabel}</div>
            )}
          </SessionInfo>
        )}

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
