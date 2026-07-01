import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import apiService from '../services/api.service';
import { PASSWORD_POLICY_COPY, isActivationPasswordStrong } from './activationPasswordPolicy';

const PageOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  background: var(--bg-base, #002060);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FormCard = styled(motion.div)`
  width: 90%;
  max-width: 420px;
  background: var(--card-bg, rgba(30, 30, 50, 0.95));
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.15));
  border-radius: 12px;
  padding: 40px 30px;
  box-shadow: 0 0 30px var(--shadow-purple-soft, rgba(139, 92, 246, 0.05));
`;

const Title = styled.h2`
  text-align: center;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 8px;
  font-size: 1.5rem;
`;

const Subtitle = styled.p`
  text-align: center;
  color: var(--text-secondary, rgba(255, 255, 255, 0.72));
  margin-bottom: 24px;
  font-size: 0.9rem;
`;

const Label = styled.label`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0 0 8px;
`;

const InputField = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  border: 2px solid var(--input-border, rgba(139, 92, 246, 0.4));
  border-radius: 8px;
  background: var(--input-bg, rgba(0, 32, 96, 0.8));
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  min-height: 44px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 3px var(--focus-ring, rgba(96, 192, 240, 0.25));
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.56));
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  border: none;
  border-radius: 8px;
  color: var(--button-text-on-accent, #002060);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Message = styled.p<{ $type: 'error' | 'success' }>`
  text-align: center;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  background: ${props => props.$type === 'error'
    ? 'var(--error-bg, rgba(255, 50, 50, 0.15))'
    : 'var(--success-bg, rgba(0, 255, 100, 0.15))'};
  color: ${props => props.$type === 'error'
    ? 'var(--error-text, #ff8a8a)'
    : 'var(--success-text, #80ffaa)'};
  border: 1px solid ${props => props.$type === 'error'
    ? 'var(--error-border, rgba(255, 50, 50, 0.3))'
    : 'var(--success-border, rgba(0, 255, 100, 0.3))'};
`;

const BackButton = styled.button`
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  text-align: center;
  margin-top: 20px;
  color: var(--accent-primary, #60C0F0);
  text-decoration: none;
  font-size: 0.9rem;
  cursor: pointer;
  min-height: 44px;
  line-height: 44px;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isActivationPasswordStrong(newPassword)) {
      setError(PASSWORD_POLICY_COPY);
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/api/auth/reset-password', {
        token,
        newPassword
      });

      if (response.data?.success) {
        setSuccess('Password has been reset successfully. You can now log in with your new password.');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(response.data?.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.msg
        || 'Failed to reset password. The link may have expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageOverlay>
      <FormCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Title>Reset Password</Title>
        <Subtitle>{PASSWORD_POLICY_COPY}</Subtitle>

        {error && <Message $type="error">{error}</Message>}
        {success && <Message $type="success">{success}</Message>}

        {!success ? (
          <form onSubmit={handleSubmit}>
            <Label htmlFor="reset-new-password">New Password</Label>
            <InputField
              id="reset-new-password"
              type="password"
              placeholder="Strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
            <InputField
              id="reset-confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <SubmitButton type="submit" disabled={loading || !isActivationPasswordStrong(newPassword) || newPassword !== confirmPassword}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </SubmitButton>
          </form>
        ) : null}

        <BackButton type="button" onClick={() => navigate('/login')}>
          Back to Login
        </BackButton>
      </FormCard>
    </PageOverlay>
  );
};

export default ResetPasswordPage;
