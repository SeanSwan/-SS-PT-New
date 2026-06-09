/**
 * FILE: SuccessPage.stateViews.tsx
 * PURPOSE: Loading and error states for the paid checkout success route.
 * LAST VALIDATED: 2026-06-09 via SuccessPage auth refresh and theme contract tests.
 */
import React from 'react';
import { AlertTriangle, Home, Loader } from 'lucide-react';
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

export const SuccessPageErrorState: React.FC<{
  error: string;
  onGoHome: () => void;
}> = ({ error, onGoHome }) => (
  <SuccessContainer
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <ErrorCard
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <StateIcon $tone="error">
        <AlertTriangle size={48} aria-hidden="true" />
      </StateIcon>
      <StateTitle $tone="error">Verification Error</StateTitle>
      <StateText>{error}</StateText>
      <StateAction>
        <GlowButton variant="primary" size="medium" onClick={onGoHome}>
          <Home size={16} aria-hidden="true" />
          Return Home
        </GlowButton>
      </StateAction>
    </ErrorCard>
  </SuccessContainer>
);
