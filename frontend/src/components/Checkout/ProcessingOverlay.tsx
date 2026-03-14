/**
 * ProcessingOverlay — Deep-Ocean Vault payment processing state
 * ==============================================================
 * Full-screen overlay shown during payment processing.
 * Shows transaction ID, premium spinner, and 15s escape hatch.
 * Crystalline Swan theme: Royal Depth surface + Ice Wing accents.
 */
import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

interface ProcessingOverlayProps {
  transactionId?: string;
  onContactSupport?: () => void;
}

const smoothSpin = keyframes`
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Container = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 16, 48, 0.92);
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${fadeIn} 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const Card = styled.div`
  background: #003080;
  border: 1px solid #60C0F0;
  border-radius: 12px;
  padding: 48px;
  max-width: 480px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(96, 192, 240, 0.3);
`;

const Spinner = styled.svg`
  width: 64px;
  height: 64px;
  animation: ${smoothSpin} 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  filter: drop-shadow(0 0 8px rgba(96, 192, 240, 0.4));
`;

const StatusText = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  color: #E0ECF4;
  margin: 24px 0 16px;
`;

const TransactionId = styled.code`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  color: #50A0F0;
  display: block;
  margin-top: 8px;
`;

const EscapeButton = styled.button`
  margin-top: 32px;
  background: transparent;
  color: #E0ECF4;
  border: 1px solid #C6A84B;
  padding: 12px 24px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${fadeIn} 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(198, 168, 75, 0.1);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.6);
  }
`;

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  transactionId,
  onContactSupport,
}) => {
  const [showEscape, setShowEscape] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowEscape(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Container>
      <Card>
        <Spinner viewBox="0 0 64 64">
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="#60C0F0"
            strokeWidth="3"
            strokeDasharray="140 40"
          />
        </Spinner>
        <StatusText>Securing Your Investment...</StatusText>
        {transactionId && (
          <TransactionId>TXN-{transactionId}</TransactionId>
        )}
        {showEscape && (
          <EscapeButton onClick={onContactSupport || (() => window.location.href = '/contact')}>
            Contact Support
          </EscapeButton>
        )}
      </Card>
    </Container>
  );
};

export default ProcessingOverlay;
