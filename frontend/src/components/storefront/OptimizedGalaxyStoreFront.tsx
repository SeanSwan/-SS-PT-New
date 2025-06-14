// Optimized Galaxy Storefront - Performance Focused
// FIXED: Decomposed, memoized, reduced complexity

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";

// --- Context Imports ---
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import api from "../../services/api.service";

// --- Component Imports ---
import OptimizedPackageCard from "./OptimizedPackageCard";
import { ThemedGlowButton } from '../../styles/swan-theme-utils.tsx';
import OrientationForm from "../OrientationForm/orientationForm";
import ShoppingCart from "../ShoppingCart/ShoppingCart";
import { useToast } from "../../hooks/use-toast";

// --- Asset Imports ---
const swanVideo = "/Swans.mp4";
const logoImg = "/Logo.png";
const swanIcon = "/Logo.png";

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

// --- Type Definition ---
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

// --- Utility Functions ---
const getThemeFromName = (name: string): string => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('silver') || nameLower.includes('wing')) return 'emerald';
  if (nameLower.includes('golden') || nameLower.includes('flight')) return 'ruby';
  if (nameLower.includes('sapphire') || nameLower.includes('soar')) return 'cosmic';
  if (nameLower.includes('platinum') || nameLower.includes('grace')) return 'purple';
  if (nameLower.includes('emerald') || nameLower.includes('evolution')) return 'emerald';
  if (nameLower.includes('diamond') || nameLower.includes('dynasty')) return 'cosmic';
  if (nameLower.includes('ruby') || nameLower.includes('reign')) return 'ruby';
  if (nameLower.includes('rhodium') || nameLower.includes('royalty')) return 'purple';
  return 'purple';
};

// --- Optimized Keyframes ---
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const starSparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const galacticShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const stellarPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(120, 81, 169, 0.2);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(120, 81, 169, 0.4);
    transform: scale(1.02);
  }
`;

const spinnerAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// --- Styled Components (Simplified) ---
const GalaxyContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  background: linear-gradient(135deg, ${GALAXY_COLORS.deepSpace}, ${GALAXY_COLORS.nebulaPurple});
  color: ${GALAXY_COLORS.stellarWhite};
  min-height: 100vh;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 20px 30px, ${GALAXY_COLORS.cyberCyan}, transparent),
      radial-gradient(1px 1px at 90px 40px, ${GALAXY_COLORS.stellarWhite}, transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    opacity: 0.2;
    pointer-events: none;
    z-index: -1;
  }
`;

const HeroSection = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  text-align: center;
  overflow: hidden;
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;

  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient( 
      to bottom, 
      rgba(0, 0, 0, 0.6), 
      rgba(10, 10, 30, 0.8), 
      rgba(30, 30, 60, 0.9) 
    );
    z-index: 1;
  }
  
  video {
    position: absolute;
    top: 50%;
    left: 50%;
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
    z-index: 0;
  }
`;

const LogoContainer = styled(motion.div)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.6));
  margin-bottom: 1.5rem;
  z-index: 2;

  img {
    height: 160px;
    max-width: 90%;
    object-fit: contain;
  }
  
  @media (max-width: 768px) {
    img { height: 120px; }
    margin-bottom: 1rem;
  }
`;

const HeroContent = styled(motion.div)`
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 2;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.6), rgba(120, 81, 169, 0.3));
  padding: 2rem;
  border-radius: 20px;
  backdrop-filter: blur(15px); 
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const AnimatedName = styled(motion.span)`
  display: inline-block;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}, 
    ${GALAXY_COLORS.energyBlue}, 
    ${GALAXY_COLORS.cyberCyan}
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${galacticShimmer} 3s linear infinite;
  padding: 0 5px;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3.2rem;
  margin-bottom: 1rem;
  font-weight: 300;
  color: ${GALAXY_COLORS.stellarWhite};
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  letter-spacing: 1px;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled(motion.h2)`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}, 
    ${GALAXY_COLORS.energyBlue}
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text; 
  color: transparent;
  animation: ${galacticShimmer} 4s linear infinite; 
  display: inline-block;
  font-weight: 300;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6; 
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  max-width: 800px;
  margin: 0 auto 2rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  justify-content: center;
  position: relative;
  z-index: 3;
  
  & > div,
  & > button {
    position: relative;
    flex: 1 1 auto;
    min-width: 180px;
    max-width: 250px;
  }
  
  @media (max-width: 600px) { 
    flex-direction: column;
    gap: 1rem;
    align-items: center; 
    
    & > div,
    & > button {
      width: 100%;
      max-width: 280px;
    } 
  }
`;

const SectionContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  
  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const PackageSection = styled(motion.section)`
  margin-bottom: 5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 3rem;
  }
`;

const SectionTitle = styled(motion.h2)`
  text-align: center;
  margin-bottom: 3rem;
  font-size: 2.8rem;
  font-weight: 300;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-bottom: 20px;
  color: ${GALAXY_COLORS.stellarWhite};
  width: 100%;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  
  &:before {
    content: "";
    width: 32px;
    height: 32px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${starSparkle} 2s ease-in-out infinite;
  }
  
  &:after {
    content: "";
    width: 32px;
    height: 32px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${starSparkle} 2s ease-in-out infinite 0.5s;
  }
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 2rem;
    
    &:before,
    &:after {
      width: 24px;
      height: 24px;
    }
  }
`;

const PackagesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
  margin-bottom: 4rem;
  position: relative;
  z-index: 15;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  @media (min-width: 1024px) { 
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    max-width: 1200px;
    margin: 0 auto 4rem;
    gap: 3rem;
  }
`;

const CartButton = styled(motion.button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${GALAXY_COLORS.cosmicPurple}, ${GALAXY_COLORS.cyberCyan});
  border: 3px solid rgba(0, 255, 255, 0.6);
  color: white;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.4), 
    0 0 30px rgba(0, 255, 255, 0.4);
  z-index: 1000;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: scale(1.15);
    box-shadow: 
      0 12px 35px rgba(0, 0, 0, 0.5), 
      0 0 40px rgba(0, 255, 255, 0.6);
    animation: ${stellarPulse} 1.5s ease-in-out infinite;
  }
`;

const CartCount = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${GALAXY_COLORS.warningRed};
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
  border: 3px solid rgba(30, 30, 60, 0.8);
  box-shadow: 0 0 10px rgba(255, 65, 108, 0.6);
`;

const AuthBanner = styled.div`
  position: fixed;
  top: 56px;
  left: 0;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3));
  color: white;
  text-align: center;
  font-size: 0.9rem;
  backdrop-filter: blur(15px);
  z-index: 999;
  border-bottom: 2px solid rgba(0, 255, 255, 0.4);
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(0, 255, 255, 0.1);
    border-left: 4px solid rgba(0, 255, 255, 0.8);
    border-radius: 50%;
    animation: ${spinnerAnimation} 1s linear infinite;
  }
  
  .loading-text {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
  }
`;

// --- Main Component ---
const OptimizedGalaxyStoreFront: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  const { toast } = useToast();

  // --- State (Reduced) ---
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  
  // API state
  const [packages, setPackages] = useState<StoreItem[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  // --- Memoized Values ---
  const canViewPrices = useMemo(() => isAuthenticated && !!user, [isAuthenticated, user]);
  const canPurchase = useMemo(() => canViewPrices, [canViewPrices]);
  
  const { fixedPackages, monthlyPackages } = useMemo(() => {
    const fixed = packages.filter(pkg => pkg.packageType === 'fixed');
    const monthly = packages.filter(pkg => pkg.packageType === 'monthly');
    return { fixedPackages: fixed, monthlyPackages: monthly };
  }, [packages]);

  // --- Refs ---
  const heroRef = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);

  // --- Animation Controls ---
  const heroControls = useAnimation();
  const packagesControls = useAnimation();

  const isHeroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const isPackagesInView = useInView(packagesRef, { once: true, amount: 0.1 });

  // --- Optimized API Call ---
  const fetchPackages = useCallback(async () => {
    try {
      setIsLoadingPackages(true);
      const response = await api.get('/api/storefront');
      
      if (response.data?.success && Array.isArray(response.data.items)) {
        const fetchedPackages = response.data.items.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || '',
          packageType: pkg.packageType || 'fixed',
          pricePerSession: Number(pkg.pricePerSession) || 0,
          sessions: pkg.sessions,
          months: pkg.months,
          sessionsPerWeek: pkg.sessionsPerWeek,
          totalSessions: pkg.totalSessions,
          price: Number(pkg.price) || Number(pkg.totalCost) || 0,
          totalCost: Number(pkg.totalCost) || Number(pkg.price) || 0,
          displayPrice: Number(pkg.totalCost) || Number(pkg.price) || Number(pkg.displayPrice) || 0,
          theme: getThemeFromName(pkg.name),
          isActive: pkg.isActive !== false,
          imageUrl: pkg.imageUrl,
          displayOrder: pkg.displayOrder || 0,
          includedFeatures: pkg.includedFeatures
        }));
        
        // Sort packages
        fetchedPackages.sort((a, b) => {
          if (a.displayOrder !== b.displayOrder) {
            return (a.displayOrder || 0) - (b.displayOrder || 0);
          }
          return a.id - b.id;
        });
        
        setPackages(fetchedPackages);
      }
    } catch (error: any) {
      console.error('Failed to fetch packages:', error);
      toast({ 
        title: "Failed to load packages", 
        description: "Please refresh the page.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoadingPackages(false);
    }
  }, [toast]);

  // --- Effects ---
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    if (isHeroInView) heroControls.start("visible");
    if (isPackagesInView) packagesControls.start("visible");
  }, [isHeroInView, isPackagesInView, heroControls, packagesControls]);

  // --- Optimized Handlers ---
  const handleAddToCart = useCallback(async (pkg: StoreItem) => {
    if (!canPurchase) {
      toast({ 
        title: "Login Required", 
        description: "Please log in to purchase packages.", 
        variant: "destructive" 
      });
      return;
    }

    if (!pkg.id) {
      toast({ 
        title: "Error", 
        description: "Invalid package data.", 
        variant: "destructive" 
      });
      return;
    }

    setIsAddingToCart(pkg.id);
    try {
      await addToCart({ id: pkg.id, quantity: 1 });
      setTimeout(() => refreshCart(), 500);
      toast({ title: "Success!", description: `Added ${pkg.name} to cart.` });
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to add item.", 
        variant: "destructive" 
      });
    } finally {
      setIsAddingToCart(null);
    }
  }, [addToCart, refreshCart, canPurchase, toast]);

  const handleToggleCart = useCallback(() => {
    setShowCart(prev => !prev);
  }, []);

  const handleHideCart = useCallback(() => {
    setShowCart(false);
  }, []);

  // --- Animation Variants ---
  const containerVariants = useMemo(() => ({ 
    hidden: { opacity: 0 }, 
    visible: { 
      opacity: 1, 
      transition: { 
        delayChildren: 0.1, 
        staggerChildren: 0.1 
      } 
    } 
  }), []);
  
  const itemVariants = useMemo(() => ({ 
    hidden: { y: 20, opacity: 0 }, 
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        duration: 0.3, 
        ease: "easeOut" 
      } 
    } 
  }), []);

  // --- Loading State ---
  if (isLoadingPackages) {
    return (
      <GalaxyContainer>
        {!isAuthenticated && (
          <AuthBanner>
            Please login or register to view pricing and purchase training packages
          </AuthBanner>
        )}
        <SectionContainer style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
          <LoadingContainer>
            <div className="spinner"></div>
            <div className="loading-text">Loading your luxury Swan packages...</div>
          </LoadingContainer>
        </SectionContainer>
      </GalaxyContainer>
    );
  }

  return (
    <GalaxyContainer>
      {/* Authentication Banner */}
      {!isAuthenticated && (
        <AuthBanner>
          Please login or register to view pricing and purchase training packages
        </AuthBanner>
      )}
      
      <div style={{ position: 'relative', zIndex: 5, paddingTop: !isAuthenticated ? '60px' : '0' }}>
        {/* Hero Section */}
        <HeroSection ref={heroRef}>
          <VideoBackground>
            <video autoPlay loop muted playsInline>
              <source src={swanVideo} type="video/mp4" />
            </video>
          </VideoBackground>
          
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={heroControls} 
            variants={containerVariants} 
            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}
          >
            <LogoContainer variants={itemVariants}>
              <img src={logoImg} alt="Swan Studios Logo" loading="lazy" />
            </LogoContainer>
            
            <HeroContent variants={itemVariants}>
              <HeroTitle variants={itemVariants}>
                Elite Training Designed by{' '}
                <AnimatedName>Sean Swan</AnimatedName>
              </HeroTitle>
              <HeroSubtitle variants={itemVariants}>
                25+ Years of Experience & NASM-Approved Protocols
              </HeroSubtitle>
              <HeroDescription variants={itemVariants}>
                Discover a revolutionary workout program tailored to your unique goals. 
                Leveraging over two decades of expertise and cutting-edge techniques, 
                Sean Swan delivers results that redefine your limits.
              </HeroDescription>
              <ButtonsContainer variants={itemVariants}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <ThemedGlowButton 
                    text="Book Consultation" 
                    variant="primary" 
                    size="large" 
                    onClick={() => setShowOrientation(true)} 
                  />
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <ThemedGlowButton 
                    text="View Packages" 
                    variant="secondary" 
                    size="large" 
                    onClick={() => packagesRef.current?.scrollIntoView({ behavior: "smooth" })}
                  />
                </motion.div>
              </ButtonsContainer>
            </HeroContent>
          </motion.div>
        </HeroSection>

        {/* Packages Section */}
        <SectionContainer ref={packagesRef}>
          {fixedPackages.length > 0 && (
            <PackageSection>
              <SectionTitle>Premium Training Packages</SectionTitle>
              <PackagesGrid>
                {fixedPackages.map(pkg => (
                  <OptimizedPackageCard
                    key={pkg.id}
                    package={pkg}
                    onAddToCart={handleAddToCart}
                    canViewPrices={canViewPrices}
                    canPurchase={canPurchase}
                    isAddingToCart={isAddingToCart === pkg.id}
                  />
                ))}
              </PackagesGrid>
            </PackageSection>
          )}

          {monthlyPackages.length > 0 && (
            <PackageSection>
              <SectionTitle>Long-Term Excellence Programs</SectionTitle>
              <PackagesGrid>
                {monthlyPackages.map(pkg => (
                  <OptimizedPackageCard
                    key={pkg.id}
                    package={pkg}
                    onAddToCart={handleAddToCart}
                    canViewPrices={canViewPrices}
                    canPurchase={canPurchase}
                    isAddingToCart={isAddingToCart === pkg.id}
                  />
                ))}
              </PackagesGrid>
            </PackageSection>
          )}
          
          {/* Consultation Button */}
          {(fixedPackages.length > 0 || monthlyPackages.length > 0) && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <ThemedGlowButton 
                  text="Schedule Consultation" 
                  variant="primary" 
                  size="large" 
                  onClick={() => setShowOrientation(true)} 
                />
              </motion.div>
            </div>
          )}
        </SectionContainer>
      </div>

      {/* Floating Cart Button */}
      {user && isAuthenticated && (
        <CartButton 
          onClick={handleToggleCart}
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          aria-label={`View Cart (${cart?.itemCount || 0} items)`}
        >
          🛒
          {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
        </CartButton>
      )}

      {/* Modals */}
      <AnimatePresence mode="wait">
        {showOrientation && (
          <OrientationForm 
            key="orientation-modal" 
            onClose={() => setShowOrientation(false)} 
          />
        )}
        {showCart && (
          <ShoppingCart 
            key="cart-modal" 
            onClose={handleHideCart} 
          />
        )}
      </AnimatePresence>
    </GalaxyContainer>
  );
};

export default OptimizedGalaxyStoreFront;