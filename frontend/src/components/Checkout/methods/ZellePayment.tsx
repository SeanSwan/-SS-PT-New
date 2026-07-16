/**
 * ZellePayment — Zelle QR code + instructions for instant payment
 * QR code is the primary CTA — scan and done. Manual steps below as fallback.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { CheckCircle, Copy, Smartphone } from 'lucide-react';
import GlowButton from '../../ui/buttons/GlowButton';
import ZelleQR from '../../../assets/Zelle.png';

interface ZellePaymentProps {
  total: number;
  zelleRecipient: string;
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

  const cardFee = (total * 0.029) + 0.30;

  return (
    <Container>
      {/* ── QR Code — Primary Action ── */}
      <QRSection>
        <QRCard>
          <QRImage src={ZelleQR} alt="Scan to pay with Zelle" />
        </QRCard>
        <QRInfo>
          <ScanLabel><Smartphone size={18} /> Scan to Pay Instantly</ScanLabel>
          <ScanHint>Open your banking app&apos;s Zelle feature and scan this QR code</ScanHint>
          <AmountBadge>${total.toFixed(2)}</AmountBadge>
        </QRInfo>
      </QRSection>

      <FeeBadge>Zero Processing Fees — You save ${cardFee.toFixed(2)} vs. card</FeeBadge>

      {/* ── Manual Fallback ── */}
      <Divider>
        <DividerLine />
        <DividerText>or send manually</DividerText>
        <DividerLine />
      </Divider>

      <StepList>
        <Step>
          <StepNumber>1</StepNumber>
          <StepText>Open your bank&apos;s Zelle (Chase, BofA, Wells Fargo, etc.)</StepText>
        </Step>
        <Step>
          <StepNumber>2</StepNumber>
          <StepText>Send to:</StepText>
        </Step>
        <RecipientBox>
          <RecipientValue>{zelleRecipient || 'Not configured yet'}</RecipientValue>
          {zelleRecipient && (
            <CopyBtn onClick={handleCopy} aria-label="Copy Zelle recipient">
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
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

      <Note>
        Zelle payments are typically received within minutes. Your package will be activated once we confirm payment.
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

export default ZellePayment;

// ── Styled Components ──

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

const QRSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 16px;
  box-shadow: inset 0 0 20px rgba(96, 192, 240, 0.05), 0 8px 32px rgba(0, 32, 96, 0.4);

  @media (max-width: 500px) {
    flex-direction: column;
    text-align: center;
  }
`;

const QRCard = styled.div`
  flex-shrink: 0;
  width: 160px;
  height: 160px;
  background: #E0ECF4;
  border: 2px solid rgba(224, 236, 244, 0.8);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.25);
`;

const QRImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 4px;
`;

const QRInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`;

const ScanLabel = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #E0ECF4;
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 500px) {
    justify-content: center;
  }
`;

const ScanHint = styled.p`
  font-size: 0.85rem;
  font-family: 'Sora', sans-serif;
  color: rgba(224, 236, 244, 0.7);
  margin: 0;
  line-height: 1.4;
`;

const AmountBadge = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: #60C0F0;
  margin-top: 4px;
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

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: rgba(96, 192, 240, 0.1);
`;

const DividerText = styled.span`
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
`;

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.7);
`;

const StepNumber = styled.span`
  width: 24px; height: 24px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: #8B5CF6;
  font-weight: 700;
  font-size: 0.75rem;
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
  padding: 10px 14px;
  margin-left: 36px;
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 10px;
`;

const RecipientValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: #60C0F0;
  flex: 1;
`;

const CopyBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(224, 236, 244, 0.7);
  cursor: pointer;
  padding: 6px 10px;
  font-size: 0.75rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  &:hover { color: #8B5CF6; border-color: rgba(139, 92, 246, 0.3); }
  &:active { transform: scale(0.94); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const Note = styled.p`
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.7);
  margin: 0;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  line-height: 1.5;
`;
