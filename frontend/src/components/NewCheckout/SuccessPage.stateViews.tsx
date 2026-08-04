/**
 * FILE: SuccessPage.stateViews.tsx
 * PURPOSE: Loading and error states for the paid checkout success route.
 * LAST VALIDATED: 2026-06-09 via SuccessPage auth refresh and theme contract tests.
 */
import React from 'react';
import { AlertTriangle, Home, LifeBuoy, Loader, RefreshCw } from 'lucide-react';
import GlowButton from '../ui/buttons/GlowButton';
import {
  ErrorCard,
  LoadingCard,
  StateAction,
  StateIcon,
  StateText,
  StateTitle,
  SuccessContainer,
} from './SuccessPage.styles';

export const SuccessPageLoadingState: React.FC = () => (
  <SuccessContainer
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <LoadingCard
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <StateIcon $tone="loading">
        <Loader size={48} className="animate-spin" aria-hidden="true" />
      </StateIcon>
      <StateTitle $tone="loading">Verifying Your Payment</StateTitle>
      <StateText>Please wait while we confirm your order...</StateText>
    </LoadingCard>
  </SuccessContainer>
);

/**
 * Shown to someone who has ALREADY been through Stripe. Every affordance here
 * exists because the previous version offered only "Return Home": a buyer whose
 * card may have been charged had no way to retry, no way to reach a human, and
 * no reference to quote — the worst dead end on the money path.
 */
export const SuccessPageErrorState: React.FC<{
  error: string;
  onGoHome: () => void;
  onRetry?: () => void;
  sessionId?: string | null;
}> = ({ error, onGoHome, onRetry, sessionId }) => (
  <SuccessContainer
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <ErrorCard
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      role="alert"
      aria-live="assertive"
    >
      <StateIcon $tone="error">
        <AlertTriangle size={48} aria-hidden="true" />
      </StateIcon>
      <StateTitle $tone="error">We couldn&apos;t confirm your order</StateTitle>
      <StateText>{error}</StateText>
      {sessionId && (
        <StateText>
          Order reference: <strong>{sessionId}</strong>
        </StateText>
      )}
      <StateAction>
        {onRetry && (
          <GlowButton variant="primary" size="medium" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </GlowButton>
        )}
        <GlowButton
          variant="primary"
          size="medium"
          onClick={() => { window.location.href = '/contact'; }}
        >
          <LifeBuoy size={16} aria-hidden="true" />
          Contact support
        </GlowButton>
        <GlowButton variant="ghost" size="medium" onClick={onGoHome}>
          <Home size={16} aria-hidden="true" />
          Return Home
        </GlowButton>
      </StateAction>
    </ErrorCard>
  </SuccessContainer>
);

export const SuccessPageInventoryReviewState: React.FC<{
  message: string;
  onGoHome: () => void;
}> = ({ message, onGoHome }) => (
  <SuccessContainer
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <LoadingCard
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <StateIcon $tone="loading">
        <AlertTriangle size={48} aria-hidden="true" />
      </StateIcon>
      <StateTitle $tone="loading">Payment Confirmed</StateTitle>
      <StateText>{message}</StateText>
      <StateText>Our team is reviewing your order and will follow up with the next step.</StateText>
      <StateAction>
        <GlowButton variant="primary" size="medium" onClick={onGoHome}>
          <Home size={16} aria-hidden="true" />
          Return Home
        </GlowButton>
      </StateAction>
    </LoadingCard>
  </SuccessContainer>
);
