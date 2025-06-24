// Optimized Package Card Component
// FIXED: Memoized, focused, single-responsibility component

import React, { memo, useCallback, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import GlowButton from '../ui/GlowButton';
import { useToast } from '../../hooks/use-toast';

// --- Galaxy Theme Constants ---
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

// --- Package Interface ---
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
  displayPrice: number;
  theme?: string;
  isActive: boolean;
  imageUrl: string | null;
  includedFeatures?: string | null;
}

interface PackageCardProps {
  package: StoreItem;
  onAddToCart: (pkg: StoreItem) => Promise<void>;
  canViewPrices: boolean;
  canPurchase: boolean;
  isAddingToCart: boolean;
}

// --- Utility Functions ---
const getGalaxyGradient = (theme: string = 'purple') => {
  switch (theme) {
    case "cosmic":  return 'linear-gradient(135deg, rgba(93, 63, 211, 0.4), rgba(0, 255, 255, 0.3), rgba(255, 46, 99, 0.2))';
    case "ruby":    return 'linear-gradient(135deg, rgba(232, 0, 70, 0.4), rgba(253, 0, 159, 0.3), rgba(120, 81, 169, 0.2))';
    case "emerald": return 'linear-gradient(135deg, rgba(0, 232, 176, 0.4), rgba(0, 253, 159, 0.3), rgba(0, 255, 255, 0.2))';
    case "purple":
    default:        return 'linear-gradient(135deg, rgba(120, 0, 245, 0.4), rgba(120, 81, 169, 0.3), rgba(200, 148, 255, 0.2))';
  }
};

const formatPrice = (price: number): string => {
  return price.toLocaleString("en-US", { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
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

// --- Keyframes ---
const galacticShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// --- Styled Components (Optimized) ---
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
  will-change: transform;
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(0, 255, 255, 0.7);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), 0 0 25px rgba(0, 255, 255, 0.3);
  }
`;

const CardMedia = styled.div`
  width: 100%;
  height: 220px;
  position: relative;
  overflow: hidden;
  border-radius: 25px 25px 0 0;
  background: ${props => getGalaxyGradient('cosmic')};
`;

const CardContent = styled.div`
  padding: 2rem;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const CardTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: ${GALAXY_COLORS.stellarWhite};
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
  font-weight: 600;
  line-height: 1.3;
`;

const CardDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  font-weight: 300;
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

const PriceBox = styled(motion.div)`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 15px;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.4));
  border: 2px solid rgba(0, 255, 255, 0.4);
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 120px;
  
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

const PriceContent = styled(motion.div)`
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
  
  & > div {
    width: 90%;
    max-width: 260px;
  }
`;

const Badge = styled.span<{ $theme?: string }>`
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

// --- Memoized Package Card Component ---
const OptimizedPackageCard: React.FC<PackageCardProps> = memo(({
  package: pkg,
  onAddToCart,
  canViewPrices,
  canPurchase,
  isAddingToCart
}) => {
  const [showPrice, setShowPrice] = useState(false);
  const { toast } = useToast();

  // Memoized handlers
  const handleCardClick = useCallback(() => {
    setShowPrice(prev => !prev);
  }, []);

  const handleAddToCartClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!pkg?.id) {
      toast({ 
        title: "Error", 
        description: "Invalid package data. Please refresh the page.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      await onAddToCart(pkg);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  }, [pkg, onAddToCart, toast]);

  // Memoized computations
  const badgeDisplay = React.useMemo(() => {
    if (pkg.packageType === 'fixed' && pkg.sessions) {
      return `${pkg.sessions} Session${pkg.sessions > 1 ? 's' : ''}`;
    } else if (pkg.packageType === 'monthly' && pkg.months) {
      return `${pkg.months} Month${pkg.months > 1 ? 's' : ''}`;
    }
    return '';
  }, [pkg.packageType, pkg.sessions, pkg.months]);

  const valueBadge = React.useMemo(() => getValueBadge(pkg), [pkg.pricePerSession]);

  const sessionDetails = React.useMemo(() => {
    if (pkg.packageType === 'fixed') {
      return `${pkg.sessions} training sessions`;
    }
    return `${pkg.months} months • ${pkg.sessionsPerWeek} sessions/week • ${pkg.totalSessions} total sessions`;
  }, [pkg.packageType, pkg.sessions, pkg.months, pkg.sessionsPerWeek, pkg.totalSessions]);

  return (
    <CosmicPackageCard 
      $theme={pkg.theme}
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      aria-label={`View details for ${pkg.name}`}
    >
      <CardMedia>
        {badgeDisplay && <Badge $theme={pkg.theme}>{badgeDisplay}</Badge>}
      </CardMedia>
      
      <CardContent>
        <CardTitle>{pkg.name}</CardTitle>
        <CardDescription>
          {pkg.description || 'Premium training package designed for stellar results.'}
        </CardDescription>
        
        {pkg.pricePerSession && (
          <SessionInfo>
            <div className="session-details">{sessionDetails}</div>
            <div className="per-session-price">
              {formatPrice(pkg.pricePerSession)} per session
            </div>
          </SessionInfo>
        )}
        
        <PriceBox>
          <AnimatePresence mode="wait">
            {canViewPrices ? (
              showPrice ? (
                <PriceContent 
                  key="price" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
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
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <GlowButton 
              text={isAddingToCart ? "Adding..." : "Add to Cart"} 
              theme={pkg.theme || "purple"}
              size="medium" 
              isLoading={isAddingToCart}
              disabled={isAddingToCart || !canPurchase}
              onClick={handleAddToCartClick}
              aria-label={`Add ${pkg.name} to cart`}
            />
          </motion.div>
        </CardActions>
      </CardContent>
    </CosmicPackageCard>
  );
});

OptimizedPackageCard.displayName = 'OptimizedPackageCard';

export default OptimizedPackageCard;