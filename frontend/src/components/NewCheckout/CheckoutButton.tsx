/**
 * CheckoutButton.tsx - Genesis Checkout Action Button
 * ==================================================
 * 
 * GlowButton-powered checkout action button with enhanced UX
 * 
 * Features:
 * ✅ Uses components/ui/buttons/GlowButton.tsx (as requested)
 * ✅ Loading states with spinner
 * ✅ Amount display integration
 * ✅ Galaxy theme compliance
 * ✅ Accessibility features
 * ✅ Mobile-optimized
 * 
 * Master Prompt v35 Compliance:
 * - Single purpose component
 * - Clean prop interface
 * - GlowButton integration mandatory
 * - No breaking changes
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import GlowButton from '../ui/buttons/GlowButton';
import {
  CreditCard, ArrowRight, Lock, Zap, Shield
} from 'lucide-react';

// Styled Components
const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AmountDisplay = styled(motion.div)`
  text-align: center;
  padding: 0.75rem;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  margin-bottom: 0.5rem;
`;

const AmountLabel = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin: 0 0 0.25rem 0;
`;

const AmountValue = styled.h3`
  color: #00ffff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
`;

const SecurityNote = styled.p`
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  margin: 0.5rem 0 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
`;

// Component Props Interface
interface CheckoutButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  amount: number;
  className?: string;
}

const CheckoutButton: React.FC<CheckoutButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  amount,
  className
}) => {
  return (
    <ButtonContainer className={className}>
      {/* Amount Display */}
      <AmountDisplay
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <AmountLabel>Total Amount</AmountLabel>
        <AmountValue>${amount.toFixed(2)}</AmountValue>
      </AmountDisplay>

      {/* Main Checkout Button - Using GlowButton as requested */}
      <GlowButton
        variant="primary"
        size="large"
        fullWidth
        onClick={onClick}
        disabled={disabled}
        isLoading={isLoading}
        glowIntensity="high"
        leftIcon={isLoading ? undefined : <Lock size={20} />}
        rightIcon={isLoading ? undefined : <ArrowRight size={20} />}
        animateOnRender={true}
        aria-label={`Proceed to secure payment for $${amount.toFixed(2)}`}
      >
        {isLoading ? 'Creating Secure Session...' : 'Proceed to Secure Payment'}
      </GlowButton>

      {/* Security Note */}
      <SecurityNote>
        <Shield size={12} />
        <span>Powered by Stripe • SSL Encrypted • PCI Compliant</span>
      </SecurityNote>
    </ButtonContainer>
  );
};

export default CheckoutButton;
