/**
 * ============================================================
 * BLUEPRINT: SafetyNumberDialog — Identity Verification
 * ============================================================
 * Purpose:  Display safety number for E2EE identity verification.
 *           Users compare numbers to verify they're talking to
 *           the right person (like Signal/WhatsApp).
 * Owner:    Phase 11 — E2EE Encryption
 * ============================================================
 */
import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Shield, ShieldCheck, Copy, Check, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

const DialogCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.15));
  border-radius: 16px;
  padding: 28px;
  max-width: 400px;
  width: 100%;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  cursor: pointer;
  padding: 4px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: var(--bg-hover, rgba(96, 192, 240, 0.08));
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
`;

const ShieldIcon = styled.div`
  color: var(--accent-primary, #60C0F0);
  display: flex;
`;

const Title = styled.h3`
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const Description = styled.p`
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  line-height: 1.5;
  margin: 0 0 20px;
`;

const NumberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  padding: 16px;
  background: var(--bg-base, #0A0A0F);
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.1));
  margin-bottom: 16px;
  font-family: var(--font-data, 'Fira Code', monospace);
`;

const NumberCell = styled.span`
  text-align: center;
  font-size: 0.85rem;
  color: var(--accent-primary, #60C0F0);
  padding: 4px 0;
  letter-spacing: 0.05em;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  border-top-color: var(--accent-primary, #60C0F0);
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  margin: 20px auto;
`;

const CopyRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-hover, rgba(96, 192, 240, 0.08));
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.15));
  border-radius: 8px;
  padding: 8px 16px;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8rem;
  font-family: var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  min-height: 44px;
  transition: background 0.15s ease;

  &:hover {
    background: var(--accent-primary-10, rgba(96, 192, 240, 0.15));
  }
`;

const Hint = styled.p`
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  text-align: center;
  margin: 12px 0 0;
  line-height: 1.4;
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SafetyNumberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  safetyNumber: string | null;
  loading?: boolean;
}

const SafetyNumberDialog: React.FC<SafetyNumberDialogProps> = ({
  isOpen,
  onClose,
  participantName,
  safetyNumber,
  loading = false,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  if (!isOpen) return null;

  const numberGroups = safetyNumber
    ? safetyNumber.split(' ')
    : [];

  const handleCopy = async () => {
    if (!safetyNumber) return;
    try {
      await navigator.clipboard.writeText(safetyNumber);
      setCopied(true);
    } catch {
      // Clipboard not available
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <DialogCard role="dialog" aria-label="Safety number verification">
        <CloseButton onClick={onClose} aria-label="Close">
          <X size={18} />
        </CloseButton>

        <Header>
          <ShieldIcon>
            <ShieldCheck size={24} />
          </ShieldIcon>
          <Title>Verify Security</Title>
        </Header>

        <Description>
          Compare this safety number with {participantName} to verify your
          conversation is end-to-end encrypted with the right person.
          Both of you should see the same number.
        </Description>

        {loading ? (
          <Spinner />
        ) : safetyNumber ? (
          <>
            <NumberGrid>
              {numberGroups.map((group, i) => (
                <NumberCell key={i}>{group}</NumberCell>
              ))}
            </NumberGrid>
            <CopyRow>
              <CopyButton onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Number'}
              </CopyButton>
            </CopyRow>
            <Hint>
              Meet in person or use a trusted channel to compare numbers.
              If the numbers match, your conversation is secure.
            </Hint>
          </>
        ) : (
          <Description style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Both users must have E2EE enabled to generate a safety number.
          </Description>
        )}
      </DialogCard>
    </Overlay>
  );
};

export default SafetyNumberDialog;
