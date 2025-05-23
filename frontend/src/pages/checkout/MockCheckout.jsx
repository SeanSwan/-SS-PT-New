import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';

// Styled components for the mock checkout page
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
`;

const Card = styled(motion.div)`
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #00ffff;
  font-weight: 300;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const Subtitle = styled.h2`
  font-size: 1.3rem;
  margin-bottom: 2rem;
  text-align: center;
  color: white;
  font-weight: 300;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const Button = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  background: linear-gradient(135deg, #7851a9, #00ffff);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const InfoText = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-top: 1.5rem;
`;

const LoadingIndicator = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  margin-left: 10px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/**
 * MockCheckout component
 * 
 * This component simulates a Stripe checkout page for development purposes.
 * It allows testing the checkout flow without requiring a real Stripe account.
 */
const MockCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '4242 4242 4242 4242',
    expiry: '12/28',
    cvc: '123',
    zip: '12345'
  });
  
  // Get redirect URL and session ID from URL parameters
  const redirectUrl = searchParams.get('redirect');
  const sessionId = searchParams.get('session_id');
  
  // Handle redirect if no session ID is provided
  useEffect(() => {
    if (!sessionId) {
      navigate('/store');
    }
  }, [sessionId, navigate]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      if (redirectUrl) {
        // Add success params to the redirect URL
        const url = new URL(redirectUrl);
        url.searchParams.append('mock_payment', 'success');
        url.searchParams.append('session_id', sessionId);
        
        // Redirect to success page
        window.location.href = url.toString();
      } else {
        // Fallback if no redirect URL is provided
        navigate('/checkout/CheckoutSuccess');
      }
    }, 2000);
  };
  
  return (
    <Container>
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title>SwanStudios Mock Checkout</Title>
        <Subtitle>Complete your purchase</Subtitle>
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleChange}
              placeholder="1234 5678 9012 3456"
              required
              disabled={isProcessing}
            />
          </FormGroup>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                type="text"
                id="expiry"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
                placeholder="MM/YY"
                required
                disabled={isProcessing}
              />
            </FormGroup>
            
            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="cvc">CVC</Label>
              <Input
                type="text"
                id="cvc"
                name="cvc"
                value={formData.cvc}
                onChange={handleChange}
                placeholder="123"
                required
                disabled={isProcessing}
              />
            </FormGroup>
          </div>
          
          <FormGroup>
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              type="text"
              id="zip"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              placeholder="12345"
              required
              disabled={isProcessing}
            />
          </FormGroup>
          
          <Button
            type="submit"
            disabled={isProcessing}
            whileHover={!isProcessing ? { scale: 1.03 } : {}}
            whileTap={!isProcessing ? { scale: 0.98 } : {}}
          >
            {isProcessing ? (
              <>Processing Payment... <LoadingIndicator /></>
            ) : (
              'Pay Now'
            )}
          </Button>
        </form>
        
        <InfoText>
          This is a mock checkout for development purposes.<br />
          No real payment will be processed.
        </InfoText>
      </Card>
    </Container>
  );
};

export default MockCheckout;