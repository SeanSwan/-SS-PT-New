/**
 * StoreV3.tsx - Enhanced Cinematic Theme-Aware Store Page
 * =======================================================
 * V3 store page building on V2 with visual-only enhancements:
 * - Noise overlay using inline SVG feTurbulence for subtle texture
 * - ParallaxHero poster image for faster perceived load
 * - Extended responsive breakpoints (320px, 2560px, 3840px)
 *
 * CRITICAL: All cart logic, API calls, checkout flow, and data handling
 * are IDENTICAL to StoreV2. Only visual/layout changes were made.
 *
 * Architecture:
 * - ParallaxHero: Swans.mp4 video background with poster + logo + CTAs
 * - PackagesSection: swan-golden.mp4 background, reuses PackagesGrid
 * - Consultation CTA: Final call-to-action section
 * - FloatingCart: Reused from existing components
 * - NoiseOverlay: Fixed SVG feTurbulence pattern for subtle grain
 *
 * Data Flow:
 * - Fetches packages from /api/storefront (same as OptimizedGalaxyStoreFront)
 * - Falls back to local hardcoded data on API error
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

// Cinematic UI Components
import ScrollReveal from '../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../components/ui-kit/cinematic/TypewriterText';
import ParallaxHero from '../../components/ui-kit/cinematic/ParallaxHero';
import SectionDivider from '../../components/ui-kit/cinematic/SectionDivider';

// Existing Store Components
import PackagesGrid from './components/PackagesGrid';
import FloatingCart from './components/FloatingCart';
import OrientationForm from '../../components/OrientationForm/orientationForm';
import { CheckoutView } from '../../components/NewCheckout';
import SectionVideoBackground from '../../components/ui/backgrounds/SectionVideoBackground';

// ============================================================
// Package Interface (matches PackagesGrid / PackageCard)
// ============================================================
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
// Noise Overlay Component (V3 addition)
// ============================================================
const NoiseOverlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
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

  /* V3: Extra-small screens */
  @media (max-width: 320px) {
    font-size: 14px;
  }

  /* V3: 2560px ultrawide */
  @media (min-width: 2560px) {
    max-width: 2560px;
    margin: 0 auto;
  }

  /* V3: 4K ultrawide */
  @media (min-width: 3840px) {
    max-width: 3840px;
    margin: 0 auto;
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
  width: 120px;
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

  /* V3: Extra-small screens */
  @media (max-width: 320px) {
    padding: 1.5rem 0.5rem 0.5rem;
    max-width: 100%;
  }

  /* V3: 2560px ultrawide */
  @media (min-width: 2560px) {
    max-width: 1200px;
  }

  /* V3: 4K ultrawide */
  @media (min-width: 3840px) {
    max-width: 1600px;
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

  /* V3: Extra-small screens */
  @media (max-width: 320px) {
    padding: 2rem 0.5rem;
    max-width: 100%;
  }

  /* V3: 2560px ultrawide */
  @media (min-width: 2560px) {
    max-width: 1200px;
  }

  /* V3: 4K ultrawide */
  @media (min-width: 3840px) {
    max-width: 1600px;
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
const StoreV3: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  const { currentTheme } = useUniversalTheme();

  // Toast fallback (same pattern as original store)
  const toast = useCallback(
    (options: { title: string; description: string; variant?: string }) => {
      console.log('Toast:', options.title, options.description);
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

  // Computed
  const canViewPrices = isAuthenticated && !!user;
  const canPurchase = canViewPrices;
  const cartItemCount = cart?.itemCount || 0;

  // ----------------------------------------------------------
  // Data Fetching (same logic as OptimizedGalaxyStoreFront)
  // ----------------------------------------------------------
  const fetchPackages = useCallback(async () => {
    try {
      setIsLoadingPackages(true);
      setPackagesError(null);

      const response = await api.get('/api/storefront');

      const packagesData = Array.isArray(response.data)
        ? response.data
        : response.data.items || response.data.packages || response.data.data || [];

      if (packagesData.length === 0) {
        throw new Error('No packages returned from API');
      }

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
        displayOrder: pkg.displayOrder || pkg.id,
      }));

      setPackages(fetchedPackages);
    } catch (error: any) {
      console.error('Failed to fetch packages from API, using fallback data:', error);

      const fallbackPackages: StoreItem[] = [
        {
          id: 50,
          name: 'Silver Swan Wing',
          description: 'Perfect for clients starting their luxury fitness journey',
          packageType: 'fixed',
          sessions: 1,
          pricePerSession: 175,
          price: 175,
          displayPrice: 175,
          totalSessions: 1,
          imageUrl: '/assets/images/single-session.jpg',
          theme: 'ruby',
          isActive: true,
          displayOrder: 1,
        },
        {
          id: 51,
          name: 'Golden Swan Flight',
          description: 'Perfect starter package with 8 premium training sessions.',
          packageType: 'fixed',
          sessions: 8,
          pricePerSession: 170,
          price: 1360,
          displayPrice: 1360,
          totalSessions: 8,
          imageUrl: '/assets/images/silver-package.jpg',
          theme: 'emerald',
          isActive: true,
          displayOrder: 2,
        },
        {
          id: 52,
          name: 'Sapphire Swan Soar',
          description: 'Comprehensive training with 20 sessions for serious results.',
          packageType: 'fixed',
          sessions: 20,
          pricePerSession: 165,
          price: 3300,
          displayPrice: 3300,
          totalSessions: 20,
          imageUrl: '/assets/images/gold-package.jpg',
          theme: 'cosmic',
          isActive: true,
          displayOrder: 3,
        },
        {
          id: 53,
          name: 'Platinum Swan Grace',
          description: 'Ultimate transformation with 50 premium sessions.',
          packageType: 'fixed',
          sessions: 50,
          pricePerSession: 160,
          price: 8000,
          displayPrice: 8000,
          totalSessions: 50,
          imageUrl: '/assets/images/platinum-package.jpg',
          theme: 'purple',
          isActive: true,
          displayOrder: 4,
        },
        {
          id: 54,
          name: 'Emerald Swan Evolution',
          description: 'Intensive 3-month program with 4 sessions per week.',
          packageType: 'monthly',
          months: 3,
          sessionsPerWeek: 4,
          totalSessions: 48,
          pricePerSession: 155,
          price: 7440,
          displayPrice: 7440,
          imageUrl: '/assets/images/3-month-package.jpg',
          theme: 'emerald',
          isActive: true,
          displayOrder: 5,
        },
        {
          id: 55,
          name: 'Diamond Swan Dynasty',
          description: 'Build lasting habits with 6 months of consistent training.',
          packageType: 'monthly',
          months: 6,
          sessionsPerWeek: 4,
          totalSessions: 96,
          pricePerSession: 150,
          price: 14400,
          displayPrice: 14400,
          imageUrl: '/assets/images/6-month-package.jpg',
          theme: 'cosmic',
          isActive: true,
          displayOrder: 6,
        },
        {
          id: 56,
          name: 'Ruby Swan Reign',
          description: 'Complete lifestyle transformation over 9 months.',
          packageType: 'monthly',
          months: 9,
          sessionsPerWeek: 4,
          totalSessions: 144,
          pricePerSession: 145,
          price: 20880,
          displayPrice: 20880,
          imageUrl: '/assets/images/9-month-package.jpg',
          theme: 'ruby',
          isActive: true,
          displayOrder: 7,
        },
        {
          id: 57,
          name: 'Rhodium Swan Royalty',
          description: 'The ultimate yearly commitment for maximum results.',
          packageType: 'monthly',
          months: 12,
          sessionsPerWeek: 4,
          totalSessions: 192,
          pricePerSession: 140,
          price: 26880,
          displayPrice: 26880,
          imageUrl: '/assets/images/12-month-package.jpg',
          theme: 'purple',
          isActive: true,
          displayOrder: 8,
        },
      ];

      setPackages(fallbackPackages);
      setPackagesError(error.message || 'Failed to load packages');
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

  const handleAddToCart = useCallback(
    async (pkg: StoreItem) => {
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
        await addToCart({ id: pkg.id, quantity: 1 });
        setTimeout(() => refreshCart(), 500);
        toast({ title: 'Success!', description: `Added ${pkg.name} to cart.` });
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
        {/* V3: Noise overlay */}
        <NoiseOverlay />

        {!isAuthenticated && (
          <AuthBanner>
            Please login or register to view pricing and purchase training packages
          </AuthBanner>
        )}
        <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
          <LoadingContainer>
            <Spinner />
            <LoadingText>Loading premium training packages...</LoadingText>
          </LoadingContainer>
        </ContentOverlay>
      </StoreContainer>
    );
  }

  // ----------------------------------------------------------
  // Error State (only if no fallback data loaded)
  // ----------------------------------------------------------
  if (packagesError && packages.length === 0) {
    return (
      <StoreContainer>
        {/* V3: Noise overlay */}
        <NoiseOverlay />

        {!isAuthenticated && (
          <AuthBanner>
            Please login or register to view pricing and purchase training packages
          </AuthBanner>
        )}
        <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
          <ErrorContainer>
            <ErrorTitle>Failed to Load Packages</ErrorTitle>
            <ErrorMessage>
              We couldn't load the training packages. Please try again.
            </ErrorMessage>
            <RetryButton onClick={fetchPackages}>Retry Loading</RetryButton>
          </ErrorContainer>
        </ContentOverlay>
      </StoreContainer>
    );
  }

  // ----------------------------------------------------------
  // Main Render
  // ----------------------------------------------------------
  return (
    <StoreContainer>
      {/* V3: Noise overlay */}
      <NoiseOverlay />

      {/* Auth Banner */}
      {!isAuthenticated && (
        <AuthBanner>
          Please login or register to view pricing and purchase training packages
        </AuthBanner>
      )}

      <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
        {/* ============================================ */}
        {/* 1. PARALLAX HERO SECTION                     */}
        {/* ============================================ */}
        <ParallaxHero
          videoSrc="/Swans.mp4"
          imageSrc="/images/parallax/store-hero-bg.png"
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
                25+ Years of Experience &amp; NASM-Guided Protocols
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
              src="/swan-golden.mp4"
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
                  designed by a 25-year veteran of elite fitness coaching.
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
              training program that's right for you.
            </CTADescription>
            <CTAButton onClick={handleBookConsultation}>
              Schedule Your Free Consultation
            </CTAButton>
          </CTASection>
        </ScrollReveal>
      </ContentOverlay>

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

export default StoreV3;
