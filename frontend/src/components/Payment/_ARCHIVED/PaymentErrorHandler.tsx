/**
 * PaymentErrorHandler.tsx
 * =======================
 * Enhanced payment error handling with user-friendly fallbacks
 * 
 * Master Prompt v28.6 Compliance:
 * ✅ Single Responsibility: Only handles payment errors and fallbacks
 * ✅ Production-Ready: Graceful degradation when payment is unavailable
 * ✅ User-Centric: Clear error messages and actionable solutions
 * ✅ Galaxy-Swan Theme: Consistent visual design
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AlertCircle, Phone, Mail, RefreshCw, Clock, CreditCard } from 'lucide-react';
import { galaxySwanTheme } from '../../styles/galaxy-swan-theme';
import { ThemedGlowButton } from '../../styles/swan-theme-utils';

// Styled Components
const ErrorContainer = styled(motion.div)`
  background: linear-gradient(135deg, #1a0a0a 0%, #2d1b1b 50%, #1a0a0a 100%);
  border: 2px solid rgba(255, 68, 68, 0.3);
  border-radius: 15px;
  padding: 2rem;
  margin: 1rem 0;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 30% 40%, rgba(255, 68, 68, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 70% 80%, rgba(255, 150, 150, 0.05) 0%, transparent 50%);
    pointer-events: none;
  }
  
  & > * {
    position: relative;
    z-index: 1;
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin: 0.75rem 0;
  }
  
  @media (max-width: 480px) {
    padding: 1.25rem;
    border-radius: 12px;
  }
`;

const ErrorIcon = styled(motion.div)`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 150, 150, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  border: 2px solid rgba(255, 68, 68, 0.3);
  
  svg {
    width: 32px;
    height: 32px;
    color: #ff6b6b;
  }
  
  @media (max-width: 480px) {
    width: 56px;
    height: 56px;
    margin-bottom: 1rem;
    
    svg {
      width: 28px;
      height: 28px;
    }
  }
`;

const ErrorTitle = styled.h3`
  color: #ff6b6b;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }
`;

const ErrorMessage = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
    margin-bottom: 1.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
`;

const FallbackOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }
`;

const FallbackCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(0, 255, 255, 0.3);
    transform: translateY(-2px);
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
  }
`;

const FallbackIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, ${galaxySwanTheme.primary.main}, ${galaxySwanTheme.secondary.main});
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  
  svg {
    width: 20px;
    height: 20px;
    color: #0a0a1a;
  }
  
  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    margin-bottom: 0.5rem;
    
    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const FallbackTitle = styled.h4`
  color: ${galaxySwanTheme.text.primary};
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
`;

const FallbackDescription = styled.p`
  color: ${galaxySwanTheme.text.secondary};
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 1rem;
  
  @media (max-width: 480px) {
    font-size: 0.8rem;
    margin-bottom: 0.75rem;
  }
`;

const ContactInfo = styled.div`
  font-size: 0.9rem;
  color: ${galaxySwanTheme.primary.main};
  font-weight: 500;
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const RetrySection = styled.div`
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  @media (max-width: 480px) {
    margin-top: 1.5rem;
    padding-top: 1rem;
  }
`;

const RetryTimer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: { 
    scale: 1, 
    rotate: 0,
    transition: { 
      delay: 0.2,
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { 
      delay: 0.3 + (i * 0.1),
      duration: 0.3,
      ease: "easeOut"
    }
  })
};

// Error Types
interface PaymentError {
  code: string;
  message: string;
  details?: string;
  retryAfter?: number;
  supportContact?: string;
  fallbackOptions?: Array<{
    method: string;
    description: string;
    contact?: string;
    retryAfter?: number;
  }>;
}

// Component Props
interface PaymentErrorHandlerProps {
  error: PaymentError;
  onRetry?: () => void;
  onClose?: () => void;
}

// Main Component
const PaymentErrorHandler: React.FC<PaymentErrorHandlerProps> = ({
  error,
  onRetry,
  onClose
}) => {
  const [retryCountdown, setRetryCountdown] = React.useState(error.retryAfter || 0);

  // Countdown timer for retry
  React.useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      : `${remainingSeconds}s`;
  };

  // Get appropriate icon for error type
  const getErrorIcon = () => {
    switch (error.code) {
      case 'PAYMENT_SERVICE_UNAVAILABLE':
      case 'SERVICE_UNAVAILABLE':
        return <Clock />;
      case 'CONNECTION_ERROR':
        return <RefreshCw />;
      case 'STRIPE_ERROR':
      case 'PAYMENT_ERROR':
        return <CreditCard />;
      default:
        return <AlertCircle />;
    }
  };

  // Get user-friendly error title
  const getErrorTitle = () => {
    switch (error.code) {
      case 'PAYMENT_SERVICE_UNAVAILABLE':
        return 'Payment System Temporarily Unavailable';
      case 'CONNECTION_ERROR':
        return 'Connection Issue';
      case 'STRIPE_ERROR':
        return 'Payment Processing Error';
      case 'INVALID_CART':
        return 'Cart Issue';
      default:
        return 'Payment Error';
    }
  };

  // Get user-friendly error message
  const getErrorMessage = () => {
    switch (error.code) {
      case 'PAYMENT_SERVICE_UNAVAILABLE':
        return 'Our payment system is currently being updated to serve you better. Please try one of the alternative options below or contact our support team.';
      case 'CONNECTION_ERROR':
        return 'There seems to be a network connection issue. Please check your internet connection and try again.';
      case 'STRIPE_ERROR':
        return 'There was an issue processing your payment. This is usually temporary and can be resolved by trying again or using an alternative payment method.';
      case 'INVALID_CART':
        return 'There was an issue with your cart. Please refresh the page and try adding items to your cart again.';
      default:
        return error.message || 'An unexpected error occurred. Our team has been notified and we\'re working to resolve this quickly.';
    }
  };

  const fallbackOptions = error.fallbackOptions || [
    {
      method: 'contact',
      description: 'Contact our support team to complete your purchase',
      contact: 'support@swanstudios.com'
    },
    {
      method: 'phone',
      description: 'Call us directly for immediate assistance',
      contact: '(555) 123-SWAN'
    },
    {
      method: 'retry',
      description: 'Try again in a few minutes',
      retryAfter: 300
    }
  ];

  return (
    <ErrorContainer
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <ErrorIcon
        variants={iconVariants}
        initial="hidden"
        animate="visible"
      >
        {getErrorIcon()}
      </ErrorIcon>
      
      <ErrorTitle>{getErrorTitle()}</ErrorTitle>
      <ErrorMessage>{getErrorMessage()}</ErrorMessage>
      
      <FallbackOptions>
        {fallbackOptions.map((option, index) => (
          <FallbackCard
            key={option.method}
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <FallbackIcon>
              {option.method === 'contact' && <Mail />}
              {option.method === 'phone' && <Phone />}
              {option.method === 'retry' && <RefreshCw />}
            </FallbackIcon>
            
            <FallbackTitle>
              {option.method === 'contact' && 'Email Support'}
              {option.method === 'phone' && 'Phone Support'}
              {option.method === 'retry' && 'Try Again Later'}
            </FallbackTitle>
            
            <FallbackDescription>
              {option.description}
            </FallbackDescription>
            
            {option.contact && (
              <ContactInfo>
                {option.contact}
              </ContactInfo>
            )}
          </FallbackCard>
        ))}
      </FallbackOptions>
      
      {/* Retry Section */}
      {onRetry && (
        <RetrySection>
          {retryCountdown > 0 ? (
            <RetryTimer>
              <Clock />
              <span>Retry available in {formatCountdown(retryCountdown)}</span>
            </RetryTimer>
          ) : null}
          
          <ThemedGlowButton
            variant="primary"
            size="medium"
            text={retryCountdown > 0 ? `Retry in ${formatCountdown(retryCountdown)}` : "Try Again"}
            onClick={onRetry}
            disabled={retryCountdown > 0}
            leftIcon={<RefreshCw />}
          />
        </RetrySection>
      )}
      
      {onClose && (
        <div style={{ marginTop: '1rem' }}>
          <ThemedGlowButton
            variant="secondary"
            size="medium"
            text="Close"
            onClick={onClose}
          />
        </div>
      )}
    </ErrorContainer>
  );
};

export default PaymentErrorHandler;