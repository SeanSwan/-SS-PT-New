/**
 * OptimizedGalaxyStoreFront.tsx - Main StoreFront (EW Theme v2.0)
 * ================================================================
 * Ethereal Wilderness token migration. Container shell + state orchestration.
 *
 * Architecture:
 * - HeroSection: Video background, logo, hero content
 * - PackagesGrid: Package display and management
 * - FloatingCart: Cart button functionality
 * - Main Component: Orchestrates everything
 *
 * Performance Optimized:
 * - Memoized callbacks to prevent re-render loops
 * - Stable dependency arrays
 * - Reduced-motion gated animations
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled, { keyframes, css } from "styled-components";
import { AnimatePresence, MotionConfig } from "framer-motion";

// Context and Service Imports
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import api from "../../services/api.service";
// Temporarily disabled useToast due to provider timing issues
// import { useToast } from "../../hooks/use-toast";

// Component Imports
import HeroSection from "./components/HeroSection";
import PackagesGrid from "./components/PackagesGrid";
import FloatingCart from "./components/FloatingCart";
import OrientationForm from "../../components/OrientationForm/orientationForm";
import { CheckoutView } from "../../components/NewCheckout";
import { ThemedGlowButton } from '../../styles/swan-theme-utils';
import SectionVideoBackground from "../../components/ui/backgrounds/SectionVideoBackground";

// EW Design Tokens
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
  warningRed: '#ff416c',
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

// Keyframe animations
const spinnerAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Styled Components
const GalaxyContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  background: ${T.bg};
  color: ${T.text};
  z-index: 1;
  min-height: 100vh;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(2px 2px at 20px 30px, rgba(0, 212, 170, 0.6), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(240, 248, 255, 0.5), transparent),
      radial-gradient(1px 1px at 130px 80px, rgba(0, 212, 170, 0.4), transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    opacity: 0.15;
    pointer-events: none;
    z-index: -1;
  }
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 5;
  padding: 0;
`;

const AuthBanner = styled.div`
  position: fixed;
  top: 56px;
  left: 0;
  width: 100%;
  padding: 12px 1rem;
  background: ${T.surface};
  color: ${T.text};
  text-align: center;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.9rem;
  backdrop-filter: blur(15px);
  z-index: 999;
  border-bottom: 1px solid rgba(0, 212, 170, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  letter-spacing: 0.5px;
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
    border: 4px solid rgba(0, 212, 170, 0.1);
    border-left: 4px solid rgba(0, 212, 170, 0.8);
    border-radius: 50%;
    ${noMotion}

    @media (prefers-reduced-motion: no-preference) {
      animation: ${spinnerAnimation} 1s linear infinite;
    }
  }

  .loading-text {
    color: ${T.textSecondary};
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    font-size: 1.1rem;
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
  text-align: center;

  .error-title {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 1.5rem;
    color: ${T.warningRed};
    margin-bottom: 0.5rem;
  }

  .error-message {
    color: ${T.textSecondary};
    font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
    font-size: 1.1rem;
    max-width: 600px;
  }

  .retry-button {
    margin-top: 1rem;
  }
`;

const SectionContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }

  @media (max-width: 480px) {
    padding: 2.5rem 0.75rem;
  }
`;

const PackagesWrapper = styled.div`
  position: relative;
  overflow: hidden;
`;

const ConsultationButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  position: relative;
  z-index: 20;
  padding-top: 2rem;
  padding-bottom: 5rem;
`;

// Button motion props
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

// Helper function to assign themes based on package order
const getThemeForPackage = (order: number): string => {
  const themes = ['ruby', 'emerald', 'cosmic', 'purple'];
  return themes[(order - 1) % themes.length];
};

// Main Optimized StoreFront Component
const OptimizedGalaxyStoreFront: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();

  // Temporarily disabled toast due to provider timing issues
  // const { toast } = useToast();
  // FIXED: Use useCallback to prevent infinite re-render loop
  const toast = useCallback((options: {title: string, description: string, variant?: string}) => {
    console.log('Toast:', options.title, options.description);
    // Fallback: could show alert or custom notification
  }, []);

  // State Management (Optimized)
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  const [showPulse, setShowPulse] = useState(false);
  
  // API-based package state
  const [packages, setPackages] = useState<StoreItem[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);

  // Computed values
  const canViewPrices = isAuthenticated && !!user;
  const canPurchase = canViewPrices;
  const cartItemCount = cart?.itemCount || 0;

  // Stable callback for fetching packages
  const fetchPackages = useCallback(async () => {
    try {
      setIsLoadingPackages(true);
      setPackagesError(null);

      console.log('🔄 Fetching packages from API...');
      const response = await api.get('/api/storefront');

      console.log('📦 API response:', response.data);

      // Handle different response formats
      const packagesData = Array.isArray(response.data)
        ? response.data
        : response.data.items || response.data.packages || response.data.data || [];

      if (packagesData.length === 0) {
        throw new Error('No packages returned from API');
      }

      // Map database packages to frontend format
      const fetchedPackages: StoreItem[] = packagesData.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        packageType: pkg.packageType || 'fixed',
        sessions: pkg.sessions,
        months: pkg.months,
        sessionsPerWeek: pkg.sessionsPerWeek,
        totalSessions: pkg.totalSessions || pkg.sessions,
        pricePerSession: parseFloat(pkg.pricePerSession || 0),
        price: parseFloat(pkg.totalCost || pkg.price || 0),
        displayPrice: parseFloat(pkg.totalCost || pkg.price || 0),
        imageUrl: pkg.imageUrl || `/assets/images/package-${pkg.id}.jpg`,
        theme: getThemeForPackage(pkg.displayOrder || pkg.id),
        isActive: pkg.isActive !== false,
        displayOrder: pkg.displayOrder || pkg.id
      }));

      setPackages(fetchedPackages);
      console.log('✅ Loaded', fetchedPackages.length, 'packages from database');
    } catch (error: any) {
      console.error('❌ Failed to fetch packages from API, using fallback data:', error);

      // FALLBACK: Use local data with correct database IDs (50-57)
      const fallbackPackages: StoreItem[] = [
        {
          id: 50,
          name: "Silver Swan Wing",
          description: "Perfect for clients starting their luxury fitness journey",
          packageType: "fixed",
          sessions: 1,
          pricePerSession: 175,
          price: 175,
          displayPrice: 175,
          totalSessions: 1,
          imageUrl: "/assets/images/single-session.jpg",
          theme: "ruby",
          isActive: true,
          displayOrder: 1
        },
        {
          id: 51,
          name: "Golden Swan Flight",
          description: "Perfect starter package with 8 premium training sessions.",
          packageType: "fixed",
          sessions: 8,
          pricePerSession: 170,
          price: 1360,
          displayPrice: 1360,
          totalSessions: 8,
          imageUrl: "/assets/images/silver-package.jpg",
          theme: "emerald",
          isActive: true,
          displayOrder: 2
        },
        {
          id: 52,
          name: "Sapphire Swan Soar",
          description: "Comprehensive training with 20 sessions for serious results.",
          packageType: "fixed",
          sessions: 20,
          pricePerSession: 165,
          price: 3300,
          displayPrice: 3300,
          totalSessions: 20,
          imageUrl: "/assets/images/gold-package.jpg",
          theme: "cosmic",
          isActive: true,
          displayOrder: 3
        },
        {
          id: 53,
          name: "Platinum Swan Grace",
          description: "Ultimate transformation with 50 premium sessions.",
          packageType: "fixed",
          sessions: 50,
          pricePerSession: 160,
          price: 8000,
          displayPrice: 8000,
          totalSessions: 50,
          imageUrl: "/assets/images/platinum-package.jpg",
          theme: "purple",
          isActive: true,
          displayOrder: 4
        },
        {
          id: 54,
          name: "Emerald Swan Evolution",
          description: "Intensive 3-month program with 4 sessions per week.",
          packageType: "monthly",
          months: 3,
          sessionsPerWeek: 4,
          totalSessions: 48,
          pricePerSession: 155,
          price: 7440,
          displayPrice: 7440,
          imageUrl: "/assets/images/3-month-package.jpg",
          theme: "emerald",
          isActive: true,
          displayOrder: 5
        },
        {
          id: 55,
          name: "Diamond Swan Dynasty",
          description: "Build lasting habits with 6 months of consistent training.",
          packageType: "monthly",
          months: 6,
          sessionsPerWeek: 4,
          totalSessions: 96,
          pricePerSession: 150,
          price: 14400,
          displayPrice: 14400,
          imageUrl: "/assets/images/6-month-package.jpg",
          theme: "cosmic",
          isActive: true,
          displayOrder: 6
        },
        {
          id: 56,
          name: "Ruby Swan Reign",
          description: "Complete lifestyle transformation over 9 months.",
          packageType: "monthly",
          months: 9,
          sessionsPerWeek: 4,
          totalSessions: 144,
          pricePerSession: 145,
          price: 20880,
          displayPrice: 20880,
          imageUrl: "/assets/images/9-month-package.jpg",
          theme: "ruby",
          isActive: true,
          displayOrder: 7
        },
        {
          id: 57,
          name: "Rhodium Swan Royalty",
          description: "The ultimate yearly commitment for maximum results.",
          packageType: "monthly",
          months: 12,
          sessionsPerWeek: 4,
          totalSessions: 192,
          pricePerSession: 140,
          price: 26880,
          displayPrice: 26880,
          imageUrl: "/assets/images/12-month-package.jpg",
          theme: "purple",
          isActive: true,
          displayOrder: 8
        }
      ];

      setPackages(fallbackPackages);
      console.log('✅ Loaded', fallbackPackages.length, 'fallback packages with correct IDs (50-57)');

      setPackagesError(error.message || 'Failed to load packages');
    } finally {
      setIsLoadingPackages(false);
    }
  }, [toast]);

  // Stable event handlers (Optimized to prevent re-render loops)
  const handleBookConsultation = useCallback(() => {
    setShowOrientation(true);
  }, []);

  const handleViewPackages = useCallback(() => {
    document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleTogglePrice = useCallback((packageId: number) => {
    setRevealPrices(prev => ({ ...prev, [packageId]: !prev[packageId] }));
  }, []);

  const handleToggleCart = useCallback(() => {
    setShowCart(prev => !prev);
  }, []);

  const handleHideCart = useCallback(() => {
    setShowCart(false);
  }, []);

  const handleAddToCart = useCallback(async (pkg: StoreItem) => {
    console.log('📦 handleAddToCart called with:', {
      id: pkg.id,
      name: pkg.name,
      hasId: pkg.id !== undefined
    });
    
    if (!canPurchase) {
      toast({ 
        title: "Login Required", 
        description: "Please log in to purchase packages.", 
        variant: "destructive" 
      });
      return;
    }

    if (!pkg.id || pkg.id === undefined || pkg.id === null) {
      console.error('🚨 CART ERROR: Package ID is invalid!', { id: pkg.id, name: pkg.name });
      toast({ 
        title: "Error", 
        description: "Invalid package data - missing ID. Please refresh the page.", 
        variant: "destructive" 
      });
      return;
    }

    const cartData = {
      id: pkg.id,
      quantity: 1
    };

    setIsAddingToCart(pkg.id);
    try {
      console.log(`🛒 Adding package to cart:`, { packageId: pkg.id, packageName: pkg.name });
      await addToCart(cartData);
      setTimeout(() => refreshCart(), 500);
      toast({ title: "Success!", description: `Added ${pkg.name} to cart.` });
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 1600);
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      const message = error?.message || "Failed to add item. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsAddingToCart(null);
    }
  }, [toast, addToCart, refreshCart, canPurchase]);

  // Effects (Optimized)
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    if (user?.id && isAuthenticated) {
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isAuthenticated, refreshCart]);

  // Memoized computed values to prevent unnecessary re-calculations
  const hasPackages = useMemo(() => packages.length > 0, [packages.length]);

  // Render loading state
  if (isLoadingPackages) {
    return (
      <MotionConfig reducedMotion="user">
        <GalaxyContainer>
          {!isAuthenticated && (
            <AuthBanner>
              Please login or register to view pricing and purchase training packages
            </AuthBanner>
          )}
          <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
            <SectionContainer>
              <LoadingContainer>
                <div className="spinner"></div>
                <div className="loading-text">Loading premium training packages...</div>
              </LoadingContainer>
            </SectionContainer>
          </ContentOverlay>
        </GalaxyContainer>
      </MotionConfig>
    );
  }

  // Render error state
  if (packagesError && packages.length === 0) {
    return (
      <MotionConfig reducedMotion="user">
        <GalaxyContainer>
          {!isAuthenticated && (
            <AuthBanner>
              Please login or register to view pricing and purchase training packages
            </AuthBanner>
          )}
          <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
            <SectionContainer>
              <ErrorContainer>
                <div className="error-title">Failed to Load Packages</div>
                <div className="error-message">
                  We couldn't load the training packages. Please try again.
                </div>
                <div className="retry-button">
                  <ThemedGlowButton
                    text="Retry Loading"
                    variant="primary"
                    size="medium"
                    onClick={fetchPackages}
                  />
                </div>
              </ErrorContainer>
            </SectionContainer>
          </ContentOverlay>
        </GalaxyContainer>
      </MotionConfig>
    );
  }

  // Main render
  return (
    <MotionConfig reducedMotion="user">
      <GalaxyContainer>
        {!isAuthenticated && (
          <AuthBanner>
            Please login or register to view pricing and purchase training packages
          </AuthBanner>
        )}

        <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
          <HeroSection
            onBookConsultation={handleBookConsultation}
            onViewPackages={handleViewPackages}
          />

          {hasPackages && (
            <PackagesWrapper>
              <SectionVideoBackground
                src="/swan-golden.mp4"
                fallbackGradient={`linear-gradient(135deg, ${T.bg} 0%, #1a1a3c 100%)`}
                overlayOpacity={0.55}
                overlayGradient="linear-gradient(to bottom, rgba(10, 10, 26, 0.65) 0%, rgba(10, 10, 26, 0.5) 50%, rgba(10, 10, 26, 0.65) 100%)"
              />
              <PackagesGrid
                packages={packages}
                canViewPrices={canViewPrices}
                canPurchase={canPurchase}
                revealPrices={revealPrices}
                isAddingToCart={isAddingToCart}
                onTogglePrice={handleTogglePrice}
                onAddToCart={handleAddToCart}
              />

              <SectionContainer>
                <ConsultationButtonContainer>
                  <ThemedGlowButton
                    text="Schedule Consultation"
                    variant="primary"
                    size="large"
                    onClick={handleBookConsultation}
                    {...buttonMotionProps}
                  />
                </ConsultationButtonContainer>
              </SectionContainer>
            </PackagesWrapper>
          )}
        </ContentOverlay>

        <FloatingCart
          isAuthenticated={isAuthenticated}
          cartItemCount={cartItemCount}
          showPulse={showPulse}
          onToggleCart={handleToggleCart}
        />

        <AnimatePresence mode="wait">
          {showOrientation && (
            <OrientationForm
              key="orientation-modal"
              onClose={() => setShowOrientation(false)}
            />
          )}
          {showCart && (
            <CheckoutView
              key="checkout-modal"
              onCancel={handleHideCart}
              onSuccess={() => {
                console.log('Checkout completed successfully');
                handleHideCart();
                toast({
                  title: "Success!",
                  description: "Your training package purchase is complete!"
                });
              }}
            />
          )}
        </AnimatePresence>
      </GalaxyContainer>
    </MotionConfig>
  );
};

export default OptimizedGalaxyStoreFront;
