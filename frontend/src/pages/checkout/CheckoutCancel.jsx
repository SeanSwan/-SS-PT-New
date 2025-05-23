import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';

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

const CancelCard = styled(motion.div)`
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
  color: #ffa500;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #ff4b6a;
  font-weight: 400;
  text-shadow: 0 0 10px rgba(255, 75, 106, 0.3);
`;

const Message = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
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

const CheckoutCancel = () => {
  const navigate = useNavigate();
  
  const handleReturnToCart = () => {
    navigate('/store');
  };
  
  return (
    <Container>
      <CancelCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <IconWrapper>⮐</IconWrapper>
        <Title>Checkout Cancelled</Title>
        <Message>
          Your order has been cancelled and no payment has been processed.
          Your items are still in your cart if you wish to complete the purchase later.
        </Message>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button
            onClick={handleReturnToCart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Return to Store
          </Button>
        </div>
      </CancelCard>
    </Container>
  );
};

export default CheckoutCancel;