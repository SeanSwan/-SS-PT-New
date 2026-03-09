/**
 * VIPConversionModal.tsx
 * =====================
 * Multi-step glassmorphic modal that converts gallery visitors into PT clients.
 * Flow: Account Creation -> VIP Checkout ($175) -> Success
 * Design: Gemini 3.1 Pro directive — cosmic glassmorphism with spring animations.
 */
import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

// ── Types ─────────────────────────────────────────────────────────────────
export interface VIPConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  eventSlug: string;
  galleryToken: string;
  onVipActivated: () => void;
}

type Step = 'account' | 'checkout' | 'success';

// ── Animations ────────────────────────────────────────────────────────────
const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.2), 0 0 60px rgba(139, 92, 246, 0.1); }
  50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.35), 0 0 80px rgba(139, 92, 246, 0.2); }
  100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.2), 0 0 60px rgba(139, 92, 246, 0.1); }
`;

const checkmarkDraw = keyframes`
  0% { stroke-dashoffset: 50; }
  100% { stroke-dashoffset: 0; }
`;

const ringExpand = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
`;

const glowPulse = keyframes`
  0% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.4), 0 0 24px rgba(139, 92, 246, 0.2); }
  50% { box-shadow: 0 0 16px rgba(139, 92, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.35); }
  100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.4), 0 0 24px rgba(139, 92, 246, 0.2); }
`;

// ── Spring transition config ──────────────────────────────────────────────
const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };

// ── Styled Components ─────────────────────────────────────────────────────
const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 16px;
`;

const ModalContainer = styled(motion.div)`
  position: relative;
  background: rgba(0, 32, 96, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(139, 92, 246, 0.15);
  box-shadow: 0 24px 48px -12px rgba(139, 92, 246, 0.4);
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', system-ui, sans-serif;

  @media (min-width: 768px) {
    padding: 40px;
  }

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
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
  min-height: 48px;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const StepIndicator = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
`;

const StepDot = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p =>
    p.$completed ? '#60C0F0' :
    p.$active ? 'rgba(139, 92, 246, 0.6)' :
    'rgba(255, 255, 255, 0.15)'};
  transition: background 0.3s;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px;
  text-align: center;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  text-align: center;
  margin: 0 0 24px;
  line-height: 1.5;
`;

const InputGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
`;

const Input = styled.input<{ $readOnly?: boolean }>`
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  background: ${p => p.$readOnly ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${p => p.$readOnly ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  color: ${p => p.$readOnly ? 'rgba(255, 255, 255, 0.4)' : '#fff'};
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(139, 92, 246, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }
`;

const NameRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const ToggleLink = styled.button`
  background: none;
  border: none;
  color: #60C0F0;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  margin-top: 12px;
  display: block;
  text-align: center;
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    text-decoration: underline;
  }
`;

const PrimaryButton = styled.button<{ $loading?: boolean }>`
  width: 100%;
  min-height: 48px;
  padding: 0 24px;
  background: linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%);
  border: none;
  border-radius: 12px;
  color: #002060;
  font-size: 16px;
  font-weight: 700;
  cursor: ${p => p.$loading ? 'wait' : 'pointer'};
  opacity: ${p => p.$loading ? 0.7 : 1};
  transition: opacity 0.2s, transform 0.15s;
  margin-top: 8px;

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

const ErrorText = styled.p`
  color: #ff6b6b;
  font-size: 13px;
  margin: 8px 0 0;
  text-align: center;
`;

// ── Step 2: Checkout styled components ────────────────────────────────────
const VipPriceTag = styled.div`
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  margin: 8px 0 4px;
`;

const VipLabel = styled.div`
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  margin-bottom: 20px;
`;

const TrustCard = styled.div`
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
`;

const TrustCardTitle = styled.h4`
  font-size: 14px;
  font-weight: 700;
  color: #60C0F0;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TrustBullet = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
`;

const BulletIcon = styled.span`
  color: #60C0F0;
  font-size: 14px;
  flex-shrink: 0;
`;

const IncludesList = styled.div`
  margin-bottom: 20px;
`;

const IncludesItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  &:last-child {
    border-bottom: none;
  }
`;

const IncludesIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
`;

// ── Journey Timeline styled components ────────────────────────────────
const TimelineContainer = styled.div`
  position: relative;
  padding: 4px 0 4px 28px;
  margin-bottom: 20px;

  /* Vertical gradient line */
  &::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 20px;
    bottom: 20px;
    width: 2px;
    background: linear-gradient(180deg, #8B5CF6 0%, #8B5CF6 100%);
    border-radius: 1px;
  }
`;

const TimelineStep = styled.div`
  position: relative;
  padding: 12px 0 12px 24px;
`;

const TimelineNode = styled.div`
  position: absolute;
  left: -28px;
  top: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #8B5CF6;
  background: rgba(0, 32, 96, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #8B5CF6;
  z-index: 1;
`;

const TimelineStepTitle = styled.h4`
  font-size: 15px;
  font-weight: 700;
  color: #8B5CF6;
  margin: 0 0 4px;
`;

const TimelineStepDesc = styled.p`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.5;
`;

const ValueBadge = styled.div`
  text-align: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 12px;
  margin-bottom: 20px;
`;

const ValueText = styled.span`
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

// ── Step 3: Success styled components ─────────────────────────────────────
const SuccessContainer = styled.div`
  text-align: center;
  padding: 16px 0;
`;

const SuccessIconWrapper = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
`;

const SuccessCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  border: 2px solid rgba(139, 92, 246, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${cosmicPulse} 2s ease-in-out infinite;
`;

const SuccessRing = styled.div`
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid rgba(139, 92, 246, 0.2);
  animation: ${ringExpand} 2s ease-out infinite;
`;

const SuccessCheckmark = styled.svg`
  width: 36px;
  height: 36px;

  polyline {
    fill: none;
    stroke: #60C0F0;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 50;
    animation: ${checkmarkDraw} 0.6s ease-out 0.3s forwards;
    stroke-dashoffset: 50;
  }
`;

const SuccessTitle = styled.h2`
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 12px;
`;

const SuccessDescription = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin: 0 0 28px;
  max-width: 380px;
  margin-left: auto;
  margin-right: auto;
`;

const SecondaryButton = styled.button`
  width: 100%;
  min-height: 48px;
  padding: 0 24px;
  background: transparent;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: #60C0F0;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 12px;
  animation: ${glowPulse} 2s ease-in-out infinite;

  &:hover {
    background: rgba(139, 92, 246, 0.05);
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

// ── Component ─────────────────────────────────────────────────────────────
const VIPConversionModal: React.FC<VIPConversionModalProps> = ({
  isOpen,
  onClose,
  email: prefillEmail,
  eventSlug,
  galleryToken,
  onVipActivated,
}) => {
  // Determine initial step from URL
  const getInitialStep = (): Step => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vip') === 'success') return 'success';
    return 'account';
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [isLoginMode, setIsLoginMode] = useState(false);

  // Form state - Step 1
  const [emailValue] = useState(prefillEmail);
  const [passwordValue, setPasswordValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [firstNameValue, setFirstNameValue] = useState('');
  const [lastNameValue, setLastNameValue] = useState('');

  // Auth state
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for ?vip=success on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vip') === 'success') {
      setStep('success');
    }
  }, []);

  // ── Step 1: Account Creation / Login ──────────────────────────────────
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passwordValue.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!isLoginMode && (!firstNameValue.trim() || !lastNameValue.trim())) {
      setError('First and last name are required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLoginMode
        ? `${API_BASE}/api/gallery/vip-login`
        : `${API_BASE}/api/gallery/vip-signup`;

      const body = isLoginMode
        ? { email: emailValue, password: passwordValue }
        : {
            email: emailValue,
            password: passwordValue,
            phone: phoneValue,
            firstName: firstNameValue,
            lastName: lastNameValue,
            eventSlug,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || data.error || 'Something went wrong. Please try again.');
        return;
      }

      setUserToken(data.token);
      setUserId(data.userId);
      setStep('checkout');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: VIP Checkout ──────────────────────────────────────────────
  const handleCheckout = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/vip-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ eventSlug }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || data.error || 'Checkout failed. Please try again.');
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Success handlers ──────────────────────────────────────────
  const handleViewGallery = () => {
    // Clean up URL param
    const url = new URL(window.location.href);
    url.searchParams.delete('vip');
    window.history.replaceState({}, '', url.toString());

    onVipActivated();
    onClose();
  };

  const handleBookSession = () => {
    window.open('/user-dashboard/schedule', '_blank');
  };

  // ── Step rendering ────────────────────────────────────────────────────
  const stepIndex = step === 'account' ? 0 : step === 'checkout' ? 1 : 2;

  const renderAccountStep = () => (
    <motion.div
      key="account"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={springTransition}
    >
      <Title>{isLoginMode ? 'Welcome Back' : 'Create Your Account'}</Title>
      <Subtitle>
        {isLoginMode
          ? 'Sign in to continue to VIP checkout.'
          : 'Quick signup to unlock your VIP PT session and unlimited enhancements.'}
      </Subtitle>

      <form onSubmit={handleAccountSubmit}>
        <InputGroup>
          <Label>Email</Label>
          <Input
            type="email"
            value={emailValue}
            readOnly
            $readOnly
            tabIndex={-1}
          />
        </InputGroup>

        {!isLoginMode && (
          <NameRow>
            <InputGroup>
              <Label>First Name *</Label>
              <Input
                type="text"
                placeholder="First"
                value={firstNameValue}
                onChange={e => setFirstNameValue(e.target.value)}
                autoFocus
              />
            </InputGroup>
            <InputGroup>
              <Label>Last Name *</Label>
              <Input
                type="text"
                placeholder="Last"
                value={lastNameValue}
                onChange={e => setLastNameValue(e.target.value)}
              />
            </InputGroup>
          </NameRow>
        )}

        <InputGroup>
          <Label>Password * (min 8 characters)</Label>
          <Input
            type="password"
            placeholder="Create a password"
            value={passwordValue}
            onChange={e => setPasswordValue(e.target.value)}
            autoFocus={isLoginMode}
          />
        </InputGroup>

        {!isLoginMode && (
          <InputGroup>
            <Label>Phone (for session reminders)</Label>
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={phoneValue}
              onChange={e => setPhoneValue(e.target.value)}
            />
          </InputGroup>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <PrimaryButton type="submit" $loading={loading} disabled={loading}>
          {loading
            ? 'Please wait...'
            : isLoginMode
              ? 'Sign In & Continue'
              : 'Create Account & Continue'}
        </PrimaryButton>
      </form>

      <ToggleLink onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}>
        {isLoginMode ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </ToggleLink>
    </motion.div>
  );

  const renderCheckoutStep = () => (
    <motion.div
      key="checkout"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={springTransition}
    >
      <Title>VIP Gallery Package</Title>

      <VipPriceTag>$175</VipPriceTag>
      <VipLabel>VIP Gallery Package</VipLabel>

      <TrustCard>
        <TrustCardTitle>Your Trainer</TrustCardTitle>
        <TrustBullet>
          <BulletIcon>&#10003;</BulletIcon>
          NASM Certified
        </TrustBullet>
        <TrustBullet>
          <BulletIcon>&#10003;</BulletIcon>
          25+ Yrs Experience
        </TrustBullet>
        <TrustBullet>
          <BulletIcon>&#10003;</BulletIcon>
          Mobility & Strength Focus
        </TrustBullet>
        <TrustBullet>
          <BulletIcon>&#10003;</BulletIcon>
          Personalized Goal Planning
        </TrustBullet>
      </TrustCard>

      <TimelineContainer>
        <TimelineStep>
          <TimelineNode>1</TimelineNode>
          <TimelineStepTitle>Complimentary NASM Assessment</TimelineStepTitle>
          <TimelineStepDesc>
            1-hour orientation: movement assessment, goal discussion, health history,
            mobility &amp; flexibility evaluation, baseline measurements
          </TimelineStepDesc>
        </TimelineStep>
        <TimelineStep>
          <TimelineNode>2</TimelineNode>
          <TimelineStepTitle>Your PT Training Session</TimelineStepTitle>
          <TimelineStepDesc>
            Based on your assessment, Sean implements your first real workout
            and begins creating your personalized 90-Day Blueprint
          </TimelineStepDesc>
        </TimelineStep>
        <TimelineStep>
          <TimelineNode>3</TimelineNode>
          <TimelineStepTitle>Unlimited Photo Enhancements</TimelineStepTitle>
          <TimelineStepDesc>
            Every photo from this gallery event, enhanced by Sean at no extra cost
          </TimelineStepDesc>
        </TimelineStep>
      </TimelineContainer>

      <ValueBadge>
        <ValueText>$350+ value for $175</ValueText>
      </ValueBadge>

      {error && <ErrorText>{error}</ErrorText>}

      <PrimaryButton onClick={handleCheckout} $loading={loading} disabled={loading}>
        {loading ? 'Redirecting to checkout...' : 'Proceed to Checkout'}
      </PrimaryButton>
    </motion.div>
  );

  const renderSuccessStep = () => (
    <motion.div
      key="success"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={springTransition}
    >
      <SuccessContainer>
        <SuccessIconWrapper>
          <SuccessRing />
          <SuccessCircle>
            <SuccessCheckmark viewBox="0 0 36 36">
              <polyline points="8 18 16 26 28 10" />
            </SuccessCheckmark>
          </SuccessCircle>
        </SuccessIconWrapper>

        <SuccessTitle>VIP Access Unlocked!</SuccessTitle>
        <SuccessDescription>
          Your VIP package includes a complimentary NASM Assessment orientation AND a full
          PT training session with Sean — plus your personalized 90-Day Blueprint.
          That's 2 hours of expert training + unlimited photo enhancements.
        </SuccessDescription>

        <PrimaryButton onClick={handleViewGallery}>
          View Your Enhanced Gallery
        </PrimaryButton>
        <SecondaryButton onClick={handleBookSession}>
          Book Your PT Session
        </SecondaryButton>
      </SuccessContainer>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <Backdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <ModalContainer
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={springTransition}
            onClick={e => e.stopPropagation()}
          >
            <CloseButton onClick={onClose} aria-label="Close modal">
              &#x2715;
            </CloseButton>

            <StepIndicator>
              <StepDot $active={stepIndex === 0} $completed={stepIndex > 0} />
              <StepDot $active={stepIndex === 1} $completed={stepIndex > 1} />
              <StepDot $active={stepIndex === 2} $completed={false} />
            </StepIndicator>

            <AnimatePresence mode="wait">
              {step === 'account' && renderAccountStep()}
              {step === 'checkout' && renderCheckoutStep()}
              {step === 'success' && renderSuccessStep()}
            </AnimatePresence>
          </ModalContainer>
        </Backdrop>
      )}
    </AnimatePresence>
  );
};

export default VIPConversionModal;
