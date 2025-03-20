import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import GlowButton from "../../components/Button/glowButton";
import OrientationForm from "../../components/OrientationForm/orientationForm";
import ShoppingCart from "../../components/ShoppingCart/ShoppingCart";

// Import assets
import wavesVideo from "../../assets/Swans.mp4";
import logoImg from "../../assets/Logo.png";

// -----------------------------------------------------------------
// Hard-Coded Package Data
// -----------------------------------------------------------------
const fixedPackages = [
  {
    id: 1,
    sessions: 8,
    pricePerSession: 175,
    totalCost: 1400, // 8 x 175
    name: "Gold Glimmer",
    description: "An introductory 8-session package to ignite your transformation.",
    theme: "cosmic"
  },
  {
    id: 2,
    sessions: 20,
    pricePerSession: 165,
    totalCost: 3300, // 20 x 165
    name: "Platinum Pulse",
    description: "Elevate your performance with 20 dynamic sessions.",
    theme: "purple"
  },
  {
    id: 3,
    sessions: 50,
    pricePerSession: 150,
    totalCost: 7500, // 50 x 150
    name: "Rhodium Rise",
    description: "Unleash your inner champion with 50 premium sessions.",
    theme: "emerald"
  }
];

const monthlyPackages = [
  { 
    id: 4, 
    months: 3, 
    sessionsPerWeek: 4, 
    pricePerSession: 155, 
    totalSessions: 48,    // 3 * 4 * 4 
    totalCost: 7440,      // 48 x 155 
    name: "Silver Storm", 
    description: "High intensity 3-month program at 4 sessions per week.",
    theme: "cosmic"
  },
  { 
    id: 6, 
    months: 6, 
    sessionsPerWeek: 4, 
    pricePerSession: 145, 
    totalSessions: 96,    // 6 * 4 * 4 
    totalCost: 13920,     // 96 x 145 
    name: "Gold Grandeur", 
    description: "Maximize your potential with 6 months at 4 sessions per week.",
    theme: "purple"
  },
  { 
    id: 9, 
    months: 9, 
    sessionsPerWeek: 4, 
    pricePerSession: 140, 
    totalSessions: 144,   // 9 * 4 * 4 
    totalCost: 20160,     // 144 x 140 
    name: "Platinum Prestige", 
    description: "The best value – 9 months at 4 sessions per week.",
    theme: "ruby"
  },
  { 
    id: 12, 
    months: 12, 
    sessionsPerWeek: 4, 
    pricePerSession: 135, 
    totalSessions: 192,   // 12 * 4 * 4 
    totalCost: 25920,     // 192 x 135 
    name: "Rhodium Reign", 
    description: "The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.",
    theme: "emerald"
  }
];

// -----------------------------------------------------------------
// Keyframe Animations
// -----------------------------------------------------------------
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(120, 81, 169, 0.7);
  }
  100% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const slideGradient = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(0, 255, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
`;

// -----------------------------------------------------------------
// Styled Components
// -----------------------------------------------------------------
const StoreContainer = styled.div`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
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
      rgba(0, 0, 0, 0.7),
      rgba(10, 10, 30, 0.85),
      rgba(20, 20, 50, 0.9)
    );
  }
  
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 1;
  padding: 0;
  color: white;
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
`;

const HeroContent = styled(motion.div)`
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const LogoContainer = styled(motion.div)`
  position: relative;
  animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
  margin-bottom: 2rem;
  
  img {
    height: 160px;
    max-width: 100%;
    object-fit: contain;
  }

  @media (max-width: 768px) {
    img {
      height: 120px;
    }
  }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(10, 10, 30, 0.6);
  backdrop-filter: blur(10px);
  color: white;
  z-index: 5;
  letter-spacing: 3px;
  
  &:before {
    content: "★★★★★★★";
    display: block;
    font-size: 0.8rem;
    letter-spacing: 2px;
    color: gold;
    text-align: center;
    margin-bottom: 4px;
  }
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
  }
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3.2rem;
  margin-bottom: 1rem;
  font-weight: 300;
  color: white;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled(motion.h2)`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: var(--silver, #c0c0c0);
  background: linear-gradient(
    to right,
    #a9f8fb,
    #46cdcf,
    #7b2cbf,
    #c8b6ff,
    #a9f8fb
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
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
  z-index: 10;
  
  & > button, & > div {
    flex: 1;
    min-width: 180px;
    max-width: 250px;
  }
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    
    & > button, & > div {
      width: 100%;
      max-width: 100%;
    }
  }
`;

const ParallaxSection = styled.div`
  position: relative;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 2rem 0;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      rgba(0, 255, 255, 0.2),
      rgba(120, 81, 169, 0.2)
    );
    background-size: 200% 200%;
    animation: ${slideGradient} 5s ease infinite;
    z-index: 0;
  }
  
  &:after {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 0.8),
      rgba(120, 81, 169, 0.8),
      rgba(0, 255, 255, 0)
    );
  }
`;

const ParallaxContent = styled(motion.div)`
  position: relative;
  z-index: 1;
  text-align: center;
`;

const ParallaxTitle = styled(motion.h2)`
  font-size: 3rem;
  font-weight: 300;
  color: white;
  text-transform: uppercase;
  letter-spacing: 8px;
  margin-bottom: 1rem;
`;

const ParallaxSubtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  max-width: 600px;
  margin: 0 auto;
`;

const SectionContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled(motion.h2)`
  text-align: center;
  margin-bottom: 3rem;
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
`;

const Grid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
  margin-bottom: 4rem;
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const CardContainer = styled(motion.div)`
  position: relative;
  border-radius: 15px;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }
`;

const CardMedia = styled.div`
  width: 100%;
  height: 200px;
  position: relative;
  overflow: hidden;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0),
      rgba(10, 10, 30, 0.8)
    );
    z-index: 1;
  }
`;

const CardImage = styled.div`
  width: 100%;
  height: 100%;
  background-size: 200% 200%;
  animation: ${slideGradient} 5s ease infinite;
`;

const CardContent = styled.div`
  padding: 1.5rem;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  
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
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0)
    );
  }
`;

const CardTitle = styled.h3`
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  color: white;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  font-weight: 400;
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
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1.5rem;
  line-height: 1.6;
`;

const PriceBox = styled(motion.div)`
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  background: rgba(30, 30, 60, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 5s linear infinite;
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
  font-size: 1.8rem;
  font-weight: 300;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  
  span {
    font-size: 1rem;
    margin-right: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const PriceDetails = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const LoginMessage = styled.div`
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`;

const CardActions = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: center;
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 2px;
  
  &:after {
    content: "↓";
    font-size: 1.5rem;
    margin-top: 0.5rem;
    animation: ${float} 2s ease-in-out infinite;
  }
`;

const PopupNotification = styled(motion.div)`
  position: fixed;
  bottom: 80px;
  right: 20px;
  background: linear-gradient(135deg, rgba(120, 81, 169, 0.9), rgba(0, 255, 255, 0.9));
  color: white;
  padding: 15px 20px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  max-width: 300px;
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
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 100;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
`;

const PulsingCartButton = styled(CartButton)`
  animation: ${pulseAnimation} 1.5s infinite;
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

// -----------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------
const formatPrice = (price) => price.toLocaleString("en-US");

const getGradientColors = (theme) => {
  switch (theme) {
    case "cosmic":
      return { start: "rgba(93, 63, 211, 0.3)", end: "rgba(255, 46, 99, 0.3)" };
    case "ruby":
      return { start: "rgba(232, 0, 70, 0.3)", end: "rgba(253, 0, 159, 0.3)" };
    case "emerald":
      return { start: "rgba(0, 232, 176, 0.3)", end: "rgba(0, 253, 159, 0.3)" };
    case "purple":
    default:
      return { start: "rgba(120, 0, 245, 0.3)", end: "rgba(200, 148, 255, 0.3)" };
  }
};

// -----------------------------------------------------------------
// StoreFront Component
// -----------------------------------------------------------------
const StoreFront = () => {
  const { user } = useAuth();
  const { cart, showCart, toggleCart, hideCart, addToCart } = useCart();
  const [showOrientation, setShowOrientation] = useState(false);
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const [revealPrices, setRevealPrices] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef);
  const parallaxRef = useRef(null);
  const isParallaxInView = useInView(parallaxRef);
  const fixedPackagesRef = useRef(null);
  const isFixedPackagesInView = useInView(fixedPackagesRef);
  const monthlyPackagesRef = useRef(null);
  const isMonthlyPackagesInView = useInView(monthlyPackagesRef);
  
  const heroControls = useAnimation();
  const parallaxControls = useAnimation();
  const fixedPackagesControls = useAnimation();
  const monthlyPackagesControls = useAnimation();
  
  // Only clients and admins can view price details
  const canViewPrices = user && (user.role === "client" || user.role === "admin");
  
  // Animation handlers
  useEffect(() => {
    if (isHeroInView) {
      heroControls.start("visible");
    }
    if (isParallaxInView) {
      parallaxControls.start("visible");
    }
    if (isFixedPackagesInView) {
      fixedPackagesControls.start("visible");
    }
    if (isMonthlyPackagesInView) {
      monthlyPackagesControls.start("visible");
    }
    
    // Hide scroll indicator when user scrolls
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setAnimateScrollIndicator(false);
      } else {
        setAnimateScrollIndicator(true);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [
    isHeroInView,
    isParallaxInView,
    isFixedPackagesInView,
    isMonthlyPackagesInView,
    heroControls,
    parallaxControls,
    fixedPackagesControls,
    monthlyPackagesControls
  ]);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.7, ease: "easeOut" }
    }
  };
  
  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.15
      }
    }
  };
  
  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    hover: {
      y: -10,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };
  
  // Toggle price visibility
  const togglePriceVisibility = (packageId) => {
    setRevealPrices((prev) => ({
      ...prev,
      [packageId]: !prev[packageId]
    }));
  };

  // Enhanced handleAddToCart function
  const handleAddToCart = async (packageId, packageType) => {
    const packageData =
      packageType === "fixed"
        ? fixedPackages.find((pkg) => pkg.id === packageId)
        : monthlyPackages.find((pkg) => pkg.id === packageId);
    if (!packageData) return;
    
    try {
      setIsAddingToCart(true);
      await addToCart(packageId);
      setSuccessMessage(`Added ${packageData.name} to cart`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      if (error.response?.data?.message) {
        setSuccessMessage(`Error: ${error.response.data.message}`);
      } else {
        setSuccessMessage(`Error adding item to cart. Please try again.`);
      }
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <StoreContainer>
      <VideoBackground>
        <video autoPlay loop muted playsInline>
          <source src={wavesVideo} type="video/mp4" />
        </video>
      </VideoBackground>
      
      <ContentOverlay>
        {/* Hero Section */}
        <HeroSection ref={heroRef}>
          <PremiumBadge
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            PREMIER
          </PremiumBadge>
          
          <motion.div initial="hidden" animate={heroControls} variants={containerVariants}>
            <LogoContainer variants={itemVariants}>
              <img src={logoImg} alt="Swan Studios" />
            </LogoContainer>
            
            <HeroContent>
              <HeroTitle variants={itemVariants}>
                Elite Training Designed by Sean Swan
              </HeroTitle>
              
              <HeroSubtitle variants={itemVariants}>
                25+ Years of Experience & NASM-Approved Protocols
              </HeroSubtitle>
              
              <HeroDescription variants={itemVariants}>
                Discover a revolutionary workout program created from thousands of hours of hands-on training by elite trainer Sean Swan—merging cutting-edge fitness science with proven NASM protocols. Our personalized approach caters to everyone—from children to seniors—ensuring you unlock your full potential.
              </HeroDescription>
              
              <ButtonsContainer variants={itemVariants}>
                <GlowButton
                  text="Book Consultation"
                  theme="cosmic"
                  size="large"
                  animateOnRender
                  onClick={() => setShowOrientation(true)}
                />
                <GlowButton
                  text="View Packages"
                  theme="purple"
                  size="large"
                  animateOnRender
                  onClick={() => {
                    const packagesSection = document.getElementById("packages-section");
                    packagesSection?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              </ButtonsContainer>
            </HeroContent>
            
            {animateScrollIndicator && (
              <ScrollIndicator
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
              >
                DISCOVER
              </ScrollIndicator>
            )}
          </motion.div>
        </HeroSection>
        
        {/* Premium Packages Section */}
        <SectionContainer id="packages-section" ref={fixedPackagesRef}>
          <SectionTitle initial={{ opacity: 0, y: 20 }} animate={fixedPackagesControls} variants={itemVariants}>
            Premium Training Packages
          </SectionTitle>
          
          <Grid initial="hidden" animate={fixedPackagesControls} variants={gridVariants}>
            {fixedPackages.map((pkg, index) => {
              const { start, end } = getGradientColors(pkg.theme);
              return (
                <motion.div
                  key={pkg.id}
                  variants={cardVariants}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                    animationName: pulseGlow.getName()
                  }}
                >
                  <CardContainer whileHover="hover" onClick={() => togglePriceVisibility(pkg.id)}>
                    <CardMedia>
                      <CardImage
                        style={{
                          background: `linear-gradient(135deg, ${start}, ${end})`
                        }}
                      />
                      <CardBadge>{pkg.sessions} Sessions</CardBadge>
                    </CardMedia>
                    
                    <CardContent>
                      <CardTitle>{pkg.name}</CardTitle>
                      <CardDescription>{pkg.description}</CardDescription>
                      
                      <PriceBox>
                        {canViewPrices ? (
                          <PriceContent>
                            <PriceLabel>Investment</PriceLabel>
                            <Price>
                              <span>$</span>
                              {formatPrice(pkg.totalCost)}
                            </Price>
                            <PriceDetails>
                              ${formatPrice(pkg.pricePerSession)} per session
                            </PriceDetails>
                          </PriceContent>
                        ) : (
                          <LoginMessage>Login as a client to view pricing</LoginMessage>
                        )}
                      </PriceBox>
                      
                      <CardActions>
                        <GlowButton
                          text={isAddingToCart ? "Adding..." : canViewPrices ? "Add to Cart" : "Login to Purchase"}
                          theme={pkg.theme}
                          size="medium"
                          disabled={isAddingToCart}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canViewPrices) {
                              handleAddToCart(pkg.id, "fixed");
                            } else {
                              alert("Only clients can purchase packages. Please log in or upgrade.");
                            }
                          }}
                        />
                      </CardActions>
                    </CardContent>
                  </CardContainer>
                </motion.div>
              );
            })}
          </Grid>
        </SectionContainer>
        
        {/* Parallax Section */}
        <ParallaxSection ref={parallaxRef}>
          <ParallaxContent initial="hidden" animate={parallaxControls} variants={containerVariants}>
            <ParallaxTitle variants={itemVariants}>Elevate Your Performance</ParallaxTitle>
            <ParallaxSubtitle variants={itemVariants}>
              Our premium packages are designed to transform not just your body, but your entire approach to fitness and wellness.
            </ParallaxSubtitle>
          </ParallaxContent>
        </ParallaxSection>
        
        {/* Monthly Packages Section */}
        <SectionContainer ref={monthlyPackagesRef}>
          <SectionTitle initial={{ opacity: 0, y: 20 }} animate={monthlyPackagesControls} variants={itemVariants}>
            Long-Term Excellence Programs
          </SectionTitle>
          
          <Grid initial="hidden" animate={monthlyPackagesControls} variants={gridVariants}>
            {monthlyPackages.map((pkg, index) => {
              const { start, end } = getGradientColors(pkg.theme);
              return (
                <motion.div
                  key={pkg.id}
                  variants={cardVariants}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                    animationName: pulseGlow.getName()
                  }}
                >
                  <CardContainer whileHover="hover" onClick={() => togglePriceVisibility(pkg.id)}>
                    <CardMedia>
                      <CardImage
                        style={{
                          background: `linear-gradient(135deg, ${start}, ${end})`
                        }}
                      />
                      <CardBadge>{pkg.months} Months</CardBadge>
                    </CardMedia>
                    
                    <CardContent>
                      <CardTitle>{pkg.name}</CardTitle>
                      <CardDescription>{pkg.description}</CardDescription>
                      
                      <PriceBox>
                        {canViewPrices ? (
                          <PriceContent>
                            <PriceLabel>Investment</PriceLabel>
                            <Price>
                              <span>$</span>
                              {formatPrice(pkg.totalCost)}
                            </Price>
                            <PriceDetails>
                              {pkg.totalSessions} sessions ({pkg.sessionsPerWeek}/week)
                              <br />
                              ${formatPrice(pkg.pricePerSession)} per session
                            </PriceDetails>
                          </PriceContent>
                        ) : (
                          <LoginMessage>Login as a client to view pricing</LoginMessage>
                        )}
                      </PriceBox>
                      
                      <CardActions>
                        <GlowButton
                          text={isAddingToCart ? "Adding..." : canViewPrices ? "Add to Cart" : "Login to Purchase"}
                          theme={pkg.theme}
                          size="medium"
                          disabled={isAddingToCart}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canViewPrices) {
                              handleAddToCart(pkg.id, "monthly");
                            } else {
                              alert("Only clients can purchase packages. Please log in or upgrade.");
                            }
                          }}
                        />
                      </CardActions>
                    </CardContent>
                  </CardContainer>
                </motion.div>
              );
            })}
          </Grid>
          
          <motion.div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "3rem"
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={monthlyPackagesControls}
            variants={itemVariants}
          >
            <GlowButton
              text="Schedule Consultation"
              theme="cosmic"
              size="large"
              onClick={() => setShowOrientation(true)}
            />
          </motion.div>
        </SectionContainer>
      </ContentOverlay>
      
      {/* Enhanced Success/Error message toast with AnimatePresence for smooth transitions */}
      <AnimatePresence>
        {successMessage && (
          <PopupNotification
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {successMessage}
          </PopupNotification>
        )}
      </AnimatePresence>
      
      {/* Floating cart button with pulsing animation when items are added */}
      {user && (
        <>
          {successMessage ? (
            <PulsingCartButton onClick={toggleCart} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              🛒
              {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
            </PulsingCartButton>
          ) : (
            <CartButton onClick={toggleCart} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              🛒
              {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
            </CartButton>
          )}
        </>
      )}
      
      {/* Orientation Form Modal */}
      {showOrientation && <OrientationForm onClose={() => setShowOrientation(false)} />}
      
      {/* Shopping Cart Modal */}
      {showCart && <ShoppingCart onClose={hideCart} />}
    </StoreContainer>
  );
};

export default StoreFront;
