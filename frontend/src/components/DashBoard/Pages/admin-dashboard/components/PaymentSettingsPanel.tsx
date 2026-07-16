/**
 * PaymentSettingsPanel
 * ====================
 * Admin panel for configuring payment method details (Zelle, Venmo, Check).
 * Lives in Store & Revenue workspace as a tab.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Settings, Phone, AtSign, FileText, Save, Check, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../../../../services/api.service';

interface PaymentSettings {
  zelleRecipient: string;
  venmoHandle: string;
  checkPayeeName: string;
}

const DEFAULTS: PaymentSettings = {
  zelleRecipient: '',
  venmoHandle: '',
  checkPayeeName: 'SwanStudios',
};

const PaymentSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULTS);
  const [original, setOriginal] = useState<PaymentSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/payment-settings');
      if (res.data?.success && res.data.settings) {
        setSettings(res.data.settings);
        setOriginal(res.data.settings);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await api.put('/api/admin/payment-settings', settings);
      if (res.data?.success) {
        setOriginal(res.data.settings);
        setSettings(res.data.settings);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...original });
    setSaveStatus('idle');
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <SpinIcon><RefreshCw size={24} /></SpinIcon>
          Loading payment settings...
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderIcon><Settings size={22} /></HeaderIcon>
        <div>
          <Title>Payment Method Settings</Title>
          <Subtitle>Configure your Zelle, Venmo, and Check payment details for customers</Subtitle>
        </div>
      </Header>

      <SettingsGrid>
        <SettingCard>
          <CardHeader>
            <CardIcon $color="#6D28D9">⚡</CardIcon>
            <CardTitle>Zelle</CardTitle>
            <ZeroBadge>Zero Fee</ZeroBadge>
          </CardHeader>
          <CardDescription>
            Phone number or email registered with your bank&apos;s Zelle service.
            Customers will send payments to this number/email.
          </CardDescription>
          <InputGroup>
            <InputLabel htmlFor="payment-zelle-recipient">
              <Phone size={14} />
              Zelle Phone or Email
            </InputLabel>
            <StyledInput
              id="payment-zelle-recipient"
              type="text"
              value={settings.zelleRecipient}
              onChange={(e) => setSettings(prev => ({ ...prev, zelleRecipient: e.target.value }))}
              placeholder="e.g., pay@sswanstudios.com"
            />
          </InputGroup>
          <StatusIndicator $active={!!settings.zelleRecipient}>
            {settings.zelleRecipient ? 'Configured — visible to customers' : 'Not configured — Zelle option disabled at checkout'}
          </StatusIndicator>
        </SettingCard>

        <SettingCard>
          <CardHeader>
            <CardIcon $color="#3B82F6">📱</CardIcon>
            <CardTitle>Venmo</CardTitle>
          </CardHeader>
          <CardDescription>
            Your Venmo business handle. Customers will send payments to this handle.
            Business accounts recommended for buyer protection.
          </CardDescription>
          <InputGroup>
            <InputLabel htmlFor="payment-venmo-handle">
              <AtSign size={14} />
              Venmo Handle
            </InputLabel>
            <StyledInput
              id="payment-venmo-handle"
              type="text"
              value={settings.venmoHandle}
              onChange={(e) => setSettings(prev => ({ ...prev, venmoHandle: e.target.value }))}
              placeholder="e.g., @SwanStudios"
            />
          </InputGroup>
          <StatusIndicator $active={!!settings.venmoHandle}>
            {settings.venmoHandle ? 'Configured — visible to customers' : 'Not configured — Venmo option disabled at checkout'}
          </StatusIndicator>
        </SettingCard>

        <SettingCard>
          <CardHeader>
            <CardIcon $color="#059669">📄</CardIcon>
            <CardTitle>Check</CardTitle>
            <ZeroBadge>Zero Fee</ZeroBadge>
          </CardHeader>
          <CardDescription>
            The payee name customers should write on checks.
            This appears in the checkout instructions.
          </CardDescription>
          <InputGroup>
            <InputLabel htmlFor="payment-check-payee">
              <FileText size={14} />
              Check Payee Name
            </InputLabel>
            <StyledInput
              id="payment-check-payee"
              type="text"
              value={settings.checkPayeeName}
              onChange={(e) => setSettings(prev => ({ ...prev, checkPayeeName: e.target.value }))}
              placeholder="e.g., SwanStudios LLC"
            />
          </InputGroup>
          <StatusIndicator $active={!!settings.checkPayeeName}>
            {settings.checkPayeeName ? `Checks payable to: "${settings.checkPayeeName}"` : 'Not configured'}
          </StatusIndicator>
        </SettingCard>
      </SettingsGrid>

      <ActionBar>
        <ActionLeft>
          {saveStatus === 'success' && (
            <SuccessMsg><Check size={16} /> Settings saved successfully</SuccessMsg>
          )}
          {saveStatus === 'error' && (
            <ErrorMsg><AlertCircle size={16} /> Failed to save — please try again</ErrorMsg>
          )}
        </ActionLeft>
        <ActionRight>
          <ResetBtn onClick={handleReset} disabled={!hasChanges || saving}>
            Reset
          </ResetBtn>
          <SaveBtn onClick={handleSave} disabled={!hasChanges || saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </SaveBtn>
        </ActionRight>
      </ActionBar>
    </Container>
  );
};

export default PaymentSettingsPanel;

// ── Styled Components ──

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
`;

const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(139, 92, 246, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B5CF6;
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: rgba(224, 236, 244, 0.6);
  margin: 4px 0 0;
`;

const SettingsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SettingCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 12px;
  padding: 24px;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: rgba(96, 192, 240, 0.25);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const CardIcon = styled.span<{ $color: string }>`
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}20`};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #E0ECF4;
  margin: 0;
`;

const ZeroBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8B5CF6;
  background: rgba(139, 92, 246, 0.15);
  padding: 3px 8px;
  border-radius: 6px;
`;

const CardDescription = styled.p`
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.5);
  margin: 0 0 16px;
  line-height: 1.5;
`;

const InputGroup = styled.div`
  margin-bottom: 12px;
`;

const InputLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.7);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Fira Code', monospace;
  font-size: 0.95rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;

  &::placeholder {
    color: rgba(224, 236, 244, 0.3);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  &:focus {
    outline: none;
    border-color: #8B5CF6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  }
`;

const StatusIndicator = styled.div<{ $active: boolean }>`
  font-size: 0.8rem;
  color: ${({ $active }) => $active ? 'rgba(52, 211, 153, 0.9)' : 'rgba(251, 191, 36, 0.8)'};
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $active }) => $active ? '#34D399' : '#FBBF24'};
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(96, 192, 240, 0.1);
`;

const ActionLeft = styled.div``;
const ActionRight = styled.div`
  display: flex;
  gap: 12px;
`;

const SuccessMsg = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #34D399;
  font-size: 0.875rem;
  font-weight: 500;
`;

const ErrorMsg = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #F87171;
  font-size: 0.875rem;
  font-weight: 500;
`;

const ResetBtn = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: transparent;
  color: rgba(224, 236, 244, 0.7);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;

  &:hover:not(:disabled) {
    border-color: rgba(96, 192, 240, 0.4);
    color: #E0ECF4;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const SaveBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #8B5CF6, #6D28D9);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinIcon = styled.div`
  color: #8B5CF6;
  animation: ${spin} 1s linear infinite;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 0;
  color: rgba(224, 236, 244, 0.6);
  font-size: 0.95rem;
`;
