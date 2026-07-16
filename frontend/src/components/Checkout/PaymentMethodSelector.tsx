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
import styled, { css, keyframes } from 'styled-components';
import { v4 as uuidv4 } from 'uuid';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api.service';
import { getPaymentMethods, calculateFee, PaymentMethodId } from './PaymentFeeCalculator';
import CheckPayment from './methods/CheckPayment';
import ZellePayment from './methods/ZellePayment';
import VenmoPayment from './methods/VenmoPayment';
import ACHPayment from './methods/ACHPayment';
import ProcessingOverlay from './ProcessingOverlay';
import PriceMismatchModal from './PriceMismatchModal';
import { StyledBox } from '@/components/ui/StyledBox';

/** localStorage-backed idempotency key with 24hr TTL (9-Brain Phase 2 consensus) */
function getPersistedIdempotencyKey(fingerprint: string): string {
  const storageKey = `payment-idemp-offline-${fingerprint}`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const { key, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) return key;
    }
  } catch { /* corrupted — regenerate */ }
  const newKey = uuidv4();
  localStorage.setItem(storageKey, JSON.stringify({ key: newKey, timestamp: Date.now() }));
  return newKey;
}

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
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [priceMismatch, setPriceMismatch] = useState<PriceMismatchData | null>(null);

  // Stable cart fingerprint for idempotency key binding
  const cartFingerprint = (cart?.items || [])
    .map((i: any) => `${i.storefrontItemId || i.id}:${i.quantity}`)
    .sort()
    .join('|');
  const idempotencyKey = useRef(getPersistedIdempotencyKey(cartFingerprint));

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
        try { localStorage.removeItem(`payment-idemp-offline-${cartFingerprint}`); } catch { /* best-effort idempotency cleanup */ }
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
        // Price changed = new payload, so new idempotency key (persist to localStorage)
        const newKey = uuidv4();
        idempotencyKey.current = newKey;
        try { localStorage.setItem(`payment-idemp-offline-${cartFingerprint}`, JSON.stringify({ key: newKey, timestamp: Date.now() })); } catch { /* best-effort idempotency persistence */ }
      } else {
        toastError(data?.message || err.message || 'Failed to place order');
        // Network errors: keep same key so retry is idempotent (prevents double-billing)
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cart?.items, selectedMethod, user, total, toastSuccess, refreshCart, cartFingerprint, toastError]);

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
      <GridHeader>
        <SelectorHeader>Select Payment Method</SelectorHeader>
        <TrustBadge>
          <ShieldCheck size={14} /> Secured by Stripe &middot; 30-Day Guarantee
        </TrustBadge>
      </GridHeader>

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
          <StyledBox as="div" $style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StyledBox as={SkeletonCard} $style={{ height: 80 }} />
            <StyledBox as={SkeletonCard} $style={{ height: 48 }} />
            <StyledBox as={SkeletonCard} $style={{ height: 48 }} />
          </StyledBox>
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
              name: item.packageName || item.name || 'SwanStudios item',
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

const GridHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }
`;

const SelectorHeader = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const TrustBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.6875rem;
  color: #50A0F0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;

  svg { flex-shrink: 0; }
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
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid ${p => p.$active ? '#8B5CF6' : 'rgba(224, 236, 244, 0.1)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  min-height: 44px;
  color: #E0ECF4;
  transform: translateZ(0);

  ${p => p.$active && css`
    border: 1px solid #8B5CF6;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(0, 48, 128, 0.4) 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.15),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  `}

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.05);
    border-color: rgba(139, 92, 246, 0.4);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${p => p.$zero ? '#8B5CF6' : '#60C0F0'};
`;

const FeeSummary = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: #E0ECF4;
  text-align: center;
  padding: 12px 8px;
  margin-top: 4px;
  border-top: 1px solid rgba(224, 236, 244, 0.1);

  strong {
    font-family: 'Fira Code', monospace;
    font-size: 1.125rem;
    color: #60C0F0;
    font-weight: 600;
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
  transform: translateZ(0);
  will-change: transform, backdrop-filter;
`;

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const SkeletonCard = styled.div`
  height: 120px;
  border-radius: 8px;
  background: linear-gradient(90deg, #002060 25%, #003080 50%, #002060 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite ease-in-out;
`;

const SettingsLoadingMsg = styled.div`
  text-align: center;
  padding: 32px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  color: rgba(224, 236, 244, 0.6);
`;

export default PaymentMethodSelector;
