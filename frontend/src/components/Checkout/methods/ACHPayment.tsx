/**
 * ACHPayment — Stripe ACH / eCheck via us_bank_account
 * =====================================================
 * Uses Stripe.js to collect bank account details and confirm payment.
 * ACH transfers take 1-3 business days to process.
 *
 * Flow:
 * 1. Call backend to create PaymentIntent
 * 2. Use stripe.collectBankAccountForPayment() to collect bank details
 * 3. Confirm only when Stripe returns requires_confirmation
 * 4. Payment processes asynchronously or waits for microdeposit verification
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Building2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { v4 as uuidv4 } from 'uuid';
import GlowButton from '../../ui/buttons/GlowButton';
import api from '../../../services/api.service';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import ProcessingOverlay from '../ProcessingOverlay';
import PriceMismatchModal from '../PriceMismatchModal';
import { logger } from '@/utils/logger';
import {
  AchPaymentIntentDecision,
  AchUiStatus,
  getAchProfileAccountHolderName,
  resolveAchPaymentIntentDecision,
  validateAchAccountHolderName,
} from './achPaymentState';

/** localStorage-backed idempotency key with 24hr TTL (9-Brain Phase 2 consensus) */
function getPersistedIdempotencyKey(fingerprint: string): string {
  const storageKey = `payment-idemp-ach-${fingerprint}`;
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

// Lazy-load Stripe only when ACH payment is actually initiated (not at module scope)
// This prevents IntegrationError on Store/Checkout pages when the key is missing
let stripeInstance: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripeInstance) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!key) {
      logger.warn('[ACH] VITE_STRIPE_PUBLISHABLE_KEY not set — Stripe ACH unavailable');
      return Promise.resolve(null);
    }
    stripeInstance = loadStripe(key);
  }
  return stripeInstance;
}

interface ACHPaymentProps {
  total: number;
  fee: number;
  items: Array<{ storefrontItemId: number; quantity: number; price: number; name: string }>;
  onSuccess?: (orderNumber: string) => void;
}

const ACHPayment: React.FC<ACHPaymentProps> = ({ total, fee, items, onSuccess }) => {
  const { user } = useAuth();
  const { refreshCart } = useCart();
  const profileAccountHolderName = useMemo(() => getAchProfileAccountHolderName(user), [user]);
  const [status, setStatus] = useState<AchUiStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(profileAccountHolderName);
  const [accountHolderTouched, setAccountHolderTouched] = useState(false);

  // Derive stable cart fingerprint from items for idempotency key binding
  const cartFingerprint = items.map(i => `${i.storefrontItemId}:${i.quantity}`).sort().join('|');
  const idempotencyKey = useRef(getPersistedIdempotencyKey(cartFingerprint));

  // Cleanup localStorage on successful payment
  useEffect(() => {
    if (status === 'succeeded' || status === 'processing') {
      try { localStorage.removeItem(`payment-idemp-ach-${cartFingerprint}`); } catch { /* best-effort idempotency cleanup */ }
    }
  }, [status, cartFingerprint]);

  useEffect(() => {
    if (!accountHolderTouched && profileAccountHolderName) {
      setAccountHolderName(profileAccountHolderName);
    }
  }, [accountHolderTouched, profileAccountHolderName]);

  const [priceMismatch, setPriceMismatch] = useState<{
    expectedTotal: number;
    updatedTotal: number;
    changedItems?: any[];
  } | null>(null);

  const totalWithFee = total + fee;

  const rotateIdempotencyKey = useCallback(() => {
    const newKey = uuidv4();
    idempotencyKey.current = newKey;
    try { localStorage.setItem(`payment-idemp-ach-${cartFingerprint}`, JSON.stringify({ key: newKey, timestamp: Date.now() })); } catch { /* best-effort idempotency persistence */ }
  }, [cartFingerprint]);

  const applyPaymentDecision = useCallback(async (decision: AchPaymentIntentDecision, oNum: string) => {
    setStatus(decision.uiStatus);
    setStatusMessage(decision.message);

    if (decision.uiStatus === 'error') {
      setErrorMsg(decision.message);
      if (decision.kind === 'retry_payment_method') rotateIdempotencyKey();
      return;
    }

    if (decision.shouldCallSuccess) {
      await refreshCart();
      onSuccess?.(oNum);
    }
  }, [onSuccess, refreshCart, rotateIdempotencyKey]);

  const handleACHPayment = useCallback(async () => {
    if (status !== 'idle') return;
    const accountHolder = validateAchAccountHolderName(accountHolderName);
    if (!accountHolder.ok) {
      setErrorMsg(accountHolder.message || 'Enter the account holder name before connecting a bank account.');
      setStatus('error');
      return;
    }

    setStatus('creating');
    setErrorMsg('');
    setStatusMessage('');

    try {
      // Step 1: Create PaymentIntent on backend
      const res = await api.post('/api/payments/ach/create-intent', {
        items,
        customerInfo: {
          name: accountHolder.name,
          email: user?.email?.trim() || '',
          userId: user?.id,
        },
        total,
        idempotencyKey: idempotencyKey.current,
      });

      if (!res.data?.success || !res.data?.clientSecret) {
        throw new Error(res.data?.message || 'Failed to create payment');
      }

      const { clientSecret, orderNumber: oNum } = res.data;
      setOrderNumber(oNum);

      // Step 2: Load Stripe and collect bank details through Financial Connections.
      setStatus('collecting');
      const stripe = await getStripe();
      if (!stripe) throw new Error('Stripe failed to load');

      const billingDetails: { name: string; email?: string } = {
        name: accountHolder.name!,
      };
      const email = user?.email?.trim();
      if (email) billingDetails.email = email;

      const collectResult = await stripe.collectBankAccountForPayment({
        clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: billingDetails,
          },
        },
      });

      if (collectResult.error) {
        throw new Error(collectResult.error.message || 'Bank verification failed');
      }

      const collectDecision = resolveAchPaymentIntentDecision(collectResult.paymentIntent, 'collect');
      if (collectDecision.shouldConfirm) {
        setStatus('confirming');
        const confirmResult = await stripe.confirmUsBankAccountPayment(clientSecret);
        if (confirmResult.error) {
          throw new Error(confirmResult.error.message || 'Bank authorization failed');
        }
        const confirmDecision = resolveAchPaymentIntentDecision(confirmResult.paymentIntent, 'confirm');
        await applyPaymentDecision(confirmDecision, oNum);
        return;
      }

      await applyPaymentDecision(collectDecision, oNum);
    } catch (err: any) {
      setStatus('error');
      const data = err.response?.data;
      if (data?.code === 'PRICE_MISMATCH') {
        const pricing = data.pricingData || data;
        setPriceMismatch({
          expectedTotal: pricing.expectedTotal ?? total,
          updatedTotal: pricing.updatedTotal ?? total,
          changedItems: pricing.changedItems,
        });
        setErrorMsg('Prices have been updated. Please review the changes.');
        // Price changed = new payload, so new idempotency key (also update localStorage)
        rotateIdempotencyKey();
      } else if (data?.code === 'PAYMENT_INTENT_FAILED') {
        setErrorMsg(data.userMessage || 'Payment processing failed.');
        // Stripe confirmed failure — safe to regenerate key for retry
        rotateIdempotencyKey();
      } else {
        setErrorMsg(err.message || 'ACH payment failed');
        // Network errors: keep same key so retry is idempotent (prevents double-billing)
      }
    }
  }, [status, user, accountHolderName, items, total, applyPaymentDecision, rotateIdempotencyKey]);

  const reset = () => {
    setStatus('idle');
    setErrorMsg('');
    setStatusMessage('');
  };

  return (
    <Container>
      {(status === 'creating' || status === 'collecting' || status === 'confirming') && (
        <ProcessingOverlay transactionId={orderNumber || undefined} />
      )}

      {priceMismatch && (
        <PriceMismatchModal
          expectedTotal={priceMismatch.expectedTotal}
          updatedTotal={priceMismatch.updatedTotal}
          changedItems={priceMismatch.changedItems}
          onAccept={() => {
            setPriceMismatch(null);
            reset();
          }}
          onCancel={() => setPriceMismatch(null)}
        />
      )}

      <InfoCard>
        <InfoIcon><Building2 size={28} /></InfoIcon>
        <InfoContent>
          <InfoTitle>ACH / eCheck — Direct Bank Transfer</InfoTitle>
          <InfoDesc>
            Pay directly from your bank account. Processed through Stripe&apos;s secure banking network.
          </InfoDesc>
        </InfoContent>
      </InfoCard>

      <FeatureRow>
        <Feature>
          <ShieldCheck size={16} />
          <span>Bank-level encryption</span>
        </Feature>
        <Feature>
          <Clock size={16} />
          <span>1-3 business days</span>
        </Feature>
        <Feature>
          <Building2 size={16} />
          <span>No card needed</span>
        </Feature>
      </FeatureRow>

      <AmountBox>
        <AmountRow>
          <span>Subtotal</span>
          <AmountValue>${total.toFixed(2)}</AmountValue>
        </AmountRow>
        <AmountRow>
          <span>ACH Processing Fee</span>
          <AmountValue>${fee.toFixed(2)}</AmountValue>
        </AmountRow>
        <AmountDivider />
        <AmountRow $bold>
          <span>Total</span>
          <AmountValue>${totalWithFee.toFixed(2)}</AmountValue>
        </AmountRow>
      </AmountBox>

      <AccountHolderField>
        <AccountHolderLabel htmlFor="ach-account-holder-name">Account holder name</AccountHolderLabel>
        <AccountHolderInput
          id="ach-account-holder-name"
          value={accountHolderName}
          onChange={(event) => {
            setAccountHolderTouched(true);
            setAccountHolderName(event.target.value);
            if (status === 'error') {
              setErrorMsg('');
              setStatusMessage('');
            }
          }}
          placeholder="Name on bank account"
          autoComplete="name"
        />
        <AccountHolderHint>
          Use the exact name on the bank account. This is sent to Stripe for ACH authorization.
        </AccountHolderHint>
      </AccountHolderField>

      {status === 'processing' && (
        <StatusBanner $type="info">
          <Clock size={18} />
          <div>
            <strong>Payment Processing</strong>
            <p>{statusMessage || `Order #${orderNumber} — Your ACH transfer is being processed. This typically takes 1-3 business days. You'll receive a confirmation email once complete.`}</p>
          </div>
        </StatusBanner>
      )}

      {status === 'microdeposit_verification' && (
        <StatusBanner $type="info">
          <AlertCircle size={18} />
          <div>
            <strong>Microdeposit Verification Needed</strong>
            <p>{statusMessage || 'Stripe needs microdeposit verification before this ACH payment can continue. Check your email for verification instructions.'}</p>
          </div>
        </StatusBanner>
      )}

      {status === 'succeeded' && (
        <StatusBanner $type="success">
          <ShieldCheck size={18} />
          <div>
            <strong>Payment Accepted</strong>
            <p>{statusMessage || `Order #${orderNumber} — Your ACH payment has been accepted. Backend confirmation remains the source of truth for fulfillment.`}</p>
          </div>
        </StatusBanner>
      )}

      {status === 'error' && (
        <StatusBanner $type="error">
          <AlertCircle size={18} />
          <div>
            <strong>Payment Failed</strong>
            <p>{errorMsg}</p>
          </div>
        </StatusBanner>
      )}

      {(status === 'idle' || status === 'error') && (
        <GlowButton
          text={status === 'error' ? 'Try Again' : 'Pay with Bank Account'}
          theme="purple"
          size="large"
          onClick={status === 'error' ? reset : handleACHPayment}
        />
      )}

      {(status === 'creating' || status === 'collecting' || status === 'confirming') && (
        <GlowButton
          text={status === 'creating' ? 'Setting up...' : status === 'collecting' ? 'Connecting to your bank...' : 'Confirming authorization...'}
          theme="purple"
          size="large"
          disabled
        />
      )}

      <Note>
        You&apos;ll be prompted to connect your bank account via Stripe&apos;s secure Financial Connections.
        ACH is not instant like card checkout; it can process for several business days or require
        microdeposit verification. Your banking credentials are never shared with SwanStudios.
      </Note>
    </Container>
  );
};

export default ACHPayment;

// ── Styled Components ──

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const InfoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 16px;
`;

const InfoIcon = styled.div`
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60C0F0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #E0ECF4;
  margin-bottom: 4px;
`;

const InfoDesc = styled.p`
  font-size: 0.875rem;
  color: #E0ECF4;
  font-weight: 300;
  margin: 0;
  line-height: 1.5;
`;

const FeatureRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #E0ECF4;
  font-weight: 300;

  svg { color: #60C0F0; }
`;

const AmountBox = styled.div`
  padding: 16px;
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
`;

const AmountRow = styled.div<{ $bold?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: ${p => p.$bold ? '1rem' : '0.85rem'};
  font-weight: ${p => p.$bold ? '700' : '400'};
  color: ${p => p.$bold ? '#E0ECF4' : 'rgba(224, 236, 244, 0.7)'};
`;

const AmountValue = styled.span`
  font-family: 'Fira Code', monospace;
  color: #60C0F0;
`;

const AmountDivider = styled.div`
  height: 1px;
  background: rgba(96, 192, 240, 0.1);
  margin: 8px 0;
`;

const AccountHolderField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AccountHolderLabel = styled.label`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #E0ECF4;
`;

const AccountHolderInput = styled.input`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.24);
  background: rgba(0, 32, 96, 0.42);
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  outline: none;

  &:focus {
    border-color: rgba(96, 192, 240, 0.72);
    box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.16);
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.44);
  }
`;

const AccountHolderHint = styled.p`
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: rgba(224, 236, 244, 0.68);
`;

const StatusBanner = styled.div<{ $type: 'info' | 'success' | 'error' }>`
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: ${p =>
    p.$type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
    p.$type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
    'rgba(96, 192, 240, 0.1)'};
  border: 1px solid ${p =>
    p.$type === 'success' ? 'rgba(34, 197, 94, 0.2)' :
    p.$type === 'error' ? 'rgba(239, 68, 68, 0.2)' :
    'rgba(96, 192, 240, 0.2)'};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${p =>
      p.$type === 'success' ? '#22C55E' :
      p.$type === 'error' ? '#ef4444' :
      '#60C0F0'};
  }

  strong {
    display: block;
    font-size: 0.9rem;
    color: #E0ECF4;
    margin-bottom: 4px;
  }

  p {
    font-size: 0.8rem;
    color: rgba(224, 236, 244, 0.7);
    margin: 0;
    line-height: 1.4;
  }
`;

const Note = styled.p`
  color: #E0ECF4;
  font-weight: 300;
  letter-spacing: 0.02em;
  line-height: 1.6;
  font-size: 0.875rem;
  margin: 0;
  padding: 1rem;
  background: rgba(80, 160, 240, 0.08);
  border-left: 3px solid #50A0F0;
  border-radius: 0 4px 4px 0;
`;
