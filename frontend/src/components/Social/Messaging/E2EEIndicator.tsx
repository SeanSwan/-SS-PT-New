/**
 * ============================================================
 * BLUEPRINT: E2EEIndicator — Encryption Status Display
 * ============================================================
 * Purpose:  Shows lock icon + E2EE status on conversations.
 *           Visual trust signal like WhatsApp's encryption notice.
 * Owner:    Phase 11 — E2EE Encryption
 * ============================================================
 */
import React from 'react';
import styled from 'styled-components';
import { Lock, LockOpen, Shield } from 'lucide-react';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const IndicatorWrapper = styled.div<{ $variant: 'inline' | 'banner' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  ${({ $variant }) => $variant === 'banner' ? `
    justify-content: center;
    padding: 6px 12px;
    background: var(--e2ee-banner-bg, rgba(96, 192, 240, 0.08));
    border-radius: 8px;
    margin: 4px 0;
  ` : ''}
`;

const IndicatorText = styled.span<{ $encrypted: boolean }>`
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  color: ${({ $encrypted }) =>
    $encrypted
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-muted, rgba(224, 236, 244, 0.4))'};
`;

const LockIcon = styled.div<{ $encrypted: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $encrypted }) =>
    $encrypted
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-muted, rgba(224, 236, 244, 0.3))'};

  svg {
    width: 12px;
    height: 12px;
  }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface E2EEIndicatorProps {
  encrypted: boolean;
  variant?: 'inline' | 'banner';
  showText?: boolean;
  onVerifyClick?: () => void;
}

const E2EEIndicator: React.FC<E2EEIndicatorProps> = ({
  encrypted,
  variant = 'inline',
  showText = true,
  onVerifyClick,
}) => {
  return (
    <IndicatorWrapper $variant={variant}>
      <LockIcon $encrypted={encrypted}>
        {encrypted ? <Lock /> : <LockOpen />}
      </LockIcon>
      {showText && (
        <IndicatorText $encrypted={encrypted}>
          {encrypted
            ? 'End-to-end encrypted'
            : 'Not encrypted'}
        </IndicatorText>
      )}
      {encrypted && onVerifyClick && (
        <VerifyButton onClick={onVerifyClick} type="button">
          <Shield size={10} />
          Verify
        </VerifyButton>
      )}
    </IndicatorWrapper>
  );
};

const VerifyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 4px;
  padding: 2px 6px;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.65rem;
  font-family: var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  min-height: 20px;
  transition: background 0.15s ease;

  &:hover {
    background: var(--accent-primary-10, rgba(96, 192, 240, 0.1));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 1px;
  }
`;

export default E2EEIndicator;
