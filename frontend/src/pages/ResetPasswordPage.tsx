import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import apiService from '../services/api.service';

const PageOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  background: #0a0a1a;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FormCard = styled(motion.div)`
  width: 90%;
  max-width: 420px;
  background: rgba(30, 30, 50, 0.95);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 12px;
  padding: 40px 30px;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.05);
`;

const Title = styled.h2`
  text-align: center;
  color: #00ffff;
  margin-bottom: 8px;
  font-size: 1.5rem;
`;

const Subtitle = styled.p`
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 24px;
  font-size: 0.9rem;
`;

const InputField = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  border: 2px solid rgba(120, 81, 169, 0.4);
  border-radius: 8px;
  background: rgba(10, 10, 26, 0.8);
  color: #fff;
  font-size: 1rem;
  min-height: 44px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  border: none;
  border-radius: 8px;
  color: #0a0a1a;
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
  background: ${props => props.$type === 'error' ? 'rgba(255, 50, 50, 0.15)' : 'rgba(0, 255, 100, 0.15)'};
  color: ${props => props.$type === 'error' ? '#ff6b6b' : '#00ff88'};
  border: 1px solid ${props => props.$type === 'error' ? 'rgba(255, 50, 50, 0.3)' : 'rgba(0, 255, 100, 0.3)'};
`;

const BackLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 20px;
  color: #00ffff;
  text-decoration: none;
  font-size: 0.9rem;
  cursor: pointer;
  min-height: 44px;
  line-height: 44px;

  &:hover {
    text-decoration: underline;
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

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
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
        <Subtitle>Enter your new password below</Subtitle>

        {error && <Message $type="error">{error}</Message>}
        {success && <Message $type="success">{success}</Message>}

        {!success ? (
          <form onSubmit={handleSubmit}>
            <InputField
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <InputField
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <SubmitButton type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </SubmitButton>
          </form>
        ) : null}

        <BackLink onClick={() => navigate('/login')}>
          Back to Login
        </BackLink>
      </FormCard>
    </PageOverlay>
  );
};

export default ResetPasswordPage;
