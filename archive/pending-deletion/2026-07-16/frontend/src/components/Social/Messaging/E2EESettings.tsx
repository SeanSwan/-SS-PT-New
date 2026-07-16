/**
 * ============================================================
 * BLUEPRINT: E2EESettings — Encryption Toggle Panel
 * ============================================================
 * Purpose:  Settings panel for users to enable/disable E2EE.
 *           Shows encryption status, device info, key fingerprint.
 * Owner:    Phase 11 — E2EE Encryption
 * ============================================================
 */
import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { Lock, Shield, Fingerprint, AlertTriangle, Trash2 } from 'lucide-react';
import { useE2EE } from '../../../services/encryption';
import { getLocalIdentityPublicKey } from '../../../services/encryption/e2eeCrypto';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const Panel = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.1));
  border-radius: 12px;
  padding: 20px;
  max-width: 480px;
`;

const SectionTitle = styled.h4`
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.06));

  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
`;

const Value = styled.span<{ $accent?: boolean }>`
  font-family: var(--font-data, 'Fira Code', monospace);
  font-size: 0.75rem;
  color: ${({ $accent }) =>
    $accent
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-primary, #E0ECF4)'};
`;

const Toggle = styled.button<{ $active: boolean }>`
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  min-height: 44px;
  min-width: 48px;
  padding: 8px 0;
  background: ${({ $active }) =>
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--bg-hover, rgba(96, 192, 240, 0.15))'};
  transition: background 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: ${({ $active }) => ($active ? '24px' : '4px')};
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--bg-base, #0A0A0F);
    transition: left 0.2s ease;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const WarningBox = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px;
  background: rgba(198, 168, 75, 0.08);
  border: 1px solid rgba(198, 168, 75, 0.2);
  border-radius: 8px;
  margin-top: 16px;
`;

const WarningText = styled.p`
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.75rem;
  color: var(--luxury-accent, #C6A84B);
  line-height: 1.4;
  margin: 0;
`;

const FingerprintBox = styled.div`
  padding: 8px 12px;
  background: var(--bg-base, #0A0A0F);
  border-radius: 8px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FingerprintValue = styled.code`
  font-family: var(--font-data, 'Fira Code', monospace);
  font-size: 0.7rem;
  color: var(--accent-primary, #60C0F0);
  word-break: break-all;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 8px 14px;
  color: #EF4444;
  font-size: 0.75rem;
  font-family: var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  min-height: 44px;
  margin-top: 16px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.08);
  }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const E2EESettings: React.FC = () => {
  const {
    isEnabled,
    serverEncryption,
    isLoading,
    error,
    enableE2EE,
    disableE2EE,
  } = useE2EE();

  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  useEffect(() => {
    if (isEnabled) {
      getLocalIdentityPublicKey().then(key => {
        if (key) setFingerprint(key.slice(0, 32) + '...');
      });
    } else {
      setFingerprint(null);
    }
  }, [isEnabled]);

  const handleToggle = useCallback(async () => {
    if (isEnabled) {
      if (!confirmDisable) {
        setConfirmDisable(true);
        return;
      }
      await disableE2EE();
      setConfirmDisable(false);
    } else {
      await enableE2EE();
    }
  }, [isEnabled, confirmDisable, enableE2EE, disableE2EE]);

  return (
    <Panel>
      <SectionTitle>
        <Lock size={16} />
        Encryption Settings
      </SectionTitle>

      <StatusRow>
        <Label>Server-side encryption</Label>
        <Value $accent={serverEncryption}>
          {serverEncryption ? 'Active' : 'Disabled'}
        </Value>
      </StatusRow>

      <StatusRow>
        <Label>End-to-end encryption</Label>
        <Toggle
          $active={isEnabled}
          onClick={handleToggle}
          disabled={isLoading}
          aria-label={isEnabled ? 'Disable E2EE' : 'Enable E2EE'}
        />
      </StatusRow>

      {error && (
        <StatusRow>
          <Label style={{ color: '#EF4444' }}>{error}</Label>
        </StatusRow>
      )}

      {isEnabled && fingerprint && (
        <FingerprintBox>
          <Fingerprint size={14} style={{ color: 'var(--accent-primary, #60C0F0)', flexShrink: 0 }} />
          <FingerprintValue>{fingerprint}</FingerprintValue>
        </FingerprintBox>
      )}

      {confirmDisable && (
        <WarningBox>
          <AlertTriangle size={16} style={{ color: '#C6A84B', flexShrink: 0, marginTop: 2 }} />
          <WarningText>
            Disabling E2EE will remove your encryption keys from this device.
            Encrypted messages sent before disabling will become unreadable.
            Tap the toggle again to confirm.
          </WarningText>
        </WarningBox>
      )}

      {!isEnabled && (
        <WarningBox>
          <Shield size={16} style={{ color: '#C6A84B', flexShrink: 0, marginTop: 2 }} />
          <WarningText>
            When enabled, your messages are encrypted on your device before
            being sent. Only you and the recipient can read them —
            not even SwanStudios can access the content.
          </WarningText>
        </WarningBox>
      )}
    </Panel>
  );
};

export default E2EESettings;
