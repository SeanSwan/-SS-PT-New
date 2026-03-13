/**
 * DonationModal.tsx
 * =================
 * Modal for gallery visitors to leave an optional donation.
 * Supports Stripe (card), Venmo (via Stripe), and Zelle (self-reported).
 * Design: Crystalline Swan glassmorphism matching MessageModal pattern.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { X, Heart, CreditCard, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

// ── Types ─────────────────────────────────────────────────────────────────
export interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  galleryToken: string;
  eventSlug: string;
}

type PaymentMethod = 'stripe' | 'venmo' | 'zelle';

const PRESET_AMOUNTS = [5, 10, 25, 50];

// ── Animations ────────────────────────────────────────────────────────────
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const heartPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
`;

// ── Styled Components ─────────────────────────────────────────────────────
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 26, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 16px;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContent = styled.div`
  position: relative;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  background: #0a0a1a;
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 24px;
  padding: 32px 28px;
  color: rgba(255, 255, 255, 0.9);
  animation: ${fadeInUp} 0.35s ease-out;

  @media (max-width: 767px) {
    padding: 24px 20px;
    border-radius: 16px;
  }

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(96, 192, 240, 0.15);
    border-radius: 3px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const HeartIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: #C6A84B;
  animation: ${heartPulse} 2s ease-in-out infinite;
`;

const ModalTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #C6A84B;
  margin: 0 0 4px;
`;

const ModalSubtitle = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0 0 24px;
  line-height: 1.5;
`;

const SectionLabel = styled.label`
  display: block;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #A0AABF;
  margin-bottom: 10px;
`;

// ── Amount Selector ───────────────────────────────────────────────────────
const AmountGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;

  @media (max-width: 380px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const AmountButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 8px;
  border-radius: 12px;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${p => p.$active ? css`
    background: rgba(198, 168, 75, 0.15);
    border: 1.5px solid rgba(198, 168, 75, 0.5);
    color: #C6A84B;
  ` : css`
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);

    &:hover {
      border-color: rgba(198, 168, 75, 0.3);
      color: rgba(255, 255, 255, 0.9);
    }
  `}
`;

const CustomAmountRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
`;

const CustomAmountInput = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-family: 'Fira Code', monospace;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(198, 168, 75, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
    font-family: 'Sora', system-ui, sans-serif;
  }
`;

const DollarPrefix = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.4);
`;

// ── Payment Method Selector ───────────────────────────────────────────────
const MethodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
`;

const MethodButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 8px;
  border-radius: 12px;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  ${p => p.$active ? css`
    background: rgba(96, 192, 240, 0.1);
    border: 1.5px solid rgba(96, 192, 240, 0.4);
    color: #60C0F0;
  ` : css`
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);

    &:hover {
      border-color: rgba(96, 192, 240, 0.25);
      color: rgba(255, 255, 255, 0.7);
    }
  `}
`;

const MethodIcon = styled.span`
  font-size: 18px;
`;

// ── Zelle Info Box ────────────────────────────────────────────────────────
const ZelleInfoBox = styled.div`
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
`;

const ZelleDetail = styled.div`
  margin: 8px 0;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  color: #8B5CF6;
  background: rgba(139, 92, 246, 0.08);
  padding: 8px 12px;
  border-radius: 8px;
  user-select: all;
`;

const NoteInput = styled.textarea`
  width: 100%;
  min-height: 60px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
  margin-bottom: 16px;

  &:focus {
    border-color: rgba(96, 192, 240, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
`;

// ── Submit Button ─────────────────────────────────────────────────────────
const SubmitButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 0 24px;
  background: linear-gradient(135deg, #C6A84B 0%, #D4B85C 100%);
  border: none;
  border-radius: 12px;
  color: #0a0a1a;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: ${p => p.$loading ? 'wait' : 'pointer'};
  opacity: ${p => p.$loading ? 0.7 : 1};
  transition: opacity 0.2s, transform 0.15s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(10, 10, 26, 0.3);
  border-top-color: #0a0a1a;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const FeedbackMessage = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;

  ${p =>
    p.$type === 'success'
      ? `
    background: rgba(96, 192, 240, 0.08);
    border: 1px solid rgba(96, 192, 240, 0.2);
    color: #60C0F0;
  `
      : `
    background: rgba(255, 107, 107, 0.08);
    border: 1px solid rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
  `}
`;

// ── Component ─────────────────────────────────────────────────────────────
const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  email,
  galleryToken,
  eventSlug,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
    }
  }, [isOpen]);

  // ESC closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  const handleTabTrap = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !contentRef.current) return;
    const focusable = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleTabTrap);
    return () => window.removeEventListener('keydown', handleTabTrap);
  }, [isOpen, handleTabTrap]);

  // Auto-close on Zelle success
  useEffect(() => {
    if (feedback?.type === 'success' && method === 'zelle') {
      const t = setTimeout(() => {
        onClose();
        resetForm();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [feedback, method, onClose]);

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setMethod('stripe');
    setNote('');
    setFeedback(null);
  };

  const getAmount = (): number => {
    if (customAmount) return parseFloat(customAmount) || 0;
    return selectedAmount || 0;
  };

  const handlePresetClick = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount('');
    setFeedback(null);
  };

  const handleCustomChange = (val: string) => {
    // Allow only numbers and one decimal point
    const cleaned = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setCustomAmount(cleaned);
    if (cleaned) setSelectedAmount(null);
    setFeedback(null);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async () => {
    setFeedback(null);
    const amount = getAmount();

    if (amount <= 0) {
      setFeedback({ type: 'error', text: 'Please select or enter a donation amount.' });
      return;
    }

    if (method === 'stripe' && amount < 0.50) {
      setFeedback({ type: 'error', text: 'Minimum amount for card payments is $0.50.' });
      return;
    }

    setLoading(true);
    try {
      if (method === 'zelle') {
        // Zelle: self-reported, admin confirms later
        const res = await fetch(`${API_BASE}/api/gallery/donation/zelle-confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${galleryToken}`,
          },
          body: JSON.stringify({ amount, note: note.trim() || undefined }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setFeedback({ type: 'error', text: data.error || 'Failed to record donation.' });
          return;
        }

        setFeedback({ type: 'success', text: 'Thank you! We\'ll verify your Zelle payment shortly.' });
      } else {
        // Stripe or Venmo — redirect to checkout
        const res = await fetch(`${API_BASE}/api/gallery/donation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${galleryToken}`,
          },
          body: JSON.stringify({ amount, method }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setFeedback({ type: 'error', text: data.error || 'Failed to start checkout.' });
          return;
        }

        // Redirect to Stripe Checkout
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        setFeedback({ type: 'error', text: 'No checkout URL returned. Please try again.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const amount = getAmount();
  const zelleEmail = 'loveswanstudios@protonmail.com';

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent ref={contentRef} role="dialog" aria-modal="true" aria-label="Leave a donation">
        <CloseButton onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </CloseButton>

        <HeartIcon>
          <Heart size={22} fill="#C6A84B" />
        </HeartIcon>

        <ModalTitle>Support Our Work</ModalTitle>
        <ModalSubtitle>
          Your generosity helps us keep capturing these moments. Every contribution, big or small, is deeply appreciated.
        </ModalSubtitle>

        {/* Amount Input */}
        <SectionLabel>Enter amount</SectionLabel>
        <CustomAmountRow>
          <DollarPrefix>$</DollarPrefix>
          <CustomAmountInput
            type="text"
            inputMode="decimal"
            placeholder="Enter any amount"
            value={customAmount}
            onChange={e => handleCustomChange(e.target.value)}
            autoFocus
          />
        </CustomAmountRow>

        {/* Payment Method */}
        <SectionLabel>Payment method</SectionLabel>
        <MethodGrid>
          <MethodButton $active={method === 'stripe'} onClick={() => { setMethod('stripe'); setFeedback(null); }}>
            <MethodIcon><CreditCard size={18} /></MethodIcon>
            Card
          </MethodButton>
          <MethodButton $active={false} disabled style={{ opacity: 0.35, cursor: 'not-allowed', filter: 'grayscale(0.6)' }}>
            <MethodIcon>V</MethodIcon>
            <span style={{ fontSize: '9px', lineHeight: 1 }}>Coming Soon</span>
          </MethodButton>
          <MethodButton $active={false} disabled style={{ opacity: 0.35, cursor: 'not-allowed', filter: 'grayscale(0.6)' }}>
            <MethodIcon><DollarSign size={18} /></MethodIcon>
            <span style={{ fontSize: '9px', lineHeight: 1 }}>Coming Soon</span>
          </MethodButton>
        </MethodGrid>

        {/* Zelle Instructions */}
        {method === 'zelle' && (
          <>
            <ZelleInfoBox>
              Send your Zelle payment to:
              <ZelleDetail>{zelleEmail}</ZelleDetail>
              After sending, click the button below to let us know. We'll confirm receipt on our end.
            </ZelleInfoBox>
            <NoteInput
              placeholder="Optional note (e.g., 'From the Johnson family')"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
            />
          </>
        )}

        {/* Feedback */}
        {feedback && (
          <FeedbackMessage $type={feedback.type}>
            <span style={{ flexShrink: 0, display: 'flex' }}>
              {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            </span>
            {feedback.text}
          </FeedbackMessage>
        )}

        {/* Submit */}
        <SubmitButton
          onClick={handleSubmit}
          $loading={loading}
          disabled={loading || amount <= 0 || feedback?.type === 'success'}
        >
          {loading ? (
            <>
              <Spinner />
              Processing...
            </>
          ) : method === 'zelle' ? (
            <>
              <CheckCircle size={16} />
              I Sent ${amount.toFixed(2)} via Zelle
            </>
          ) : (
            <>
              <Heart size={16} />
              Donate ${amount > 0 ? amount.toFixed(2) : '0.00'}
            </>
          )}
        </SubmitButton>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DonationModal;
