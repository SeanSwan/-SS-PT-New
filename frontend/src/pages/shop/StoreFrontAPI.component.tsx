// File: frontend/src/pages/shop/StoreFrontAPI.component.tsx
// Updated version that fetches from API while preserving original styling

import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes, css } from "styled-components";
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

// --- Type Definition for API Package ---
interface ApiPackage {
  id: number;
  name: string;
  description: string | null;
  packageType: 'fixed' | 'monthly';
  pricePerSession: number;
  sessions?: number | null;
  months?: number | null;
  sessionsPerWeek?: number | null;
  totalSessions?: number | null;
  totalCost?: number | null;
  price?: number | null;
  displayPrice: number;
  theme?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// --- Utility Functions (Preserved from original) ---
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
  if (typeof price !== 'number') { return '$0'; }
  return price.toLocaleString("en-US", { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// --- Keyframe Animations (Preserved from original) ---
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;
const pulseGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
  50% { box-shadow: 0 0 25px rgba(120, 81, 169, 0.7); }
  100% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
`;
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;
const slideGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
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

// --- Styled Components (Preserved from original) ---
const StoreContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
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
  z-index: 1;
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

const ParallaxSection = styled(motion.div)`
  position: relative; height: 60vh; display: flex; align-items: center; justify-content: center;
  overflow: hidden; margin: 0;
  background: url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&q=80&w=1920') center/cover fixed no-repeat;
  background-attachment: fixed; z-index: 1;
  &:before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10, 10, 30, 0.65); z-index: 1; }
  @media (max-width: 768px) { height: 45vh; }
`;
const ParallaxContent = styled(motion.div)` position: relative; z-index: 2; text-align: center; max-width: 750px; padding: 0 1rem; `;
const ParallaxTitle = styled(motion.h2)` font-size: 3.5rem; font-weight: 300; color: white; text-transform: uppercase; letter-spacing: 10px; margin-bottom: 1rem; text-shadow: 0 2px 15px rgba(0, 0, 0, 0.7); @media (max-width: 768px) { font-size: 2.5rem; letter-spacing: 6px; } `;
const ParallaxSubtitle = styled(motion.p)` font-size: 1.2rem; color: rgba(255, 255, 255, 0.8); max-width: 600px; margin: 0 auto; line-height: 1.7; @media (max-width: 768px) { font-size: 1rem; } `;

const SectionContainer = styled.section` padding: 5rem 2rem; max-width: 1400px; margin: 0 auto; position: relative; z-index: 1; `;
const SectionTitle = styled(motion.h2)` text-align: center; margin-bottom: 3rem; font-size: 2.5rem; font-weight: 300; position: relative; display: inline-block; padding-bottom: 15px; color: white; width: 100%; &:after { content: ""; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 150px; height: 2px; background: linear-gradient( to right, rgba(0, 255, 255, 0), rgba(0, 255, 255, 1), rgba(0, 255, 255, 0) ); } `;
const Grid = styled(motion.div)` display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2.5rem; margin-bottom: 4rem; @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); } `;
const CardContainer = styled(motion.div)` position: relative; border-radius: 15px; overflow: hidden; background: rgba(30, 30, 60, 0.3); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); transition: all 0.3s ease; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); cursor: pointer; height: 100%; display: flex; flex-direction: column; &:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); } `;
const CardMedia = styled.div` width: 100%; height: 200px; position: relative; overflow: hidden; &:before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient( to bottom, rgba(0, 0, 0, 0), rgba(10, 10, 30, 0.8) ); z-index: 1; } `;
const CardImage = styled.div` width: 100%; height: 100%; background-size: 200% 200%; animation: ${slideGradient} 5s ease infinite; `;
const CardContent = styled.div` padding: 1.5rem; position: relative; flex: 1; display: flex; flex-direction: column; &:before { content: ""; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 80%; height: 1px; background: linear-gradient( to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0) ); } `;
const CardTitle = styled.h3` font-size: 1.75rem; margin-bottom: 0.75rem; color: white; text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); font-weight: 400; `;
const CardBadge = styled.span` position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; background: rgba(0, 0, 0, 0.6); border-radius: 20px; font-size: 0.8rem; color: white; z-index: 2; border: 1px solid rgba(255, 255, 255, 0.2); `;
const CardDescription = styled.p` font-size: 1rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 1.5rem; line-height: 1.6; `;
const PriceBox = styled(motion.div)` padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px; background: rgba(30, 30, 60, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); text-align: center; position: relative; overflow: hidden; min-height: 110px; &:before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient( 45deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100% ); background-size: 200% auto; animation: ${shimmer} 5s linear infinite; } `;
const PriceContent = styled(motion.div)` position: relative; z-index: 1; `;
const PriceLabel = styled.div` font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); margin-bottom: 0.5rem; `;
const Price = styled.div` font-size: 1.8rem; font-weight: 300; color: white; display: flex; align-items: center; justify-content: center; span { font-size: 1rem; margin-right: 0.5rem; color: rgba(255, 255, 255, 0.8); } `;
const PriceDetails = styled.div` margin-top: 0.5rem; font-size: 0.9rem; color: rgba(255, 255, 255, 0.7); `;
const LoginMessage = styled.div` font-style: italic; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; `;
const CardActions = styled.div` margin-top: auto; display: flex; justify-content: center; padding-top: 1rem; position: relative; z-index: 5; & > div { width: 80%; max-width: 220px; } `;

const CartButton = styled(motion.button)` position: fixed; bottom: 2rem; right: 2rem; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #7851a9, #00ffff); border: none; color: white; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); z-index: 1000; transition: transform 0.3s ease, box-shadow 0.3s ease; &:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4); } `;
const PulsingCartButton = styled(CartButton)` animation: ${pulseAnimation} 1.5s infinite; `;
const CartCount = styled.span` position: absolute; top: -5px; right: -5px; background: #ff4b6a; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; border: 2px solid rgba(20, 20, 40, 0.8); `;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.p`
  color: #ff4b6a;
  text-align: center;
  font-size: 1rem;
  margin: 2rem 0;
  padding: 1rem;
  background: rgba(255, 75, 106, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 75, 106, 0.3);
`;

// --- Component ---
const StoreFront: React.FC = () => {
  const { user, authAxios } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  const { toast } = useToast();

  // --- State ---
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
  const [showPulse, setShowPulse] = useState(false);

  // --- Refs and Animation Controls ---
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const parallaxRef = useRef(null);
  const isParallaxInView = useInView(parallaxRef, { once: true, amount: 0.3 });
  const fixedPackagesRef = useRef(null);
  const isFixedPackagesInView = useInView(fixedPackagesRef, { once: true, amount: 0.2 });
  const monthlyPackagesRef = useRef(null);
  const isMonthlyPackagesInView = useInView(monthlyPackagesRef, { once: true, amount: 0.2 });

  const heroControls = useAnimation();
  const parallaxControls = useAnimation();
  const fixedPackagesControls = useAnimation();
  const monthlyPackagesControls = useAnimation();

  const canViewPrices = !!user && (user.role === "client" || user.role === "admin");

  // --- Fetch Packages from API ---
  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const httpClient = authAxios || (await import('axios')).default;
      const response = await httpClient.get('/api/storefront');

      if (response.data && response.data.success && Array.isArray(response.data.items)) {
        setPackages(response.data.items);
      } else {
        console.warn('API Error or Invalid Data:', response.data?.message || 'Unexpected response format');
        setError(response.data?.message || "Failed to load packages.");
      }
    } catch (err: any) {
      console.error("Error fetching packages:", err);
      setError(err.response?.data?.message || "Failed to load packages from server.");
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  // --- Effects ---
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    if (isHeroInView) heroControls.start("visible");
    if (isParallaxInView) parallaxControls.start("visible");
    if (isFixedPackagesInView) fixedPackagesControls.start("visible");
    if (isMonthlyPackagesInView) monthlyPackagesControls.start("visible");
  }, [
    isHeroInView, isParallaxInView, isFixedPackagesInView, isMonthlyPackagesInView,
    heroControls, parallaxControls, fixedPackagesControls, monthlyPackagesControls
  ]);

  useEffect(() => {
    const handleScroll = () => setAnimateScrollIndicator(window.scrollY < 200);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user && user.id) {
      console.log('StoreFront mounted - refreshing cart');
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, refreshCart]);

  // --- Animation Variants ---
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delayChildren: 0.3, staggerChildren: 0.2 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } } };
  const gridVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delayChildren: 0.3, staggerChildren: 0.15 } } };
  const cardVariants = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } } };
  const buttonMotionProps = { whileHover:{ scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 10 } }, whileTap:{ scale: 0.95 } };

  // --- Event Handlers ---
  const togglePriceVisibility = (packageId: string) => setRevealPrices((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  const handleToggleCart = () => setShowCart(prev => !prev);
  const handleHideCart = () => setShowCart(false);

  const handleAddToCart = async (pkg: ApiPackage) => {
    if (!canViewPrices) {
      toast({ title: "Login Required", description: "Please log in as a client to purchase.", variant: "destructive" });
      return;
    }

    const cartItemData = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.displayPrice,
      quantity: 1,
    };

    setIsAddingToCart(pkg.id.toString());
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
  };

  // --- Separate packages by type ---
  const fixedPackages = packages.filter(pkg => pkg.packageType === 'fixed');
  const monthlyPackages = packages.filter(pkg => pkg.packageType === 'monthly');

  // --- Render Package Card ---
  const renderPackageCard = (pkg: ApiPackage) => {
    const { start, end } = getGradientColors(pkg.theme || 'purple');
    const isLoading = isAddingToCart === pkg.id.toString();
    const packageId = pkg.id.toString();

    return (
      <motion.div key={pkg.id} variants={cardVariants}>
        <CardContainer onClick={() => togglePriceVisibility(packageId)}>
          <CardMedia>
            <CardImage style={{ background: `linear-gradient(135deg, ${start}, ${end})` }} />
            <CardBadge>
              {pkg.packageType === 'fixed' ? `${pkg.sessions} Sessions` : `${pkg.months} Months`}
            </CardBadge>
          </CardMedia>
          <CardContent>
            <CardTitle>{pkg.name}</CardTitle>
            <CardDescription>{pkg.description}</CardDescription>
            <PriceBox variants={itemVariants}>
              <AnimatePresence mode="wait">
                {canViewPrices ? (
                  revealPrices[packageId] ? (
                    <PriceContent key="price" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                      <PriceLabel>Investment</PriceLabel>
                      <Price><span>$</span>{formatPrice(pkg.displayPrice)}</Price>
                      <PriceDetails>
                        {pkg.packageType === 'fixed' 
                          ? `${formatPrice(pkg.pricePerSession)} per session`
                          : `${pkg.totalSessions} sessions (${pkg.sessionsPerWeek}/week)\n${formatPrice(pkg.pricePerSession)} per session`
                        }
                      </PriceDetails>
                    </PriceContent>
                  ) : (
                    <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.7)'}}>Click to reveal price</motion.div>
                  )
                ) : (
                  <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                    <LoginMessage>Login as a client to view pricing</LoginMessage>
                  </motion.div>
                )}
              </AnimatePresence>
            </PriceBox>
            <CardActions>
              <motion.div {...buttonMotionProps} style={{ width: '100%'}}>
                <GlowButton 
                  text={isLoading ? "Adding..." : "Add to Cart"} 
                  theme={pkg.theme || 'purple'} 
                  size="medium" 
                  disabled={!!isAddingToCart || !canViewPrices}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleAddToCart(pkg); 
                  }} 
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
      <ContentOverlay>
        {/* Hero Section */}
        <HeroSection ref={heroRef}>
          <VideoBackground>
            <video autoPlay loop muted playsInline key="hero-bg-video">
              <source src={swanVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </VideoBackground>
          
          <PremiumBadge initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.8 }}>
            PREMIER
          </PremiumBadge>

          <motion.div 
            initial="hidden" 
            animate={heroControls} 
            variants={containerVariants} 
            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}
          >
            <LogoContainer variants={itemVariants}>
              <img src={logoImg} alt="Swan Studios" />
            </LogoContainer>
            <HeroContent>
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

        {/* Parallax Section */}
        <ParallaxSection ref={parallaxRef} initial="hidden" animate={parallaxControls} variants={containerVariants}>
          <ParallaxContent>
            <ParallaxTitle variants={itemVariants}>Elevate Your Performance</ParallaxTitle>
            <ParallaxSubtitle variants={itemVariants}>
              Our premium packages are designed to transform your body and mind, unlocking peak physical potential through scientifically-backed methods.
            </ParallaxSubtitle>
          </ParallaxContent>
        </ParallaxSection>

        {/* Loading, Error, or Package Content */}
        {isLoading ? (
          <SectionContainer>
            <LoadingSpinner />
          </SectionContainer>
        ) : error ? (
          <SectionContainer>
            <ErrorMessage>Error: {error}</ErrorMessage>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <GlowButton text="Retry" theme="ruby" size="medium" onClick={fetchPackages} />
            </div>
          </SectionContainer>
        ) : (
          <>
            {/* Fixed Packages Section */}
            <SectionContainer id="packages-section" ref={fixedPackagesRef}>
              <SectionTitle initial="hidden" animate={fixedPackagesControls} variants={itemVariants}>
                Premium Training Packages
              </SectionTitle>
              <Grid initial="hidden" animate={fixedPackagesControls} variants={gridVariants}>
                {fixedPackages.map(renderPackageCard)}
              </Grid>
            </SectionContainer>

            {/* Monthly Packages Section */}
            <SectionContainer ref={monthlyPackagesRef}>
              <SectionTitle initial="hidden" animate={monthlyPackagesControls} variants={itemVariants}>
                Long-Term Excellence Programs
              </SectionTitle>
              <Grid initial="hidden" animate={monthlyPackagesControls} variants={gridVariants}>
                {monthlyPackages.map(renderPackageCard)}
              </Grid>
              <motion.div 
                style={{ display: "flex", justifyContent: "center", marginTop: "4rem", position: 'relative', zIndex: 20 }} 
                variants={itemVariants} 
                initial="hidden" 
                animate={monthlyPackagesControls}
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
          </>
        )}
      </ContentOverlay>

      {/* Floating Cart Button */}
      {user && (
        <AnimatePresence>
          {showPulse ? (
            <PulsingCartButton 
              key="pulsing-cart" 
              onClick={handleToggleCart} 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }} 
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              🛒
              {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
            </PulsingCartButton>
          ) : (
            <CartButton 
              key="static-cart" 
              onClick={handleToggleCart} 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }} 
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              🛒
              {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
            </CartButton>
          )}
        </AnimatePresence>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showOrientation && (
          <OrientationForm key="orientation-modal" onClose={() => setShowOrientation(false)} />
        )}
        {showCart && <ShoppingCart key="cart-modal" onClose={handleHideCart} />}
      </AnimatePresence>
    </StoreContainer>
  );
};

export default StoreFront;
