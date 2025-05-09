// File: frontend/src/pages/shop/StoreFront.component.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext"; // Correct path
import { useCart } from "../../context/CartContext";   // Correct path
import GlowButton from "../../components/Button/glowButton"; // Correct path
import OrientationForm from "../../components/OrientationForm/orientationForm"; // Correct path
import ShoppingCart from "../../components/ShoppingCart/ShoppingCart"; // Correct path
import { useToast } from "../../hooks/use-toast";           // Correct path
import axios from 'axios'; // Import regular axios for fallback

// --- Asset Imports ---
const swanVideo = "/Swans.mp4"; // Ensure '/public/Swans.mp4' exists
const logoImg = "/Logo.png";   // Ensure '/public/Logo.png' exists

// --- Type Definition for Fetched Item (Align with API) ---
interface StoreItem {
    id: number; // Expect numeric ID from API/DB
    name: string;
    description: string | null;
    totalCost?: number; // Use totalCost if API sends it
    displayPrice: number; // Main price to display
    pricePerSession?: number | null;
    priceDetails?: string | null; // Optional extra details
    imageUrl: string | null;
    theme?: string | null; // Use theme from API if available
    sessions?: number | null;
    months?: number | null;
    sessionsPerWeek?: number | null;
    totalSessions?: number | null;
    category?: string | null;
    itemType?: string; // e.g., 'TRAINING_PACKAGE_FIXED', 'TRAINING_PACKAGE_SUBSCRIPTION'
    includedFeatures?: string | null; // Expecting JSON string or null
    trackInventory?: boolean;
    inventoryQuantity?: number | null;
    packageType?: string; // Added package type
    // Add other fields your API might return
}

// Type for API Response
interface ApiResponse {
    success: boolean;
    items: StoreItem[];
    // Add pagination if your API supports it
}

// --- Utility Functions ---
const formatPrice = (price: number | null | undefined): string => {
  if (typeof price !== 'number' || isNaN(price)) { return '$0'; } // Added NaN check
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

// --- Keyframe Animations (Original) ---
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

// --- Styled Components (Original Structure) ---
const StoreContainer = styled.div`
  position: relative; overflow-x: hidden; background: linear-gradient(135deg, #0a0a1a, #1e1e3f); color: white;
`;
const VideoBackground = styled.div`
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden;
  &:after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(10,10,30,0.8), rgba(20,20,50,0.9)); z-index: 1; }
  video { position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%; width: auto; height: auto; transform: translate(-50%, -50%); z-index: 0; }
`;
const ContentOverlay = styled.div`
  position: relative; z-index: 1; padding: 0;
`;
const HeroSection = styled.section`
  position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 2rem; text-align: center; overflow: hidden;
`;
const LogoContainer = styled(motion.div)`
  position: relative; display: flex; justify-content: center; align-items: center; width: 100%; animation: ${float} 6s ease-in-out infinite; filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5)); margin-bottom: 1.5rem; z-index: 2;
  img { height: 160px; max-width: 90%; object-fit: contain; }
  @media (max-width: 768px) { img { height: 120px; } margin-bottom: 1rem; }
  @media (max-width: 480px) { img { height: 100px; } margin-bottom: 0.5rem; }
`;
const HeroContent = styled(motion.div)`
  max-width: 800px; width: 100%; margin: 0 auto; position: relative; z-index: 2; background: rgba(10, 10, 30, 0.6); padding: 2rem; border-radius: 15px; backdrop-filter: blur(5px); border: 1px solid rgba(0, 255, 255, 0.1);
  @media (max-width: 768px) { padding: 1.5rem; }
`;
const PremiumBadge = styled(motion.div)`
  position: absolute; top: 1.5rem; right: 1.5rem; font-family: 'Playfair Display', serif; font-size: 1rem; padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; background: rgba(10, 10, 30, 0.6); backdrop-filter: blur(10px); color: white; z-index: 3; letter-spacing: 3px;
  &:before { content: "★★★★★★★"; display: block; font-size: 0.8rem; letter-spacing: 2px; color: gold; text-align: center; margin-bottom: 4px; }
  &:after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(45deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%); background-size: 200% auto; animation: ${shimmer} 3s linear infinite; }
`;
const AnimatedName = styled(motion.span)`
  display: inline-block; background: linear-gradient(to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb); background-size: 200% auto; background-clip: text; -webkit-background-clip: text; color: transparent; animation: ${shimmer} 3s linear infinite, ${textGlow} 2s ease-in-out infinite alternate; padding: 0 5px;
`;
const HeroTitle = styled(motion.h1)`
  font-size: 3.2rem; margin-bottom: 1rem; font-weight: 300; color: white; text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); letter-spacing: 1px;
  @media (max-width: 768px) { font-size: 2.5rem; }
`;
const HeroSubtitle = styled(motion.h2)`
  font-size: 1.75rem; margin-bottom: 1.5rem; color: var(--silver, #c0c0c0); background: linear-gradient(to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb); background-size: 200% auto; background-clip: text; -webkit-background-clip: text; color: transparent; animation: ${shimmer} 4s linear infinite; display: inline-block; font-weight: 300;
  @media (max-width: 768px) { font-size: 1.25rem; }
`;
const HeroDescription = styled(motion.p)`
  font-size: 1.125rem; margin-bottom: 2rem; line-height: 1.6; color: rgba(255, 255, 255, 0.9); text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7); max-width: 800px; margin: 0 auto 2rem;
  @media (max-width: 768px) { font-size: 1rem; }
`;
const ButtonsContainer = styled(motion.div)`
  display: flex; gap: 1.5rem; margin-top: 2rem; justify-content: center; position: relative; z-index: 3;
  & > div, & > button { position: relative; flex: 1 1 auto; min-width: 180px; max-width: 250px; }
  @media (max-width: 600px) { flex-direction: column; gap: 1rem; align-items: center; & > div, & > button { width: 100%; max-width: 280px; } }
`;
const ScrollIndicator = styled(motion.div)`
  position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); letter-spacing: 2px; z-index: 2;
  &:after { content: "↓"; font-size: 1.5rem; margin-top: 0.5rem; animation: ${float} 2s ease-in-out infinite; }
`;
const ParallaxSection = styled(motion.div)`
  position: relative; height: 60vh; display: flex; align-items: center; justify-content: center; overflow: hidden; margin: 0; background: url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&q=80&w=1920') center/cover fixed no-repeat; background-attachment: fixed; z-index: 1;
  &:before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10, 10, 30, 0.65); z-index: 1; }
  @media (max-width: 768px) { height: 45vh; }
`;
const ParallaxContent = styled(motion.div)` position: relative; z-index: 2; text-align: center; max-width: 750px; padding: 0 1rem; `;
const ParallaxTitle = styled(motion.h2)` font-size: 3.5rem; font-weight: 300; color: white; text-transform: uppercase; letter-spacing: 10px; margin-bottom: 1rem; text-shadow: 0 2px 15px rgba(0, 0, 0, 0.7); @media (max-width: 768px) { font-size: 2.5rem; letter-spacing: 6px; } `;
const ParallaxSubtitle = styled(motion.p)` font-size: 1.2rem; color: rgba(255, 255, 255, 0.8); max-width: 600px; margin: 0 auto; line-height: 1.7; @media (max-width: 768px) { font-size: 1rem; } `;
const SectionContainer = styled.section` padding: 5rem 2rem; max-width: 1400px; margin: 0 auto; position: relative; z-index: 1; `;
const SectionTitle = styled(motion.h2)` text-align: center; margin-bottom: 3rem; font-size: 2.5rem; font-weight: 300; position: relative; display: inline-block; padding-bottom: 15px; color: white; width: 100%; &:after { content: ""; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 150px; height: 2px; background: linear-gradient(to right, rgba(0, 255, 255, 0), rgba(0, 255, 255, 1), rgba(0, 255, 255, 0)); } `;
const Grid = styled(motion.div)` display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2.5rem; margin-bottom: 4rem; @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); } `;
// Enhanced neon animation keyframes
const neonPulse = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3), 0 0 15px rgba(120, 81, 169, 0.2); }
  50% { box-shadow: 0 0 8px rgba(0, 255, 255, 0.8), 0 0 15px rgba(0, 255, 255, 0.5), 0 0 25px rgba(120, 81, 169, 0.3); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3), 0 0 15px rgba(120, 81, 169, 0.2); }
`;

const neonBorderEffect = keyframes`
  0% { border-color: rgba(0, 255, 255, 0.5); }
  50% { border-color: rgba(120, 81, 169, 0.7); }
  100% { border-color: rgba(0, 255, 255, 0.5); }
`;

const CardContainer = styled(motion.div)`
  position: relative; 
  border-radius: 15px; 
  overflow: hidden; 
  background: rgba(30, 30, 60, 0.3); 
  backdrop-filter: blur(10px); 
  border: 0.5em solid rgba(0, 255, 255, 0.3); 
  transition: all 0.3s ease; 
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3); 
  cursor: pointer; 
  height: 100%; 
  display: flex; 
  flex-direction: column;
  animation: ${neonBorderEffect} 3s infinite ease-in-out, ${neonPulse} 4s infinite ease-in-out;
  
  &:hover { 
    transform: translateY(-10px); 
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.5);
    border-color: rgba(0, 255, 255, 0.8);
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 12px;
    padding: 0.5em;
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;
const CardMedia = styled.div` width: 100%; height: 200px; position: relative; overflow: hidden; &:before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(10, 10, 30, 0.8)); z-index: 1; } `;
const CardImage = styled.div` width: 100%; height: 100%; background-size: cover; background-position: center; `;
const CardContent = styled.div` padding: 1.5rem; position: relative; flex: 1; display: flex; flex-direction: column; &:before { content: ""; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 80%; height: 1px; background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)); } `;
const CardTitle = styled.h3` font-size: 1.75rem; margin-bottom: 0.75rem; color: white; text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); font-weight: 400; `;
const CardBadge = styled.span` position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; background: rgba(0, 0, 0, 0.6); border-radius: 20px; font-size: 0.8rem; color: white; z-index: 2; border: 1px solid rgba(255, 255, 255, 0.2); `;
const CardDescription = styled.p` font-size: 1rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 1.5rem; line-height: 1.6; `;
const FeaturesList = styled.ul` list-style: none; padding: 0 0 1rem 0; margin: 0; font-size: 0.9rem; color: rgba(255, 255, 255, 0.7); li { margin-bottom: 0.4rem; position: relative; padding-left: 1.2rem; &:before { content: '✓'; position: absolute; left: 0; color: #00ffff; } } `;
const PriceBox = styled(motion.div)` padding: 1rem; margin-bottom: 1.5rem; border-radius: 8px; background: rgba(30, 30, 60, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); text-align: center; position: relative; overflow: hidden; min-height: 110px; &:before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(45deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%); background-size: 200% auto; animation: ${shimmer} 5s linear infinite; } `;
const PriceContent = styled(motion.div)` position: relative; z-index: 1; `;
const PriceLabel = styled.div` font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); margin-bottom: 0.5rem; `;
const Price = styled.div` font-size: 1.8rem; font-weight: 300; color: white; display: flex; align-items: center; justify-content: center; span { font-size: 1rem; margin-right: 0.5rem; color: rgba(255, 255, 255, 0.8); } `;
const PriceDetails = styled.div` margin-top: 0.5rem; font-size: 0.9rem; color: rgba(255, 255, 255, 0.7); `;
const LoginMessage = styled.div` font-style: italic; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; display: flex; align-items: center; justify-content: center; height: 100%;`; // Centering
const CardActions = styled.div` margin-top: auto; display: flex; justify-content: center; padding-top: 1rem; position: relative; z-index: 5; & > div { width: 80%; max-width: 220px; } `;
const CartButton = styled(motion.button)` position: fixed; bottom: 2rem; right: 2rem; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #7851a9, #00ffff); border: none; color: white; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.3); z-index: 1000; transition: transform 0.3s ease, box-shadow 0.3s ease; &:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.5); } /* Fix for event bubbling issue */ outline: none; &:focus { outline: none; } `;
const PulsingCartButton = styled(CartButton)` animation: ${pulseAnimation} 1.5s infinite; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.6); /* Fix for event bubbling issue */ outline: none; &:focus { outline: none; } `;
const CartCount = styled.span` position: absolute; top: -5px; right: -5px; background: #ff4b6a; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; border: 2px solid rgba(20, 20, 40, 0.8); `;
const LoadingSpinner = styled.div` border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid #00ffff; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 2rem auto; @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
const ErrorMessage = styled.p` color: #ff4b6a; text-align: center; margin: 2rem; `;
// --- End Styled Components ---

// --- StoreFront Component ---
const StoreFront: React.FC = () => {
  const { user, authAxios } = useAuth(); // Use authAxios from context
  const { cart, addToCart, refreshCart } = useCart();
  const { toast } = useToast();

  // --- State ---
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<string | number | null>(null);
  const [showPulse, setShowPulse] = useState(false);

  // --- Refs and Animation Controls ---
  const heroRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);
  const heroControls = useAnimation();
  const parallaxControls = useAnimation();
  const packagesControls = useAnimation();

  const canViewPrices = !!user && (user.role === "client" || user.role === "admin");

  // --- Effects ---
  // Fetch storefront items on mount
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Create a http client - use authAxios if available, otherwise use regular axios
        // This allows the store to be viewed by non-authenticated users
        const httpClient = authAxios || axios;
        
        const response = await httpClient.get<ApiResponse>('/api/storefront?sortBy=displayOrder&sortOrder=ASC');
        if (response.data && response.data.success && Array.isArray(response.data.items)) {
            // Assign a default theme if missing from API data
            const itemsWithTheme = response.data.items.map(item => ({
                ...item,
                theme: item.theme || 'purple' // Default to purple if theme is missing
            }));
            setItems(itemsWithTheme);
        } else {
             console.warn('API Error or Invalid Data:', response.data?.message || 'Unexpected response format');
             setItems([]); // Set to empty array on error or invalid data
             setError(response.data?.message || "Failed to load packages.");
        }
      } catch (err: any) {
        console.error("Error fetching storefront items:", err);
        setError(err.response?.data?.message || "Network error. Failed to load packages.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [authAxios]); // Dependency: authAxios instance

  // Animation triggers
  const isHeroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const isParallaxInView = useInView(parallaxRef, { once: true, amount: 0.3 });
  const isPackagesInView = useInView(packagesRef, { once: true, amount: 0.1 });

   useEffect(() => {
    if (isHeroInView) heroControls.start("visible");
    if (isParallaxInView) parallaxControls.start("visible");
    if (isPackagesInView) packagesControls.start("visible");
  }, [isHeroInView, isParallaxInView, isPackagesInView, heroControls, parallaxControls, packagesControls]);
  
  // Handle cart refresh only when user is authenticated
  useEffect(() => {
    if (user && user.id) {
      console.log('StoreFront mounted - refreshing cart');
      // Small delay to avoid conflict with initial load
      const timer = setTimeout(() => {
        refreshCart();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, refreshCart]);

  // Scroll indicator effect
  // Enhanced scroll effects for cart button and scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      // Control scroll indicator animation
      setAnimateScrollIndicator(window.scrollY < 200);
      
      // If we have cart items, ensure cart button follows scroll
      const cartButton = document.querySelector('.cart-follow-button');
      if (cartButton) {
        // Add smooth transition based on scroll position
        if (window.scrollY > 300) {
          cartButton.classList.add('cart-elevated');
        } else {
          cartButton.classList.remove('cart-elevated');
        }
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Add global styles for cart button transitions
  useEffect(() => {
    // Create style element for cart button transitions
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .cart-follow-button {
        transition: transform 0.3s ease, box-shadow 0.3s ease, bottom 0.3s ease;
      }
      .cart-elevated {
        bottom: 2.5rem;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 255, 0.4);
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // --- Animation Variants (Original) ---
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delayChildren: 0.3, staggerChildren: 0.2 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } } };
  const gridVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delayChildren: 0.3, staggerChildren: 0.15 } } };
  const cardVariants = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } } };
  const buttonMotionProps = { whileHover:{ scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 10 } }, whileTap:{ scale: 0.95 } };

  // --- Event Handlers ---
  const togglePriceVisibility = (itemId: string | number) => setRevealPrices((prev) => ({ ...prev, [itemId.toString()]: !prev[itemId.toString()] }));
  const handleToggleCart = () => setShowCart(prev => !prev);
  const handleHideCart = () => setShowCart(false);
  
  // Handle orientation modal
  const handleShowOrientation = () => {
    setShowOrientation(true);
  };
  
  const handleHideOrientation = () => {
    setShowOrientation(false);
  };

  const handleAddToCart = useCallback(async (item: StoreItem) => {
    if (!canViewPrices) {
      toast({ title: "Login Required", description: "Please log in as a client to purchase.", variant: "destructive" });
      return;
    }

    // Prepare data for cart context
    const cartItemData = {
        id: item.id, // ID is already numeric from API type
        name: item.name,
        price: item.displayPrice, // Assuming displayPrice is the one to use
        quantity: 1,
    };

    setIsAddingToCart(item.id);
    try {
        await addToCart(cartItemData); // Pass the object to context function
        
        // Add a manual refresh to ensure cart is updated
        setTimeout(() => refreshCart(), 500);
        
        toast({ title: "Success!", description: `Added ${item.name} to cart.` });
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1600); // Duration of pulse animation
    } catch (error: any) {
        console.error("Error adding to cart:", error);
        const message = error?.message || "Failed to add item. Please try again."; // Use error message from context if available
        toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
        setIsAddingToCart(null);
    }
  }, [canViewPrices, toast, addToCart, refreshCart]); // Dependencies

  // --- Render Helper for Cards ---
  const renderStoreItemCard = (item: StoreItem) => {
    if (!item || typeof item.id === 'undefined') return null;

    const features = safelyParseJson(item.includedFeatures);
    const itemKey = item.id.toString();
    const isLoadingItem = isAddingToCart === item.id;
    const isSubscription = item.itemType?.includes("SUBSCRIPTION") ?? false; // Default to false if itemType undefined
    const outOfStock = !!item.trackInventory && (item.inventoryQuantity ?? 0) <= 0;
    
    // Enhanced session package information
    let badgeText = '';
    let sessionDetails = '';
    const packageType = item.packageType || '';
    
    if (packageType === 'fixed') {
      badgeText = item.sessions ? `${item.sessions} Sessions` : '';
      if (item.sessions && item.pricePerSession) {
        sessionDetails = `${item.sessions} sessions at ${item.pricePerSession} per session`;
      }
    } else if (packageType === 'monthly') {
      badgeText = item.months ? `${item.months} Months` : '';
      if (item.months && item.sessionsPerWeek && item.pricePerSession) {
        sessionDetails = `${item.months} months, ${item.sessionsPerWeek} sessions/week at ${item.pricePerSession} per session`;
      }
    } else if (item.category) {
      badgeText = item.category;
    } else if (item.itemType === 'TRAINING_PACKAGE_FIXED' && item.sessions) {
      badgeText = `${item.sessions} Sessions`;
    } else if (item.itemType === 'TRAINING_PACKAGE_SUBSCRIPTION' && item.months) {
      badgeText = `${item.months} Months`;
    } else if (item.itemType === 'DIGITAL_ASSET') {
      badgeText = `Digital`;
    } else if (item.itemType === 'PHYSICAL_GOOD') {
      badgeText = `Gear`;
    } else if (item.itemType === 'SUPPLEMENT') {
      badgeText = `Supplement`;
    }
    
    // Get correct theme based on package name or assigned theme
    let cardTheme = item.theme || 'purple';
    if (item.name) {
      if (item.name.includes('Gold')) {
        cardTheme = 'cosmic';
      } else if (item.name.includes('Platinum')) {
        cardTheme = 'purple';
      } else if (item.name.includes('Rhodium')) {
        cardTheme = 'emerald';
      } else if (item.name.includes('Silver')) {
        cardTheme = 'ruby';
      }
    }

    return (
      <motion.div key={itemKey} variants={cardVariants}>
        <CardContainer
            onClick={() => togglePriceVisibility(itemKey)}
            aria-label={`View details for ${item.name}`}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && togglePriceVisibility(itemKey)}
        >
          <CardMedia>
             {/* Use item image or fallback */}
            <CardImage style={{ backgroundImage: `url(${item.imageUrl || '/marble-texture.png'})` }} aria-hidden="true" />
            {badgeText && <CardBadge>{badgeText}</CardBadge>}
          </CardMedia>
          <CardContent>
            <CardTitle>{item.name}</CardTitle>
            <CardDescription>
  {sessionDetails || item.description || 'No description available.'}
</CardDescription>
            {features.length > 0 && (
                <FeaturesList aria-label="Included Features">
                    {features.slice(0, 3).map((feature, index) => <li key={index}>{feature}</li>)}
                    {features.length > 3 && <li>...and more!</li>}
                </FeaturesList>
            )}
            <PriceBox variants={itemVariants} aria-live="polite">
              <AnimatePresence mode="wait">
                {canViewPrices ? (
                  revealPrices[itemKey] ? (
                    <PriceContent key="price" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                      <PriceLabel>Investment</PriceLabel>
                      <Price><span>$</span>{formatPrice(item.displayPrice)}</Price>
                      {item.priceDetails && <PriceDetails>{item.priceDetails}</PriceDetails>}
                      {item.itemType?.includes('TRAINING') && item.pricePerSession &&
                        <PriceDetails>(${formatPrice(item.pricePerSession)} / session)</PriceDetails>
                      }
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
              <motion.div {...buttonMotionProps} style={{ width: '100%' }}>
                <GlowButton
                text={isLoadingItem ? "Adding..." : "Add to Cart"}
                theme={cardTheme} // Use the mapped theme based on package name
                size="medium"
                isLoading={isLoadingItem}
                disabled={isLoadingItem || !canViewPrices || outOfStock}
                animateOnRender={false} // Keep original prop values
                leftIcon={null}
                rightIcon={null}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleAddToCart(item);
                }}
                aria-busy={isLoadingItem}
                aria-label={`Add ${item.name} to cart`}
                />
              </motion.div>
            </CardActions>
             {outOfStock && !isLoadingItem &&
                 <p style={{textAlign: 'center', color: '#ff4b6a', fontSize: '0.9em', marginTop: '0.5rem'}} role="status">Out of Stock</p>
             }
          </CardContent>
        </CardContainer>
      </motion.div>
    );
  };

  // --- Component Return JSX ---
  return (
    <StoreContainer>
      <ContentOverlay>
        {/* --- Hero Section (Original Structure) --- */}
         <HeroSection ref={heroRef}>
             <VideoBackground><video autoPlay loop muted playsInline key="hero-video"><source src={swanVideo} type="video/mp4" /></video></VideoBackground>
             <PremiumBadge initial={{ opacity: 0, x: 20 }} animate={heroControls} variants={itemVariants}> PREMIER </PremiumBadge>
             <motion.div initial="hidden" animate={heroControls} variants={containerVariants} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }} >
                 <LogoContainer variants={itemVariants}><img src={logoImg} alt="Swan Studios" loading="lazy" /></LogoContainer>
                 <HeroContent variants={itemVariants}>
                     <HeroTitle variants={itemVariants}> Elite Training Designed by <AnimatedName>Sean Swan</AnimatedName> </HeroTitle>
                     <HeroSubtitle variants={itemVariants}> NASM Protocols | Subscriptions | Gear & More </HeroSubtitle>
                     <HeroDescription variants={itemVariants}> Explore our comprehensive offerings, from premier training subscriptions powered by decades of experience to curated gear and digital resources designed to maximize your results. </HeroDescription>
                     <ButtonsContainer variants={itemVariants}>
                         <motion.div {...buttonMotionProps}><GlowButton text="Book Consultation" theme="cosmic" size="large" onClick={handleShowOrientation} isLoading={false} animateOnRender={false} leftIcon={null} rightIcon={null} disabled={false} /></motion.div>
                         <motion.div {...buttonMotionProps}><GlowButton text="Explore Store" theme="purple" size="large" onClick={() => packagesRef.current?.scrollIntoView({ behavior: "smooth" })} isLoading={false} animateOnRender={false} leftIcon={null} rightIcon={null} disabled={false} /></motion.div>
                     </ButtonsContainer>
                 </HeroContent>
             </motion.div>
             {animateScrollIndicator && ( <ScrollIndicator initial={{ opacity: 0 }} animate={{ opacity: [0, 0.7, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}> DISCOVER </ScrollIndicator> )}
         </HeroSection>

        {/* --- Parallax Section (Original Structure) --- */}
        <ParallaxSection ref={parallaxRef} initial="hidden" animate={parallaxControls} variants={containerVariants}>
          <ParallaxContent variants={itemVariants}>
            <ParallaxTitle variants={itemVariants}>Unlock Your Potential</ParallaxTitle>
            <ParallaxSubtitle variants={itemVariants}> Your journey to peak performance starts here. Find the perfect package, resource, or gear to fuel your success. </ParallaxSubtitle>
          </ParallaxContent>
        </ParallaxSection>

        {/* --- Main Store Section --- */}
        <SectionContainer id="store-section" ref={packagesRef}>
          <SectionTitle initial="hidden" animate={packagesControls} variants={itemVariants}> Our Offerings </SectionTitle>
          {/* Filtering/Sorting UI Placeholder */}
          {isLoading && <LoadingSpinner aria-label="Loading items"/>}
          {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
          {!isLoading && !error && items.length === 0 && <p style={{textAlign: 'center'}}>No items available at this time.</p>}
          {!isLoading && !error && items.length > 0 && (
             <Grid initial="hidden" animate={packagesControls} variants={gridVariants} aria-label="Store items">
                {/* Render fetched items */}
                {items.map(renderStoreItemCard)}
             </Grid>
          )}
          {/* Pagination UI Placeholder */}
          <motion.div style={{ display: "flex", justifyContent: "center", marginTop: "4rem", position: 'relative', zIndex: 20 }} variants={itemVariants} initial="hidden" animate={packagesControls}>
             <motion.div {...buttonMotionProps}> <GlowButton text="Schedule Consultation" theme="cosmic" size="large" onClick={handleShowOrientation} isLoading={false} animateOnRender={false} leftIcon={null} rightIcon={null} disabled={false} /> </motion.div>
          </motion.div>
        </SectionContainer>
      </ContentOverlay>

      {/* Floating cart button - Fixed event handling */}
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
            onClose={handleHideOrientation} 
            returnToStore={true} 
          />
        )}
        {showCart && <ShoppingCart key="cart-modal" onClose={handleHideCart} />}
      </AnimatePresence>
    </StoreContainer>
  );
};

export default StoreFront;