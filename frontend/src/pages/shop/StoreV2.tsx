/**
 * StoreV2.tsx - Cinematic Theme-Aware Store Page
 * =================================================
 * V2 store page using the Crystalline Swan theme system with cinematic
 * scroll-reveal animations, parallax hero, and typewriter text.
 *
 * Architecture:
 * - ParallaxHero: Swans.mp4 video background with logo + CTAs
 * - PackagesSection: swan-golden.mp4 background, reuses PackagesGrid
 * - Consultation CTA: Final call-to-action section
 * - FloatingCart: Reused from existing components
 *
 * Data Flow:
 * - Fetches packages from /api/storefront (same as OptimizedGalaxyStoreFront)
 * - Shows an honest retry state on API error; never sells local fallback packages
 * - Uses useAuth() and useCart() for authentication and cart state
 *
 * Theme:
 * - ALL colors derived from styled-components theme via ${({ theme }) => ...}
 * - Supports all four Crystalline Swan variants
 * - Glass effects gated on theme.effects.glassmorphism
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Context and Service Imports
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUniversalTheme } from '../../context/ThemeContext/UniversalThemeContext';
import api from '../../services/api.service';
import { VIDEO } from '../../config/videoAssets';
import { YEARS_EXPERIENCE_CLAIM } from '../../content/marketingStats';

// Cinematic UI Components
import ScrollReveal from '../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../components/ui-kit/cinematic/TypewriterText';
import ParallaxHero from '../../components/ui-kit/cinematic/ParallaxHero';
import SectionDivider from '../../components/ui-kit/cinematic/SectionDivider';

// Existing Store Components
import PackagesGrid from './components/PackagesGrid';
import FloatingCart from './components/FloatingCart';
import useCartDeepLink from './useCartDeepLink';
import OrientationForm from '../../components/OrientationForm/orientationForm';
import { CheckoutView } from '../../components/NewCheckout';
import SectionVideoBackground from '../../components/ui/backgrounds/SectionVideoBackground';
import { logger } from '@/utils/logger';
import { mapStorefrontItemToStoreItem } from './components/storeCatalog';
import type { ProductVariant, StoreItem } from './components/storeCatalog.types';
import { StyledBox } from '@/components/ui/StyledBox';

// ============================================================
// Helper: Theme assignment by display order
// ============================================================
const getThemeForPackage = (order: number): string => {
  const themes = ['ruby', 'emerald', 'cosmic', 'purple'];
  return themes[(order - 1) % themes.length];
};

// ============================================================
// Reduced motion helper
// ============================================================
const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// ============================================================
// Keyframes
// ============================================================
const spinnerSpin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const subtleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
`;

// ============================================================
// Styled Components — All colours from theme
// ============================================================

const StoreContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  background: ${({ theme }) => theme.background?.primary || '#001545'};
  color: ${({ theme }) => theme.text?.primary || '#E0ECF4'};
  min-height: 100vh;
  z-index: 1;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(2px 2px at 20px 30px, ${({ theme }) => theme.colors?.primary || '#60C0F0'}99, transparent),
      radial-gradient(1px 1px at 90px 40px, ${({ theme }) => theme.text?.primary || '#E0ECF4'}80, transparent),
      radial-gradient(1px 1px at 130px 80px, ${({ theme }) => theme.colors?.primary || '#60C0F0'}66, transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    opacity: 0.1;
    pointer-events: none;
    z-index: -1;
  }
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 5;
  padding: 0;
`;

// ---- Hero Inner Content ----

const HeroContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const HeroLogo = styled.img`
  border-radius: 50%;
  width: 120px;
  border-radius: 50%;
  height: auto;
  filter: drop-shadow(0 0 20px ${({ theme }) => theme.colors?.primary || '#60C0F0'}60);
  ${noMotion}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${subtleFloat} 4s ease-in-out infinite;
  }

  @media (max-width: 430px) {
    width: 90px;
  }
`;

const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts?.drama || '"Cormorant Garamond", Georgia, serif'};
  font-size: 3.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text?.heading || '#E0ECF4'};
  text-shadow: 0 2px 20px ${({ theme }) => theme.colors?.primary || '#60C0F0'}40;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }

  @media (max-width: 430px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled.p`
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 1.2rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(224,236,244,0.85)'};
  max-width: 600px;
  line-height: 1.6;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1rem;
  }

  @media (max-width: 430px) {
    font-size: 0.95rem;
  }
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.5rem;

  @media (max-width: 430px) {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }
`;

const HeroButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 1rem;
  font-weight: 600;
  padding: 14px 32px;
  border-radius: 50px;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  ${noMotion}

  ${({ $variant, theme }) =>
    $variant === 'secondary'
      ? css`
          background: transparent;
          color: ${theme.text?.primary || '#E0ECF4'};
          border: 1px solid ${theme.borders?.elegant || 'rgba(96,192,240,0.2)'};
          ${theme.effects?.glassmorphism
            ? css`backdrop-filter: blur(10px); background: ${theme.background?.surface || 'rgba(0,48,128,0.3)'};`
            : ''}

          &:hover {
            border-color: ${theme.colors?.primary || '#60C0F0'};
            background: ${theme.background?.elevated || 'rgba(0,48,128,0.4)'};
            box-shadow: ${theme.shadows?.primary || '0 0 25px rgba(96,192,240,0.25)'};
          }
        `
      : css`
          background: ${theme.gradients?.primary || 'linear-gradient(135deg, #001545, #60C0F0)'};
          color: ${theme.colors?.white || '#E0ECF4'};
          border: none;
          box-shadow: ${theme.shadows?.button || '0 4px 20px rgba(96,192,240,0.3)'};

          &:hover {
            transform: translateY(-2px);
            box-shadow: ${theme.shadows?.elevation || '0 15px 35px rgba(0,0,0,0.5)'};
          }
        `}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors?.primary || '#60C0F0'};
    outline-offset: 3px;
  }

  &:active {
    transform: scale(0.97);
  }

  @media (max-width: 430px) {
    width: 100%;
    padding: 14px 24px;
  }
`;

// ---- Auth Banner ----

const AuthBanner = styled.div`
  position: fixed;
  top: 56px;
  left: 0;
  width: 100%;
  padding: 12px 1rem;
  background: ${({ theme }) => theme.background?.surface || 'rgba(0,48,128,0.6)'};
  color: ${({ theme }) => theme.text?.primary || '#E0ECF4'};
  text-align: center;
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 0.9rem;
  z-index: 999;
  border-bottom: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(96,192,240,0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  letter-spacing: 0.5px;
  ${({ theme }) =>
    theme.effects?.glassmorphism
      ? css`backdrop-filter: blur(15px);`
      : ''}
`;

// ---- Packages Section ----

const PackagesWrapper = styled.section`
  position: relative;
  overflow: hidden;
`;

const PackagesSectionHeader = styled.div`
  text-align: center;
  padding: 4rem 2rem 1rem;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    padding: 3rem 1rem 0.5rem;
  }

  @media (max-width: 430px) {
    padding: 2rem 0.75rem 0.5rem;
  }
`;

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts?.drama || '"Cormorant Garamond", Georgia, serif'};
  font-size: 2.8rem;
  font-weight: 600;
  font-style: italic;
  margin-bottom: 1rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.text?.heading || '#E0ECF4'} 0%,
    ${({ theme }) => theme.colors?.primary || '#60C0F0'} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2.2rem;
  }

  @media (max-width: 430px) {
    font-size: 1.8rem;
  }
`;

const SectionSubtitle = styled.p`
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(224,236,244,0.85)'};
  line-height: 1.6;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

// ---- CTA Section ----

const CTASection = styled.section`
  position: relative;
  z-index: 10;
  padding: 5rem 2rem;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }

  @media (max-width: 430px) {
    padding: 2.5rem 0.75rem;
  }
`;

const CTAHeading = styled.h2`
  font-family: ${({ theme }) => theme.fonts?.drama || '"Cormorant Garamond", Georgia, serif'};
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text?.heading || '#E0ECF4'};
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }

  @media (max-width: 430px) {
    font-size: 1.6rem;
  }
`;

const CTADescription = styled.p`
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(224,236,244,0.85)'};
  line-height: 1.7;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const CTAButton = styled.button`
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 1.1rem;
  font-weight: 600;
  padding: 16px 40px;
  border-radius: 50px;
  border: none;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #001545, #60C0F0)'};
  color: ${({ theme }) => theme.colors?.white || '#E0ECF4'};
  box-shadow: ${({ theme }) => theme.shadows?.button || '0 4px 20px rgba(96,192,240,0.3)'};
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  ${noMotion}

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${({ theme }) => theme.shadows?.elevation || '0 15px 35px rgba(0,0,0,0.5)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors?.primary || '#60C0F0'};
    outline-offset: 3px;
  }

  &:active {
    transform: scale(0.97);
  }

  @media (max-width: 430px) {
    width: 100%;
    max-width: 300px;
    padding: 14px 32px;
  }
`;

// ---- Loading / Error States ----

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid ${({ theme }) => theme.borders?.subtle || 'rgba(96,192,240,0.1)'};
  border-left: 4px solid ${({ theme }) => theme.colors?.primary || '#60C0F0'};
  border-radius: 50%;
  ${noMotion}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${spinnerSpin} 1s linear infinite;
  }
`;

const LoadingText = styled.div`
  color: ${({ theme }) => theme.text?.muted || 'rgba(224,236,244,0.6)'};
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 1.1rem;
`;

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
`;

const ErrorTitle = styled.div`
  font-family: ${({ theme }) => theme.fonts?.drama || '"Cormorant Garamond", Georgia, serif'};
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors?.error || '#FF6B6B'};
  margin-bottom: 0.5rem;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.text?.muted || 'rgba(224,236,244,0.6)'};
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 1.1rem;
  max-width: 600px;
`;

const RetryButton = styled.button`
  font-family: ${({ theme }) => theme.fonts?.ui || '"Sora", sans-serif'};
  font-size: 1rem;
  font-weight: 600;
  padding: 12px 28px;
  border-radius: 50px;
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(96,192,240,0.2)'};
  background: ${({ theme }) => theme.background?.surface || 'rgba(0,48,128,0.6)'};
  color: ${({ theme }) => theme.text?.primary || '#E0ECF4'};
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors?.primary || '#60C0F0'};
    box-shadow: ${({ theme }) => theme.shadows?.primary || '0 0 25px rgba(96,192,240,0.25)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors?.primary || '#60C0F0'};
    outline-offset: 3px;
  }
`;

// ============================================================
// Main Component
// ============================================================
const StoreV2: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  useUniversalTheme();

  // Toast fallback (same pattern as original store)
  const toast = useCallback(
    (options: { title: string; description: string; variant?: string }) => {
      logger.log('Toast:', options.title, options.description);
    },
    []
  );

  // State
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  const [showPulse, setShowPulse] = useState(false);

  // API-based package state
  const [packages, setPackages] = useState<StoreItem[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  // Launch P1-1: price visibility is SERVER truth (admin-granted store-prices
  // flag) — being logged in no longer reveals prices.
  const [pricesVisible, setPricesVisible] = useState(false);

  // Computed
  const canViewPrices = pricesVisible;
  const canPurchase = pricesVisible && isAuthenticated && !!user;
  const cartItemCount = cart?.itemCount || 0;

  // ----------------------------------------------------------
  // Data Fetching (same logic as OptimizedGalaxyStoreFront)
  // ----------------------------------------------------------
  const fetchPackages = useCallback(async () => {
    try {
      setIsLoadingPackages(true);
      setPackagesError(null);

      const response = await api.get('/api/storefront');

      setPricesVisible(response.data?.pricesVisible === true);

      const packagesData = Array.isArray(response.data)
        ? response.data
        : response.data.items || response.data.packages || response.data.data || [];

      if (packagesData.length === 0) {
        throw new Error('No packages returned from API');
      }

      const fetchedPackages: StoreItem[] = packagesData.map((pkg: any) =>
        mapStorefrontItemToStoreItem(pkg, getThemeForPackage(pkg.displayOrder || pkg.id))
      );

      setPackages(fetchedPackages);
    } catch (error: any) {
      logger.warn('Failed to fetch live storefront packages:', error);
      setPackages([]);
      // Never render the raw throw: axios yields "Network Error" / "Request
      // failed with status code 500", and this surface is the first thing cold
      // traffic sees. The detail belongs in the log, not on the storefront.
      setPackagesError('Failed to load packages');
    } finally {
      setIsLoadingPackages(false);
    }
  }, []);

  // ----------------------------------------------------------
  // Event Handlers (stable callbacks)
  // ----------------------------------------------------------
  const handleBookConsultation = useCallback(() => {
    setShowOrientation(true);
  }, []);

  const handleViewPackages = useCallback(() => {
    document.getElementById('packages-section')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleTogglePrice = useCallback((packageId: number) => {
    setRevealPrices((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  }, []);

  const handleToggleCart = useCallback(() => {
    setShowCart((prev) => !prev);
  }, []);

  const handleHideCart = useCallback(() => {
    setShowCart(false);
  }, []);

  // Checkout-cancel recovery deep link. StoreV2 is the lazy-import fallback, so
  // a buyer who abandoned a payment can land HERE when the primary chunk fails —
  // without this they get the closed-cart dead end the fix was meant to remove.
  useCartDeepLink(isAuthenticated, useCallback(() => setShowCart(true), []));

  const handleAddToCart = useCallback(
    async (pkg: StoreItem, productVariant?: ProductVariant | null) => {
      if (!canPurchase) {
        toast({
          title: 'Login Required',
          description: 'Please log in to purchase packages.',
          variant: 'destructive',
        });
        return;
      }

      if (!pkg.id) {
        toast({
          title: 'Error',
          description: 'Invalid package data - missing ID. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }

      setIsAddingToCart(pkg.id);
      try {
        await addToCart({
          id: pkg.id,
          quantity: 1,
          productVariantId: productVariant?.id,
          name: productVariant ? `${pkg.name} - ${productVariant.label}` : pkg.name,
        });
        setTimeout(() => refreshCart(), 500);
        toast({
          title: 'Success!',
          description: `Added ${productVariant ? `${pkg.name} - ${productVariant.label}` : pkg.name} to cart.`,
        });
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1600);
      } catch (error: any) {
        const message = error?.message || 'Failed to add item. Please try again.';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setIsAddingToCart(null);
      }
    },
    [toast, addToCart, refreshCart, canPurchase]
  );

  // ----------------------------------------------------------
  // Effects
  // ----------------------------------------------------------
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    if (user?.id && isAuthenticated) {
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isAuthenticated, refreshCart]);

  const hasPackages = useMemo(() => packages.length > 0, [packages.length]);

  // ----------------------------------------------------------
  // Loading State
  // ----------------------------------------------------------
  if (isLoadingPackages) {
    return (
      <StoreContainer>
        {!isAuthenticated && (
          <AuthBanner>
            Please login or register to view pricing and purchase training packages
          </AuthBanner>
        )}
        <StyledBox as={ContentOverlay} $style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
          <LoadingContainer>
            <Spinner />
            <LoadingText>Loading premium training packages...</LoadingText>
          </LoadingContainer>
        </StyledBox>
      </StoreContainer>
    );
  }

  // ----------------------------------------------------------
  // Error State (only if no fallback data loaded)
  // ----------------------------------------------------------
  if (packagesError && packages.length === 0) {
    return (
      <StoreContainer>
        {!isAuthenticated && (
          <AuthBanner>
            Please login or register to view pricing and purchase training packages
          </AuthBanner>
        )}
        <StyledBox as={ContentOverlay} $style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
          <ErrorContainer>
            <ErrorTitle>Failed to Load Packages</ErrorTitle>
            <ErrorMessage>
              We couldn&apos;t load the training packages. Please try again.
            </ErrorMessage>
            <RetryButton onClick={fetchPackages}>Retry Loading</RetryButton>
          </ErrorContainer>
        </StyledBox>
      </StoreContainer>
    );
  }

  // ----------------------------------------------------------
  // Main Render
  // ----------------------------------------------------------
  return (
    <StoreContainer>
      {/* Auth Banner */}
      {!isAuthenticated && (
        <AuthBanner>
          Please login or register to view pricing and purchase training packages
        </AuthBanner>
      )}

      <StyledBox as={ContentOverlay} $style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
        {/* ============================================ */}
        {/* 1. PARALLAX HERO SECTION                     */}
        {/* ============================================ */}
        <ParallaxHero
          videoSrc={VIDEO.swans}
          overlayOpacity={0.55}
          minHeight="100vh"
        >
          <HeroContent>
            <ScrollReveal direction="up" delay={0} duration={0.8}>
              <HeroLogo src="/Logo.png" alt="SwanStudios Logo" />
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3} duration={0.8}>
              <HeroTitle>
                <TypewriterText
                  text="Elite Training by Sean Swan"
                  speed={45}
                  delay={500}
                  as="span"
                />
              </HeroTitle>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.6} duration={0.8}>
              <HeroSubtitle>
                {YEARS_EXPERIENCE_CLAIM} Years of Experience &amp; NASM-Guided Protocols
              </HeroSubtitle>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.9} duration={0.8}>
              <HeroButtons>
                <HeroButton $variant="primary" onClick={handleBookConsultation}>
                  Book Consultation
                </HeroButton>
                <HeroButton $variant="secondary" onClick={handleViewPackages}>
                  View Packages
                </HeroButton>
              </HeroButtons>
            </ScrollReveal>
          </HeroContent>
        </ParallaxHero>

        <SectionDivider />

        {/* ============================================ */}
        {/* 2. PACKAGES SECTION                          */}
        {/* ============================================ */}
        {hasPackages && (
          <PackagesWrapper id="packages-section">
            {/* Video background layer */}
            <SectionVideoBackground
              src={VIDEO.swanGolden}
              fallbackGradient={`linear-gradient(135deg, var(--bg-primary, #001545) 0%, var(--bg-secondary, #002060) 100%)`}
              overlayOpacity={0.55}
              overlayGradient="linear-gradient(to bottom, rgba(0,21,69,0.65) 0%, rgba(0,21,69,0.5) 50%, rgba(0,21,69,0.65) 100%)"
            />

            <ScrollReveal direction="up" delay={0.1} duration={0.7}>
              <PackagesSectionHeader>
                <SectionTitle>
                  <TypewriterText
                    text="Premium Training Packages"
                    speed={40}
                    delay={200}
                    as="span"
                  />
                </SectionTitle>
                <SectionSubtitle>
                  Invest in your transformation with our curated training programs,
                  designed by a 26+ year veteran of elite fitness coaching.
                </SectionSubtitle>
              </PackagesSectionHeader>
            </ScrollReveal>

            {/* Reuse existing PackagesGrid with same props */}
            <PackagesGrid
              packages={packages}
              canViewPrices={canViewPrices}
              canPurchase={canPurchase}
              revealPrices={revealPrices}
              isAddingToCart={isAddingToCart}
              onTogglePrice={handleTogglePrice}
              onAddToCart={handleAddToCart}
            />
          </PackagesWrapper>
        )}

        <SectionDivider />

        {/* ============================================ */}
        {/* 3. CONSULTATION CTA SECTION                  */}
        {/* ============================================ */}
        <ScrollReveal direction="up" delay={0.1} duration={0.8}>
          <CTASection>
            <CTAHeading>
              <TypewriterText
                text="Ready to Start Your Transformation?"
                speed={35}
                delay={100}
                as="span"
              />
            </CTAHeading>
            <CTADescription>
              Take the first step towards becoming the best version of yourself.
              Schedule a complimentary consultation with Sean Swan and discover the
              training program that&apos;s right for you.
            </CTADescription>
            <CTAButton onClick={handleBookConsultation}>
              Schedule Your Free Consultation
            </CTAButton>
          </CTASection>
        </ScrollReveal>
      </StyledBox>

      {/* ============================================ */}
      {/* 4. FLOATING CART (reused component)           */}
      {/* ============================================ */}
      <FloatingCart
        isAuthenticated={isAuthenticated}
        cartItemCount={cartItemCount}
        showPulse={showPulse}
        onToggleCart={handleToggleCart}
      />

      {/* ============================================ */}
      {/* MODALS                                        */}
      {/* ============================================ */}
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
              handleHideCart();
              toast({
                title: 'Success!',
                description: 'Your training package purchase is complete!',
              });
            }}
          />
        )}
      </AnimatePresence>
    </StoreContainer>
  );
};

export default StoreV2;
