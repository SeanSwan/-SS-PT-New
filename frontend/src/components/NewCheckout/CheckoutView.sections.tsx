/**
 * FILE: CheckoutView.sections.tsx
 * PURPOSE: Presentational sections for the live paid checkout route.
 * LAST VALIDATED: 2026-06-09 via CheckoutView theme contract.
 */
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowLeft, CheckCircle, Home, Lock, Mail, Phone, Shield, Star, User } from 'lucide-react';
import GlowButton from '../ui/buttons/GlowButton';
import PaymentMethodSelector from '../Checkout/PaymentMethodSelector';
import CheckoutButton from './CheckoutButton';
import CheckoutFulfillmentSection from './CheckoutFulfillmentSection';
import OrderReviewStep from './OrderReviewStep';
import type { CheckoutCustomerInfo } from './CheckoutView.types';
import type { CheckoutFulfillmentDetails, CheckoutFulfillmentIntent } from './CheckoutView.logic';
import {
  ActionButtonContainer,
  BackButton,
  CheckoutContainer,
  CheckoutContent,
  CheckoutHeader,
  CheckoutInfoGrid,
  CheckoutSection,
  CheckoutSubtitle,
  CheckoutTitle,
  ErrorMessage,
  InfoCard,
  InfoCardIcon,
  InfoCardTitle,
  InfoCardValue,
  MainSection,
  SectionTitle,
  SecurityBadge,
  SecurityBadges,
  SuccessMessage,
} from './CheckoutView.styles';

export const AuthRequiredCheckout: React.FC = () => (
  <CheckoutContainer
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <CheckoutHeader>
      <CheckoutTitle>Authentication Required</CheckoutTitle>
      <CheckoutSubtitle>Please log in to complete your purchase</CheckoutSubtitle>
    </CheckoutHeader>
    {/* Previously a terminal panel: it named the requirement but gave the buyer
        no way to satisfy it. */}
    <ActionButtonContainer>
      <GlowButton
        variant="primary"
        size="large"
        fullWidth
        onClick={() => { window.location.href = '/login?returnUrl=/checkout'; }}
      >
        Log in to continue
      </GlowButton>
    </ActionButtonContainer>
  </CheckoutContainer>
);

/**
 * The /checkout route mounts CheckoutView with NO props (routes/main-routes.tsx),
 * so onCancel is undefined there. Gating the only escape hatches on it left a
 * buyer standing on /checkout with an empty cart, a disabled $0.00 pay button,
 * and no way back to the store. A checkout screen must never depend on its
 * caller to provide a way out.
 */
const goToStore = () => { window.location.href = '/store'; };

const CheckoutHero: React.FC<{ onCancel?: () => void }> = ({ onCancel }) => (
  <CheckoutHeader>
    <BackButton onClick={onCancel ?? goToStore} aria-label="Back to store">
      <ArrowLeft size={16} aria-hidden="true" />
      Back
    </BackButton>
    <CheckoutTitle>Secure Checkout</CheckoutTitle>
    <CheckoutSubtitle>Complete your SwanStudios training package purchase</CheckoutSubtitle>
  </CheckoutHeader>
);

const CheckoutSecurityBadges: React.FC = () => (
  <SecurityBadges>
    <SecurityBadge>
      <Shield size={16} aria-hidden="true" />
      Stripe Secure
    </SecurityBadge>
    <SecurityBadge>
      <Lock size={16} aria-hidden="true" />
      SSL Encrypted
    </SecurityBadge>
    <SecurityBadge>
      <CheckCircle size={16} aria-hidden="true" />
      PCI Compliant
    </SecurityBadge>
    <SecurityBadge>
      <Star size={16} aria-hidden="true" />
      Money Back Guarantee
    </SecurityBadge>
  </SecurityBadges>
);

const CustomerInformationSection: React.FC<{ customerInfo: CheckoutCustomerInfo }> = ({ customerInfo }) => (
  <CheckoutSection
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay: 0.1 }}
  >
    <SectionTitle>
      <User size={20} aria-hidden="true" />
      Customer Information
    </SectionTitle>

    <CheckoutInfoGrid>
      <InfoCard>
        <InfoCardIcon>
          <User size={20} aria-hidden="true" />
        </InfoCardIcon>
        <InfoCardTitle>Name</InfoCardTitle>
        <InfoCardValue>{customerInfo.name || 'Not provided'}</InfoCardValue>
      </InfoCard>

      <InfoCard>
        <InfoCardIcon>
          <Mail size={20} aria-hidden="true" />
        </InfoCardIcon>
        <InfoCardTitle>Email</InfoCardTitle>
        <InfoCardValue>{customerInfo.email || 'Not provided'}</InfoCardValue>
      </InfoCard>

      <InfoCard>
        <InfoCardIcon>
          <Phone size={20} aria-hidden="true" />
        </InfoCardIcon>
        <InfoCardTitle>Phone</InfoCardTitle>
        <InfoCardValue>{customerInfo.phone || 'Not provided'}</InfoCardValue>
      </InfoCard>
    </CheckoutInfoGrid>
  </CheckoutSection>
);

const PaymentActionSection: React.FC<{
  total: number;
  amountLabel: string;
  amountAriaLabel: string;
  disabled: boolean;
  isProcessing: boolean;
  onCheckout: () => void;
}> = ({ total, amountLabel, amountAriaLabel, disabled, isProcessing, onCheckout }) => (
  <CheckoutSection
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
  >
    <PaymentMethodSelector total={total}>
      <ActionButtonContainer>
        <CheckoutButton
          onClick={onCheckout}
          disabled={disabled}
          isLoading={isProcessing}
          amount={total}
          amountLabel={amountLabel}
          amountAriaLabel={amountAriaLabel}
        />
      </ActionButtonContainer>
    </PaymentMethodSelector>
  </CheckoutSection>
);

const ReturnToCartAction: React.FC<{
  disabled: boolean;
  onCancel?: () => void;
}> = ({ disabled, onCancel }) => {
  return (
    <ActionButtonContainer>
      <GlowButton
        variant="ghost"
        size="large"
        fullWidth
        onClick={onCancel ?? goToStore}
        disabled={disabled}
      >
        <Home size={20} aria-hidden="true" />
        {onCancel ? 'Return to Cart' : 'Back to Store'}
      </GlowButton>
    </ActionButtonContainer>
  );
};

const CheckoutStatusMessages: React.FC<{
  error: string | null;
  success: string | null;
}> = ({ error, success }) => (
  <AnimatePresence>
    {error && (
      <ErrorMessage
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <AlertTriangle size={16} aria-hidden="true" />
        {error}
      </ErrorMessage>
    )}

    {success && (
      <SuccessMessage
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <CheckCircle size={16} aria-hidden="true" />
        {success}
      </SuccessMessage>
    )}
  </AnimatePresence>
);

export const CheckoutReadyView: React.FC<{
  cart: any;
  checkoutReady: boolean;
  customerInfo: CheckoutCustomerInfo;
  error: string | null;
  fulfillmentDetails: CheckoutFulfillmentDetails;
  fulfillmentIntent: CheckoutFulfillmentIntent;
  isProcessing: boolean;
  onCancel?: () => void;
  onCheckout: () => void;
  onFulfillmentDetailsChange: (details: CheckoutFulfillmentDetails) => void;
  sessionCount: number;
  subtotal: number;
  success: string | null;
  tax: number | null;
  taxLabel: string;
  total: number;
}> = ({
  cart,
  checkoutReady,
  customerInfo,
  error,
  fulfillmentDetails,
  fulfillmentIntent,
  isProcessing,
  onCancel,
  onCheckout,
  onFulfillmentDetailsChange,
  sessionCount,
  subtotal,
  success,
  tax,
  taxLabel,
  total,
}) => {
  const usesStripeTax = tax === null;
  const amountLabel = usesStripeTax ? 'Subtotal Before Stripe Tax' : 'Total Amount';
  const amountAriaLabel = usesStripeTax
    ? `Proceed to secure payment for $${total.toFixed(2)} before Stripe-calculated tax`
    : `Proceed to secure payment for $${total.toFixed(2)}`;

  return (
  <CheckoutContainer
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <CheckoutHero onCancel={onCancel} />
    <CheckoutSecurityBadges />

    <CheckoutContent>
      <MainSection>
        <CustomerInformationSection customerInfo={customerInfo} />
        <CheckoutFulfillmentSection
          fulfillmentDetails={fulfillmentDetails}
          fulfillmentIntent={fulfillmentIntent}
          onFulfillmentDetailsChange={onFulfillmentDetailsChange}
        />
        <PaymentActionSection
          total={total}
          amountLabel={amountLabel}
          amountAriaLabel={amountAriaLabel}
          disabled={!checkoutReady || isProcessing}
          isProcessing={isProcessing}
          onCheckout={onCheckout}
        />
        <ReturnToCartAction disabled={isProcessing} onCancel={onCancel} />
        <CheckoutStatusMessages error={error} success={success} />
      </MainSection>

      <OrderReviewStep
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        taxLabel={taxLabel}
        total={total}
        sessionCount={sessionCount}
      />
    </CheckoutContent>
  </CheckoutContainer>
  );
};
