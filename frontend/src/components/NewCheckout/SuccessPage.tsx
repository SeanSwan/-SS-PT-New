/**
 * SuccessPage.tsx - Genesis Checkout Success Handler
 * =================================================
 * 
 * Handles successful Stripe Checkout redirects and order completion
 * 
 * Features:
 * ✅ Stripe session verification
 * ✅ Order completion processing
 * ✅ Admin dashboard data integration
 * ✅ Session addition to user account
 * ✅ Galaxy-themed success animation
 * ✅ Mobile-first responsive design
 * ✅ GlowButton integration for actions
 * 
 * URL Parameters:
 * - session_id: Stripe checkout session ID
 * 
 * Admin Dashboard Integration:
 * - Updates financial analytics
 * - Records successful transactions
 * - Triggers user session additions
 * 
 * Master Prompt v35 Compliance:
 * - Simple success handling
 * - No complex state management
 * - Admin dashboard connectivity
 * - GlowButton usage throughout
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import GlowButton from '../ui/buttons/GlowButton';
import api from '../../services/api.service';
import {
  CheckCircle, Star, Sparkles, Trophy, Calendar,
  DollarSign, Package, Users, ArrowRight, Home,
  Download, Share, Mail, AlertTriangle, Loader
} from 'lucide-react';

// Galaxy-themed animations
const successPulse = keyframes`
  0% { 
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 60px rgba(16, 185, 129, 0.8);
    transform: scale(1.05);
  }
  100% { 
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);
    transform: scale(1);
  }
`;

const stellarCelebration = keyframes`
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(90deg) scale(1.1); }
  50% { transform: rotate(180deg) scale(1.2); }
  75% { transform: rotate(270deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
`;

const galaxyShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const SuccessContainer = styled(motion.div)`
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #0a0a1a 100%);
  border-radius: 24px;
  border: 1px solid rgba(16, 185, 129, 0.3);
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 800px;
  margin: 2rem auto;
  padding: 0;
  animation: ${successPulse} 3s infinite;
  
  @media (max-width: 768px) {
    max-width: 100%;
    margin: 1rem;
    border-radius: 16px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #10b981, #059669, #10b981);
    animation: ${galaxyShimmer} 3s infinite;
  }
`;

const SuccessHeader = styled.div`
  padding: 3rem 2rem 2rem;
  text-align: center;
  background: rgba(16, 185, 129, 0.05);
  border-bottom: 1px solid rgba(16, 185, 129, 0.2);
  
  @media (max-width: 768px) {
    padding: 2rem 1rem 1.5rem;
  }
`;

const SuccessIcon = styled(motion.div)`
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 50%;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  animation: ${stellarCelebration} 4s infinite;
  
  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
    margin-bottom: 1.5rem;
  }
`;

const SuccessTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #10b981, #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 1rem 0;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SuccessSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const SuccessContent = styled.div`
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const OrderDetailsCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 2rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #10b981;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DetailItem = styled.div`
  text-align: center;
  padding: 1rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 12px;
`;

const DetailIcon = styled.div`
  color: #10b981;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
`;

const DetailLabel = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin: 0 0 0.25rem 0;
`;

const DetailValue = styled.p`
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const SessionsHighlight = styled(motion.div)`
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
`;

const SessionsTitle = styled.h3`
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const SessionsCount = styled.div`
  color: #ffffff;
  font-size: 3rem;
  font-weight: 700;
  margin: 0.5rem 0;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const SessionsDescription = styled.p`
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 1rem;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
`;

const LoadingCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 3rem 2rem;
  text-align: center;
`;

const ErrorCard = styled(motion.div)`
  background: rgba(239, 68, 68, 0.1);
  border-radius: 16px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 2rem;
  text-align: center;
`;

// Component State Interface
interface OrderData {
  sessionId: string;
  amount: number;
  sessionsAdded: number;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  items: any[];
}

const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    verifyAndCompleteOrder();
  }, [sessionId]);

  /**
   * Verify Stripe session and complete order
   * Integrates with admin dashboard for analytics
   */
  const verifyAndCompleteOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🎉 [Success Page] Verifying Stripe session:', sessionId);

      // Verify the session with backend
      const response = await api.post('/api/v2/payments/verify-session', {
        sessionId
      });

      if (response.data.success) {
        const orderData = response.data.data;
        setOrderData(orderData);

        console.log('✅ [Success Page] Order verified:', orderData);

        // ADMIN DASHBOARD INTEGRATION: Record successful transaction
        try {
          await api.post('/api/financial/record-transaction', {
            sessionId,
            userId: user?.id,
            amount: orderData.amount,
            type: 'payment_success',
            sessionsAdded: orderData.sessionsAdded,
            timestamp: new Date().toISOString()
          });
          console.log('📊 [Admin Dashboard] Transaction recorded for analytics');
        } catch (analyticsError) {
          console.warn('⚠️ [Admin Dashboard] Analytics recording failed:', analyticsError);
          // Don't fail the success page for analytics errors
        }

        // Clear the cart after successful purchase
        clearCart();

        // Show success toast
        toast({
          title: "Payment Successful!",
          description: `${orderData.sessionsAdded} training sessions added to your account.`,
          duration: 5000,
        });

      } else {
        throw new Error(response.data.message || 'Order verification failed');
      }

    } catch (error: any) {
      console.error('💥 [Success Page] Verification failed:', error.message);
      setError(error.response?.data?.message || error.message || 'Order verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to dashboard
   */
  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  /**
   * Navigate to home
   */
  const handleGoToHome = () => {
    navigate('/');
  };

  /**
   * Download receipt (future feature)
   */
  const handleDownloadReceipt = () => {
    toast({
      title: "Receipt Download",
      description: "Receipt download will be available soon. Check your email for confirmation.",
      duration: 3000,
    });
  };

  // Loading State
  if (isLoading) {
    return (
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
          <Loader size={48} color="#3b82f6" className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#3b82f6', margin: '0 0 0.5rem 0' }}>Verifying Your Payment</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
            Please wait while we confirm your order...
          </p>
        </LoadingCard>
      </SuccessContainer>
    );
  }

  // Error State
  if (error) {
    return (
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
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#ef4444', margin: '0 0 0.5rem 0' }}>Verification Error</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 2rem 0' }}>
            {error}
          </p>
          <GlowButton
            variant="primary"
            size="medium"
            onClick={handleGoToHome}
          >
            <Home size={16} />
            Return Home
          </GlowButton>
        </ErrorCard>
      </SuccessContainer>
    );
  }

  // Success State
  return (
    <SuccessContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <SuccessHeader>
        <SuccessIcon
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <CheckCircle size={50} color="#ffffff" />
        </SuccessIcon>
        <SuccessTitle>Payment Successful!</SuccessTitle>
        <SuccessSubtitle>
          Your training package purchase has been completed successfully
        </SuccessSubtitle>
      </SuccessHeader>

      <SuccessContent>
        {/* Sessions Highlight */}
        {orderData && orderData.sessionsAdded > 0 && (
          <SessionsHighlight
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <SessionsTitle>
              <Calendar size={24} />
              Training Sessions Added
            </SessionsTitle>
            <SessionsCount>{orderData.sessionsAdded}</SessionsCount>
            <SessionsDescription>
              Premium training sessions are now available in your account
            </SessionsDescription>
          </SessionsHighlight>
        )}

        {/* Order Details */}
        {orderData && (
          <OrderDetailsCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <CardTitle>
              <Package size={20} />
              Order Details
            </CardTitle>
            
            <DetailGrid>
              <DetailItem>
                <DetailIcon>
                  <DollarSign size={20} />
                </DetailIcon>
                <DetailLabel>Amount Paid</DetailLabel>
                <DetailValue>${orderData.amount.toFixed(2)}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailIcon>
                  <Users size={20} />
                </DetailIcon>
                <DetailLabel>Customer</DetailLabel>
                <DetailValue>{orderData.customerName}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailIcon>
                  <Mail size={20} />
                </DetailIcon>
                <DetailLabel>Email</DetailLabel>
                <DetailValue>{orderData.customerEmail}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailIcon>
                  <Calendar size={20} />
                </DetailIcon>
                <DetailLabel>Date</DetailLabel>
                <DetailValue>{new Date(orderData.orderDate).toLocaleDateString()}</DetailValue>
              </DetailItem>
            </DetailGrid>
          </OrderDetailsCard>
        )}

        {/* Action Buttons */}
        <ActionGrid>
          <GlowButton
            variant="primary"
            size="large"
            fullWidth
            onClick={handleGoToDashboard}
            rightIcon={<ArrowRight size={20} />}
          >
            <Trophy size={20} />
            Go to Dashboard
          </GlowButton>
          
          <GlowButton
            variant="emerald"
            size="large"
            fullWidth
            onClick={handleDownloadReceipt}
            rightIcon={<Download size={20} />}
          >
            <Package size={20} />
            Download Receipt
          </GlowButton>
          
          <GlowButton
            variant="cosmic"
            size="large"
            fullWidth
            onClick={handleGoToHome}
            rightIcon={<Home size={20} />}
          >
            <Star size={20} />
            Return Home
          </GlowButton>
        </ActionGrid>
      </SuccessContent>
    </SuccessContainer>
  );
};

export default SuccessPage;
