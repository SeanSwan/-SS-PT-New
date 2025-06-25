// /frontend/src/components/ShoppingCart/ShoppingCart.tsx
// Enhanced shopping cart with role-based access and user upgrade notifications

import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import GlowButton from "../ui/buttons/GlowButton";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/use-toast";
import { OptimizedCheckoutFlow } from '../Checkout';

// Animations
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

// Define TypeScript interfaces for styled component props
interface StatusMessageProps {
  $isError?: boolean; // Using $ prefix for transient prop to avoid DOM warnings
}

// Styled components with enhanced design matching store page style
const CartModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CartModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #1e1e3f, #0a0a1a);
  width: 95%;
  max-width: 500px;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(120, 81, 169, 0.3);
  position: relative;
  color: white;
  max-height: 90vh;
  overflow-y: auto;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(120, 81, 169, 0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(120, 81, 169, 0.8);
  }
`;

const ModalCloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 20px;
  background: transparent;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: color 0.2s ease, transform 0.2s ease;
  
  &:hover {
    color: #00ffff;
    transform: scale(1.1);
  }
`;

const CartTitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 20px;
  font-weight: 300;
  color: white;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 15px;
`;

const EmptyCartMessage = styled.div`
  text-align: center;
  padding: 30px 0;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  
  p {
    margin-bottom: 20px;
  }
`;

const CartItemsList = styled.div`
  margin: 20px 0;
`;

const CartItemContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 15px;
  padding: 15px;
  margin-bottom: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
`;

const ItemDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const ItemName = styled.h3`
  font-size: 1.2rem;
  margin: 0 0 5px 0;
  color: #00ffff;
  font-weight: 400;
`;

const ItemDescription = styled.p`
  font-size: 0.9rem;
  margin: 0 0 10px 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
`;

const PriceContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
`;

const ItemPrice = styled.div`
  font-size: 1.1rem;
  font-weight: 300;
  color: white;
`;

const QuantityControls = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;

const QuantityButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.4);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const QuantityValue = styled.span`
  padding: 0 10px;
  color: white;
  min-width: 30px;
  text-align: center;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: color 0.2s ease;
  
  &:hover {
    color: #ff4b6a;
  }
`;

const CartSummary = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  
  &.total {
    font-size: 1.2rem;
    font-weight: 500;
    color: white;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px dashed rgba(255, 255, 255, 0.2);
  }
`;

const SummaryLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

const SummaryValue = styled.span`
  color: white;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 25px;
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const StatusMessage = styled.div<StatusMessageProps>`
  padding: 12px 15px;
  border-radius: 8px;
  margin: 10px 0;
  background: ${props => props.$isError 
    ? 'rgba(255, 70, 70, 0.1)' 
    : 'rgba(0, 255, 255, 0.1)'};
  border: 1px solid ${props => props.$isError 
    ? 'rgba(255, 70, 70, 0.3)' 
    : 'rgba(0, 255, 255, 0.3)'};
  color: ${props => props.$isError 
    ? '#ff6b6b' 
    : '#00ffff'};
  font-size: 0.9rem;
`;

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const LoadingSpinner = styled.div`
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 3px solid #00ffff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Component props interface
interface ShoppingCartProps {
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ onClose }) => {
  const { cart, loading, error, updateQuantity, removeItem, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCheckout, setShowCheckout] = useState<boolean>(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      transition: { duration: 0.2, ease: "easeIn" }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      x: -20, 
      transition: { duration: 0.2 }
    }
  };

  // Format price with commas
  const formatPrice = (price: number | undefined): string => 
    price ? price.toLocaleString() : '0';

  // Simplified checkout handler - delegates to OptimizedCheckoutFlow
  const handleCheckout = (): void => {
    if (!cart || cart.items.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    if (!isAuthenticated || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to complete your purchase.",
        variant: "destructive",
        duration: 5000,
      });
      navigate('/login');
      return;
    }
    
    // Show the optimized checkout flow (cart stays mounted but hidden)
    setShowCheckout(true);
  };
  
  // Handle checkout close
  const handleCheckoutClose = () => {
    setShowCheckout(false);
    // Note: Cart modal will automatically reappear when showCheckout becomes false
  };

  // Handle successful checkout completion
  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    onClose(); // Close the entire cart component after successful purchase
    
    toast({
      title: "Purchase Complete!",
      description: "Thank you for your purchase. Your training sessions are now available.",
      duration: 6000,
    });
  };

  return (
    <>
      {/* Cart Modal - hidden when checkout is open */}
      {!showCheckout && (
        <CartModalOverlay onClick={onClose}>
          <AnimatePresence>
            <CartModalContent 
              onClick={(e) => e.stopPropagation()}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
          <ModalCloseButton onClick={onClose}>&times;</ModalCloseButton>
          <CartTitle>Your Shopping Cart</CartTitle>
          
          {loading ? (
            <LoaderContainer>
              <LoadingSpinner />
            </LoaderContainer>
          ) : error ? (
            <StatusMessage $isError>{error}</StatusMessage>
          ) : (
            <>

              
              {(!cart || cart.items?.length === 0) ? (
                <EmptyCartMessage>
                  <p>Your cart is empty.</p>
                  <GlowButton 
                    text="Continue Shopping" 
                    theme="cosmic" 
                    onClick={onClose} 
                  />
                </EmptyCartMessage>
              ) : (
                <>
                  <CartItemsList>
                    <AnimatePresence>
                      {cart.items.map((item) => {
                        // Determine if this is a training package
                        const isTrainingPackage = item.storefrontItem?.name?.includes('Gold') || 
                                                  item.storefrontItem?.name?.includes('Platinum') ||
                                                  item.storefrontItem?.name?.includes('Rhodium') ||
                                                  item.storefrontItem?.name?.includes('Silver');
                        
                        // Get session details for training packages                    
                        let sessionDetails = '';
                        let pricePerSession = 0;
                        let sessionCount = 0;
                        
                        if (isTrainingPackage) {
                          if (item.storefrontItem?.name?.includes('Single Session')) {
                            sessionDetails = `${item.quantity} session${item.quantity > 1 ? 's' : ''} at $175 per session`;
                            pricePerSession = 175;
                            sessionCount = 1;
                          } else if (item.storefrontItem?.name?.includes('Silver Package')) {
                            sessionDetails = `${8 * item.quantity} sessions at $170 per session`;
                            pricePerSession = 170;
                            sessionCount = 8;
                          } else if (item.storefrontItem?.name?.includes('Gold Package')) {
                            sessionDetails = `${20 * item.quantity} sessions at $165 per session`;
                            pricePerSession = 165;
                            sessionCount = 20;
                          } else if (item.storefrontItem?.name?.includes('Platinum Package')) {
                            sessionDetails = `${50 * item.quantity} sessions at $160 per session`;
                            pricePerSession = 160;
                            sessionCount = 50;
                          } else if (item.storefrontItem?.name?.includes('3-Month')) {
                            sessionDetails = `${3 * item.quantity} months, 4 sessions/week at $155 per session`;
                            pricePerSession = 155;
                            sessionCount = 48; // 3 months × 4 weeks × 4 sessions/week
                          } else if (item.storefrontItem?.name?.includes('6-Month')) {
                            sessionDetails = `${6 * item.quantity} months, 4 sessions/week at $150 per session`;
                            pricePerSession = 150;
                            sessionCount = 96; // 6 months × 4 weeks × 4 sessions/week
                          } else if (item.storefrontItem?.name?.includes('9-Month')) {
                            sessionDetails = `${9 * item.quantity} months, 4 sessions/week at $145 per session`;
                            pricePerSession = 145;
                            sessionCount = 144; // 9 months × 4 weeks × 4 sessions/week
                          } else if (item.storefrontItem?.name?.includes('12-Month')) {
                            sessionDetails = `${12 * item.quantity} months, 4 sessions/week at $140 per session`;
                            pricePerSession = 140;
                            sessionCount = 192; // 12 months × 4 weeks × 4 sessions/week
                          }
                        }
                        
                        return (
                          <CartItemContainer
                            key={item.id}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <ItemDetails>
                              <ItemName>{item.storefrontItem?.name || `Package #${item.storefrontItemId}`}</ItemName>
                              <ItemDescription>
                                {isTrainingPackage ? sessionDetails : (item.storefrontItem?.description || "Premium training package")}
                              </ItemDescription>
                              {isTrainingPackage && (
                                <span style={{ fontSize: '0.9rem', color: '#00ffff', marginTop: '0.5rem' }}>
                                  <strong>{item.quantity * sessionCount} total sessions</strong>
                                </span>
                              )}
                              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem' }}>
                                Item #{item.id} • {item.quantity > 1 ? `${item.quantity}× ` : ''}${formatPrice(item.price)} each
                              </div>
                            </ItemDetails>
                            
                            <PriceContainer>
                              <ItemPrice>${formatPrice(item.price * item.quantity)}</ItemPrice>
                              <QuantityControls>
                                <QuantityButton 
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </QuantityButton>
                                <QuantityValue>{item.quantity}</QuantityValue>
                                <QuantityButton 
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  +
                                </QuantityButton>
                              </QuantityControls>
                            </PriceContainer>
                            
                            <RemoveButton onClick={() => removeItem(item.id)}>
                              ✕
                            </RemoveButton>
                          </CartItemContainer>
                        );
                      })}
                    </AnimatePresence>
                  </CartItemsList>
                  
                  <CartSummary>
                    <SummaryRow>
                      <SummaryLabel>Subtotal</SummaryLabel>
                      <SummaryValue>${formatPrice(cart.total)}</SummaryValue>
                    </SummaryRow>
                    <SummaryRow>
                      <SummaryLabel>Items</SummaryLabel>
                      <SummaryValue>{cart.itemCount}</SummaryValue>
                    </SummaryRow>
                    <SummaryRow className="total">
                      <SummaryLabel>Total</SummaryLabel>
                      <SummaryValue>${formatPrice(cart.total)}</SummaryValue>
                    </SummaryRow>
                  </CartSummary>
                  
                  <ButtonsContainer>
                    <GlowButton 
                      text="Clear Cart" 
                      theme="ruby" 
                      size="medium"
                      onClick={clearCart} 
                    />
                    <GlowButton 
                      text="Secure Checkout" 
                      theme="emerald" 
                      size="medium"
                      onClick={handleCheckout}
                    />
                  </ButtonsContainer>
                </>
              )}
            </>
          )}
          </CartModalContent>
        </AnimatePresence>
      </CartModalOverlay>
      )}
      
      {/* Optimized Checkout Flow Integration */}
      <OptimizedCheckoutFlow
        isOpen={showCheckout}
        onClose={handleCheckoutClose}
        onSuccess={handleCheckoutSuccess}
        preferredMethod="embedded"
      />
    </>
  );
};

export default ShoppingCart;