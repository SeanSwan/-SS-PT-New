/**
 * ZellePayment — Instructions for paying via Zelle
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { CheckCircle, Copy, Zap } from 'lucide-react';
import GlowButton from '../../ui/buttons/GlowButton';

interface ZellePaymentProps {
  total: number;
  zelleRecipient: string; // email or phone
  onSubmit: () => Promise<void>;
  isProcessing: boolean;
}

const ZellePayment: React.FC<ZellePaymentProps> = ({ total, zelleRecipient, onSubmit, isProcessing }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(zelleRecipient);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Container>
      <InstructionTitle>
        <Zap size={20} />
        Pay with Zelle
      </InstructionTitle>

      <StepList>
        <Step>
          <StepNumber>1</StepNumber>
          <StepText>Open your bank's Zelle feature (Chase, BofA, Wells Fargo, etc.)</StepText>
        </Step>
        <Step>
          <StepNumber>2</StepNumber>
          <StepText>Send payment to:</StepText>
        </Step>
        <RecipientBox>
          <RecipientValue>{zelleRecipient || 'Not configured yet'}</RecipientValue>
          {zelleRecipient && (
            <CopyBtn onClick={handleCopy} aria-label="Copy Zelle recipient">
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            </CopyBtn>
          )}
        </RecipientBox>
        <Step>
          <StepNumber>3</StepNumber>
          <StepText>Amount: <strong>${total.toFixed(2)}</strong></StepText>
        </Step>
        <Step>
          <StepNumber>4</StepNumber>
          <StepText>Include your <strong>name</strong> and <strong>order number</strong> in the memo</StepText>
        </Step>
      </StepList>

      <FeeBadge>Zero Processing Fees — You save ${((total * 0.029) + 0.30).toFixed(2)} vs. card</FeeBadge>

      <Note>
        Zelle payments are typically received within minutes. Your package will be activated once we confirm the payment.
      </Note>

      <GlowButton
        text={isProcessing ? 'Placing Order...' : 'Place Order — Pay with Zelle'}
        theme="purple"
        size="large"
        onClick={onSubmit}
        disabled={isProcessing || !zelleRecipient}
      />
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const InstructionTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  color: rgba(224, 236, 244, 0.8);
`;

const StepNumber = styled.span`
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #8B5CF6;
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StepText = styled.span`
  strong { color: #60C0F0; }
`;

const RecipientBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-left: 40px;
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 10px;
`;

const RecipientValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  font-weight: 600;
  color: #60C0F0;
  flex: 1;
`;

const CopyBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(224, 236, 244, 0.5);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  &:hover { color: #8B5CF6; border-color: rgba(139, 92, 246, 0.3); }
`;

const FeeBadge = styled.div`
  padding: 10px 16px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #8B5CF6;
  text-align: center;
`;

const Note = styled.p`
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.4);
  margin: 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  line-height: 1.5;
`;

export default ZellePayment;
