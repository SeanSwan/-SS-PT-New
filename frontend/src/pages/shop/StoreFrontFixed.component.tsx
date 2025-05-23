// Fixed StoreFront component - animations disabled for visibility
import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";

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

// --- Styled Components (SIMPLIFIED - NO ANIMATIONS) ---
const StoreContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
  z-index: 1;
  opacity: 1 !important; /* Force visibility */
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
  opacity: 1 !important; /* Force visibility */
`;

const HeroSection = styled.section`
  position: relative; min-height: 100vh; display: flex; flex-direction: column;
  justify-content: center; align-items: center; padding: 2rem; text-align: center;
  overflow: hidden;
  opacity: 1 !important; /* Force visibility */
`;

const HeroContent = styled.div`
  max-width: 800px; width: 100%; margin: 0 auto; position: relative; z-index: 2;
  background: rgba(10, 10, 30, 0.6); padding: 2rem; border-radius: 15px;
  backdrop-filter: blur(5px); border: 1px solid rgba(0, 255, 255, 0.1);
  opacity: 1 !important; /* Force visibility */
  @media (max-width: 768px) { padding: 1.5rem; }
`;

const LogoContainer = styled.div`
  position: relative; display: flex; justify-content: center; align-items: center;
  width: 100%; margin-bottom: 1.5rem;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5));
  z-index: 2;
  opacity: 1 !important; /* Force visibility */

  img { height: 160px; max-width: 90%; object-fit: contain; }
  @media (max-width: 768px) { img { height: 120px; } margin-bottom: 1rem; }
  @media (max-width: 480px) { img { height: 100px; } margin-bottom: 0.5rem; }
`;

const HeroTitle = styled.h1`
  font-size: 3.2rem; margin-bottom: 1rem; font-weight: 300; color: white;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); letter-spacing: 1px;
  opacity: 1 !important; /* Force visibility */
  @media (max-width: 768px) { font-size: 2.5rem; }
`;

const HeroSubtitle = styled.h2`
  font-size: 1.75rem; margin-bottom: 1.5rem; color: var(--silver, #c0c0c0);
  background: linear-gradient( to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb );
  background-size: 200% auto; background-clip: text; -webkit-background-clip: text; color: transparent;
  display: inline-block; font-weight: 300;
  opacity: 1 !important; /* Force visibility */
  @media (max-width: 768px) { font-size: 1.25rem; }
`;

const HeroDescription = styled.p`
  font-size: 1.125rem; margin-bottom: 2rem; line-height: 1.6; color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7); max-width: 800px; margin: 0 auto 2rem;
  opacity: 1 !important; /* Force visibility */
  @media (max-width: 768px) { font-size: 1rem; }
`;

const ButtonsContainer = styled.div`
  display: flex; gap: 1.5rem; margin-top: 2rem; justify-content: center;
  position: relative; z-index: 3;
  opacity: 1 !important; /* Force visibility */
  & > div, & > button { position: relative; flex: 1 1 auto; min-width: 180px; max-width: 250px; }
  @media (max-width: 600px) { flex-direction: column; gap: 1rem; align-items: center; & > div, & > button { width: 100%; max-width: 280px; } }
`;

const SectionContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  opacity: 1 !important; /* Force visibility */
  
  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 2.5rem 0.75rem;
  }
`;

const PackageSection = styled.section`
  margin-bottom: 5rem;
  opacity: 1 !important; /* Force visibility */
  
  @media (max-width: 768px) {
    margin-bottom: 3rem;
  }
`;

const SectionTitle = styled.h2`
  text-align: center;
  margin-bottom: 1rem;
  font-size: 2.5rem;
  font-weight: 300;
  position: relative;
  display: inline-block;
  padding-bottom: 15px;
  color: white;
  width: 100%;
  opacity: 1 !important; /* Force visibility */
  
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 4rem;
  position: relative;
  z-index: 15;
  opacity: 1 !important; /* Force visibility */
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  
  @media (min-width: 769px) and (max-width: 1023px) {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }
  
  @media (min-width: 1024px) { 
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    max-width: 1200px;
    margin: 0 auto 4rem;
    gap: 2.5rem;
  }
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(3, 400px);
    justify-content: center;
  }
`;

const CardContainer = styled.div`
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
  min-height: 400px;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  z-index: 20;
  opacity: 1 !important; /* Force visibility */
  
  @media (max-width: 768px) {
    min-height: 380px;
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
  opacity: 1 !important; /* Force visibility */
  
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
  opacity: 1 !important; /* Force visibility */
  
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
  opacity: 1 !important; /* Force visibility */
  
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
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  font-weight: 500;
  line-height: 1.3;
  opacity: 1 !important; /* Force visibility */
  
  @media (max-width: 768px) {
    font-size: 1.375rem;
  }
  
  @media (min-width: 1024px) {
    font-size: 1.6rem;
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
  opacity: 1 !important; /* Force visibility */
`;

const CardDescription = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  font-weight: 300;
  opacity: 1 !important; /* Force visibility */
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
  }
  
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0 0 1rem 0;
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  opacity: 1 !important; /* Force visibility */
  
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

const PriceBox = styled.div`
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  background: rgba(30, 30, 60, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 110px;
  opacity: 1 !important; /* Force visibility */
`;

const PriceContent = styled.div`
  position: relative;
  z-index: 1;
  opacity: 1 !important; /* Force visibility */
`;

const PriceLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
  opacity: 1 !important; /* Force visibility */
`;

const Price = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1 !important; /* Force visibility */
`;

const PriceDetails = styled.div`
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: pre-line;
  opacity: 1 !important; /* Force visibility */
  
  .bold {
    font-weight: bold;
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
  opacity: 1 !important; /* Force visibility */
`;

const CardActions = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  position: relative;
  z-index: 30;
  opacity: 1 !important; /* Force visibility */
  
  & > div {
    width: 80%;
    max-width: 220px;
  }
`;

const CartButton = styled.button`
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
  opacity: 1 !important; /* Force visibility */
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.5);
  }
  
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
  opacity: 1 !important; /* Force visibility */
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
  opacity: 1 !important; /* Force visibility */
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  opacity: 1 !important; /* Force visibility */
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  font-weight: 300;
  opacity: 1 !important; /* Force visibility */
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(30, 30, 60, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 64, 64, 0.3);
  margin: 2rem auto;
  max-width: 600px;
  opacity: 1 !important; /* Force visibility */
`;

const ErrorMessage = styled.p`
  color: #ff6b6b;
  text-align: center;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
  opacity: 1 !important; /* Force visibility */
`;

const EmptyStateMessage = styled.p`
  text-align: center;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 3rem;
  padding: 2rem;
  opacity: 1 !important; /* Force visibility */
`;

// --- StoreFront Component ---
const StoreFrontFixed: React.FC = () => {
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
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);

  const canViewPrices = !!user && (user.role === "client" || user.role === "admin");

  // Filter out specific packages by name
  const filterSpecificPackages = (packages: StoreItem[]): StoreItem[] => {
    const packagesToFilter = [
      'Single Session Assessment',
      'Bronze Performance Package',
      'Silver Elite Training'
    ];
    
    return packages.filter(pkg => {
      if (packagesToFilter.includes(pkg.name)) {
        console.log(`🚫 Filtering out package: ${pkg.name}`);
        return false;
      }
      return true;
    });
  };

  // Filter out packages with $75 per session
  const filter75DollarPackages = (packages: StoreItem[]): StoreItem[] => {
    return packages.filter(pkg => {
      const pricePerSession = pkg.pricePerSession;
      if (pricePerSession === 75) {
        console.log(`🚫 Filtering out $75 package: ${pkg.name}`);
        return false;
      }
      return true;
    });
  };

  // Deduplicate packages by name and type
  const deduplicatePackages = (packages: StoreItem[]): StoreItem[] => {
    const seen = new Map();
    return packages.filter(pkg => {
      const key = `${pkg.name}-${pkg.packageType}`;
      if (seen.has(key)) {
        console.log(`🗑️ Removing duplicate: ${pkg.name} (ID: ${pkg.id})`);
        return false;
      }
      seen.set(key, pkg);
      return true;
    });
  };

  // --- Fetch Packages from API ---
  const fetchPackages = useCallback(async () => {
    console.log('🔄 Fetching packages...');
    setIsLoading(true);
    setError(null);
    try {
      const httpClient = authAxios || (await import('axios')).default;
      
      const response = await httpClient.get<ApiResponse>('/api/storefront?sortBy=displayOrder&sortOrder=ASC');
      console.log('📦 API Response:', response.data);

      if (response.data && response.data.success && Array.isArray(response.data.items)) {
        // First, remove specific packages by name
        const filteredSpecific = filterSpecificPackages(response.data.items);
        
        // Then, remove packages with $75 per session
        const filtered75Items = filter75DollarPackages(filteredSpecific);
        
        // Then, remove duplicates from the filtered response
        const deduplicatedItems = deduplicatePackages(filtered75Items);
        
        const processedItems = deduplicatedItems.map(item => ({
          ...item,
          theme: item.theme || 'purple',
          displayPrice: item.displayPrice || item.price || 0,
          displayOrder: item.displayOrder || 0
        }));
        
        // Filter and sort packages by type
        const fixedFiltered = processedItems
          .filter(pkg => pkg.packageType === 'fixed')
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
        const monthlyFiltered = processedItems
          .filter(pkg => pkg.packageType === 'monthly')
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
        // Apply all filters again as a safety measure
        const finalFixedPackages = filterSpecificPackages(filter75DollarPackages(deduplicatePackages(fixedFiltered)));
        const finalMonthlyPackages = filterSpecificPackages(filter75DollarPackages(deduplicatePackages(monthlyFiltered)));
        
        setFixedPackages(finalFixedPackages);
        setMonthlyPackages(finalMonthlyPackages);
        console.log(`✅ Loaded ${finalFixedPackages.length} fixed packages, ${finalMonthlyPackages.length} monthly packages`);
        console.log(`📊 Removed ${response.data.items.length - filteredSpecific.length} specific packages by name`);
        console.log(`📊 Removed ${filteredSpecific.length - filtered75Items.length} packages with $75 sessions`);
        console.log(`📊 Removed ${filtered75Items.length - deduplicatedItems.length} duplicates`);

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
  }, [authAxios]);

  // --- Effects ---
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    if (user?.id) {
      console.log('StoreFront mounted - refreshing cart');
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, refreshCart]);

  // --- Event Handlers ---
  const togglePriceVisibility = (packageId: number) => setRevealPrices((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  const handleToggleCart = () => setShowCart(prev => !prev);
  const handleHideCart = () => setShowCart(false);

  const handleAddToCart = useCallback(async (pkg: StoreItem) => {
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

    setIsAddingToCart(pkg.id);
    try {
      await addToCart(cartItemData);
      setTimeout(() => refreshCart(), 500);
      toast({ title: "Success!", description: `Added ${pkg.name} to cart.` });
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      const message = error?.message || "Failed to add item. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsAddingToCart(null);
    }
  }, [canViewPrices, toast, addToCart, refreshCart]);

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

    let priceDetailText = '';
    if (pkg.packageType === 'fixed' && pkg.pricePerSession) {
      priceDetailText = `${formatPrice(pkg.pricePerSession)} per session`;
    } else if (pkg.packageType === 'monthly' && pkg.totalSessions && pkg.sessionsPerWeek && pkg.pricePerSession) {
      priceDetailText = `${pkg.totalSessions} sessions (${pkg.sessionsPerWeek}/week)\n${formatPrice(pkg.pricePerSession)} per session`;
    }

    let cardTheme = pkg.theme || 'purple';
    if (pkg.name) {
      if (pkg.name.includes('Gold')) {
        cardTheme = 'cosmic';
      } else if (pkg.name.includes('Platinum')) {
        cardTheme = 'purple';
      } else if (pkg.name.includes('Rhodium')) {
        cardTheme = 'emerald';
      } else if (pkg.name.includes('Silver')) {
        cardTheme = 'ruby';
      }
    }

    return (
      <div key={pkg.id} style={{ opacity: 1 }}>
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
              {priceDetailText || pkg.description || 'Details coming soon.'}
            </CardDescription>
            {features.length > 0 && (
              <FeaturesList aria-label="Included Features">
                {features.slice(0, 3).map((feature, index) => <li key={index}>{feature}</li>)}
                {features.length > 3 && <li>...and more!</li>}
              </FeaturesList>
            )}
            <PriceBox aria-live="polite">
              {canViewPrices ? (
                revealPrices[pkg.id] ? (
                  <PriceContent key="price">
                    <PriceLabel>Total Investment</PriceLabel>
                    <Price>{formatPrice(pkg.displayPrice)}</Price>
                    {priceDetailText && <PriceDetails>{priceDetailText}</PriceDetails>}
                    {pkg.pricePerSession && (
                      <PriceDetails>
                        <span className="bold">{formatPrice(pkg.pricePerSession)} per session</span>
                      </PriceDetails>
                    )}
                    {pkg.packageType === 'monthly' && pkg.sessionsPerWeek && (
                      <PriceDetails>
                        <span className="bold">{pkg.sessionsPerWeek} sessions per week</span>
                      </PriceDetails>
                    )}
                  </PriceContent>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.7)'}}>Click to reveal price</div>
                )
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                  <LoginMessage>Login as client to view prices</LoginMessage>
                </div>
              )}
            </PriceBox>
            <CardActions>
              <div style={{ width: '100%'}}>
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
              </div>
            </CardActions>
          </CardContent>
        </CardContainer>
      </div>
    );
  };

  // --- Component JSX ---
  console.log('🎨 StoreFrontFixed rendering with state:', {
    isLoading,
    error,
    fixedPackagesCount: fixedPackages.length,
    monthlyPackagesCount: monthlyPackages.length,
    user: !!user
  });

  return (
    <StoreContainer>
      <ContentOverlay>
        {/* Hero Section */}
        <HeroSection>
          <VideoBackground>
            <video autoPlay loop muted playsInline key="hero-bg-video">
              <source src={swanVideo} type="video/mp4" />
            </video>
          </VideoBackground>
          
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontFamily: 'Playfair Display, serif', fontSize: '1rem', padding: '8px 16px', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px', background: 'rgba(10, 10, 30, 0.6)', backdropFilter: 'blur(10px)', color: 'white', zIndex: 3, letterSpacing: '3px' }}>
            <div style={{ fontSize: '0.8rem', letterSpacing: '2px', color: 'gold', textAlign: 'center', marginBottom: '4px' }}>★★★★★★★</div>
            PREMIER
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
            <LogoContainer>
              <img src={logoImg} alt="Swan Studios Logo" loading="lazy" />
            </LogoContainer>
            <HeroContent>
              <HeroTitle>
                Elite Training Designed by{' '}
                <span style={{ display: 'inline-block', background: 'linear-gradient( to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb )', backgroundSize: '200% auto', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', padding: '0 5px' }}>Sean Swan</span>
              </HeroTitle>
              <HeroSubtitle>
                25+ Years of Experience & NASM-Approved Protocols
              </HeroSubtitle>
              <HeroDescription>
                Discover a revolutionary workout program tailored to your unique goals. Leveraging over two decades of expertise and cutting-edge techniques, Sean Swan delivers results that redefine your limits.
              </HeroDescription>
              <ButtonsContainer>
                <div>
                  <GlowButton 
                    text="Book Consultation" 
                    theme="cosmic" 
                    size="large" 
                    onClick={() => setShowOrientation(true)} 
                  />
                </div>
                <div>
                  <GlowButton 
                    text="View Packages" 
                    theme="purple" 
                    size="large" 
                    onClick={() => document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" })}
                  />
                </div>
              </ButtonsContainer>
            </HeroContent>
          </div>
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
              <div>
                <GlowButton text="Retry" theme="ruby" size="medium" onClick={fetchPackages} />
              </div>
            </ErrorContainer>
          </SectionContainer>
        ) : (fixedPackages.length === 0 && monthlyPackages.length === 0) ? (
          <SectionContainer>
             <EmptyStateMessage>No training packages are currently available. We are updating our packages and will have new offerings soon!</EmptyStateMessage>
             <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem"}}>
                <GlowButton text="Contact Us for Custom Training" theme="cosmic" size="large" onClick={() => setShowOrientation(true)} />
             </div>
             <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>
               <p>Interested in personal training? Book a consultation to discuss custom packages.</p>
               <p>We offer personalized fitness solutions tailored to your specific goals.</p>
             </div>
          </SectionContainer>
        ) : (
          <>
            {/* Fixed Packages Section */}
            {fixedPackages.length > 0 && (
              <PackageSection id="packages-section">
                <div>
                  <SectionTitle>
                    Premium Training Packages
                  </SectionTitle>
                  <Grid aria-label="Session packages">
                    {fixedPackages.map(renderPackageCard)}
                  </Grid>
                </div>
              </PackageSection>
            )}

            {/* Monthly Packages Section */}
            {monthlyPackages.length > 0 && (
              <PackageSection style={fixedPackages.length > 0 ? { marginTop: '0rem' } : {}}>
                <div>
                   <SectionTitle>
                    Long-Term Excellence Programs
                  </SectionTitle>
                  <Grid aria-label="Monthly packages">
                    {monthlyPackages.map(renderPackageCard)}
                  </Grid>
                </div>
              </PackageSection>
            )}
            
            {/* Always show consultation button if packages are displayed */}
            {(fixedPackages.length > 0 || monthlyPackages.length > 0) && (
                <SectionContainer style={{paddingTop: '2rem', paddingBottom: '5rem'}}>
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem", position: 'relative', zIndex: 20 }}>
                        <div>
                        <GlowButton 
                            text="Schedule Consultation" 
                            theme="cosmic" 
                            size="large" 
                            onClick={() => setShowOrientation(true)} 
                        />
                        </div>
                    </div>
                </SectionContainer>
            )}
          </>
        )}
      </ContentOverlay>

      {/* Floating Cart Button */}
      {user && (
        <CartButton 
          className="cart-follow-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggleCart();
          }} 
          aria-label={`View Cart (${cart?.itemCount || 0} items)`}
        >
          🛒
          {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
        </CartButton>
      )}

      {/* Modals */}
      {showOrientation && (
        <OrientationForm 
          key="orientation-modal" 
          onClose={() => setShowOrientation(false)} 
        />
      )}
      {showCart && <ShoppingCart key="cart-modal" onClose={handleHideCart} />}
    </StoreContainer>
  );
};

export default StoreFrontFixed;