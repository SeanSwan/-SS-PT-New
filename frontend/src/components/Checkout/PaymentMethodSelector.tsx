/**
 * PaymentMethodSelector
 * =====================
 * Orchestrator component that shows payment options above the existing Stripe form.
 * When "Credit/Debit Card" is selected, the existing CheckoutView renders normally.
 * When an offline method (Check/Zelle/Venmo) is selected, shows instructions + order creation.
 *
 * Design: Glassmorphic card grid per Gemini specs.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { css } from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api.service';
import {
  getPaymentMethods,
  calculateFee,
  PaymentMethodId,
  PaymentMethodInfo,
} from './PaymentFeeCalculator';
import CheckPayment from './methods/CheckPayment';
import ZellePayment from './methods/ZellePayment';
import VenmoPayment from './methods/VenmoPayment';
import ACHPayment from './methods/ACHPayment';
import ProcessingOverlay from './ProcessingOverlay';
import PriceMismatchModal from './PriceMismatchModal';

interface PaymentMethodSelectorProps {
  total: number;
  /** Render prop for the existing Stripe checkout */
  children: React.ReactNode;
}

interface PaymentSettings {
  zelleRecipient: string;
  venmoHandle: string;
  checkPayeeName: string;
}

interface PriceMismatchData {
  expectedTotal: number;
  updatedTotal: number;
  changedItems?: Array<{
    id: number;
    name: string;
    expectedPrice: number;
    actualPrice: number;
    delta: number;
    status: 'PRICE_CHANGED' | 'REMOVED';
  }>;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ total, children }) => {
  const { user } = useAuth();
  const { cart, refreshCart } = useCart();
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const idempotencyKey = useRef(uuidv4());
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [priceMismatch, setPriceMismatch] = useState<PriceMismatchData | null>(null);

  const methods = getPaymentMethods(total);

  // Fetch payment settings from admin (3-state: loading → loaded | error)
  useEffect(() => {
    setSettingsStatus('loading');
    api.get('/api/admin/payment-settings/public')
      .then(res => {
        if (res.data?.success && res.data.settings) {
          setSettings(res.data.settings);
          setSettingsStatus('loaded');
        } else {
          setSettingsStatus('error');
        }
      })
      .catch(() => {
        setSettingsStatus('error');
      });
  }, []);

  const handleOfflineSubmit = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const cartItems = cart?.items || [];
      const res = await api.post('/api/payments/offline', {
        paymentMethod: selectedMethod,
        items: cartItems.map(item => ({
          storefrontItemId: item.storefrontItemId || item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.packageName || item.name,
        })),
        customerInfo: {
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
          email: user?.email || '',
          userId: user?.id,
        },
        total,
        fee: calculateFee(selectedMethod, total),
        idempotencyKey: idempotencyKey.current,
      });

      if (res.data?.success) {
        toastSuccess(`Order placed! Your ${selectedMethod} payment is pending confirmation.`);
        await refreshCart();
      } else {
        throw new Error(res.data?.message || 'Order creation failed');
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === 'PRICE_MISMATCH') {
        const pricing = data.pricingData || data;
        setPriceMismatch({
          expectedTotal: pricing.expectedTotal ?? total,
          updatedTotal: pricing.updatedTotal ?? total,
          changedItems: pricing.changedItems,
        });
        // Price changed = new payload, so new idempotency key
        idempotencyKey.current = uuidv4();
      } else {
        toastError(data?.message || err.message || 'Failed to place order');
        // Network errors: keep same key so retry is idempotent (prevents double-billing)
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cart, selectedMethod, user, total, toastSuccess, toastError, refreshCart]);

  const handlePriceMismatchAccept = useCallback(() => {
    setPriceMismatch(null);
    // User accepted — they can retry at the new price
    toastSuccess('Prices updated. Please submit your payment again.');
  }, [toastSuccess]);

  const handlePriceMismatchCancel = useCallback(() => {
    setPriceMismatch(null);
  }, []);

  const fee = calculateFee(selectedMethod, total);

  return (
    <Container>
      {isProcessing && (
        <ProcessingOverlay
          transactionId={selectedMethod.toUpperCase()}
        />
      )}

      {priceMismatch && (
        <PriceMismatchModal
          expectedTotal={priceMismatch.expectedTotal}
          updatedTotal={priceMismatch.updatedTotal}
          changedItems={priceMismatch.changedItems}
          onAccept={handlePriceMismatchAccept}
          onCancel={handlePriceMismatchCancel}
        />
      )}
      <SelectorHeader>Choose Payment Method</SelectorHeader>

      <MethodGrid>
        {methods.map(method => (
          <MethodCard
            key={method.id}
            $active={selectedMethod === method.id}
            onClick={() => setSelectedMethod(method.id)}
            aria-label={`Pay with ${method.label}`}
          >
            {method.isZeroFee && <ZeroFeeBadge>Zero Fee</ZeroFeeBadge>}
            <MethodIcon>{method.icon}</MethodIcon>
            <MethodLabel>{method.label}</MethodLabel>
            <MethodFee $zero={method.isZeroFee}>{method.feeLabel}</MethodFee>
          </MethodCard>
        ))}
      </MethodGrid>

      {/* Fee summary */}
      {fee > 0 && (
        <FeeSummary>
          Processing fee: <strong>${fee.toFixed(2)}</strong> · Total: <strong>${(total + fee).toFixed(2)}</strong>
        </FeeSummary>
      )}

      {/* Payment method content */}
      <MethodContent>
        {selectedMethod === 'card' && children}

        {selectedMethod !== 'card' && selectedMethod !== 'ach' && settingsStatus === 'loading' && (
          <SettingsLoadingMsg>Loading payment details...</SettingsLoadingMsg>
        )}

        {selectedMethod !== 'card' && selectedMethod !== 'ach' && settingsStatus === 'error' && (
          <SettingsLoadingMsg>Unable to load payment settings. Please refresh and try again.</SettingsLoadingMsg>
        )}

        {selectedMethod === 'check' && settings && (
          <CheckPayment
            total={total}
            payeeName={settings.checkPayeeName}
            onSubmit={handleOfflineSubmit}
            isProcessing={isProcessing}
          />
        )}

        {selectedMethod === 'zelle' && settings && (
          <ZellePayment
            total={total}
            zelleRecipient={settings.zelleRecipient}
            onSubmit={handleOfflineSubmit}
            isProcessing={isProcessing}
          />
        )}

        {selectedMethod === 'venmo' && settings && (
          <VenmoPayment
            total={total}
            fee={fee}
            venmoHandle={settings.venmoHandle}
            onSubmit={handleOfflineSubmit}
            isProcessing={isProcessing}
          />
        )}

        {selectedMethod === 'ach' && (
          <ACHPayment
            total={total}
            fee={fee}
            items={(cart?.items || []).map(item => ({
              storefrontItemId: item.storefrontItemId || item.id,
              quantity: item.quantity,
              price: item.price,
              name: item.packageName || item.name,
            }))}
            onSuccess={() => {
              toastSuccess('ACH payment initiated! Processing takes 1-3 business days.');
              refreshCart();
            }}
          />
        )}
      </MethodContent>
    </Container>
  );
};

// ── Styled Components ──

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const SelectorHeader = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
  text-align: center;
`;

const MethodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MethodCard = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid ${p => p.$active ? '#60C0F0' : 'rgba(255, 255, 255, 0.08)'};
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  color: #E0ECF4;

  ${p => p.$active && css`
    background: linear-gradient(145deg, rgba(96, 192, 240, 0.12) 0%, rgba(0, 48, 128, 0.4) 100%);
    border-color: #60C0F0;
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(96, 192, 240, 0.15),
                0 0 0 1px rgba(96, 192, 240, 0.3),
                inset 0 2px 12px rgba(96, 192, 240, 0.1);
  `}

  &:hover {
    background: rgba(96, 192, 240, 0.04);
    border-color: rgba(96, 192, 240, 0.3);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;

const ZeroFeeBadge = styled.span`
  position: absolute;
  top: -10px;
  right: -10px;
  padding: 4px 10px;
  border-radius: var(--radius-full, 9999px);
  background: var(--midnight-sapphire, #002060);
  border: 1px solid var(--wing-purple, #8B5CF6);
  color: var(--frost-white, #E0ECF4);
  font-family: var(--font-heading, 'Sora', sans-serif);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  z-index: 1;

  /* GPU-Accelerated Glow via pseudo-element */
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    background: var(--wing-purple, #8B5CF6);
    opacity: 0.4;
    animation: premiumPulse 2s infinite var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
    z-index: -1;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
      opacity: 0.3;
      inset: -1px;
    }
  }

  @keyframes premiumPulse {
    0% { transform: scale(1); opacity: 0.4; }
    70% { transform: scale(1.25); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }
`;

const MethodIcon = styled.span`
  font-size: 1.5rem;
`;

const MethodLabel = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
`;

const MethodFee = styled.span<{ $zero: boolean }>`
  font-size: 0.72rem;
  font-weight: 600;
  color: ${p => p.$zero ? '#8B5CF6' : 'rgba(224, 236, 244, 0.7)'};
`;

const FeeSummary = styled.div`
  text-align: center;
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.7);
  padding: 8px;

  strong {
    color: #60C0F0;
    font-family: 'Fira Code', monospace;
  }
`;

const MethodContent = styled.div`
  padding: 20px;
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border-top: 1px solid rgba(96, 192, 240, 0.15);
  box-shadow: inset 0 4px 24px rgba(0, 0, 0, 0.2);
  min-height: 200px;
`;

const SettingsLoadingMsg = styled.div`
  text-align: center;
  padding: 32px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  color: rgba(224, 236, 244, 0.6);
`;

export default PaymentMethodSelector;
