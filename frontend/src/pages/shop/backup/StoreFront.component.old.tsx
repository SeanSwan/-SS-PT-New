// File: frontend/src/pages/shop/StoreFront.component.tsx
// Enhanced StoreFront Component with Graduated Pricing

import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";

// --- Context Imports ---
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

// --- Component Imports ---
import GlowButton from "../../components/Button/glowButton";
import OrientationForm from "../../components/OrientationForm/orientationForm";
import ShoppingCart from "../../components/ShoppingCart/ShoppingCart";
import { useToast } from "../../hooks/use-toast";

// --- Asset Imports ---
const swanVideo = "/Swans.mp4";
const logoImg = "/Logo.png";

// --- Type Definition for API Package (StoreItem) ---
interface StoreItem {
  id: number;
  name: string;
  description: string | null;
  packageType: 'fixed' | 'monthly';
  pricePerSession?: number | null;
  sessions?: number | null;
  months?: number | null;
  sessionsPerWeek?: number | null;
  totalSessions?: number | null;
  totalCost?: number | null;
  price?: number | null;
  displayPrice: number;
  theme?: string | null;
  isActive: boolean;
  imageUrl: string | null;
  displayOrder?: number;
  includedFeatures?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// API Response structure
interface ApiResponse {
  success: boolean;
  items: StoreItem[];
}

// --- Utility Functions ---
const getGradientColors = (theme: string = 'purple'): { start: string; end: string } => {
  switch (theme) {
    case "cosmic":  return { start: "rgba(93, 63, 211, 0.3)", end: "rgba(255, 46, 99, 0.3)" };
    case "ruby":    return { start: "rgba(232, 0, 70, 0.3)", end: "rgba(253, 0, 159, 0.3)" };
    case "emerald": return { start: "rgba(0, 232, 176, 0.3)", end: "rgba(0, 253, 159, 0.3)" };
    case "purple":
    default:        return { start: "rgba(120, 0, 245, 0.3)", end: "rgba(200, 148, 255, 0.3)" };
  }
};

const formatPrice = (price: number | null | undefined): string => {
  if (typeof price !== 'number' || isNaN(price)) { return '$0'; }
  return price.toLocaleString("en-US", { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const safelyParseJson = (jsonString: string | null | undefined): string[] => {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (e) {
    console.error("Failed to parse JSON string:", jsonString, e);
    return [];
  }
};

const getPackageImage = (imageUrl: string | null, packageName: string): string => {
  if (imageUrl && imageUrl.startsWith('/assets/images/')) {
    return imageUrl;
  }
  return '/marble-texture.png';
};

// --- Keyframe Animations ---
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(0, 255, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
`;

const textGlow = keyframes`
  0%, 100% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.4); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.6); }
`;

const slideGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const diagonalShimmer = keyframes`
  0% {
    background-position: 150% -50%;
  }
  100% {
    background-position: -100% 150%;
  }
`;

// --- Styled Components ---
const StoreContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
  z-index: 1;
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0; overflow: hidden;

  &:after {
    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient( to bottom, rgba(0, 0, 0, 0.6), rgba(10, 10, 30, 0.8), rgba(20, 20, 50, 0.9) );
    z-index: 1;
  }
  video {
    position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%;
    width: auto; height: auto; transform: translate(-50%, -50%); z-index: 0;
  }
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 5;
  padding: 0;
`;

const HeroSection = styled.section`
  position: relative; min-height: 100vh; display: flex; flex-direction: column;
  justify-content: center; align-items: center; padding: 2rem; text-align: center;
  overflow: hidden;
`;

const LogoContainer = styled(motion.div)`
  position: relative; display: flex; justify-content: center; align-items: center;
  width: 100%; animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5)); margin-bottom: 1.5rem;
  z-index: 2;

  img { height: 160px; max-width: 90%; object-fit: contain; }
  @media (max-width: 768px) { img { height: 120px; } margin-bottom: 1rem; }
  @media (max-width: 480px) { img { height: 100px; } margin-bottom: 0.5rem; }
`;

const HeroContent = styled(motion.div)`
  max-width: 800px; width: 100%; margin: 0 auto; position: relative; z-index: 2;
  background: rgba(10, 10, 30, 0.6); padding: 2rem; border-radius: 15px;
  backdrop-filter: blur(5px); border: 1px solid rgba(0, 255, 255, 0.1);
  @media (max-width: 768px) { padding: 1.5rem; }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute; top: 1.5rem; right: 1.5rem; font-family: 'Playfair Display', serif;
  font-size: 1rem; padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px; background: rgba(10, 10, 30, 0.6); backdrop-filter: blur(10px);
  color: white; z-index: 3; letter-spacing: 3px;
  &:before { content: "★★★★★★★"; display: block; font-size: 0.8rem; letter-spacing: 2px; color: gold; text-align: center; margin-bottom: 4px; }
  &:after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient( 45deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100% ); background-size: 200% auto; animation: ${shimmer} 3s linear infinite; }
`;

const AnimatedName = styled(motion.span)`
  display: inline-block;
  background: linear-gradient( to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb );
  background-size: 200% auto; background-clip: text; -webkit-background-clip: text;
  color: transparent; animation: ${shimmer} 3s linear infinite, ${textGlow} 2s ease-in-out infinite alternate;
  padding: 0 5px;
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3.2rem; margin-bottom: 1rem; font-weight: 300; color: white;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); letter-spacing: 1px;
  @media (max-width: 768px) { font-size: 2.5rem; }
`;

const HeroSubtitle = styled(motion.h2)`
  font-size: 1.75rem; margin-bottom: 1.5rem; color: var(--silver, #c0c0c0);
  background: linear-gradient( to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb );
  background-size: 200% auto; background-clip: text; -webkit-background-clip: text; color: transparent;
  animation: ${shimmer} 4s linear infinite; display: inline-block; font-weight: 300;
  @media (max-width: 768px) { font-size: 1.25rem; }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem; margin-bottom: 2rem; line-height: 1.6; color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7); max-width: 800px; margin: 0 auto 2rem;
  @media (max-width: 768px) { font-size: 1rem; }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex; gap: 1.5rem; margin-top: 2rem; justify-content: center;
  position: relative; z-index: 3;
  & > div, & > button { position: relative; flex: 1 1 auto; min-width: 180px; max-width: 250px; }
  @media (max-width: 600px) { flex-direction: column; gap: 1rem; align-items: center; & > div, & > button { width: 100%; max-width: 280px; } }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7); letter-spacing: 2px; z-index: 2;
  &:after { content: "↓"; font-size: 1.5rem; margin-top: 0.5rem; animation: ${float} 2s ease-in-out infinite; }
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
  
  @media (max-width: 480px) {
    padding: 2.5rem 0.75rem;
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
  margin-bottom: 1rem;
  font-size: 2.5rem;
  font-weight: 300;
  position: relative;
  display: inline-block;
  padding-bottom: 15px;
  color: white;
  width: 100%;
  
  &:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 150px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
  }
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Grid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
  position: relative;
  z-index: 15;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  @media (min-width: 769px) and (max-width: 1023px) {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
  }
  
  @media (min-width: 1024px) { 
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    max-width: 1200px;
    margin: 0 auto 4rem;
    gap: 2.5rem;
  }
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    max-width: 1600px;
  }
`;

const CardContainer = styled(motion.div)`
  position: relative;
  border-radius: 15px;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  height: 100%;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  z-index: 20;
  
  @media (max-width: 768px) {
    min-height: 460px;
    border-radius: 12px;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3);
    border-color: rgba(0, 255, 255, 0.6);
    background: rgba(30, 30, 60, 0.6);
    z-index: 25;
  }
  
  &:focus {
    outline: 2px solid rgba(0, 255, 255, 0.8);
    outline-offset: 2px;
  }
`;

const CardMedia = styled.div`
  width: 100%;
  height: 200px;
  position: relative;
  overflow: hidden;
  border-radius: 15px 15px 0 0;
  
  @media (max-width: 768px) {
    height: 180px;
    border-radius: 12px 12px 0 0;
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
      rgba(10, 10, 30, 0.3) 60%,
      rgba(10, 10, 30, 0.8) 100%
    );
    z-index: 1;
  }
`;

const CardImage = styled.div<{imageUrl?: string | null}>`
  width: 100%;
  height: 100%;
  background-image: ${props => props.imageUrl ? `url(${props.imageUrl})` : 'none'};
  background-size: ${props => props.imageUrl ? 'cover' : '200% 200%'};
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.3s ease;
  animation: ${props => !props.imageUrl && slideGradient} 5s ease infinite;
  
  ${CardContainer}:hover & {
    transform: scale(1.05);
  }
`;

const CardContent = styled.div`
  padding: 1.5rem;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 1.25rem;
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 1px;
    background: linear-gradient(
      to right, 
      rgba(255, 255, 255, 0), 
      rgba(255, 255, 255, 0.2), 
      rgba(255, 255, 255, 0)
    );
  }
`;

const CardTitle = styled.h3`
  font-size: 1.6rem;
  margin-bottom: 0.75rem;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  font-weight: 500;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
  
  @media (min-width: 1024px) {
    font-size: 1.7rem;
  }
`;

const CardBadge = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20px;
  font-size: 0.8rem;
  color: white;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const CardDescription = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  font-weight: 300;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
  }
  
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const SessionInfo = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.1);
  
  .session-details {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 0.5rem;
  }
  
  .per-session-price {
    font-size: 1.1rem;
    font-weight: 600;
    color: #00ffff;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }
`;

const PriceBox = styled(motion.div)`
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: 10px;
  background: rgba(30, 30, 60, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 100px;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
    background-size: 300% 300%;
    animation: ${diagonalShimmer} 5s ease infinite;
  }
`;

const PriceContent = styled(motion.div)`
  position: relative;
  z-index: 1;
`;

const PriceLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
`;

const Price = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
`;

const ValueBadge = styled.div<{ $isGoodValue?: boolean }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.75rem;
  font-weight: 600;
  ${props => props.$isGoodValue ? `
    background: linear-gradient(45deg, #00ff88, #00ffaa);
    color: #003322;
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  `}
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0 0 1rem 0;
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
  
  li {
    margin-bottom: 0.4rem;
    position: relative;
    padding-left: 1.2rem;
    
    &:before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #00ffff;
    }
  }
`;

const LoginMessage = styled.div`
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
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
    width: 85%;
    max-width: 240px;
  }
`;

const CartButton = styled(motion.button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7851a9, #00ffff);
  border: none;
  color: white;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.3);
  z-index: 1000;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.5);
  }
  
  outline: none;
  &:focus {
    outline: none;
  }
`;

const PulsingCartButton = styled(CartButton)`
  animation: ${pulseAnimation} 1.5s infinite;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.6);
  
  outline: none;
  &:focus {
    outline: none;
  }
`;

const CartCount = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff4b6a;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px solid rgba(20, 20, 40, 0.8);
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  font-weight: 300;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(30, 30, 60, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 64, 64, 0.3);
  margin: 2rem auto;
  max-width: 600px;
`;

const ErrorMessage = styled.p`
  color: #ff6b6b;
  text-align: center;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const EmptyStateMessage = styled.p`
  text-align: center;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 3rem;
  padding: 2rem;
`;

const RefreshButton = styled.button`
  position: fixed;
  right: 2rem;
  top: 2rem;
  background: rgba(0, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  z-index: 1000;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: rgba(0, 255, 255, 0.3);
    transform: translateY(-2px);
  }
`;

// --- Package Helper Functions (defined outside component to prevent re-renders) ---
// These stable functions won't change between renders and won't cause dependency cycles
const enforceCorrectPackages = (packages: any[]): any[] => {
  // Simply return all packages without filtering
  return packages;
};

const filterOutProblematicPackages = (packages: any[]): any[] => {
  // Return all packages without filtering
  return packages;
};

const deduplicatePackages = (packages: any[]): any[] => {
  // Return all packages without deduplication
  return packages;
};

// --- StoreFront Component ---
const StoreFront: React.FC = () => {
  const { user, authAxios } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  const { toast } = useToast();

  // --- State ---
  const [fixedPackages, setFixedPackages] = useState<StoreItem[]>([]);
  const [monthlyPackages, setMonthlyPackages] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  const [showPulse, setShowPulse] = useState(false);

  // --- Refs and Animation Controls ---
  const heroRef = useRef<HTMLDivElement>(null);
  const fixedPackagesSectionRef = useRef<HTMLDivElement>(null);
  const monthlyPackagesSectionRef = useRef<HTMLDivElement>(null);

  const heroControls = useAnimation();
  const fixedPackagesControls = useAnimation();
  const monthlyPackagesControls = useAnimation();

  const isHeroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const isFixedPackagesInView = useInView(fixedPackagesSectionRef, { once: true, amount: 0.1 });
  const isMonthlyPackagesInView = useInView(monthlyPackagesSectionRef, { once: true, amount: 0.1 });

  // Allow admins, clients, and trainers to view prices and purchase
  const canViewPrices = !!user && (user.role === "client" || user.role === "admin" || user.role === "trainer");

  // --- Helper functions for packages - defined OUTSIDE component to prevent causing re-renders ---
  // These functions are now defined outside the component to break dependency cycles


  // Enhanced fetch function with strict package filtering
  const fetchPackages = useCallback(async () => {
    console.log('🔄 Fetching storefront packages...');
    setIsLoading(true);
    setError(null);
    try {
      // Import regular axios for fallback when user is not authenticated
      const httpClient = authAxios || (await import('axios')).default;
      
      // Request sorted data from API with cache busting
      const timestamp = new Date().getTime();
      const response = await httpClient.get<ApiResponse>(`/api/storefront?sortBy=displayOrder&sortOrder=ASC&_=${timestamp}`);

      // Detailed logging of the raw API response
      if (response.data && response.data.success && Array.isArray(response.data.items)) {
        console.log(`📦 Raw API response has ${response.data.items.length} packages:`);
        response.data.items.forEach(item => {
          console.log(`  • ID ${item.id}: ${item.name} (${item.packageType}) - ${item.pricePerSession}/session, Order: ${item.displayOrder}`);
        });
        
        // Basic processing
        const processedItems = response.data.items.map(item => ({
          ...item,
          theme: item.theme || 'purple',
          displayPrice: item.displayPrice || item.price || 0,
          displayOrder: item.displayOrder || 0
        }));
        
        // Skip aggressive filtering
        console.log('\n📦 DISPLAYING ALL AVAILABLE PACKAGES:');
        
        // Use all packages directly without filtering
        const finalItems = processedItems;
        console.log(`  • Total packages available: ${finalItems.length} packages`);
        
        // Separate into fixed and monthly
        const fixedFiltered = finalItems
          .filter(pkg => pkg.packageType === 'fixed')
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
        const monthlyFiltered = finalItems
          .filter(pkg => pkg.packageType === 'monthly')
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
        console.log(`\n📊 FINAL RESULT: ${fixedFiltered.length} fixed packages and ${monthlyFiltered.length} monthly packages`);
        
        setFixedPackages(fixedFiltered);
        setMonthlyPackages(monthlyFiltered);
      } else {
        console.warn('API Error or Invalid Data:', response.data?.message || 'Unexpected response format');
        setError(response.data?.message || "Failed to load packages.");
        setFixedPackages([]);
        setMonthlyPackages([]);
      }
    } catch (err: any) {
      console.error("Error fetching packages:", err);
      setError(err.response?.data?.message || "Failed to load packages from server.");
      setFixedPackages([]);
      setMonthlyPackages([]);
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]); // Removed the filter functions from dependencies to break circular dependency

  // Log package data on updates for debugging
  useEffect(() => {
    if (fixedPackages.length > 0 || monthlyPackages.length > 0) {
      console.log('📊 Current packages after filtering:');
      console.log('Fixed packages:', fixedPackages.map(p => `${p.name} (ID: ${p.id})`));
      console.log('Monthly packages:', monthlyPackages.map(p => `${p.name} (ID: ${p.id})`));
    }
  }, [fixedPackages, monthlyPackages]);

  // Check for service worker registration which might cause caching
  useEffect(() => {
    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
          console.log('🚨 Service workers detected! They might be causing cache issues');
          console.log('Registered service workers:', registrations);
          
          // Attempt to unregister service workers if debugging
          if (process.env.NODE_ENV === 'development') {
            registrations.forEach(registration => {
              registration.unregister().then(boolean => {
                console.log('Service worker unregistered:', boolean);
              });
            });
            console.log('🔄 Service workers unregistered. Try refreshing the page.');
          }
        } else {
          console.log('✅ No service workers detected');
        }
      });
    }
  }, []);

  // --- Effects ---
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]); // Removed the filter functions from dependencies to break the loop

  useEffect(() => {
    if (isHeroInView) heroControls.start("visible");
    if (isFixedPackagesInView) fixedPackagesControls.start("visible");
    if (isMonthlyPackagesInView) monthlyPackagesControls.start("visible");
  }, [
    isHeroInView, isFixedPackagesInView, isMonthlyPackagesInView,
    heroControls, fixedPackagesControls, monthlyPackagesControls
  ]);

  useEffect(() => {
    const handleScroll = () => setAnimateScrollIndicator(window.scrollY < 200);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user?.id) {
      console.log('StoreFront mounted - refreshing cart');
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, refreshCart]);

  // --- Animation Variants (Fixed - No Opacity Issues) ---
  const containerVariants = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 0, opacity: 1 }, visible: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } } };
  const gridVariants = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.05 } } };
  const cardVariants = { hidden: { y: 0, opacity: 1 }, visible: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } } };
  const buttonMotionProps = { whileHover:{ scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 10 } }, whileTap:{ scale: 0.95 } };

  // --- Event Handlers ---
  const togglePriceVisibility = (packageId: number) => setRevealPrices((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  const handleToggleCart = () => setShowCart(prev => !prev);
  const handleHideCart = () => setShowCart(false);
  
  // Force clear browser cache and refresh packages
  const handleForceRefresh = useCallback(() => {
    console.log('🔄 Forcing refresh and clearing cache...');
    
    // Clear any local storage caches
    localStorage.removeItem('storefrontPackages');
    localStorage.removeItem('packageCache');
    
    // Also try to clear any session storage (sometimes packages get cached here)
    sessionStorage.removeItem('storefrontPackages');
    sessionStorage.removeItem('packageItems');
    sessionStorage.removeItem('cachedPackages');
    
    // Try to clear browser cache with cache API if available
    if (typeof caches !== 'undefined') {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log(`🗑️ Clearing cache: ${name}`);
          caches.delete(name);
        });
      });
    }
    
    // Add a cache-busting parameter to the API request
    const forceRefresh = async () => {
      setIsLoading(true);
      try {
        const httpClient = authAxios || (await import('axios')).default;
        
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        // Add extra random parameter to really bust any cache
        const random = Math.random().toString(36).substring(7);
        const response = await httpClient.get<ApiResponse>(
          `/api/storefront?sortBy=displayOrder&sortOrder=ASC&_=${timestamp}&nocache=${random}`
        );
        
        if (response.data && response.data.success && Array.isArray(response.data.items)) {
          console.log(`📦 Force refresh: Retrieved ${response.data.items.length} packages`);
          
          // Process and filter packages
          let processedItems = response.data.items.map(item => ({
            ...item,
            theme: item.theme || 'purple',
            displayPrice: item.displayPrice || item.price || 0,
            displayOrder: item.displayOrder || 0
          }));
          
          // Skip filtering and use all packages
          console.log('\n📦 Using all available packages:');
          const finalItems = processedItems;
          console.log(`  • Total packages available: ${finalItems.length} packages`);
          
          // Separate fixed and monthly packages
          const fixedFiltered = finalItems
            .filter(pkg => pkg.packageType === 'fixed')
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          
          const monthlyFiltered = finalItems
            .filter(pkg => pkg.packageType === 'monthly')
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          
          setFixedPackages(fixedFiltered);
          setMonthlyPackages(monthlyFiltered);
          
          return { success: true, count: finalItems.length };
        }
        return { success: false, count: 0 };
      } catch (err) {
        console.error('Force refresh failed:', err);
        return { success: false, count: 0 };
      } finally {
        setIsLoading(false);
      }
    };
    
    forceRefresh().then(result => {
      if (result.success) {
        toast({ 
          title: 'Refresh Complete', 
          description: `Found ${result.count} packages successfully.`,
          variant: 'default'
        });
        
        // Simplified package count check - don't expect exactly 8 anymore
        if (result.count === 0) {
          setTimeout(() => {
            toast({
              title: 'No Packages Found', 
              description: 'No packages were found. Ask administrator to check the database.',
              variant: 'destructive'
            });
          }, 1500);
        }
      } else {
        toast({
          title: 'Refresh Failed', 
          description: 'Could not refresh packages. Try reloading the page.',
          variant: 'destructive'
        });
      }
    });
  }, [authAxios, toast]); // Removed filter functions from dependencies

  const handleAddToCart = useCallback(async (pkg: StoreItem) => {
    if (!canViewPrices) {
      const roleMessage = user ? 
        "Please ensure you have the appropriate role to purchase." : 
        "Please log in to purchase packages.";
      toast({ title: "Access Required", description: roleMessage, variant: "destructive" });
      return;
    }

    const cartItemData = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.displayPrice,
      quantity: 1,
    };

    setIsAddingToCart(pkg.id);
    try {
      await addToCart(cartItemData);
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
  }, [canViewPrices, toast, addToCart, refreshCart]);

  // --- Helper Functions ---
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

  // --- Render Package Card ---
  const renderPackageCard = (pkg: StoreItem) => {
    const { start, end } = getGradientColors(pkg.theme || 'purple');
    const packageIdKey = pkg.id.toString();
    const isCurrentlyAdding = isAddingToCart === pkg.id;
    const features = safelyParseJson(pkg.includedFeatures);

    let badgeDisplay = '';
    if (pkg.packageType === 'fixed' && pkg.sessions) {
      badgeDisplay = `${pkg.sessions} Session${pkg.sessions > 1 ? 's' : ''}`;
    } else if (pkg.packageType === 'monthly' && pkg.months) {
      badgeDisplay = `${pkg.months} Month${pkg.months > 1 ? 's' : ''}`;
    }

    // Get correct theme based on package name or assigned theme
    let cardTheme = pkg.theme || 'purple';
    if (pkg.name) {
      if (pkg.name.includes('Gold') || pkg.name.includes('Platinum')) {
        cardTheme = 'cosmic';
      } else if (pkg.name.includes('Silver')) {
        cardTheme = 'emerald';
      } else if (pkg.name.includes('Single')) {
        cardTheme = 'ruby';
      }
    }

    const valueBadge = getValueBadge(pkg);

    return (
      <motion.div key={pkg.id} variants={cardVariants}>
        <CardContainer 
          onClick={() => togglePriceVisibility(pkg.id)}
          aria-label={`View details for ${pkg.name}`}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && togglePriceVisibility(pkg.id)}
        >
          <CardMedia>
            <CardImage 
              imageUrl={getPackageImage(pkg.imageUrl, pkg.name)} 
              style={!pkg.imageUrl ? { background: `linear-gradient(135deg, ${start}, ${end})` } : {}} 
            />
            {badgeDisplay && <CardBadge>{badgeDisplay}</CardBadge>}
          </CardMedia>
          <CardContent>
            <CardTitle>{pkg.name}</CardTitle>
            <CardDescription>
              {pkg.description || 'Premium training package designed for results.'}
            </CardDescription>
            
            {pkg.pricePerSession && (
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
            
            {features.length > 0 && (
              <FeaturesList aria-label="Included Features">
                {features.slice(0, 3).map((feature, index) => <li key={index}>{feature}</li>)}
                {features.length > 3 && <li>...and more!</li>}
              </FeaturesList>
            )}
            
            <PriceBox variants={itemVariants} aria-live="polite">
              <AnimatePresence mode="wait">
                {canViewPrices ? (
                  revealPrices[pkg.id] ? (
                    <PriceContent key="price" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                      <PriceLabel>Total Investment</PriceLabel>
                      <Price>{formatPrice(pkg.displayPrice)}</Price>
                      {valueBadge.text && (
                        <ValueBadge $isGoodValue={valueBadge.isGoodValue}>
                          {valueBadge.text}
                        </ValueBadge>
                      )}
                    </PriceContent>
                  ) : (
                    <motion.div key="reveal" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.7)'}}>Click to reveal price</motion.div>
                  )
                ) : (
                  <motion.div key="login" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                    <LoginMessage>Login to view prices and purchase</LoginMessage>
                  </motion.div>
                )}
              </AnimatePresence>
            </PriceBox>
            <CardActions>
              <motion.div {...buttonMotionProps} style={{ width: '100%'}}>
                <GlowButton 
                  text={isCurrentlyAdding ? "Adding..." : "Add to Cart"} 
                  theme={cardTheme}
                  size="medium" 
                  isLoading={isCurrentlyAdding}
                  disabled={isCurrentlyAdding || !canViewPrices}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.stopPropagation(); 
                    handleAddToCart(pkg); 
                  }}
                  aria-busy={isCurrentlyAdding}
                  aria-label={`Add ${pkg.name} to cart`}
                />
              </motion.div>
            </CardActions>
          </CardContent>
        </CardContainer>
      </motion.div>
    );
  };

  // --- Component JSX ---
  return (
    <StoreContainer>
      {/* Debug Refresh Button */}
      <RefreshButton onClick={handleForceRefresh}>
        🔄 Refresh Packages
      </RefreshButton>
      <ContentOverlay>
        {/* Hero Section */}
        <HeroSection ref={heroRef}>
          <VideoBackground>
            <video autoPlay loop muted playsInline key="hero-bg-video">
              <source src={swanVideo} type="video/mp4" />
            </video>
          </VideoBackground>
          
          <PremiumBadge initial={{ opacity: 0, x: 20 }} animate={heroControls} variants={itemVariants} transition={{ delay: 0.5 }}> 
            PREMIER
          </PremiumBadge>

          <motion.div 
            initial={{ opacity: 1 }} 
            animate={{ opacity: 1 }} 
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
                Discover a revolutionary workout program tailored to your unique goals. Leveraging over two decades of expertise and cutting-edge techniques, Sean Swan delivers results that redefine your limits.
              </HeroDescription>
              <ButtonsContainer variants={itemVariants}>
                <motion.div {...buttonMotionProps}>
                  <GlowButton 
                    text="Book Consultation" 
                    theme="cosmic" 
                    size="large" 
                    onClick={() => setShowOrientation(true)} 
                  />
                </motion.div>
                <motion.div {...buttonMotionProps}>
                  <GlowButton 
                    text="View Packages" 
                    theme="purple" 
                    size="large" 
                    onClick={() => document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" })}
                  />
                </motion.div>
              </ButtonsContainer>
            </HeroContent>
          </motion.div>
          
          {animateScrollIndicator && (
            <ScrollIndicator 
              initial={{ opacity: 0 }} 
              animate={{ opacity: [0, 0.7, 0] }} 
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              DISCOVER
            </ScrollIndicator>
          )}
        </HeroSection>

        {/* Loading, Error, or Package Content */}
        {isLoading ? (
          <SectionContainer style={{ minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <LoadingContainer>
              <LoadingSpinner aria-label="Loading items"/>
              <LoadingText>Loading premium training packages...</LoadingText>
            </LoadingContainer>
          </SectionContainer>
        ) : error ? (
          <SectionContainer>
            <ErrorContainer>
              <ErrorMessage role="alert">{error}</ErrorMessage>
              <motion.div {...buttonMotionProps}>
                <GlowButton text="Retry" theme="ruby" size="medium" onClick={fetchPackages} />
              </motion.div>
            </ErrorContainer>
          </SectionContainer>
        ) : (fixedPackages.length === 0 && monthlyPackages.length === 0) ? (
          <SectionContainer>
             <EmptyStateMessage>No training packages are currently available. Please check back soon or contact us for custom options!</EmptyStateMessage>
             <motion.div style={{ display: "flex", justifyContent: "center", marginTop: "2rem"}} variants={itemVariants} >
                <GlowButton text="Contact Us" theme="cosmic" size="large" onClick={() => setShowOrientation(true)} />
             </motion.div>
          </SectionContainer>
        ) : (
          <>
            {/* Fixed Packages Section */}
            {fixedPackages.length > 0 && (
              <PackageSection id="packages-section" ref={fixedPackagesSectionRef}>
                <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} variants={containerVariants}>
                  <SectionTitle initial={{ opacity: 1 }} animate={{ opacity: 1 }} variants={itemVariants}>
                    Premium Training Packages
                  </SectionTitle>
                  <Grid initial={{ opacity: 1 }} animate={{ opacity: 1 }} variants={gridVariants} aria-label="Session packages">
                    {fixedPackages.map(renderPackageCard)}
                  </Grid>
                </motion.div>
              </PackageSection>
            )}

            {/* Monthly Packages Section */}
            {monthlyPackages.length > 0 && (
              <PackageSection ref={monthlyPackagesSectionRef} style={fixedPackages.length > 0 ? { marginTop: '0rem' } : {}}>
                <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} variants={containerVariants}>
                   <SectionTitle initial={{ opacity: 1 }} animate={{ opacity: 1 }} variants={itemVariants}>
                    Long-Term Excellence Programs
                  </SectionTitle>
                  <Grid initial={{ opacity: 1 }} animate={{ opacity: 1 }} variants={gridVariants} aria-label="Monthly packages">
                    {monthlyPackages.map(renderPackageCard)}
                  </Grid>
                </motion.div>
              </PackageSection>
            )}
            
            {/* Always show consultation button if packages are displayed */}
            {(fixedPackages.length > 0 || monthlyPackages.length > 0) && (
                <SectionContainer style={{paddingTop: '2rem', paddingBottom: '5rem'}}>
                    <motion.div 
                        style={{ display: "flex", justifyContent: "center", marginTop: "1rem", position: 'relative', zIndex: 20 }} 
                        variants={itemVariants} 
                        initial={{ opacity: 1 }} 
                        animate={{ opacity: 1 }}
                    >
                        <motion.div {...buttonMotionProps}>
                        <GlowButton 
                            text="Schedule Consultation" 
                            theme="cosmic" 
                            size="large" 
                            onClick={() => setShowOrientation(true)} 
                        />
                        </motion.div>
                    </motion.div>
                </SectionContainer>
            )}
          </>
        )}
      </ContentOverlay>

      {/* Floating Cart Button */}
      {user && (
        <AnimatePresence>
          {showPulse ? (
            <PulsingCartButton 
              className="cart-follow-button"
              key="pulsing-cart" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleCart();
              }} 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }} 
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={`View Cart (${cart?.itemCount || 0} items)`}
            >
              🛒
              {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
            </PulsingCartButton>
          ) : (
            <CartButton 
              className="cart-follow-button"
              key="static-cart" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleCart();
              }} 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }} 
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={`View Cart (${cart?.itemCount || 0} items)`}
            >
              🛒
              {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
            </CartButton>
          )}
        </AnimatePresence>
      )}

      {/* Modals */}
      <AnimatePresence mode="wait">
        {showOrientation && (
          <OrientationForm 
            key="orientation-modal" 
            onClose={() => setShowOrientation(false)} 
          />
        )}
        {showCart && <ShoppingCart key="cart-modal" onClose={handleHideCart} />}
      </AnimatePresence>
    </StoreContainer>
  );
};

export default StoreFront;