/**
 * CheckPayment — Instructions for paying by check
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { CheckCircle, Copy, FileText } from 'lucide-react';
import GlowButton from '../../ui/buttons/GlowButton';

interface CheckPaymentProps {
  total: number;
  payeeName: string;
  onSubmit: () => Promise<void>;
  isProcessing: boolean;
}

const CheckPayment: React.FC<CheckPaymentProps> = ({ total, payeeName, onSubmit, isProcessing }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(payeeName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Container>
      <InstructionTitle>
        <FileText size={20} />
        Pay by Check
      </InstructionTitle>

      <StepList>
        <Step>
          <StepNumber>1</StepNumber>
          <StepText>Make check payable to:</StepText>
        </Step>
        <PayeeBox>
          <PayeeName>{payeeName || 'Sean Swan'}</PayeeName>
          <CopyBtn onClick={handleCopy} aria-label="Copy payee name">
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
          </CopyBtn>
        </PayeeBox>
        <Step>
          <StepNumber>2</StepNumber>
          <StepText>Write amount: <strong>${total.toFixed(2)}</strong></StepText>
        </Step>
        <Step>
          <StepNumber>3</StepNumber>
          <StepText>Mail to the address provided after placing your order</StepText>
        </Step>
      </StepList>

      <Note>
        Your package will be activated once we receive and process your check (typically 5-7 business days).
      </Note>

      <GlowButton
        text={isProcessing ? 'Placing Order...' : 'Place Order — Pay by Check'}
        theme="purple"
        size="large"
        onClick={onSubmit}
        disabled={isProcessing}
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

const PayeeBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-left: 40px;
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 10px;
`;

const PayeeName = styled.span`
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
  color: rgba(224, 236, 244, 0.7);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover { color: #8B5CF6; border-color: rgba(139, 92, 246, 0.3); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const Note = styled.p`
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.7);
  margin: 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  line-height: 1.5;
`;

export default CheckPayment;
