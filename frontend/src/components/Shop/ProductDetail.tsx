import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import GlowButton from '../Button/glowButton';
import ProductRecommendations from './ProductRecommendations';

// Types
interface ProductDetailType {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  pricePerSession: number | null;
  packageType: string;
  sessions: number | null;
  theme: string;
  totalCost: number | null;
  totalSessions: number | null;
  isActive: boolean;
  includedFeatures: string;
}

// Styled components
const ProductDetailContainer = styled.div`
  padding: 2rem;
  background: rgba(20, 20, 40, 0.5);
  border-radius: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  transition: color 0.2s ease;
  
  &:hover {
    color: white;
  }
  
  svg {
    margin-right: 0.5rem;
  }
`;

const ProductContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ImageContainer = styled.div`
  border-radius: 12px;
  overflow: hidden;
  height: 400px;
  position: relative;
  
  @media (max-width: 768px) {
    height: 300px;
  }
`;

const ProductImage = styled.div`
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
`;

const ImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #1a1a3a, #2c2c56);
  display: flex;
  justify-content: center;
  align-items: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.2rem;
`;

const ThemeBadge = styled.div<{ theme: string }>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  background: ${({ theme }) => {
    switch (theme) {
      case 'cosmic': return 'rgba(0, 255, 255, 0.2)';
      case 'purple': return 'rgba(120, 81, 169, 0.2)';
      case 'ruby': return 'rgba(224, 36, 94, 0.2)';
      case 'emerald': return 'rgba(0, 200, 100, 0.2)';
      default: return 'rgba(120, 81, 169, 0.2)';
    }
  }};
  color: ${({ theme }) => {
    switch (theme) {
      case 'cosmic': return '#00ffff';
      case 'purple': return '#a97ef8';
      case 'ruby': return '#ff6e91';
      case 'emerald': return '#00ff95';
      default: return '#a97ef8';
    }
  }};
  border: 1px solid ${({ theme }) => {
    switch (theme) {
      case 'cosmic': return 'rgba(0, 255, 255, 0.3)';
      case 'purple': return 'rgba(120, 81, 169, 0.3)';
      case 'ruby': return 'rgba(224, 36, 94, 0.3)';
      case 'emerald': return 'rgba(0, 200, 100, 0.3)';
      default: return 'rgba(120, 81, 169, 0.3)';
    }
  }};
  text-transform: capitalize;
`;

const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const ProductName = styled.h1`
  color: white;
  font-size: 2.2rem;
  margin: 0 0 1rem 0;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const ProductPrice = styled.div`
  color: white;
  font-size: 1.8rem;
  font-weight: 300;
  margin-bottom: 1rem;
  display: flex;
  align-items: baseline;
  
  span {
    color: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
    margin-left: 0.5rem;
  }
`;

const PriceDetails = styled.div`
  background: rgba(30, 30, 60, 0.4);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const PriceDetail = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  
  &:last-child {
    margin-bottom: 0;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-weight: 500;
  }
  
  span:first-child {
    color: rgba(255, 255, 255, 0.7);
  }
  
  span:last-child {
    color: white;
  }
`;

const ProductDescription = styled.div`
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const FeaturesTitle = styled.h3`
  color: white;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  font-weight: 500;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
`;

const FeatureItem = styled.li`
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  padding-left: 1.5rem;
  position: relative;
  
  &:before {
    content: '✓';
    position: absolute;
    left: 0;
    color: ${({ theme }) => theme === 'cosmic' ? '#00ffff' : '#7851a9'};
  }
`;

const CartActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: auto;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  background: rgba(30, 30, 60, 0.4);
  border-radius: 8px;
  height: 50px;
`;

const QuantityButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 50px;
  height: 50px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  &:disabled {
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }
`;

const QuantityDisplay = styled.div`
  color: white;
  font-size: 1rem;
  width: 60px;
  text-align: center;
`;

const AddToCartWrapper = styled.div`
  flex: 1;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  color: #ff6e91;
  background: rgba(224, 36, 94, 0.1);
  border: 1px solid rgba(224, 36, 94, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin: 2rem 0;
  text-align: center;
`;

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5,
      ease: "easeOut"
    } 
  }
};

// Main component
const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authAxios, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  
  // Format price
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  // Parse included features
  const parseFeatures = (featuresJson: string): string[] => {
    if (!featuresJson) return [];
    try {
      return JSON.parse(featuresJson);
    } catch (e) {
      console.error("Error parsing features:", e);
      return [];
    }
  };
  
  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const api = isAuthenticated ? authAxios : axios;
        const response = await api.get(`/api/storefront/${id}`);
        
        if (response.data && response.data.success) {
          setProduct(response.data.item);
        } else {
          setError(response.data?.message || 'Failed to load product details');
        }
      } catch (error: any) {
        console.error("Error fetching product:", error);
        setError(error.response?.data?.message || 'An error occurred while fetching product details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id, authAxios, isAuthenticated]);
  
  // Quantity handlers
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };
  
  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };
  
  // Add to cart
  const handleAddToCart = async () => {
    if (!product) return;
    
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your cart",
        variant: "destructive"
      });
      return;
    }
    
    setAddingToCart(true);
    
    try {
      await addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity
      });
      
      toast({
        title: "Success",
        description: `Added ${product.name} to your cart`,
        variant: "default"
      });
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add item to cart",
        variant: "destructive"
      });
    } finally {
      setAddingToCart(false);
    }
  };
  
  // Handle back navigation
  const handleBack = () => {
    navigate('/shop');
  };
  
  if (loading) {
    return (
      <ProductDetailContainer>
        <LoadingSpinner aria-label="Loading product details" />
      </ProductDetailContainer>
    );
  }
  
  if (error || !product) {
    return (
      <ProductDetailContainer>
        <BackButton onClick={handleBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 13L5 8L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Shop
        </BackButton>
        <ErrorMessage>
          {error || 'Product not found'}
        </ErrorMessage>
      </ProductDetailContainer>
    );
  }
  
  const features = parseFeatures(product.includedFeatures);
  
  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <ProductDetailContainer>
          <BackButton onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 13L5 8L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Shop
          </BackButton>
          
          <ProductContent>
            <ImageContainer>
              {product.imageUrl ? (
                <ProductImage style={{ backgroundImage: `url(${product.imageUrl})` }} />
              ) : (
                <ImagePlaceholder>
                  No Image Available
                </ImagePlaceholder>
              )}
              <ThemeBadge theme={product.theme || 'purple'}>
                {product.theme || 'Purple'}
              </ThemeBadge>
            </ImageContainer>
            
            <InfoContainer>
              <ProductName>{product.name}</ProductName>
              
              <ProductPrice>
                {formatPrice(product.price)}
                {product.packageType === 'fixed' && product.pricePerSession && (
                  <span>({formatPrice(product.pricePerSession)} / session)</span>
                )}
              </ProductPrice>
              
              {(product.packageType === 'fixed' || product.packageType === 'monthly') && (
                <PriceDetails>
                  {product.packageType === 'fixed' && product.sessions && (
                    <PriceDetail>
                      <span>Sessions:</span>
                      <span>{product.sessions}</span>
                    </PriceDetail>
                  )}
                  
                  {product.packageType === 'monthly' && (
                    <>
                      <PriceDetail>
                        <span>Duration:</span>
                        <span>{product.sessions} months</span>
                      </PriceDetail>
                      <PriceDetail>
                        <span>Sessions per Week:</span>
                        <span>{product.totalSessions}</span>
                      </PriceDetail>
                      <PriceDetail>
                        <span>Total Sessions:</span>
                        <span>{product.totalSessions}</span>
                      </PriceDetail>
                    </>
                  )}
                  
                  {product.pricePerSession && (
                    <PriceDetail>
                      <span>Price per Session:</span>
                      <span>{formatPrice(product.pricePerSession)}</span>
                    </PriceDetail>
                  )}
                  
                  <PriceDetail>
                    <span>Total Investment:</span>
                    <span>{formatPrice(product.totalCost || product.price)}</span>
                  </PriceDetail>
                </PriceDetails>
              )}
              
              <ProductDescription dangerouslySetInnerHTML={{ __html: product.description }} />
              
              {features.length > 0 && (
                <>
                  <FeaturesTitle>Included Features:</FeaturesTitle>
                  <FeaturesList>
                    {features.map((feature, index) => (
                      <FeatureItem key={index} theme={product.theme}>
                        {feature}
                      </FeatureItem>
                    ))}
                  </FeaturesList>
                </>
              )}
              
              <CartActions>
                <QuantityControl>
                  <QuantityButton 
                    onClick={decreaseQuantity} 
                    disabled={quantity <= 1 || addingToCart}
                    aria-label="Decrease quantity"
                  >
                    -
                  </QuantityButton>
                  <QuantityDisplay aria-live="polite">
                    {quantity}
                  </QuantityDisplay>
                  <QuantityButton 
                    onClick={increaseQuantity}
                    disabled={addingToCart}
                    aria-label="Increase quantity"
                  >
                    +
                  </QuantityButton>
                </QuantityControl>
                
                <AddToCartWrapper>
                  <GlowButton
                    text={addingToCart ? "Adding..." : "Add to Cart"}
                    theme={product.theme || 'purple'}
                    size="large"
                    isLoading={addingToCart}
                    disabled={addingToCart}
                    animateOnRender={false}
                    leftIcon={null}
                    rightIcon={null}
                    onClick={handleAddToCart}
                  />
                </AddToCartWrapper>
              </CartActions>
            </InfoContainer>
          </ProductContent>
        </ProductDetailContainer>
        
        {/* Complementary product recommendations */}
        <ProductRecommendations
          type="complementary"
          title="You Might Also Like"
          itemId={product.id}
          limit={3}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductDetail;