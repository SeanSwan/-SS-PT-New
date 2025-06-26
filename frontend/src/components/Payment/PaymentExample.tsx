/**
 * PaymentExample.tsx - Example Integration for SwanStudios Payment Components
 * ========================================================================= 
 * Demonstrates how to integrate the FullScreenPaymentModal and GalaxyPaymentElement
 * Master Prompt v28.6 Aligned: Production-ready example with comprehensive error handling
 * 
 * Features:
 * - Shows both modal and embedded payment modes
 * - Comprehensive error handling examples
 * - Mobile-first responsive design
 * - Accessibility compliance demonstrations
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Monitor, ShoppingBag } from 'lucide-react';
import FullScreenPaymentModal from './FullScreenPaymentModal';
import GalaxyPaymentElement from './GalaxyPaymentElement';

// Styled Components
const ExampleContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ExampleSection = styled.section`
  margin-bottom: 3rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
`;

const SectionTitle = styled.h2`
  color: #00ffff;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const SectionDescription = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 2rem 0;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const DemoButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 153, 255, 0.1));
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 153, 255, 0.2));
    border-color: rgba(0, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    flex-shrink: 0;
  }
  
  @media (max-width: 768px) {
    padding: 0.875rem 1.25rem;
    font-size: 0.95rem;
  }
`;

const EmbeddedContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 1rem;
  border: 1px solid rgba(0, 255, 255, 0.2);
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const StatusMessage = styled(motion.div)<{ $type: 'success' | 'error' | 'info' }>`
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  background: ${props => 
    props.$type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
    props.$type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
    'rgba(59, 130, 246, 0.1)'
  };
  border: 1px solid ${props => 
    props.$type === 'success' ? 'rgba(16, 185, 129, 0.3)' :
    props.$type === 'error' ? 'rgba(239, 68, 68, 0.3)' :
    'rgba(59, 130, 246, 0.3)'
  };
  color: ${props => 
    props.$type === 'success' ? '#10b981' :
    props.$type === 'error' ? '#ef4444' :
    '#3b82f6'
  };
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
`;

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    font-size: 0.8rem;
  }
`;

// TypeScript Interface
interface PaymentExampleProps {
  // Add any props needed for your specific implementation
}

/**
 * PaymentExample Component
 * Demonstrates integration patterns for SwanStudios payment components
 */
const PaymentExample: React.FC<PaymentExampleProps> = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [embeddedVisible, setEmbeddedVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  const handlePaymentSuccess = () => {
    setStatusMessage('🎉 Payment completed successfully! Redirecting to success page...');
    setStatusType('success');
    setModalOpen(false);
    setEmbeddedVisible(false);
    
    // Simulate redirect after success
    setTimeout(() => {
      setStatusMessage('In a real app, user would be redirected to CheckoutSuccess page');
      setStatusType('info');
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setStatusMessage(`❌ Payment failed: ${error}`);
    setStatusType('error');
  };

  const openFullScreenModal = () => {
    setModalOpen(true);
    setStatusMessage('Opening full-screen payment modal - perfect for mobile devices');
    setStatusType('info');
  };

  const openEmbeddedPayment = () => {
    setEmbeddedVisible(true);
    setStatusMessage('Showing embedded payment form - great for desktop integration');
    setStatusType('info');
  };

  const closeEmbedded = () => {
    setEmbeddedVisible(false);
    setStatusMessage('Embedded payment form closed');
    setStatusType('info');
  };

  return (
    <ExampleContainer>
      <ExampleSection>
        <SectionTitle>
          <CreditCard size={24} />
          SwanStudios Payment Integration Examples
        </SectionTitle>
        <SectionDescription>
          This page demonstrates how to integrate the SwanStudios payment components into your application. 
          Choose between full-screen modal (recommended for mobile) or embedded payment forms (great for desktop).
        </SectionDescription>

        <ButtonGrid>
          <DemoButton
            onClick={openFullScreenModal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Smartphone size={20} />
            <div>
              <div style={{ fontWeight: 600 }}>Full-Screen Modal</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Perfect for mobile devices</div>
            </div>
          </DemoButton>

          <DemoButton
            onClick={openEmbeddedPayment}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Monitor size={20} />
            <div>
              <div style={{ fontWeight: 600 }}>Embedded Payment</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Great for desktop integration</div>
            </div>
          </DemoButton>
        </ButtonGrid>

        {statusMessage && (
          <StatusMessage
            $type={statusType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {statusMessage}
          </StatusMessage>
        )}
      </ExampleSection>

      <ExampleSection>
        <SectionTitle>
          <ShoppingBag size={24} />
          Usage Examples
        </SectionTitle>
        <SectionDescription>
          Here's how to integrate these components into your React application:
        </SectionDescription>

        <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>1. Full-Screen Modal (Recommended for Mobile)</h3>
        <CodeBlock>{`import FullScreenPaymentModal from './components/Payment/FullScreenPaymentModal';

function CheckoutPage() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handlePaymentSuccess = () => {
    // Handle successful payment
    navigate('/checkout/success');
  };

  return (
    <>
      <button onClick={() => setPaymentModalOpen(true)}>
        Complete Payment
      </button>
      
      <FullScreenPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}`}</CodeBlock>

        <h3 style={{ color: '#00ffff', margin: '2rem 0 1rem 0' }}>2. Embedded Payment Form</h3>
        <CodeBlock>{`import GalaxyPaymentElement from './components/Payment/GalaxyPaymentElement';

function CheckoutPage() {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div>
      {showPayment && (
        <GalaxyPaymentElement
          isOpen={true}
          onClose={() => setShowPayment(false)}
          onSuccess={() => navigate('/checkout/success')}
          embedded={true}
        />
      )}
    </div>
  );
}`}</CodeBlock>

        <h3 style={{ color: '#00ffff', margin: '2rem 0 1rem 0' }}>3. Error Handling</h3>
        <CodeBlock>{`// Both components provide comprehensive error handling
const handlePaymentError = (error) => {
  console.error('Payment failed:', error);
  
  // Show user-friendly error message
  setErrorMessage('Payment could not be processed. Please try again.');
  
  // Optional: Log to analytics
  analytics.track('payment_failed', { error });
};

<FullScreenPaymentModal
  isOpen={paymentModalOpen}
  onClose={() => setPaymentModalOpen(false)}
  onSuccess={handlePaymentSuccess}
  onError={handlePaymentError}  // Optional error handler
/>`}</CodeBlock>
      </ExampleSection>

      {/* Embedded Payment Demo */}
      {embeddedVisible && (
        <ExampleSection>
          <SectionTitle>
            <Monitor size={24} />
            Embedded Payment Demo
          </SectionTitle>
          <SectionDescription>
            This is how the embedded payment form looks when integrated into your page:
          </SectionDescription>
          
          <EmbeddedContainer>
            <GalaxyPaymentElement
              isOpen={true}
              onClose={closeEmbedded}
              onSuccess={handlePaymentSuccess}
              embedded={true}
            />
          </EmbeddedContainer>
        </ExampleSection>
      )}

      {/* Full-Screen Modal */}
      <FullScreenPaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </ExampleContainer>
  );
};

export default PaymentExample;
