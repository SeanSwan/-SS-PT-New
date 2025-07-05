/**
 * GalaxyPaymentElement.tsx - SwanStudios Premium Payment Component
 * ================================================================
 * Revolutionary Galaxy-themed embedded payment experience
 * Built with Stripe Elements for seamless checkout
 * 
 * Features:
 * - Embedded Stripe Elements (no redirects)
 * - Galaxy-themed styling with cosmic animations
 * - Real-time payment validation
 * - Progressive enhancement
 * - Mobile-optimized responsive design
 * - Accessibility compliance (WCAG AA)
 * 
 * Master Prompt v28 Alignment:
 * - Sensational aesthetics with Galaxy theme
 * - Revolutionary user experience
 * - Production-ready error handling
 * - Performance optimized
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { CreditCard, Shield, Zap, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Import enhanced error handling
import PaymentErrorHandler from './PaymentErrorHandler';
import paymentDiagnostics from '../../utils/paymentDiagnostics';
import StripeAccountValidator from '../../utils/stripeAccountValidator';

// Import diagnostic utilities for development
if (process.env.NODE_ENV === 'development') {
  import('../../utils/stripeDiagnostic').then(diagnostics => {
    console.log('🔧 Payment diagnostics loaded! Available via SwanStripeDiagnostics global');
  }).catch(err => {
    console.warn('Failed to load payment diagnostics:', err);
  });
  
  // Load payment diagnostics
  console.log('🔧 Payment system diagnostics available via SwanPaymentDiagnostics.runAndReport()');
}

// Performance-optimized Stripe loading with enhanced validation
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// ULTRA-ENHANCED Stripe key validation with account matching
const validateStripeKey = (key: string | undefined): { valid: boolean; accountId: string | null; details: string } => {
  if (!key) {
    const error = 'No publishable key found in environment variables';
    console.error('🚨 STRIPE ERROR:', error);
    return { valid: false, accountId: null, details: error };
  }
  
  if (key === 'pk_test_placeholder_key_for_development' || key === 'pk_test_placeholder_production_key') {
    const error = 'Using placeholder key - Stripe not configured';
    console.error('🚨 STRIPE ERROR:', error);
    return { valid: false, accountId: null, details: error };
  }
  
  if (!key.startsWith('pk_')) {
    const error = `Invalid publishable key format: ${key.substring(0, 10)}...`;
    console.error('🚨 STRIPE ERROR:', error);
    return { valid: false, accountId: null, details: error };
  }
  
  if (key.length < 50) {
    const error = `Publishable key too short: ${key.length} characters`;
    console.error('🚨 STRIPE ERROR:', error);
    return { valid: false, accountId: null, details: error };
  }
  
  // Extract account ID for validation
  const accountMatch = key.match(/pk_(?:live|test)_([A-Za-z0-9]{16,})/);
  const accountId = accountMatch ? accountMatch[1].substring(0, 16) : null;
  
  if (!accountId) {
    const error = 'Could not extract account ID from key';
    console.error('🚨 STRIPE ERROR:', error);
    return { valid: false, accountId: null, details: error };
  }
  
  const isLive = key.startsWith('pk_live_');
  const isTest = key.startsWith('pk_test_');
  
  console.log(`✅ STRIPE KEY VALIDATED: ${isLive ? 'LIVE' : isTest ? 'TEST' : 'UNKNOWN'} environment`);
  console.log(`🔑 STRIPE ACCOUNT ID: ${accountId}`);
  console.log(`🔐 STRIPE KEY PREFIX: ${key.substring(0, 25)}...`);
  
  if (isLive && window.location.hostname !== 'sswanstudios.com' && !window.location.hostname.includes('localhost')) {
    console.warn('⚠️ STRIPE WARNING: Using live keys on non-production domain:', window.location.hostname);
    console.log('ℹ️ This is normal for development testing with live keys');
  }
  
  return { valid: true, accountId, details: `Valid ${isLive ? 'LIVE' : 'TEST'} key for account ${accountId}` };
};

const keyValidation = validateStripeKey(stripePublishableKey);
const stripePromise = keyValidation.valid 
  ? loadStripe(stripePublishableKey!)
  : null;

// Log validation results for debugging
if (keyValidation.valid) {
  console.log('🎯 STRIPE INITIALIZATION SUCCESS:', keyValidation.details);
} else {
  console.error('💥 STRIPE INITIALIZATION FAILED:', keyValidation.details);
  console.error('🔧 ACTION REQUIRED: Check your VITE_STRIPE_PUBLISHABLE_KEY in .env files');
}

// Galaxy-themed animations
const galaxyShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
`;

const stellarFloat = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

// Styled Components
const PaymentContainer = styled(motion.div)<{ $embedded?: boolean }>`
  background: ${props => props.$embedded 
    ? 'transparent' 
    : 'linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #0a0a1a 100%)'
  };
  border-radius: ${props => props.$embedded ? '0' : '20px'};
  padding: ${props => props.$embedded ? '1rem' : '2rem'};
  border: ${props => props.$embedded ? 'none' : '1px solid rgba(0, 255, 255, 0.3)'};
  position: relative;
  overflow: hidden;
  max-width: ${props => props.$embedded ? 'none' : '600px'};
  margin: 0 auto;
  width: 100%;
  
  /* Enhanced mobile responsiveness */
  min-height: ${props => props.$embedded ? '100%' : 'auto'};
  
  ${props => !props.$embedded && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(0, 255, 255, 0.1) 50%,
        transparent 70%
      );
      background-size: 200% 200%;
      animation: ${galaxyShimmer} 3s ease-in-out infinite;
      pointer-events: none;
    }
  `}
  
  /* Mobile-first responsive design - Enhanced */
  @media (max-width: 768px) {
    padding: ${props => props.$embedded ? '1rem' : '1.5rem'};
    border-radius: ${props => props.$embedded ? '0' : '15px'};
    min-height: ${props => props.$embedded ? '100vh' : 'auto'};
    
    /* Full viewport on mobile when embedded */
    ${props => props.$embedded && `
      margin: 0;
      width: 100vw;
      height: 100vh;
      position: relative;
    `}
  }
  
  @media (max-width: 480px) {
    padding: ${props => props.$embedded ? '1rem' : '1rem'};
    min-height: ${props => props.$embedded ? '100vh' : 'auto'};
    
    /* Ensure full mobile coverage */
    ${props => props.$embedded && `
      padding: 1rem;
      padding-top: 2rem; /* Account for close button */
    `}
  }
`;

const MessageContainer = styled(motion.div)`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  
  &.success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  }
  
  &.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }
  
  &.info {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
  }
`;

const PaymentHeader = styled.div<{ $embedded?: boolean }>`
  text-align: center;
  margin-bottom: ${props => props.$embedded ? '1.5rem' : '2rem'};
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 0.75rem;
  }
`;

const PaymentTitle = styled.h2<{ $embedded?: boolean }>`
  font-size: ${props => props.$embedded ? '1.5rem' : '1.75rem'};
  font-weight: 600;
  background: linear-gradient(135deg, #00ffff, #0099ff, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  animation: ${stellarFloat} 4s ease-in-out infinite;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const PaymentSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const OrderSummary = styled(motion.div)<{ $embedded?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: ${props => props.$embedded ? '1.25rem' : '1.5rem'};
  margin-bottom: ${props => props.$embedded ? '1.5rem' : '2rem'};
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }
`;

const SummaryTitle = styled.h3`
  color: #00ffff;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SummaryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  color: rgba(255, 255, 255, 0.9);
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const SummaryTotal = styled(SummaryItem)`
  font-weight: 600;
  font-size: 1.1rem;
  color: #00ffff;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 2px solid rgba(0, 255, 255, 0.3);
`;

const PaymentFormContainer = styled.div<{ $embedded?: boolean }>`
  position: relative;
  z-index: 1;
  margin-bottom: ${props => props.$embedded ? '1.5rem' : '2rem'};
  
  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 0.75rem;
  }
`;

const StripeElementContainer = styled.div<{ $embedded?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  padding: ${props => props.$embedded ? '1.25rem' : '1.5rem'};
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  
  &:focus-within {
    border-color: rgba(0, 255, 255, 0.6);
    animation: ${cosmicPulse} 2s infinite;
  }
  
  .StripeElement {
    background: transparent;
    color: white;
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }
`;

const SecurityBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const SecurityBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  
  svg {
    color: #00ffff;
  }
`;

const PaymentButton = styled(motion.button)<{ $embedded?: boolean }>`
  width: 100%;
  background: linear-gradient(135deg, #00ffff, #0099ff);
  border: none;
  border-radius: 12px;
  padding: ${props => props.$embedded ? '1.25rem 2rem' : '1rem 2rem'};
  font-size: 1.1rem;
  font-weight: 600;
  color: #0a0a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 56px;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #00cccc, #0088cc);
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0, 255, 255, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  /* Mobile optimization */
  @media (max-width: 768px) {
    padding: 1.25rem;
    font-size: 1rem;
    min-height: 56px;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    font-size: 0.95rem;
    min-height: 52px;
  }
`;

const LoadingSpinner = styled(motion.div)`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(10, 10, 26, 0.3);
  border-top: 2px solid #0a0a1a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EnhancedLoadingContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  margin-bottom: 1rem;
`;

const LoadingText = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  
  .primary {
    color: #00ffff;
    font-weight: 600;
    display: block;
    margin-bottom: 0.25rem;
  }
  
  .secondary {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
  }
`;

const PaymentMethodSelector = styled.div`
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
`;

const PaymentMethodButton = styled(motion.button)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 1px solid ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.3)'};
  background: ${props => props.$active ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.8)'};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  font-weight: 500;
  text-align: left;
  width: 100%;
  min-height: 60px;
  
  &:hover {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    color: #00ffff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.2);
  }
  
  svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }
  
  .method-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }
  
  .method-title {
    font-weight: 600;
  }
  
  .method-subtitle {
    font-size: 0.8rem;
    opacity: 0.8;
  }
  
  /* Enhanced Mobile Responsiveness */
  @media (max-width: 768px) {
    padding: 1rem;
    font-size: 0.9rem;
    min-height: 56px;
    
    .method-title {
      font-size: 0.95rem;
    }
    
    .method-subtitle {
      font-size: 0.75rem;
    }
  }
  
  @media (max-width: 480px) {
    padding: 0.85rem;
    gap: 0.5rem;
    min-height: 52px;
    font-size: 0.85rem;
    
    svg {
      width: 20px;
      height: 20px;
    }
    
    .method-title {
      font-size: 0.9rem;
    }
    
    .method-subtitle {
      font-size: 0.7rem;
    }
  }
`;

const SubscriptionToggle = styled.div`
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    padding: 0.875rem;
    margin-bottom: 1.25rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`;

const ToggleSwitch = styled.div<{ $active: boolean }>`
  width: 48px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.2)'};
  position: relative;
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '26px' : '2px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.$active ? '#0a0a1a' : '#ffffff'};
    transition: all 0.3s ease;
  }
`;

const SubscriptionInfo = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
`;

const FeeCalculator = styled.div`
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 153, 255, 0.05));
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  
  .fee-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .fee-item {
    text-align: center;
    padding: 0.5rem;
    border-radius: 6px;
    
    &.eft {
      background: rgba(0, 255, 255, 0.15);
      color: #00ffff;
    }
    
    &.card {
      background: rgba(255, 165, 0, 0.15);
      color: #ffa500;
    }
  }
  
  .savings-highlight {
    text-align: center;
    padding: 0.5rem;
    background: rgba(16, 185, 129, 0.1);
    border-radius: 6px;
    color: #10b981;
    font-weight: 600;
  }
`;

const EFTTimeline = styled.div`
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  
  .timeline-title {
    color: #00ffff;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-align: center;
  }
  
  .timeline-steps {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #00ffff, rgba(0, 255, 255, 0.3));
      z-index: 1;
    }
  }
  
  .timeline-step {
    background: rgba(0, 255, 255, 0.1);
    border: 2px solid #00ffff;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 600;
    color: #00ffff;
    position: relative;
    z-index: 2;
  }
  
  .timeline-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    
    .timeline-label {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.7);
      text-align: center;
      max-width: 60px;
    }
  }
`;

// Performance-optimized base Stripe Elements styling options
const baseStripeElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
      '::placeholder': {
        color: 'rgba(255, 255, 255, 0.5)',
      },
      backgroundColor: 'transparent',
      iconColor: '#00ffff',
      lineHeight: '24px'
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
    complete: {
      color: '#10b981',
      iconColor: '#10b981',
    }
  },
  variables: {
    colorPrimary: '#00ffff',
    colorBackground: 'rgba(255, 255, 255, 0.05)',
    colorText: '#ffffff',
    colorDanger: '#ef4444',
    colorSuccess: '#10b981',
    fontFamily: 'Inter, SF Pro Display, Roboto, sans-serif',
    spacingUnit: '8px',
    borderRadius: '12px',
    focusBoxShadow: '0 0 0 2px rgba(0, 255, 255, 0.3)',
    tabSpacing: '12px'
  },
};

// Manual Payment UI Components
const ManualPaymentContainer = styled(motion.div)`
  background: rgba(255, 165, 0, 0.05);
  border: 2px solid rgba(255, 165, 0, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const ManualPaymentTitle = styled.h3`
  color: #ffa500;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const ManualPaymentInfo = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  text-align: left;
  
  .payment-reference {
    background: rgba(255, 165, 0, 0.1);
    border: 1px solid rgba(255, 165, 0, 0.3);
    border-radius: 6px;
    padding: 0.75rem;
    margin: 0.5rem 0;
    font-family: 'Courier New', monospace;
    font-weight: 600;
    color: #ffa500;
    text-align: center;
    word-break: break-all;
  }
  
  .next-steps {
    margin-top: 1rem;
    
    .step {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0.5rem 0;
      font-size: 0.9rem;
      
      .step-number {
        background: #ffa500;
        color: #0a0a1a;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 600;
        flex-shrink: 0;
        margin-top: 0.1rem;
      }
    }
  }
`;

const ManualPaymentButton = styled(motion.button)`
  width: 100%;
  background: linear-gradient(135deg, #ffa500, #ff8c00);
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0a0a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #ff8c00, #ff7700);
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(255, 165, 0, 0.4);
  }
`;

// Payment method types
type PaymentMethodType = 'card' | 'bank' | 'bnpl';

// Interface definitions
interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  embedded?: boolean;
}

interface GalaxyPaymentElementProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  embedded?: boolean; // New prop for embedded mode
}

// Payment Method Persistence Utilities
const PAYMENT_PREFERENCES_KEY = 'swanstudios_payment_preferences';

interface PaymentPreferences {
  preferredMethod: PaymentMethodType;
  autoPayEnabled: boolean;
  lastUsed: string;
}

const savePaymentPreferences = (preferences: PaymentPreferences) => {
  try {
    localStorage.setItem(PAYMENT_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save payment preferences:', error);
  }
};

const loadPaymentPreferences = (): PaymentPreferences | null => {
  try {
    const stored = localStorage.getItem(PAYMENT_PREFERENCES_KEY);
    if (stored) {
      const preferences = JSON.parse(stored);
      // Only use preferences if they're recent (within 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (new Date(preferences.lastUsed) > thirtyDaysAgo) {
        return preferences;
      }
    }
  } catch (error) {
    console.warn('Failed to load payment preferences:', error);
  }
  return null;
};

// Deferred Payment Collection Component (Better UX than pure manual payment)
const DeferredPaymentFlow: React.FC<{
  clientSecret: string;
  cart: any;
  onSuccess: () => void;
  onClose: () => void;
  embedded?: boolean;
}> = ({ clientSecret, cart, onSuccess, onClose, embedded = false }) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [contactInfo, setContactInfo] = useState({
    email: user?.email || '',
    phone: '',
    preferredContact: 'email'
  });
  
  // Extract payment reference from client secret
  const paymentReference = clientSecret.replace('manual_', '');
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsProcessing(true);
    setMessage('Processing your order for manual payment...');
    setMessageType('info');
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would:
      // 1. Store the contact information
      // 2. Send confirmation email
      // 3. Create order record
      // 4. Notify admin team
      
      console.log('✅ Deferred payment order created:', {
        paymentReference,
        cartId: cart.id,
        contactInfo,
        amount: cart.total
      });
      
      setMessage('🎉 Order received! We\'ll email you payment instructions within 1 hour.');
      setMessageType('success');
      
      // Simulate success after showing message
      setTimeout(() => {
        onSuccess();
      }, 3000);
      
    } catch (err: any) {
      console.error('💥 Deferred payment error:', err);
      setMessage('Unable to process your order. Please try again or contact support.');
      setMessageType('error');
    }
    
    setIsProcessing(false);
  };
  
  const handleContactInfoChange = (field: string, value: string) => {
    setContactInfo(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <>
      <PaymentHeader $embedded={embedded}>
        <PaymentTitle $embedded={embedded}>Complete Your Order</PaymentTitle>
        <PaymentSubtitle>We'll email you secure payment instructions</PaymentSubtitle>
      </PaymentHeader>
      
      {/* Order Summary */}
      <OrderSummary
        $embedded={embedded}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SummaryTitle>
          <CreditCard size={20} />
          Order Summary
        </SummaryTitle>
        
        {cart?.items?.map((item: any, index: number) => (
          <SummaryItem key={index}>
            <span>
              {item.storefrontItem?.name || 'Training Package'} × {item.quantity}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </SummaryItem>
        ))}
        
        <SummaryTotal>
          <span>Total</span>
          <span>${cart?.total?.toFixed(2) || '0.00'}</span>
        </SummaryTotal>
      </OrderSummary>
      
      {/* Deferred Payment Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          background: 'rgba(0, 255, 255, 0.05)',
          border: '2px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}
      >
        <h3 style={{
          color: '#00ffff',
          fontSize: '1.2rem',
          fontWeight: 600,
          margin: '0 0 1rem 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <Shield size={20} />
          Secure Payment Processing
        </h3>
        
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 1rem 0', lineHeight: 1.6 }}>
          We're processing payments manually for enhanced security. 
          Complete your order below and we'll email you secure payment instructions within 1 hour.
        </p>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '1rem',
          margin: '1rem 0',
          textAlign: 'left'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#00ffff' }}>Order Reference:</strong>
            <div style={{
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '6px',
              padding: '0.75rem',
              margin: '0.5rem 0',
              fontFamily: 'Courier New, monospace',
              fontWeight: 600,
              color: '#00ffff',
              textAlign: 'center',
              wordBreak: 'break-all'
            }}>
              {paymentReference}
            </div>
          </div>
          
          <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              ✅ <strong>Secure:</strong> Bank transfer, check, or credit card options
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              ⚡ <strong>Fast:</strong> Instructions sent within 1 hour
            </div>
            <div>
              📧 <strong>Confirmation:</strong> Email receipt upon payment completion
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Contact Information Form */}
      <form onSubmit={handleSubmit}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{
            color: '#00ffff',
            fontSize: '1.1rem',
            fontWeight: 600,
            margin: '0 0 1rem 0'
          }}>
            Contact Information
          </h4>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.9rem',
              marginBottom: '0.5rem'
            }}>
              Email Address *
            </label>
            <input
              type="email"
              value={contactInfo.email}
              onChange={(e) => handleContactInfoChange('email', e.target.value)}
              required
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'white',
                fontSize: '1rem'
              }}
              placeholder="your.email@example.com"
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.9rem',
              marginBottom: '0.5rem'
            }}>
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={contactInfo.phone}
              onChange={(e) => handleContactInfoChange('phone', e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'white',
                fontSize: '1rem'
              }}
              placeholder="(555) 123-4567"
            />
          </div>
          
          <div>
            <label style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.9rem',
              marginBottom: '0.5rem',
              display: 'block'
            }}>
              Preferred Contact Method
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                <input
                  type="radio"
                  value="email"
                  checked={contactInfo.preferredContact === 'email'}
                  onChange={(e) => handleContactInfoChange('preferredContact', e.target.value)}
                  style={{ accentColor: '#00ffff' }}
                />
                Email
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                <input
                  type="radio"
                  value="phone"
                  checked={contactInfo.preferredContact === 'phone'}
                  onChange={(e) => handleContactInfoChange('preferredContact', e.target.value)}
                  style={{ accentColor: '#00ffff' }}
                />
                Phone
              </label>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <PaymentButton
          $embedded={embedded}
          type="submit"
          disabled={isProcessing || !contactInfo.email}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isProcessing ? (
            <>
              <LoadingSpinner />
              Processing order...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Complete Order (${cart?.total?.toFixed(2) || '0.00'})
            </>
          )}
        </PaymentButton>
        
        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <MessageContainer
              className={messageType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {messageType === 'success' && <CheckCircle size={16} />}
              {messageType === 'error' && <AlertCircle size={16} />}
              {messageType === 'info' && <Loader size={16} />}
              {message}
            </MessageContainer>
          )}
        </AnimatePresence>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
};

// Payment Form Component
const PaymentForm: React.FC<PaymentFormProps> = ({ clientSecret, onSuccess, onError, embedded = false }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { cart } = useCart();
  
  // Performance-optimized preference loading with memoization
  const savedPreferences = useMemo(() => loadPaymentPreferences(), []);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>(
    savedPreferences?.preferredMethod || 'bank'
  );
  const [enableSubscription, setEnableSubscription] = useState(
    savedPreferences?.autoPayEnabled || false
  );
  const [showPreferencesSaved, setShowPreferencesSaved] = useState(false);

  // Save preferences when they change
  useEffect(() => {
    if (selectedPaymentMethod || enableSubscription !== (savedPreferences?.autoPayEnabled || false)) {
      const preferences: PaymentPreferences = {
        preferredMethod: selectedPaymentMethod,
        autoPayEnabled: enableSubscription,
        lastUsed: new Date().toISOString()
      };
      savePaymentPreferences(preferences);
      
      // Show brief confirmation for preference changes (not on initial load)
      if (savedPreferences && (
        selectedPaymentMethod !== savedPreferences.preferredMethod ||
        enableSubscription !== savedPreferences.autoPayEnabled
      )) {
        setShowPreferencesSaved(true);
        setTimeout(() => setShowPreferencesSaved(false), 2000);
      }
    }
  }, [selectedPaymentMethod, enableSubscription]);

  // Performance-optimized handlers with useCallback
const handlePaymentMethodChange = useCallback((method: PaymentMethodType) => {
  setSelectedPaymentMethod(method);
}, []);

const handleSubscriptionToggle = useCallback(() => {
  setEnableSubscription(prev => !prev);
}, []);

// Add state for Payment Element readiness
const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);
const [paymentElementError, setPaymentElementError] = useState<string | null>(null);

// Payment Element ready handler
const handlePaymentElementReady = useCallback(() => {
  console.log('💳 Payment Element is ready for interaction');
  setIsPaymentElementReady(true);
  setPaymentElementError(null);
}, []);

// Payment Element change handler for debugging
const handlePaymentElementChange = useCallback((event: any) => {
  console.log('💳 Payment Element change:', event);
  if (event.complete) {
    console.log('✅ Payment Element input is complete and valid');
  }
  if (event.error) {
    console.error('❌ Payment Element error:', event.error);
    setPaymentElementError(event.error.message);
  }
}, []);

  // Optimized submit handler with better error boundaries and mounting validation
const handleSubmit = useCallback(async (event: React.FormEvent) => {
  event.preventDefault();

  console.log('💳 Payment form submitted');
  console.log('🔍 Pre-flight checks:', {
  stripe: !!stripe,
  elements: !!elements,
    isPaymentElementReady,
    selectedPaymentMethod,
    userEmail: user?.email
  });

  if (!stripe || !elements) {
  const errorMsg = 'Payment system is loading...';
  console.warn('⚠️ Payment system not ready:', { stripe: !!stripe, elements: !!elements });
  setMessage(errorMsg);
  setMessageType('info');
  return;
  }

  // CRITICAL: Check if Payment Element is ready before proceeding
  if (!isPaymentElementReady) {
  const errorMsg = 'Payment form is still loading. Please wait a moment and try again.';
  console.error('❌ Payment Element not ready - blocking submission');
  setMessage(errorMsg);
  setMessageType('error');
  return;
  }

  // Additional validation for Payment Element
  const paymentElement = elements.getElement('payment');
  if (!paymentElement) {
  const errorMsg = 'Payment form not properly loaded. Please refresh and try again.';
  console.error('❌ Payment Element not found in elements');
  setMessage(errorMsg);
  setMessageType('error');
  onError(errorMsg);
  return;
  }

  setIsProcessing(true);
  setMessage(null);

  try {
  console.log('🚀 Initiating Stripe confirmPayment...');
  console.log('📋 Payment configuration:', {
  clientSecret: clientSecret.substring(0, 20) + '...',
  returnUrl: `${window.location.origin}/checkout/CheckoutSuccess`,
  userEmail: user?.email,
  selectedMethod: selectedPaymentMethod
  });

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
      confirmParams: {
      return_url: `${window.location.origin}/checkout/CheckoutSuccess`,
      receipt_email: user?.email,
    },
    redirect: 'if_required',
  });

  if (error) {
    console.error('💳 Stripe confirmPayment error:', error);
  console.error('Error details:', {
      type: error.type,
    code: error.code,
      message: error.message,
    paymentMethod: error.payment_method
    });
  
  let userFriendlyMessage = error.message || 'An unexpected error occurred.';
    
  // Handle specific error types
    if (error.code === 'payment_intent_authentication_failure') {
      userFriendlyMessage = 'Payment authentication failed. Please verify your payment information and try again.';
    } else if (error.code === 'card_declined') {
      userFriendlyMessage = 'Your payment method was declined. Please try a different payment method.';
  } else if (error.code === 'expired_card') {
    userFriendlyMessage = 'Your payment method has expired. Please use a different payment method.';
    } else if (error.code === 'processing_error') {
      userFriendlyMessage = 'There was an error processing your payment. Please try again.';
    }
    
    setMessage(userFriendlyMessage);
      setMessageType('error');
      onError(userFriendlyMessage);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      console.log('🎉 Payment succeeded!', paymentIntent);
      
      // Enhanced success messaging with payment details
      const paymentMethod = selectedPaymentMethod === 'bank' ? 'EFT Bank Transfer' : 
        selectedPaymentMethod === 'card' ? 'Credit/Debit Card' : 'Buy Now, Pay Later';
      
      setMessage(`🎉 Payment successful via ${paymentMethod}! ${selectedPaymentMethod === 'bank' ? 'Bank transfer processing...' : 'Processing complete!'} Redirecting...`);
      setMessageType('success');
      
      // Save successful payment method preference
      const successPreferences: PaymentPreferences = {
        preferredMethod: selectedPaymentMethod,
        autoPayEnabled: enableSubscription,
        lastUsed: new Date().toISOString()
      };
      savePaymentPreferences(successPreferences);
      
      onSuccess(paymentIntent);
    } else {
      console.log('ℹ️ Payment requires additional processing:', paymentIntent);
      // Enhanced processing messaging
      const processingMessage = selectedPaymentMethod === 'bank' ? 
        '🏦 Bank connection established. Processing EFT transfer...' :
        selectedPaymentMethod === 'card' ? 
        '💳 Card payment processing...' :
        '⚡ Finalizing Buy Now, Pay Later setup...';
        
      setMessage(processingMessage);
      setMessageType('info');
    }
  } catch (err: any) {
    console.error('💥 Payment processing exception:', err);
    console.error('Exception details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    
    let errorMessage = 'Payment processing failed';
    let showDiagnosticTip = false;
    
    if (err.type === 'card_error') {
      errorMessage = err.message || 'Your card was declined';
    } else if (err.type === 'validation_error') {
      errorMessage = 'Please check your payment information and try again';
    } else if (err.code === 'payment_intent_authentication_failure') {
      errorMessage = 'Payment authentication failed. Please try again';
    } else if (err.code === 'payment_method_creation_failed') {
      errorMessage = 'Unable to set up payment method. Please check your information';
    } else if (err.message?.includes('publishable key')) {
      errorMessage = 'Payment configuration error. Please contact support';
      showDiagnosticTip = true;
    } else if (err.message?.includes('Payment Element')) {
      errorMessage = 'Payment form error. Please refresh the page and try again';
      showDiagnosticTip = true;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    // Add diagnostic tip for configuration errors
    if (showDiagnosticTip && process.env.NODE_ENV === 'development') {
      console.log('🔧 DIAGNOSTIC TIP: Run SwanStripeDiagnostics.runDiagnostics() in the browser console for detailed error analysis');
      errorMessage += ' (Check browser console for diagnostic tools)';
    }
    
    setMessage(errorMessage);
    setMessageType('error');
    onError(errorMessage);
  }

  setIsProcessing(false);
}, [stripe, elements, isPaymentElementReady, selectedPaymentMethod, enableSubscription, user?.email, clientSecret, onSuccess, onError]);

  return (
    <form onSubmit={handleSubmit}>
      <PaymentFormContainer $embedded={embedded}>
        {/* Order Summary */}
        <OrderSummary
          $embedded={embedded}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SummaryTitle>
            <CreditCard size={20} />
            Order Summary
          </SummaryTitle>
          
          {cart?.items?.map((item, index) => (
            <SummaryItem key={index}>
              <span>
                {item.storefrontItem?.name || 'Training Package'} × {item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </SummaryItem>
          ))}
          
          <SummaryTotal>
            <span>Total</span>
            <span>${cart?.total?.toFixed(2) || '0.00'}</span>
          </SummaryTotal>
        </OrderSummary>

        {/* Payment Method Selection - Performance Optimized */}
        <PaymentMethodSelector>
          <PaymentMethodButton
          $active={selectedPaymentMethod === 'bank'}
          onClick={() => handlePaymentMethodChange('bank')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
              border: selectedPaymentMethod === 'bank' ? '2px solid #00ffff' : '1px solid rgba(0, 255, 255, 0.6)',
              position: 'relative'
            }}
            aria-label="Select EFT Bank Transfer payment method - Recommended, lower fees"
            role="radio"
            aria-checked={selectedPaymentMethod === 'bank'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePaymentMethodChange('bank');
              }
            }}
          >
            <Shield />
            <div className="method-info">
              <div className="method-title">EFT Bank Transfer (Recommended)</div>
              <div className="method-subtitle">Lower fees • Secure • Direct from bank</div>
            </div>
            {selectedPaymentMethod === 'bank' && (
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '8px',
                background: 'linear-gradient(135deg, #00ffff, #0099ff)',
                color: '#0a0a1a',
                padding: '0.25rem 0.5rem',
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                DEFAULT
              </div>
            )}
          </PaymentMethodButton>
          
          <PaymentMethodButton
          $active={selectedPaymentMethod === 'card'}
          onClick={() => handlePaymentMethodChange('card')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Select Credit/Debit Card payment method - Instant payment with higher fees"
            role="radio"
            aria-checked={selectedPaymentMethod === 'card'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePaymentMethodChange('card');
              }
            }}
          >
            <CreditCard />
            <div className="method-info">
              <div className="method-title">Credit/Debit Card</div>
              <div className="method-subtitle">Instant payment • Higher fees</div>
            </div>
          </PaymentMethodButton>
          
          <PaymentMethodButton
          $active={selectedPaymentMethod === 'bnpl'}
          onClick={() => handlePaymentMethodChange('bnpl')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap />
            <div className="method-info">
              <div className="method-title">Buy Now, Pay Later</div>
              <div className="method-subtitle">Affirm, Klarna options</div>
            </div>
          </PaymentMethodButton>
        </PaymentMethodSelector>
        
        {/* Payment Method Context */}
        {selectedPaymentMethod === 'bank' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              background: 'rgba(0, 255, 255, 0.05)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}
          >
            <div style={{
              color: '#00ffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <Shield size={16} />
              EFT Bank Transfer Selected (Default)
            </div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              margin: '0 0 0.5rem 0',
              lineHeight: 1.4
            }}>
              💰 <strong>Save {Math.round(((2.9 - 0.5) / 2.9) * 100)}%</strong> on fees with direct bank transfer (0.5% vs 2.9% card fees). Processing takes 1-3 business days.
            </p>
            
            {/* Real-time Fee Calculator */}
            {cart?.total && (
              <FeeCalculator>
                <div className="fee-comparison">
                  <div className="fee-item eft">
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>EFT Fee</div>
                    <div style={{ fontWeight: 600 }}>${(cart.total * 0.005).toFixed(2)}</div>
                  </div>
                  <div className="fee-item card">
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Card Fee</div>
                    <div style={{ fontWeight: 600 }}>${(cart.total * 0.029).toFixed(2)}</div>
                  </div>
                </div>
                <div className="savings-highlight">
                  💰 You save ${((cart.total * 0.029) - (cart.total * 0.005)).toFixed(2)} with EFT!
                </div>
              </FeeCalculator>
            )}
            
            {/* EFT Process Timeline */}
            <EFTTimeline>
              <div className="timeline-title">EFT Processing Timeline</div>
              <div className="timeline-steps">
                <div className="timeline-step">1</div>
                <div className="timeline-step">2</div>
                <div className="timeline-step">3</div>
                <div className="timeline-step">✓</div>
              </div>
              <div className="timeline-labels">
                <div className="timeline-label">Setup Account</div>
                <div className="timeline-label">Bank Verification</div>
                <div className="timeline-label">Transfer Initiated</div>
                <div className="timeline-label">Complete</div>
              </div>
            </EFTTimeline>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.8rem',
              margin: 0
            }}>
              <strong style={{ color: '#00ffff' }}>Need instant payment?</strong> Select "Credit/Debit Card" above.
            </p>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  background: 'rgba(0, 255, 255, 0.1)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#00ffff'
                }}
              >
                ⏳ Setting up secure bank connection...
              </motion.div>
            )}
          </motion.div>
        )}
        
        {selectedPaymentMethod === 'card' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(255, 165, 0, 0.1)',
              border: '1px solid rgba(255, 165, 0, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}
          >
            <div style={{
              color: '#ffa500',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <CreditCard size={16} />
              One-Time Card Payment
            </div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              margin: '0 0 0.5rem 0',
              lineHeight: 1.4
            }}>
              Instant processing with 2.9% fee. Secure and immediate confirmation.
            </p>
            
            {/* Card Fee Calculator */}
            {cart?.total && (
              <FeeCalculator>
                <div className="fee-comparison">
                  <div className="fee-item card">
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Card Fee (Current)</div>
                    <div style={{ fontWeight: 600, color: '#ffa500' }}>${(cart.total * 0.029).toFixed(2)}</div>
                  </div>
                  <div className="fee-item eft">
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>EFT Fee (Alternative)</div>
                    <div style={{ fontWeight: 600, color: '#00ffff' }}>${(cart.total * 0.005).toFixed(2)}</div>
                  </div>
                </div>
                <div className="savings-highlight" style={{ background: 'rgba(255, 165, 0, 0.1)', color: '#ffa500' }}>
                  💸 Potential savings: ${((cart.total * 0.029) - (cart.total * 0.005)).toFixed(2)} with EFT
                </div>
              </FeeCalculator>
            )}
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.8rem',
              margin: 0
            }}>
              <strong style={{ color: '#ffa500' }}>Save money:</strong> Switch to "EFT Bank Transfer" for lower fees.
            </p>
          </motion.div>
        )}
        
        {/* Smart Auto-Pay Integration */}
        <SubscriptionToggle>
          <ToggleLabel>
            <ToggleSwitch 
              $active={enableSubscription}
              onClick={handleSubscriptionToggle}
            />
            <span>
              Enable Monthly Auto-Pay 
              {selectedPaymentMethod === 'bank' && '💰 (Ultimate Savings Combo!)'}
              {selectedPaymentMethod === 'card' && '⚡ (Instant + Convenient)'}
              {selectedPaymentMethod === 'bnpl' && '📈 (Flexible + Automated)'}
            </span>
          </ToggleLabel>
          
          {/* Dynamic Auto-Pay Messaging Based on Payment Method */}
          {enableSubscription && (
            <SubscriptionInfo>
              {selectedPaymentMethod === 'bank' && (
                <>
                  <strong style={{ color: '#00ffff' }}>🏆 MAXIMUM SAVINGS ACTIVATED!</strong><br/>
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0, 255, 255, 0.1)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    💰 <strong>Total Savings with EFT + Auto-Pay:</strong><br/>
                    • Lowest fees (0.5% vs 2.9% = 83% savings)<br/>
                    • 10% auto-pay discount on future sessions<br/>
                    • Zero monthly card processing charges<br/>
                    {cart?.total && (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>
                        Annual fee savings: ~${((cart.total * 0.024 * 12)).toFixed(0)}+
                      </span>
                    )}
                  </div>
                  • Priority booking for appointments<br/>
                  • Seamless bank-to-bank transfers<br/>
                  • Cancel anytime, no commitment<br/>
                  • Automatic session credit renewal
                </>
              )}
              
              {selectedPaymentMethod === 'card' && (
                <>
                  <strong style={{ color: '#ffa500' }}>⚡ INSTANT + CONVENIENT!</strong><br/>
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255, 165, 0, 0.1)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    💳 <strong>Card Auto-Pay Benefits:</strong><br/>
                    • Instant processing every month<br/>
                    • 10% discount on future sessions<br/>
                    • Never miss a session due to payment issues<br/>
                    • Secure recurring billing
                  </div>
                  • Priority booking for appointments<br/>
                  • Cancel anytime, no commitment<br/>
                  • Automatic session credit renewal<br/>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    💡 Tip: Switch to EFT for even lower monthly fees!
                  </span>
                </>
              )}
              
              {selectedPaymentMethod === 'bnpl' && (
                <>
                  <strong style={{ color: '#a855f7' }}>📈 FLEXIBLE + AUTOMATED!</strong><br/>
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    ⚡ <strong>BNPL Auto-Pay Benefits:</strong><br/>
                    • Spread costs across multiple payments<br/>
                    • 10% discount on future sessions<br/>
                    • Automated payment scheduling<br/>
                    • Flexible payment terms
                  </div>
                  • Priority booking for appointments<br/>
                  • Cancel anytime, no commitment<br/>
                  • Automatic session credit renewal
                </>
              )}
            </SubscriptionInfo>
          )}
          
          {/* Smart CTA based on current selection */}
          {!enableSubscription && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: selectedPaymentMethod === 'bank' ? 'rgba(0, 255, 255, 0.05)' : 
                           selectedPaymentMethod === 'card' ? 'rgba(255, 165, 0, 0.05)' : 'rgba(168, 85, 247, 0.05)',
                border: `1px solid ${selectedPaymentMethod === 'bank' ? 'rgba(0, 255, 255, 0.2)' : 
                                     selectedPaymentMethod === 'card' ? 'rgba(255, 165, 0, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                borderRadius: '6px',
                fontSize: '0.8rem',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.8)'
              }}
            >
              {selectedPaymentMethod === 'bank' && '💰 Enable Auto-Pay for ultimate savings (EFT fees + 10% discount)!'}
              {selectedPaymentMethod === 'card' && '⚡ Enable Auto-Pay for convenience + 10% discount on future sessions!'}
              {selectedPaymentMethod === 'bnpl' && '📈 Enable Auto-Pay for automated flexible payments + 10% discount!'}
            </motion.div>
          )}
        </SubscriptionToggle>

        {/* Payment Element */}
        <StripeElementContainer $embedded={embedded}>
          <PaymentElement 
            options={useMemo(() => {
              // Enhanced payment method configuration for better compatibility
              const baseOptions = {
                ...baseStripeElementOptions,
                layout: {
                  type: 'tabs' as const,
                  defaultCollapsed: false,
                  radios: false,
                  spacedAccordionItems: true
                },
                wallets: {
                  applePay: 'auto' as const,
                  googlePay: 'auto' as const
                }
              };
              
              // Configure payment method types based on selection
              switch (selectedPaymentMethod) {
                case 'card':
                  return {
                    ...baseOptions,
                    paymentMethodTypes: ['card'],
                    wallets: {
                      applePay: 'auto' as const,
                      googlePay: 'auto' as const
                    }
                  };
                  
                case 'bank':
                  return {
                    ...baseOptions,
                    paymentMethodTypes: ['us_bank_account'],
                    wallets: {
                      applePay: 'never' as const,
                      googlePay: 'never' as const
                    }
                  };
                  
                case 'bnpl':
                  return {
                    ...baseOptions,
                    paymentMethodTypes: ['affirm', 'klarna', 'afterpay_clearpay']
                  };
                  
                default:
                  return {
                    ...baseOptions,
                    paymentMethodTypes: ['card', 'us_bank_account']
                  };
              }
            }, [selectedPaymentMethod])}
            onReady={handlePaymentElementReady}
            onChange={handlePaymentElementChange}
          />
          
          {/* Payment Element Status Indicators */}
          {!isPaymentElementReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(0, 255, 255, 0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: '#00ffff'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ width: '16px', height: '16px' }}
              >
                <Loader size={16} />
              </motion.div>
              Loading secure payment form...
            </motion.div>
          )}
          
          {paymentElementError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(255, 68, 68, 0.1)',
                border: '1px solid rgba(255, 68, 68, 0.3)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#ff4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={16} />
              {paymentElementError}
            </motion.div>
          )}
        </StripeElementContainer>

        {/* Security Badges */}
        <SecurityBadges>
          <SecurityBadge>
            <Shield size={16} />
            256-bit SSL
          </SecurityBadge>
          <SecurityBadge>
            <Zap size={16} />
            Instant Processing
          </SecurityBadge>
          <SecurityBadge>
            <CheckCircle size={16} />
            PCI Compliant
          </SecurityBadge>
        </SecurityBadges>

        {/* Submit Button */}
        <PaymentButton
          $embedded={embedded}
          type="submit"
          disabled={!stripe || !elements || isProcessing || !isPaymentElementReady}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={selectedPaymentMethod === 'bank' 
            ? `Setup EFT bank transfer payment ${cart?.total ? `for ${cart.total.toFixed(2)}` : ''}` 
            : `Complete card payment ${cart?.total ? `for ${cart.total.toFixed(2)}` : ''}`
          }
        >
          {isProcessing ? (
            <>
              <LoadingSpinner />
              {selectedPaymentMethod === 'bank' 
                ? 'Setting up secure bank connection...' 
                : 'Processing payment...'}
            </>
          ) : !isPaymentElementReady ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader size={20} />
              </motion.div>
              Loading payment form...
            </>
          ) : (
            <>
              {selectedPaymentMethod === 'bank' ? <Shield size={20} /> : <CreditCard size={20} />}
              {selectedPaymentMethod === 'bank' 
                ? `Setup EFT Transfer (${cart?.total?.toFixed(2) || '0.00'})` 
                : `Complete Card Payment (${cart?.total?.toFixed(2) || '0.00'})`}
            </>
          )}
        </PaymentButton>
        
        {/* Payment Method Guidance */}
        {selectedPaymentMethod === 'bank' && !isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              marginTop: '0.75rem',
              textAlign: 'center',
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.7)',
              fontStyle: 'italic'
            }}
          >
            🔒 You'll securely connect your bank account in the next step
          </motion.div>
        )}

        {/* Preferences Saved Notification */}
        <AnimatePresence>
          {showPreferencesSaved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#10b981',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                zIndex: 10000,
                backdropFilter: 'blur(10px)'
              }}
            >
              <CheckCircle size={16} />
              Preferences saved for next time!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <MessageContainer
              className={messageType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {messageType === 'success' && <CheckCircle size={16} />}
              {messageType === 'error' && <AlertCircle size={16} />}
              {messageType === 'info' && <Loader size={16} />}
              {message}
            </MessageContainer>
          )}
        </AnimatePresence>
      </PaymentFormContainer>
    </form>
  );
};

// Main Galaxy Payment Element Component
const GalaxyPaymentElement: React.FC<GalaxyPaymentElementProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  embedded = false // Default to false for backward compatibility
}) => {
  const { authAxios, token } = useAuth();
  const { cart } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null); // Enhanced to handle error objects
  const [isManualPayment, setIsManualPayment] = useState(false); // Track if this is a manual payment

  // Create Payment Intent when component opens
useEffect(() => {
  if (isOpen && cart?.id && !clientSecret) {
  console.log('💳 Payment modal opened - creating payment intent');
    console.log('📋 Cart info:', { cartId: cart.id, total: cart.total, items: cart.items?.length });
    createPaymentIntent();
  }
}, [isOpen, cart?.id]);

  const createPaymentIntent = async () => {
  if (!cart?.id || !token) {
  console.error('❌ Payment intent creation blocked - missing cart or token:', { cartId: cart?.id, token: !!token });
  setError('Cart or authentication not available');
    return;
  }

  // Check if Stripe is properly configured
  if (!stripePromise) {
  console.error('❌ Payment intent creation blocked - Stripe not configured');
    setError('Payment system is not configured. Please contact support.');
    return;
  }

  console.log('🚀 Creating payment intent for cart:', cart.id);
  setLoading(true);
  setError(null);

  try {
    const response = await authAxios.post('/api/payments/create-payment-intent', {
    cartId: cart.id
  });

  console.log('💳 Payment intent response:', { 
    status: response.status, 
      success: response.data.success,
    hasClientSecret: !!response.data.data?.clientSecret
  });

  if (response.data.success) {
  const clientSecret = response.data.data.clientSecret;
  
  // Validate client secret format - Support both Stripe and Manual payments
  const isStripeFormat = clientSecret?.startsWith('pi_') && clientSecret.includes('_secret_');
  const isManualFormat = clientSecret?.startsWith('manual_');
  
  if (!clientSecret || (!isStripeFormat && !isManualFormat)) {
    console.error('❌ Invalid client secret format:', clientSecret?.substring(0, 20) + '...');
    setError('Invalid payment configuration. Please try again.');
    return;
  }
  
  // Log payment method detection and set state
  if (isManualFormat) {
    console.log('🔧 Deferred payment detected - switching to deferred payment flow');
    console.log('📋 Deferred payment reference:', clientSecret.substring(0, 30) + '...');
    setIsManualPayment(true);
  } else {
    console.log('💳 Stripe payment detected - using standard payment flow');
    setIsManualPayment(false);
  }
  
  console.log('✅ Payment intent created successfully:', {
  paymentIntentId: response.data.data.paymentIntentId,
  amount: response.data.data.amount,
  currency: response.data.data.currency
  });
  
  // ULTRA-VALIDATION: Check account matching (skip for manual payments)
  if (!isManualFormat && keyValidation.valid && stripePublishableKey) {
    const accountValidation = StripeAccountValidator.validateAccountMatch(
      clientSecret, 
      stripePublishableKey
    );
    
    if (!accountValidation.valid) {
      console.error('🚨 CRITICAL: Account mismatch will cause 401 errors!');
      setError({
        code: 'ACCOUNT_MISMATCH',
        message: 'Payment configuration error: Frontend and backend Stripe accounts do not match.',
        details: accountValidation.details,
        fallbackOptions: [
          {
            method: 'fix',
            description: 'Update frontend .env file with correct publishable key',
            technical: `Expected account: ${accountValidation.backendAccount}`
          },
          {
            method: 'contact',
            description: 'Contact support for Stripe configuration assistance',
            contact: 'support@swanstudios.com'
          }
        ]
      });
      return;
    } else {
      console.log('🎯 ACCOUNT VALIDATION PASSED: Ready for secure payment processing');
    }
  } else if (isManualFormat) {
    console.log('🔧 DEFERRED PAYMENT: Skipping Stripe account validation');
  }
  
  setClientSecret(clientSecret);
  } else {
  console.error('❌ Payment intent creation failed:', response.data.message);
  setError(response.data.message || 'Failed to initialize payment');
  }
  } catch (err: any) {
  console.error('💥 Payment intent creation error:', err);
  
  // Enhanced Stripe error handling with diagnostics
  if (err.response?.status === 401) {
  console.error('🚨 STRIPE AUTH ERROR: Backend Stripe secret key may be mismatched with frontend publishable key');
  console.log('Frontend key:', stripePublishableKey?.substring(0, 15) + '...');
  
  // Run diagnostics in development
  if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Running payment diagnostics...');
    paymentDiagnostics.runDiagnostics().then(results => {
    console.log('🔍 Diagnostic results:', results);
    if (!results.success) {
      console.log('💡 Recommendations:');
        paymentDiagnostics.getRecommendations().forEach(rec => console.log(`   - ${rec}`));
        }
    }).catch(diagErr => {
    console.warn('Diagnostics failed:', diagErr);
  });
  }
  
    setError({
    code: 'STRIPE_AUTH_ERROR',
  message: 'Stripe authentication failed. There may be a configuration mismatch between frontend and backend Stripe keys.',
  details: 'Please contact support - this is a configuration issue.',
  fallbackOptions: [
      {
          method: 'contact',
        description: 'Contact support immediately - Stripe keys may be mismatched',
      contact: 'support@swanstudios.com'
    },
    {
        method: 'retry',
          description: 'Try refreshing the page',
            retryAfter: 10
        }
        ]
      });
    } else if (err.response?.status === 503) {
      // Service unavailable - show enhanced error with fallback options
      const errorData = err.response.data;
      setError({
        code: 'PAYMENT_SERVICE_UNAVAILABLE',
        message: errorData.message || 'Payment processing temporarily unavailable',
        details: errorData.error?.details,
        retryAfter: errorData.error?.retryAfter,
        supportContact: errorData.error?.supportContact,
        fallbackOptions: errorData.fallbackOptions
      });
    } else if (err.response?.status === 400) {
      const errorData = err.response.data;
      setError({
        code: 'INVALID_REQUEST',
        message: errorData.message || 'Invalid payment request',
        details: errorData.error?.details,
        debugInfo: errorData.error?.debugInfo
      });
    } else if (err.response?.status === 500) {
      setError({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error. Please try again.',
        details: 'Payment processing encountered an error'
      });
    } else if (err.code === 'ERR_NETWORK') {
      setError({
        code: 'CONNECTION_ERROR',
        message: 'Network connection error. Please check your internet connection.',
        details: 'Unable to connect to payment service'
      });
    } else {
      setError({
        code: 'UNKNOWN_ERROR',
        message: err.response?.data?.message || 'Failed to initialize payment',
        details: 'An unexpected error occurred'
      });
    }
  } finally {
    setLoading(false);
  }
};

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      // Confirm payment with backend
      await authAxios.post('/api/payments/confirm-payment', {
        paymentIntentId: paymentIntent.id
      });

      // Success! Navigate to success page or trigger success callback
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = `/checkout/CheckoutSuccess?payment_intent=${paymentIntent.id}`;
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!isOpen) return null;

  // Embedded mode - render without overlay
  if (embedded) {
    // Show configuration error if Stripe is not properly set up
    if (!stripePromise) {
      return (
        <PaymentContainer
        $embedded={false}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
          >
          <PaymentHeader $embedded={embedded}>
          <PaymentTitle $embedded={embedded}>Payment System Unavailable</PaymentTitle>
          <PaymentSubtitle>Payment processing is currently being configured</PaymentSubtitle>
          </PaymentHeader>

          <PaymentErrorHandler 
            error={{
              code: 'STRIPE_NOT_CONFIGURED',
              message: 'Payment system is not configured. Please contact support or try again later.',
              details: 'Payment processing temporarily unavailable',
              fallbackOptions: [
                {
                  method: 'contact',
                  description: 'Contact our support team to complete your purchase',
                  contact: 'support@swanstudios.com'
                },
                {
                  method: 'retry',
                  description: 'Try again in a few minutes',
                  retryAfter: 300
                }
              ]
            }}
            onRetry={() => window.location.reload()}
            onClose={onClose}
          />
        </PaymentContainer>
      );
    }

    return (
      <PaymentContainer
        $embedded={embedded}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PaymentHeader $embedded={embedded}>
          <PaymentTitle $embedded={embedded}>Secure Payment</PaymentTitle>
          <PaymentSubtitle>Complete your SwanStudios training package purchase</PaymentSubtitle>
        </PaymentHeader>

        {loading && (
          <EnhancedLoadingContainer
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Shield size={32} style={{ color: '#00ffff' }} />
            </motion.div>
            <LoadingText>
              <span className="primary">Initializing Secure Payment</span>
              <span className="secondary">Setting up your secure payment environment...</span>
            </LoadingText>
          </EnhancedLoadingContainer>
        )}

        {error && (
          <PaymentErrorHandler 
            error={typeof error === 'string' ? {
              code: 'GENERIC_ERROR',
              message: error
            } : error}
            onRetry={() => {
              setError(null);
              setClientSecret(null);
              createPaymentIntent();
            }}
            onClose={onClose}
          />
        )}

        {clientSecret && (
          isManualPayment ? (
            <DeferredPaymentFlow
              clientSecret={clientSecret}
              cart={cart}
              onSuccess={() => {
                console.log('🎉 Deferred payment flow completed (Embedded)');
                if (onSuccess) {
                  onSuccess();
                } else {
                  window.location.href = '/checkout/CheckoutSuccess?deferred=true';
                }
              }}
              onClose={onClose}
              embedded={embedded}
            />
          ) : (
            <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#00ffff',
                  colorBackground: '#0a0a1a',
                  colorText: '#ffffff',
                  fontFamily: 'Inter, SF Pro Display, Roboto, sans-serif'
                }
              }
            }}
            onError={(error: any) => {
              console.error('🚨 STRIPE ELEMENTS ERROR (Embedded):', error);
              if (error.type === 'invalid_request_error' && error.code === 'client_secret_mismatch') {
                setError({
                  code: 'STRIPE_KEY_MISMATCH',
                  message: 'Stripe configuration error detected. Frontend and backend keys may not match.',
                  details: 'This is a server configuration issue.',
                  fallbackOptions: [
                    {
                      method: 'contact',
                      description: 'Contact support - Stripe keys mismatch detected',
                      contact: 'support@swanstudios.com'
                    }
                  ]
                });
              } else {
                setError(error.message || 'Stripe configuration error');
              }
            }}
          >
            <PaymentForm
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              embedded={embedded}
            />
          </Elements>
          )
        )}
      </PaymentContainer>
    );
  }

  // Show configuration error if Stripe is not properly set up
  if (!stripePromise) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <PaymentContainer
          $embedded={false}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PaymentHeader $embedded={false}>
          <PaymentTitle $embedded={false}>Payment System Unavailable</PaymentTitle>
          <PaymentSubtitle>Payment processing is currently being configured</PaymentSubtitle>
          </PaymentHeader>

          <PaymentErrorHandler 
            error={{
              code: 'STRIPE_NOT_CONFIGURED',
              message: 'Payment system is not configured. Please contact support or try again later.',
              details: 'Payment processing temporarily unavailable',
              fallbackOptions: [
                {
                  method: 'contact',
                  description: 'Contact our support team to complete your purchase',
                  contact: 'support@swanstudios.com'
                },
                {
                  method: 'retry',
                  description: 'Try again in a few minutes',
                  retryAfter: 300
                }
              ]
            }}
            onRetry={() => window.location.reload()}
            onClose={onClose}
          />

          <motion.button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer'
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </motion.button>
        </PaymentContainer>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <PaymentContainer
        $embedded={embedded}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PaymentHeader $embedded={false}>
        <PaymentTitle $embedded={false}>Secure Payment</PaymentTitle>
        <PaymentSubtitle>Complete your SwanStudios training package purchase</PaymentSubtitle>
        </PaymentHeader>

        {loading && (
          <EnhancedLoadingContainer
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Shield size={32} style={{ color: '#00ffff' }} />
            </motion.div>
            <LoadingText>
              <span className="primary">Initializing Secure Payment</span>
              <span className="secondary">Setting up your secure payment environment...</span>
            </LoadingText>
          </EnhancedLoadingContainer>
        )}

        {error && (
          <PaymentErrorHandler 
            error={typeof error === 'string' ? {
              code: 'GENERIC_ERROR',
              message: error
            } : error}
            onRetry={() => {
              setError(null);
              setClientSecret(null);
              createPaymentIntent();
            }}
            onClose={onClose}
          />
        )}

        {clientSecret && (
          isManualPayment ? (
            <DeferredPaymentFlow
              clientSecret={clientSecret}
              cart={cart}
              onSuccess={() => {
                console.log('🎉 Deferred payment flow completed');
                if (onSuccess) {
                  onSuccess();
                } else {
                  window.location.href = '/checkout/CheckoutSuccess?deferred=true';
                }
              }}
              onClose={onClose}
              embedded={embedded}
            />
          ) : (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#00ffff',
                    colorBackground: '#0a0a1a',
                    colorText: '#ffffff',
                    fontFamily: 'Inter, SF Pro Display, Roboto, sans-serif'
                  }
                }
              }}
              onError={(error: any) => {
                console.error('🚨 STRIPE ELEMENTS ERROR (Modal):', error);
                if (error.type === 'invalid_request_error' && error.code === 'client_secret_mismatch') {
                  setError({
                    code: 'STRIPE_KEY_MISMATCH',
                    message: 'Stripe configuration error detected. Frontend and backend keys may not match.',
                    details: 'This is a server configuration issue.',
                    fallbackOptions: [
                      {
                        method: 'contact',
                        description: 'Contact support - Stripe keys mismatch detected',
                        contact: 'support@swanstudios.com'
                      }
                    ]
                  });
                } else {
                  setError(error.message || 'Stripe configuration error');
                }
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                embedded={embedded}
              />
            </Elements>
          )
        )}

        <motion.button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer'
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ✕
        </motion.button>
      </PaymentContainer>
    </motion.div>
  );
};

export default GalaxyPaymentElement;
