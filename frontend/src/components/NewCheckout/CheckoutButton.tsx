/**
 * COMPONENT: CheckoutButton
 * PURPOSE: Render the primary Stripe checkout CTA with amount proof and security note.
 * OWNER: Codex | LAST VALIDATED: 2026-06-09
 *
 * WIREFRAME:
 * [total amount]
 * [secure payment button]
 * [Stripe security note]
 *
 * DATA FLOW:
 * Props In: onClick, disabled, isLoading, amount, className.
 * State: none.
 * API Calls: none.
 * Events: delegates click to CheckoutView.
 * Children: GlowButton and styled amount/security text.
 *
 * ARCHITECTURE: CheckoutButton -> GlowButton + CheckoutButton.styles.
 */
import React from 'react';
import { ArrowRight, Lock, Shield } from 'lucide-react';
import GlowButton from '../ui/buttons/GlowButton';
import {
  AmountDisplay,
  AmountLabel,
  AmountValue,
  ButtonContainer,
  SecurityNote,
} from './CheckoutButton.styles';

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
  className,
}) => (
  <ButtonContainer className={className}>
    <AmountDisplay
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AmountLabel>Total Amount</AmountLabel>
      <AmountValue>${amount.toFixed(2)}</AmountValue>
    </AmountDisplay>

    <GlowButton
      variant="primary"
      size="large"
      fullWidth
      onClick={onClick}
      disabled={disabled}
      isLoading={isLoading}
      glowIntensity="high"
      leftIcon={isLoading ? undefined : <Lock size={20} aria-hidden="true" />}
      rightIcon={isLoading ? undefined : <ArrowRight size={20} aria-hidden="true" />}
      animateOnRender={true}
      aria-label={`Proceed to secure payment for $${amount.toFixed(2)}`}
    >
      {isLoading ? 'Creating Secure Session...' : 'Proceed to Secure Payment'}
    </GlowButton>

    <SecurityNote>
      <Shield size={12} aria-hidden="true" />
      <span>Powered by Stripe with SSL encryption and PCI compliance</span>
    </SecurityNote>
  </ButtonContainer>
);

export default CheckoutButton;
