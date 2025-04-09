// File: frontend/src/pages/shop/StoreFront.component.tsx

import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";

// --- Context Imports ---
import { useAuth } from "../../context/AuthContext";         // Verify path
import { useCart } from "../../context/CartContext";           // Verify path

// --- Component Imports (Verify Paths) ---
import GlowButton from "../../components/Button/glowButton"; // Verify path
import OrientationForm from "../../components/OrientationForm/orientationForm"; // Verify path
import ShoppingCart from "../../components/ShoppingCart/ShoppingCart";     // Verify path

// --- Hook Imports ---
import { useToast } from "../../hooks/use-toast";               // Verify path

// --- Asset Imports ---
import wavesVideo from "../../assets/Waves.mp4";                 // Verify path
import logoImg from "../../assets/Logo.png";                     // Verify path

// --- TODO: Replace these placeholder functions with actual implementations ---
// --- TODO: Move these functions to the appropriate utility file (e.g., /lib/utils.ts) and export them ---

/**
 * Placeholder for getting gradient colors based on a theme.
 * @param theme - The theme name (e.g., 'ocean', 'cosmic').
 * @returns An object with start and end color strings.
 */
const getGradientColors = (theme: string = 'default'): { start: string; end: string } => {
  // console.warn(`getGradientColors called with theme: ${theme}. Using placeholder colors.`); // Optional warning
  switch (theme) {
    case 'ocean': return { start: '#0077ff', end: '#00ffff' };
    case 'sunset': return { start: '#ff8c00', end: '#ff4500' };
    case 'forest': return { start: '#228b22', end: '#006400' };
    case 'cosmic': return { start: '#4a00e0', end: '#8e2de2' };
    case 'purple': return { start: '#8a2be2', end: '#4b0082' };
    default: return { start: '#555', end: '#aaa' }; // Default fallback
  }
};

/**
 * Placeholder for formatting a price number into a string.
 * @param price - The numeric price value.
 * @returns A formatted price string (e.g., '$500.00') or a default.
 */
const formatPrice = (price: number | null | undefined): string => {
  if (typeof price !== 'number') {
    return '$0.00'; // Or handle null/undefined differently
  }
  // Simple formatting, replace with more robust logic if needed
  return price.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};


// --- Hard-Coded Package Data (Example - Replace with your actual data) ---
const fixedPackages = [
  { id: 'fix1', name: 'Starter Pack', description: 'Get started with personalized training.', sessions: 5, totalCost: 500, pricePerSession: 100, theme: 'ocean' },
  { id: 'fix2', name: 'Booster Pack', description: 'Accelerate your progress.', sessions: 10, totalCost: 900, pricePerSession: 90, theme: 'sunset' },
  { id: 'fix3', name: 'Transformation Pack', description: 'Commit to a new you.', sessions: 20, totalCost: 1600, pricePerSession: 80, theme: 'forest' },
];
const monthlyPackages = [
  { id: 'mon1', name: 'Consistent Progress', description: 'Steady gains month over month.', months: 3, totalSessions: 36, sessionsPerWeek: 3, totalCost: 2700, pricePerSession: 75, theme: 'cosmic' },
  { id: 'mon2', name: 'Peak Performance', description: 'Maximize your potential.', months: 6, totalSessions: 72, sessionsPerWeek: 3, totalCost: 4680, pricePerSession: 65, theme: 'purple' },
];

// --- Keyframe Animations (Add your actual keyframes) ---
const shimmer = keyframes` /* ... */ `;
const pulseGlow = keyframes` /* ... */ `;
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); } // Reduced float height slightly
`;
const slideGradient = keyframes` /* ... */ `;
const pulseAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 5px 15px rgba(0, 255, 255, 0.4); }
  50% { transform: scale(1.1); box-shadow: 0 8px 25px rgba(0, 255, 255, 0.7); }
  100% { transform: scale(1); box-shadow: 0 5px 15px rgba(0, 255, 255, 0.4); }
`;
const glow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 8px rgba(0,255,255,0.6)); }
  50% { filter: drop-shadow(0 0 18px rgba(0,255,255,0.9)); }
`;

// --- Styled Components (Define or import ALL needed components) ---
const StoreContainer = styled.div`
  position: relative;
  overflow-x: hidden; // Prevent horizontal scroll
  background-color: #0a0a2a;
  color: #e0e0e0;
`;

const VideoBackground = styled.div`
  position: fixed; // Fixed background
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh; // Full viewport height
  overflow: hidden;
  z-index: -1; // Behind content

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 1; // Above background
  min-height: 100vh;
  padding: 2rem;
  // Removed background gradient to let video show through more
  // background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9));

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const HeroSection = styled(motion.section)` // Added motion
  min-height: calc(100vh - 4rem); // Adjust based on header/padding
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  position: relative;
  padding: 4rem 0; // Add padding for content spacing

  @media (max-width: 768px) {
     padding: 2rem 0;
     min-height: calc(100vh - 2rem);
   }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute;
  top: 40px; // Adjusted positioning
  right: 40px;
  background: linear-gradient(45deg, #ffd700, #ffcc00);
  color: #333;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9rem;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  z-index: 15;

   @media (max-width: 768px) {
    top: 20px;
    right: 20px;
    font-size: 0.8rem;
    padding: 6px 12px;
  }
`;

const LogoContainer = styled(motion.div)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  animation: ${float} 6s ease-in-out infinite;
  // filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5)); // Glow applied directly to img
  margin: 0 auto 2rem auto; // Reduced bottom margin slightly
  padding-top: 30px;
  z-index: 10;

  img {
    height: 160px;
    max-width: 90%; // Ensure it doesn't touch edges on small screens
    object-fit: contain;
    animation: ${glow} 3s ease-in-out infinite;
  }
  @media (max-width: 768px) { margin-bottom: 1.5rem; img { height: 120px; } }
  @media (max-width: 480px) { margin-bottom: 1rem; img { height: 100px; } }
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  background: rgba(10, 10, 42, 0.6); // Subtle dark background for readability
  padding: 2rem;
  border-radius: 15px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(0, 255, 255, 0.1);

  @media (max-width: 768px) { padding: 1.5rem; }
`;

const HeroTitle = styled(motion.h1)`
  font-size: 2.8rem; // Slightly adjusted
  font-weight: bold;
  margin-bottom: 1rem;
  color: #fff;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.5);

  @media (max-width: 768px) { font-size: 2.2rem; }
  @media (max-width: 480px) { font-size: 1.8rem; }
`;

const HeroSubtitle = styled(motion.h2)`
  font-size: 1.4rem; // Slightly adjusted
  margin-bottom: 1.5rem;
  color: #b0b0d0;
  font-weight: 400; // Less bold

  @media (max-width: 768px) { font-size: 1.2rem; }
  @media (max-width: 480px) { font-size: 1rem; }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1rem; // Slightly adjusted
  line-height: 1.7; // Increased line height
  margin-bottom: 2.5rem;
  color: #d0d0e0;

  @media (max-width: 768px) { font-size: 0.95rem; }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  justify-content: center;
  flex-wrap: wrap; // Allow wrapping on smaller screens if needed
  position: relative;
  z-index: 20;

  & > div {
    position: relative;
    flex: 1 1 auto; // Allow grow, shrink, auto basis
    min-width: 180px; // Minimum width before wrapping/shrinking
    max-width: 250px;
  }
  @media (max-width: 480px) { // Adjust breakpoint for stacking
    flex-direction: column; gap: 1rem; align-items: center; margin-top: 2rem;
    & > div { width: 100%; max-width: 280px; }
  }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: 20px; // Closer to bottom
  left: 50%;
  transform: translateX(-50%);
  color: #0ff;
  font-size: 0.7rem; // Smaller text
  letter-spacing: 4px; // Wider spacing
  text-transform: uppercase;
  animation: ${float} 3s ease-in-out infinite;
  opacity: 0.6;
  cursor: default;
`;

const SectionContainer = styled.section`
  padding: 5rem 1rem; // Increased padding, added horizontal padding
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 4rem 1rem; }
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 3rem;
  color: #fff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.4);

  @media (max-width: 768px) { font-size: 2rem; margin-bottom: 2rem; }
`;

const Grid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) { gap: 1.5rem; }
  @media (max-width: 480px) { grid-template-columns: 1fr; } // Single column on small phones
`;

const CardContainer = styled(motion.div)`
  background: rgba(15, 15, 45, 0.85); // Slightly darker/more opaque
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5); // Stronger shadow
  border: 1px solid rgba(0, 255, 255, 0.25); // Brighter border
  display: flex;
  flex-direction: column;
  min-height: 520px; // Slightly taller
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative; // Needed for hover effects/pulseGlow?

  &:hover {
    transform: translateY(-5px); // Subtle lift on hover
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 255, 255, 0.3);
  }

  // Apply pulseGlow animation
  animation: ${pulseGlow} 4s infinite ease-in-out;
`;

const CardMedia = styled.div`
  position: relative;
  height: 200px;
  overflow: hidden; // Ensure image doesn't bleed out
`;

const CardImage = styled.div`
  width: 100%;
  height: 100%;
  background-size: cover; // Use cover for better image display
  background-position: center;
  // background-size: 200% 200%; // Keep if using gradient animation
  // animation: ${slideGradient} 10s ease infinite; // Keep if using gradient animation
  transition: transform 0.4s ease;

  ${CardContainer}:hover & {
     transform: scale(1.05); // Zoom image slightly on card hover
  }
`;

const CardBadge = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.7);
  color: #0ff;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: bold;
  backdrop-filter: blur(3px);
`;

const CardContent = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const CardTitle = styled.h3`
  font-size: 1.4rem; // Adjusted size
  margin-bottom: 0.75rem;
  color: #fff;
  font-weight: 600;
`;

const CardDescription = styled.p`
  font-size: 0.9rem; // Adjusted size
  color: #b0b0d0;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  flex-grow: 1;
`;

const PriceBox = styled.div`
  background: rgba(0, 0, 0, 0.4); // Slightly more opaque
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: center;
  border: 1px solid rgba(0, 255, 255, 0.15);
  min-height: 110px; // Increased height
  display: flex;
  flex-direction: column; // Stack elements vertically
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease;

  ${CardContainer}:hover & {
      background-color: rgba(0, 0, 0, 0.5); // Darken slightly on card hover
  }
`;

const PriceContent = styled(motion.div)``; // Add motion for potential animation

const PriceLabel = styled.div`
  font-size: 0.75rem; // Smaller label
  color: #8080a0;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 1.5px; // Wider spacing
`;

const Price = styled.div`
  font-size: 2.2rem; // Larger price
  font-weight: bold;
  color: #0ff;
  line-height: 1.1; // Tighter line height

  span {
    font-size: 1.3rem;
    vertical-align: super;
    margin-right: 2px;
    opacity: 0.7; // Less prominent dollar sign
  }
`;

const PriceDetails = styled.div`
  font-size: 0.8rem; // Smaller details
  color: #a0a0c0;
  margin-top: 0.5rem;
  line-height: 1.4;
`;

const LoginMessage = styled.div`
  font-size: 0.9rem;
  color: #ffcc00;
  font-weight: 500;
`;

const CardActions = styled.div`
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 5;

  & > div { // Target motion.div wrapper for button
      width: 80%; // Control button width within action area
      max-width: 220px;
  }
`;

const ParallaxSection = styled.section`
  height: 50vh; // Adjust height as needed
  // ** IMPORTANT: Replace placeholder URL with your actual parallax background image **
  background: url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&q=80&w=1920') center/cover fixed no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: #fff;
  margin: 5rem 0; // Increased margin
  position: relative;

  &::before { // Darker overlay for better text contrast
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6); // Darker overlay
    z-index: 1;
  }

   @media (max-width: 768px) { height: 40vh; margin: 3rem 0;}
`;

const ParallaxContent = styled(motion.div)`
  position: relative;
  z-index: 2;
  max-width: 750px; // Wider content
  padding: 0 1rem;
`;

const ParallaxTitle = styled(motion.h2)`
  font-size: 2.8rem; // Larger title
  margin-bottom: 1rem;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8); // Stronger text shadow

  @media (max-width: 768px) { font-size: 2.2rem; }
`;

const ParallaxSubtitle = styled(motion.p)`
  font-size: 1.3rem; // Larger subtitle
  line-height: 1.7;
  color: #e0e0e0;

  @media (max-width: 768px) { font-size: 1.1rem; }
`;

const CartButton = styled(motion.button)`
   position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px;
   border-radius: 50%; background: linear-gradient(45deg, #00ffff, #0077ff);
   color: white; border: none; font-size: 1.8rem; display: flex;
   justify-content: center; align-items: center; cursor: pointer;
   box-shadow: 0 5px 15px rgba(0, 255, 255, 0.4);
   z-index: 1000;
   transition: background 0.3s ease;

   &:hover {
      background: linear-gradient(45deg, #00ddff, #0055ff); // Slightly different hover gradient
   }
 `;

const PulsingCartButton = styled(CartButton)`
  // Apply pulse animation with adjusted shadow
  animation: ${pulseAnimation} 1.5s infinite;
`;

const CartCount = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #ff4136; // Brighter red
  color: white;
  border-radius: 50%;
  min-width: 22px; // Use min-width
  height: 22px;
  padding: 0 4px; // Add padding for multi-digit counts
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8rem;
  font-weight: bold;
  border: 1px solid white; // White border for definition
`;


// -----------------------------------------------------------------
// StoreFront Component Logic
// -----------------------------------------------------------------
const StoreFront: React.FC = () => {
  const { user } = useAuth();
  const { cart, addToCart, hideCart } = useCart(); // Assuming CartContext provides these
  const { toast } = useToast();

  // --- State ---
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
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

  // --- Effects ---
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

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delayChildren: 0.3, staggerChildren: 0.2 } }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
  };
  const gridVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delayChildren: 0.3, staggerChildren: 0.15 } }
  };
  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
    // Hover handled by CSS (:hover) on CardContainer for simplicity now
  };
  const logoVariants = {
    hidden: { y: -30, opacity: 0, scale: 0.9 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 15, delay: 0.2 } }
  };
  const buttonContainerVariants = { // Renamed for clarity
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { delay: 0.8 } },
  };
  const buttonMotionProps = {
      whileHover:{ scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 10 } },
      whileTap:{ scale: 0.95 },
  };

  // --- Event Handlers ---
  const togglePriceVisibility = (packageId: string) => {
    setRevealPrices((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  };

  const handleAddToCart = async (packageId: string, packageType: 'fixed' | 'monthly') => {
    const packageData = packageType === "fixed"
      ? fixedPackages.find((pkg) => pkg.id === packageId)
      : monthlyPackages.find((pkg) => pkg.id === packageId);

    if (!packageData || !canViewPrices) {
      if (!canViewPrices) {
        toast({ title: "Login Required", description: "Please log in as a client to purchase.", variant: "destructive" });
      }
      return;
    }

    setIsAddingToCart(packageId);
    try {
        // --- EXPLANATION FOR TS2345 ---
        // The following line might show: "Argument of type 'string' is not assignable to parameter of type 'number'.ts(2345)"
        // This means the `addToCart` function defined in `frontend/src/context/CartContext.tsx`
        // currently expects a 'number' as its first argument.
        // **THE FIX REQUIRED IS IN CartContext.tsx**: Update the `addToCart` function signature
        // in that file to accept a `string` ID, like: `addToCart = (id: string, ...) => { ... }`
        await addToCart(packageId); // Pass the string ID as intended

        toast({ title: "Success!", description: `Added ${packageData.name} to cart.` });
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1600); // Pulse duration

    } catch (error: any) {
        console.error("Error adding to cart:", error);
        const message = error.response?.data?.message || "Failed to add item. Please try again.";
        toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
        setIsAddingToCart(null);
    }
  };

  const handleToggleCart = () => setShowCart(prev => !prev);
  const handleHideCart = () => setShowCart(false);

  // --- Component Return JSX ---
  return (
    <StoreContainer>
      <VideoBackground>
        <video autoPlay loop muted playsInline key="bg-video"> {/* Added key */}
          <source src={wavesVideo} type="video/mp4" />
        </video>
      </VideoBackground>

      <ContentOverlay>
        {/* Hero Section */}
        <HeroSection ref={heroRef} initial="hidden" animate={heroControls} variants={containerVariants}>
          <PremiumBadge
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            PREMIER
          </PremiumBadge>

          {/* Logo */}
          <LogoContainer variants={logoVariants}>
            <img src={logoImg} alt="Swan Studios" />
          </LogoContainer>

          {/* Hero Text Content */}
          <HeroContent>
            <HeroTitle variants={itemVariants}>Elite Training Designed by Sean Swan</HeroTitle>
            <HeroSubtitle variants={itemVariants}>25+ Years of Experience & NASM-Approved Protocols</HeroSubtitle>
            <HeroDescription variants={itemVariants}>
              Discover a revolutionary workout program created from thousands of hours of hands-on training...
            </HeroDescription>

            {/* Hero Buttons */}
            <ButtonsContainer variants={buttonContainerVariants}>
               <motion.div {...buttonMotionProps}>
                  <GlowButton text="Book Consultation" theme="cosmic" size="large" onClick={() => setShowOrientation(true)} />
               </motion.div>
               <motion.div {...buttonMotionProps}>
                  <GlowButton text="View Packages" theme="purple" size="large" onClick={() => document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" })} />
               </motion.div>
            </ButtonsContainer>
          </HeroContent>

          {/* Scroll Down Indicator */}
          {animateScrollIndicator && (
             <ScrollIndicator
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }} // Fade in and out
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
             >DISCOVER</ScrollIndicator>
           )}
        </HeroSection>

        {/* Fixed Term Packages Section */}
        <SectionContainer id="packages-section" ref={fixedPackagesRef}>
          <SectionTitle initial="hidden" animate={fixedPackagesControls} variants={itemVariants}>
            Premium Training Packages
          </SectionTitle>
          <Grid initial="hidden" animate={fixedPackagesControls} variants={gridVariants}>
            {fixedPackages.map((pkg) => {
              const { start, end } = getGradientColors(pkg.theme);
              const isLoading = isAddingToCart === pkg.id;
              return (
                <motion.div key={pkg.id} variants={cardVariants}>
                  <CardContainer onClick={() => togglePriceVisibility(pkg.id)}> {/* Hover handled by CSS */}
                    <CardMedia>
                      <CardImage style={{ background: `linear-gradient(135deg, ${start}, ${end})` }} />
                      <CardBadge>{pkg.sessions} Sessions</CardBadge>
                    </CardMedia>
                    <CardContent>
                      <CardTitle>{pkg.name}</CardTitle>
                      <CardDescription>{pkg.description}</CardDescription>
                      <PriceBox>
                        {canViewPrices ? (
                           revealPrices[pkg.id] ? (
                            <PriceContent initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                              <PriceLabel>Investment</PriceLabel>
                              <Price><span>$</span>{formatPrice(pkg.totalCost)}</Price>
                              <PriceDetails>${formatPrice(pkg.pricePerSession)} per session</PriceDetails>
                            </PriceContent>
                           ) : (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Click to reveal price</motion.div>)
                         ) : ( <LoginMessage>Login as a client to view pricing</LoginMessage> )
                        }
                      </PriceBox>
                      <CardActions>
                         <motion.div {...buttonMotionProps}>
                            <GlowButton
                              text={isLoading ? "Adding..." : "Add to Cart"}
                              theme={pkg.theme}
                              size="medium"
                              disabled={isLoading || !canViewPrices} // Simplified disabled logic
                              onClick={(e) => { e.stopPropagation(); handleAddToCart(pkg.id, "fixed"); }}
                            />
                         </motion.div>
                      </CardActions>
                    </CardContent>
                  </CardContainer>
                </motion.div>
              );
            })}
          </Grid>
        </SectionContainer>

        {/* Parallax Divider */}
        <ParallaxSection ref={parallaxRef}>
          <ParallaxContent initial="hidden" animate={parallaxControls} variants={containerVariants}>
            <ParallaxTitle variants={itemVariants}>Elevate Your Performance</ParallaxTitle>
            <ParallaxSubtitle variants={itemVariants}>
              Our premium packages transform your approach to fitness and wellness.
            </ParallaxSubtitle>
          </ParallaxContent>
        </ParallaxSection>

        {/* Monthly Packages Section */}
        <SectionContainer ref={monthlyPackagesRef}>
          <SectionTitle initial="hidden" animate={monthlyPackagesControls} variants={itemVariants}>
            Long-Term Excellence Programs
          </SectionTitle>
          <Grid initial="hidden" animate={monthlyPackagesControls} variants={gridVariants}>
             {monthlyPackages.map((pkg) => {
               const { start, end } = getGradientColors(pkg.theme);
               const isLoading = isAddingToCart === pkg.id;
               return (
                 <motion.div key={pkg.id} variants={cardVariants}>
                   <CardContainer onClick={() => togglePriceVisibility(pkg.id)}>
                     <CardMedia>
                       <CardImage style={{ background: `linear-gradient(135deg, ${start}, ${end})` }} />
                       <CardBadge>{pkg.months} Months</CardBadge>
                     </CardMedia>
                     <CardContent>
                       <CardTitle>{pkg.name}</CardTitle>
                       <CardDescription>{pkg.description}</CardDescription>
                       <PriceBox>
                         {canViewPrices ? (
                            revealPrices[pkg.id] ? (
                              <PriceContent initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                                <PriceLabel>Investment</PriceLabel>
                                <Price><span>$</span>{formatPrice(pkg.totalCost)}</Price>
                                <PriceDetails>
                                    {pkg.totalSessions} sessions ({pkg.sessionsPerWeek}/week)<br/>
                                    ${formatPrice(pkg.pricePerSession)} per session
                                </PriceDetails>
                              </PriceContent>
                           ) : (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Click to reveal price</motion.div>)
                         ) : ( <LoginMessage>Login as a client to view pricing</LoginMessage> )
                         }
                       </PriceBox>
                       <CardActions>
                          <motion.div {...buttonMotionProps}>
                             <GlowButton
                               text={isLoading ? "Adding..." : "Add to Cart"}
                               theme={pkg.theme}
                               size="medium"
                               disabled={isLoading || !canViewPrices}
                               onClick={(e) => { e.stopPropagation(); handleAddToCart(pkg.id, "monthly"); }}
                             />
                          </motion.div>
                       </CardActions>
                     </CardContent>
                   </CardContainer>
                 </motion.div>
               );
             })}
          </Grid>

          {/* Final CTA Button */}
           <motion.div
             style={{ display: "flex", justifyContent: "center", marginTop: "4rem", position: "relative", zIndex: 20 }}
             initial="hidden" // Use variants for consistency
             animate={monthlyPackagesControls} // Use existing controls
             variants={itemVariants} // Use standard item variant
           >
             <motion.div {...buttonMotionProps}>
                <GlowButton text="Schedule Consultation" theme="cosmic" size="large" onClick={() => setShowOrientation(true)} />
             </motion.div>
           </motion.div>
        </SectionContainer>
      </ContentOverlay>

      {/* Floating Cart Button */}
       {user && (
            <AnimatePresence>
               { showPulse ? (
                   <PulsingCartButton key="pulsing-cart" onClick={handleToggleCart} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} >
                       🛒
                       {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
                   </PulsingCartButton>
               ) : (
                   <CartButton key="static-cart" onClick={handleToggleCart} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} >
                       🛒
                       {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
                   </CartButton>
               )}
            </AnimatePresence>
       )}

      {/* Modals */}
      {/* Wrap modals in AnimatePresence for entry/exit animations if desired */}
      <AnimatePresence>
        {showOrientation && <OrientationForm key="orientation-modal" onClose={() => setShowOrientation(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCart && <ShoppingCart key="cart-modal" onClose={handleHideCart} />}
      </AnimatePresence>

    </StoreContainer>
  );
};

export default StoreFront;