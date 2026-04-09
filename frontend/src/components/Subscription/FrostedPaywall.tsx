/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: FrostedPaywall                                    ║
 * ║  PURPOSE: Glass overlay shown when free-tier user hits AI cap ║
 * ║  OWNER: Claude Opus 4.6 | Gemini 3.1 Pro (design)            ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────┐
 * │ ░░░░░░░░░ FROSTED GLASS BACKDROP ░░░░░░░░░░ │
 * │ ░                                          ░ │
 * │ ░    🔒 (Ice Wing glow lock icon)          ░ │
 * │ ░                                          ░ │
 * │ ░    "Unlock Unlimited AI Coaching"        ░ │
 * │ ░    "Join Swan Guardian to access..."     ░ │
 * │ ░                                          ░ │
 * │ ░    [Start Free Trial]  [Subscribe]       ░ │
 * │ ░                                          ░ │
 * │ ░    "2/3 AI chats used this month"        ░ │
 * │ ░                                          ░ │
 * └──────────────────────────────────────────────┘
 *
 * CLICK-OUTCOMES:
 * [Start Free Trial] → POST /api/subscriptions/start-trial → Overlay disappears
 * [Subscribe] → POST /api/subscriptions/checkout → Redirect to Stripe
 * [X close] → Dismiss overlay (feature stays locked)
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import useSubscription from '../../hooks/useSubscription';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const lockGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 8px rgba(96, 192, 240, 0.4)); }
  50% { filter: drop-shadow(0 0 16px rgba(96, 192, 240, 0.7)); }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components (Gemini CTO design specs)
// ─────────────────────────────────────────────────────────────

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
  background: rgba(10, 10, 15, 0.7);
  animation: ${fadeIn} 0.3s ease-out;

  @supports not (backdrop-filter: blur(12px)) {
    background: rgba(10, 10, 15, 0.92);
  }
`;

const Card = styled.div`
  max-width: 480px;
  width: 90%;
  padding: 2.5rem 2rem;
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 1.5rem;
  text-align: center;
  position: relative;
  animation: ${slideUp} 0.4s ease-out;
  box-shadow: 0 0 40px rgba(96, 192, 240, 0.15),
              0 24px 48px rgba(0, 0, 0, 0.4);
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-size: 1.5rem;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: rgba(224, 236, 244, 0.1);
  }
`;

const LockIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  animation: ${lockGlow} 2s ease-in-out infinite;
  color: var(--accent-primary, #60C0F0);
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.75rem;
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-weight: 400;
  font-size: 0.9375rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  margin: 0 0 1.5rem;
  line-height: 1.6;
`;

const TrialBadge = styled.div<{ $isExpired?: boolean }>`
  display: inline-block;
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  margin-bottom: 1.5rem;
  background: ${({ $isExpired }) =>
    $isExpired
      ? 'rgba(201, 42, 84, 0.15)'
      : 'rgba(96, 192, 240, 0.1)'};
  color: ${({ $isExpired }) =>
    $isExpired
      ? '#C92A54'
      : 'var(--accent-primary, #60C0F0)'};
  border: 1px solid ${({ $isExpired }) =>
    $isExpired
      ? 'rgba(201, 42, 84, 0.3)'
      : 'rgba(96, 192, 240, 0.2)'};
`;

const UsageBar = styled.div`
  margin-bottom: 1.5rem;
`;

const UsageLabel = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin-bottom: 0.5rem;
`;

const UsageTrack = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(224, 236, 244, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const UsageFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => Math.min(100, $pct)}%;
  height: 100%;
  background: ${({ $pct }) =>
    $pct >= 100
      ? '#C92A54'
      : $pct >= 66
        ? 'var(--accent-gold, #C6A84B)'
        : 'var(--accent-primary, #60C0F0)'};
  border-radius: 3px;
  transition: width 0.5s ease;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
`;

// Supporter CTA: Midnight Sapphire bg → Wing Purple glow
const PrimaryBtn = styled.button`
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.9375rem;
  padding: 0.75rem 1.5rem;
  min-height: 48px;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: var(--brand-primary, #002060);
  transition: box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              transform 0.2s;

  &:hover {
    box-shadow: 0 0 20px 4px rgba(139, 92, 246, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Premium CTA: Wing Purple bg → Ice Wing glow
const SecondaryBtn = styled.button`
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.9375rem;
  padding: 0.75rem 1.5rem;
  min-height: 48px;
  border-radius: 0.75rem;
  border: 1px solid rgba(224, 236, 244, 0.15);
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: transparent;
  transition: box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              background 0.2s,
              transform 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    box-shadow: 0 0 16px 2px rgba(96, 192, 240, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const AnnualSection = styled.div`
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(96, 192, 240, 0.15);
`;

const AnnualTitle = styled.p`
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

// Annual CTA: Gilded Fern border to call out the savings
const AnnualBtn = styled.button`
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.625rem 1.25rem;
  min-height: 48px;
  border-radius: 0.75rem;
  border: 1px solid var(--accent-gold, #C6A84B);
  cursor: pointer;
  color: var(--accent-gold, #C6A84B);
  background: rgba(198, 168, 75, 0.08);
  transition: box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              background 0.2s,
              transform 0.2s;

  &:hover {
    background: rgba(198, 168, 75, 0.15);
    box-shadow: 0 0 16px 2px rgba(198, 168, 75, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const DonationNote = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin-top: 1rem;
  margin-bottom: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface FrostedPaywallProps {
  /** What feature triggered the paywall */
  featureName?: string;
  /** Minimum tier required — drives subtitle copy */
  requiredTier?: 'pro' | 'elite';
  /** Close handler — dismiss the overlay */
  onClose: () => void;
  /** Called after successful trial start or subscription */
  onUnlocked?: () => void;
}

const TIER_DISPLAY: Record<string, string> = {
  pro: 'Swan Guardian',
  elite: 'Crystalline Swan',
};

const FrostedPaywall: React.FC<FrostedPaywallProps> = ({
  featureName = 'AI coaching',
  requiredTier = 'pro',
  onClose,
  onUnlocked,
}) => {
  const { subscription, usage, startTrial, checkout, isTrial } = useSubscription();
  const [starting, setStarting] = useState(false);

  const handleStartTrial = async () => {
    setStarting(true);
    try {
      const result = await startTrial();
      if (result.success) {
        onUnlocked?.();
        onClose();
      }
    } finally {
      setStarting(false);
    }
  };

  const handleSubscribe = (tier: 'pro' | 'elite', amount?: number, billingInterval: 'month' | 'year' = 'month') => {
    checkout(tier, amount, billingInterval);
  };

  const trialExpired = subscription && !subscription.isInTrial && subscription.trialDaysRemaining === 0;
  const trialDays = subscription?.trialDaysRemaining || 0;

  const messagesUsed = usage?.aiMessagesUsed || 0;
  const messagesLimit = usage?.aiMessagesLimit || 3;
  const messagePct = messagesLimit > 0 ? (messagesUsed / messagesLimit) * 100 : 100;

  return (
    <Backdrop onClick={onClose} role="dialog" aria-modal="true" aria-label="Subscription required">
      <Card onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose} aria-label="Close">&times;</CloseBtn>

        <LockIcon aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </LockIcon>

        <Title>Unlock {featureName}</Title>
        <Subtitle>
          This feature requires <strong>{TIER_DISPLAY[requiredTier] || 'Swan Guardian'}</strong> or higher.
          {requiredTier === 'elite'
            ? ' Crystalline Swan ($24.99/mo) adds direct trainer access, full analytics, and all premium tools.'
            : ' Support the mission — your donation keeps SwanStudios free for everyone and unlocks NASM calculators, advanced analytics, and more.'}
        </Subtitle>

        {/* Trial status badge */}
        {isTrial && trialDays > 0 && (
          <TrialBadge>
            {trialDays} day{trialDays !== 1 ? 's' : ''} left in free trial — all features unlocked
          </TrialBadge>
        )}
        {trialExpired && (
          <TrialBadge $isExpired>
            Free trial ended — upgrade to keep premium features
          </TrialBadge>
        )}

        <ButtonRow>
          {/* Show trial button only if never trialed */}
          {!subscription && (
            <PrimaryBtn onClick={handleStartTrial} disabled={starting}>
              {starting ? 'Starting...' : 'Start Free Trial (30 days)'}
            </PrimaryBtn>
          )}

          <PrimaryBtn onClick={() => handleSubscribe('pro', 5)}>
            Swan Guardian — Pay What You Can
          </PrimaryBtn>

          <SecondaryBtn onClick={() => handleSubscribe('elite')}>
            Crystalline Swan — $24.99/mo
          </SecondaryBtn>
        </ButtonRow>

        <AnnualSection>
          <AnnualTitle>Save with Annual Plans — 2 months free</AnnualTitle>
          <ButtonRow>
            <AnnualBtn onClick={() => handleSubscribe('elite', undefined, 'year')}>
              Crystalline Swan Annual — $249.99/yr
            </AnnualBtn>
          </ButtonRow>
        </AnnualSection>

        <DonationNote>
          Swan Coach is always free for everyone. Swan Guardian (one-time donation, pay what you can)
          unlocks advanced analytics and NASM tools. Crystalline Swan ($24.99/mo) adds direct trainer access.
        </DonationNote>
      </Card>
    </Backdrop>
  );
};

export default FrostedPaywall;
