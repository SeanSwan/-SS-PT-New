import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Send, Bell, Settings } from 'lucide-react';
import api from '../../../../../services/api';

// Import the settings management component
import NotificationSettingsList from './NotificationSettingsList';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const PanelContainer = styled.div`
  padding: 24px;
  margin-bottom: 32px;
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;

  svg {
    color: #00ffff;
  }
`;

const PanelTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const PanelDesc = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 24px;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  min-height: 44px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#00ffff' : 'transparent'};
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;

  &:hover {
    color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.9)'};
  }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
  margin: 8px 0;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const InputLabel = styled.label`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8px;
  display: block;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: ${props => props.$variant === 'secondary'
    ? 'rgba(120, 81, 169, 0.3)'
    : 'rgba(0, 255, 255, 0.15)'};
  color: ${props => props.$variant === 'secondary' ? '#b388ff' : '#00ffff'};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'secondary'
      ? 'rgba(120, 81, 169, 0.4)'
      : 'rgba(0, 255, 255, 0.25)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const HelpText = styled.span`
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 24px 0;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin: 0 0 16px;
`;

const FieldRow = styled.div`
  display: flex;
  gap: 16px;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const FieldGroup = styled.div`
  flex: 1;
`;

const AlertBanner = styled.div<{ $severity: 'error' | 'success' }>`
  padding: 12px 16px;
  margin-top: 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  background: ${props => props.$severity === 'error'
    ? 'rgba(244, 67, 54, 0.1)'
    : 'rgba(76, 175, 80, 0.1)'};
  border: 1px solid ${props => props.$severity === 'error'
    ? 'rgba(244, 67, 54, 0.3)'
    : 'rgba(76, 175, 80, 0.3)'};
  color: ${props => props.$severity === 'error' ? '#ef5350' : '#66bb6a'};
`;

const Toast = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) ${props => props.$visible ? 'translateY(0)' : 'translateY(20px)'};
  opacity: ${props => props.$visible ? 1 : 0};
  background: rgba(29, 31, 43, 0.95);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #66bb6a;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.875rem;
  z-index: 1000;
  transition: all 0.3s ease;
  pointer-events: none;
`;

/**
 * NotificationTester Component
 *
 * A utility component for admin users to test email and SMS notifications
 */
const NotificationTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [showToast, setShowToast] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (success) {
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setSuccess(null), 300);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleTestAdminNotification = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const response = await api.post('/test-notifications/admin', { message });
      setSuccess('Admin notification sent successfully! Check your email and phone.');
    } catch (err: any) {
      setError(`Failed to send admin notification: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestDirectNotification = async () => {
    if (!email && !phone) {
      setError('Please provide either an email or phone number');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const response = await api.post('/test-notifications/direct', { email, phone, message });
      setSuccess(`Direct notification sent successfully to ${email || ''} ${phone || ''}!`);
    } catch (err: any) {
      setError(`Failed to send direct notification: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelContainer>
      <PanelHeader>
        <Bell size={20} />
        <PanelTitle>Notification Management</PanelTitle>
      </PanelHeader>

      <PanelDesc>Send test notifications and manage notification settings.</PanelDesc>

      <TabBar>
        <TabButton
          $active={tabValue === 0}
          onClick={() => setTabValue(0)}
          role="tab"
          id="notification-tab-0"
          aria-controls="notification-tabpanel-0"
          aria-selected={tabValue === 0}
        >
          <Send size={16} /> Send Test Notifications
        </TabButton>
        <TabButton
          $active={tabValue === 1}
          onClick={() => setTabValue(1)}
          role="tab"
          id="notification-tab-1"
          aria-controls="notification-tabpanel-1"
          aria-selected={tabValue === 1}
        >
          <Settings size={16} /> Notification Settings
        </TabButton>
      </TabBar>

      {/* Test Notifications Tab */}
      <div
        role="tabpanel"
        hidden={tabValue !== 0}
        id="notification-tabpanel-0"
        aria-labelledby="notification-tab-0"
      >
        {tabValue === 0 && (
          <>
            <InputLabel htmlFor="test-message">Test Message</InputLabel>
            <StyledInput
              id="test-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a test message to send"
            />

            <div style={{ marginTop: 16, marginBottom: 24 }}>
              <ActionButton onClick={handleTestAdminNotification} disabled={loading}>
                {loading ? <Spinner /> : <Send size={16} />}
                Test Admin Notifications
              </ActionButton>
              <HelpText>
                This will send notifications to all configured admin emails and phones.
              </HelpText>
            </div>

            <Divider />

            <SectionTitle>Test Direct Notification</SectionTitle>

            <FieldRow>
              <FieldGroup>
                <InputLabel htmlFor="email-field">Email Address</InputLabel>
                <StyledInput
                  id="email-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter an email address"
                />
              </FieldGroup>
              <FieldGroup>
                <InputLabel htmlFor="phone-field">Phone Number</InputLabel>
                <StyledInput
                  id="phone-field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., +13239968153"
                />
              </FieldGroup>
            </FieldRow>

            <div style={{ marginTop: 16 }}>
              <ActionButton
                $variant="secondary"
                onClick={handleTestDirectNotification}
                disabled={loading || (!email && !phone)}
              >
                {loading ? <Spinner /> : <Send size={16} />}
                Test Direct Notification
              </ActionButton>
            </div>

            {error && <AlertBanner $severity="error">{error}</AlertBanner>}
            {success && <AlertBanner $severity="success">{success}</AlertBanner>}
          </>
        )}
      </div>

      {/* Notification Settings Tab */}
      <div
        role="tabpanel"
        hidden={tabValue !== 1}
        id="notification-tabpanel-1"
        aria-labelledby="notification-tab-1"
      >
        {tabValue === 1 && <NotificationSettingsList />}
      </div>

      <Toast $visible={showToast}>{success}</Toast>
    </PanelContainer>
  );
};

export default NotificationTester;
