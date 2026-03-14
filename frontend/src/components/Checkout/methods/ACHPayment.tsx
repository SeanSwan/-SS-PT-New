/**
 * ACHPayment — Stripe ACH / eCheck via us_bank_account
 * =====================================================
 * Uses Stripe.js to collect bank account details and confirm payment.
 * ACH transfers take 1-3 business days to process.
 *
 * Flow:
 * 1. Call backend to create PaymentIntent
 * 2. Use stripe.confirmUsBankAccountPayment() to collect bank details
 * 3. User authorizes via Stripe Financial Connections
 * 4. Payment processes asynchronously (webhook handles completion)
 */
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Building2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import GlowButton from '../../ui/buttons/GlowButton';
import api from '../../../services/api.service';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface ACHPaymentProps {
  total: number;
  fee: number;
  items: Array<{ storefrontItemId: number; quantity: number; price: number; name: string }>;
  onSuccess?: (orderNumber: string) => void;
}

type ACHStatus = 'idle' | 'creating' | 'confirming' | 'processing' | 'succeeded' | 'error';

const ACHPayment: React.FC<ACHPaymentProps> = ({ total, fee, items, onSuccess }) => {
  const { user } = useAuth();
  const { refreshCart } = useCart();
  const [status, setStatus] = useState<ACHStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const totalWithFee = total + fee;

  const handleACHPayment = useCallback(async () => {
    if (status !== 'idle') return;
    setStatus('creating');
    setErrorMsg('');

    try {
      // Step 1: Create PaymentIntent on backend
      const res = await api.post('/api/payments/ach/create-intent', {
        items,
        customerInfo: {
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
          email: user?.email || '',
          userId: user?.id,
        },
        total,
      });

      if (!res.data?.success || !res.data?.clientSecret) {
        throw new Error(res.data?.message || 'Failed to create payment');
      }

      const { clientSecret, orderNumber: oNum } = res.data;
      setOrderNumber(oNum);

      // Step 2: Load Stripe and confirm with bank account
      setStatus('confirming');
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { error, paymentIntent } = await stripe.confirmUsBankAccountPayment(clientSecret, {
        payment_method: {
          us_bank_account: {
            account_holder_type: 'individual',
          },
          billing_details: {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
            email: user?.email || '',
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Bank verification failed');
      }

      // Step 3: Check payment status
      if (paymentIntent?.status === 'processing') {
        setStatus('processing');
        await refreshCart();
        onSuccess?.(oNum);
      } else if (paymentIntent?.status === 'succeeded') {
        setStatus('succeeded');
        await refreshCart();
        onSuccess?.(oNum);
      } else if (paymentIntent?.status === 'requires_action') {
        // Micro-deposits verification needed — Stripe handles the UI
        setStatus('processing');
      } else {
        throw new Error(`Unexpected payment status: ${paymentIntent?.status}`);
      }
    } catch (err: any) {
      setStatus('error');
      const data = err.response?.data;
      if (data?.code === 'PRICE_MISMATCH') {
        setErrorMsg(`Prices updated. New total: $${data.updatedTotal?.toFixed(2)}. Please refresh.`);
      } else {
        setErrorMsg(err.message || 'ACH payment failed');
      }
    }
  }, [status, items, user, total, refreshCart, onSuccess]);

  const reset = () => {
    setStatus('idle');
    setErrorMsg('');
  };

  return (
    <Container>
      <InfoCard>
        <InfoIcon><Building2 size={28} /></InfoIcon>
        <InfoContent>
          <InfoTitle>ACH / eCheck — Direct Bank Transfer</InfoTitle>
          <InfoDesc>
            Pay directly from your bank account. Processed through Stripe's secure banking network.
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
          <span>ACH Processing Fee (0.8%, max $5)</span>
          <AmountValue>${fee.toFixed(2)}</AmountValue>
        </AmountRow>
        <AmountDivider />
        <AmountRow $bold>
          <span>Total</span>
          <AmountValue>${totalWithFee.toFixed(2)}</AmountValue>
        </AmountRow>
      </AmountBox>

      {status === 'processing' && (
        <StatusBanner $type="info">
          <Clock size={18} />
          <div>
            <strong>Payment Processing</strong>
            <p>Order #{orderNumber} — Your ACH transfer is being processed. This typically takes 1-3 business days. You'll receive a confirmation email once complete.</p>
          </div>
        </StatusBanner>
      )}

      {status === 'succeeded' && (
        <StatusBanner $type="success">
          <ShieldCheck size={18} />
          <div>
            <strong>Payment Confirmed!</strong>
            <p>Order #{orderNumber} — Your ACH payment has been processed successfully.</p>
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

      {(status === 'creating' || status === 'confirming') && (
        <GlowButton
          text={status === 'creating' ? 'Setting up...' : 'Connecting to your bank...'}
          theme="purple"
          size="large"
          disabled
        />
      )}

      <Note>
        You'll be prompted to connect your bank account via Stripe's secure Financial Connections.
        Your banking credentials are never shared with SwanStudios.
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
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.7);
  margin: 0;
  line-height: 1.4;
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
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.6);

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
  font-size: 0.78rem;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  line-height: 1.5;
`;
