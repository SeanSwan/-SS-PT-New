import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
`;

const SuccessCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 2.5rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const IconWrapper = styled.div`
  margin-bottom: 1.5rem;
  font-size: 4rem;
  color: #00ffaa;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #00ffff;
  font-weight: 400;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const Message = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
`;

const OrderDetails = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: left;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.8rem;
  
  &:last-child {
    margin-bottom: 0;
    padding-top: 0.8rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-weight: 500;
  }
`;

const DetailLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

const DetailValue = styled.span`
  color: white;
`;

const Button = styled(motion.button)`
  background: linear-gradient(135deg, #7851a9, #00ffff);
  color: white;
  border: none;
  padding: 0.8rem 2rem;
  font-size: 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  
  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 255, 255, 0.3);
  }
`;

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  
  // Create ref at component level to track if cart has been cleared
  const cartCleared = React.useRef(false);
  
  // Format price with commas and proper currency
  const formatPrice = (price) => {
    // Handle the case where price is a string
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Ensure the price is within a reasonable range (to handle potential errors)
    if (isNaN(numericPrice) || numericPrice > 100000) {
      return '$0.00';
    }
    
    // Format with 2 decimal places and commas
    return numericPrice.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  // Get parameters from URL or localStorage
  const sessionId = searchParams.get('session_id') || '';
  const amount = searchParams.get('amount') || '';
  const isRecovery = searchParams.get('recovery') === 'true';
  
  // Get stored cart data if available
  const [orderDetails, setOrderDetails] = useState(() => {
    // Try to get data from URL params first
    const orderFromParams = {
      orderId: sessionId || `SWNST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      date: new Date().toLocaleDateString(),
      total: parseFloat(amount) || cart?.total || 0,
      items: cart?.itemCount || 0
    };
    
    // Try to get more details from localStorage if available
    try {
      const savedCartData = localStorage.getItem('lastCheckoutData');
      if (savedCartData) {
        const parsedCart = JSON.parse(savedCartData);
        return {
          ...orderFromParams,
          items: parsedCart.itemCount || orderFromParams.items,
          total: parsedCart.total || orderFromParams.total
        };
      }
    } catch (e) {
      console.warn('Error parsing saved cart data:', e);
    }
    
    return orderFromParams;
  });
  
  // Clear the cart after successful checkout
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Skip if already cleared
    if (cartCleared.current) {
      console.log('Cart already cleared, skipping clearCart operation');
      return;
    }

    const handleOrderComplete = async () => {
      try {
        // Set the flag first to prevent multiple calls
        cartCleared.current = true;
        
        // Slight delay to ensure cart data is used before clearing
        setTimeout(async () => {
          if (clearCart) {
            await clearCart();
            console.log('Cart cleared successfully after checkout');
          }
          
          // Clear saved cart data
          localStorage.removeItem('lastCheckoutData');
        }, 500);
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    };
    
    handleOrderComplete();
    
    // Cleanup function to prevent multiple clears
    return () => {
      // This prevents clearing if component unmounts and remounts
      cartCleared.current = true;
    };
  }, []); // Empty dependency array to run only once
  
  const handleContinueShopping = () => {
    navigate('/store');
  };
  
  const handleViewSchedule = () => {
    navigate('/schedule');
  };
  
  return (
    <Container>
      <SuccessCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <IconWrapper>✓</IconWrapper>
        <Title>Order Confirmed!</Title>
        <Message>
          Thank you for your purchase. We've received your order and will contact you soon 
          to schedule your sessions. You can view your appointments in the schedule section.
        </Message>
        
        <OrderDetails>
          <DetailItem>
            <DetailLabel>Order Number:</DetailLabel>
            <DetailValue>{orderDetails.orderId}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Date:</DetailLabel>
            <DetailValue>{orderDetails.date}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Items:</DetailLabel>
            <DetailValue>{orderDetails.items}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Total:</DetailLabel>
            <DetailValue>{formatPrice(orderDetails.total)}</DetailValue>
          </DetailItem>
        </OrderDetails>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={handleViewSchedule}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Schedule
          </Button>
          <Button
            onClick={handleContinueShopping}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ background: 'linear-gradient(135deg, #4a4a8f, #333356)' }}
          >
            Continue Shopping
          </Button>
        </div>
      </SuccessCard>
    </Container>
  );
};

export default CheckoutSuccess;