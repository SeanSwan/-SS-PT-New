/**
 * ============================================================================
 * FILE: ClaimAccountPage.tsx
 * PURPOSE: Public landing page for clients to claim their STUB account via SWAN-XXXX code
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-27
 * AI VILLAGE VALIDATED: 2026-03-27
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Renders a "Claim Your Account" form where Move Fitness / external clients
 *   enter their SWAN-XXXX invite code (or arrive via QR link with token pre-filled)
 *   and set a password to activate their account.
 *
 * HOW IT FITS IN THE APP:
 *   Admin creates STUB client → generates SWAN-XXXX token → QR code / manual code
 *   Client scans QR → /claim/SWAN-XXXX → this page → POST /api/claim/activate
 *
 * ARCHITECTURE:
 * graph TD
 *   QRScan -->|/claim/:token| ClaimAccountPage
 *   ClaimAccountPage -->|GET /api/claim/verify/:token| VerifyEndpoint
 *   ClaimAccountPage -->|POST /api/claim/activate| ActivateEndpoint
 *   ActivateEndpoint -->|success| LoginRedirect
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Dark-first Crystalline Swan styling matching auth pages
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const PageOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  overflow: auto;
  background: var(--bg-base, #0A0A0F);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const FormCard = styled(motion.div)`
  width: 90%;
  max-width: 440px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 0 40px rgba(139, 92, 246, 0.08), 0 0 80px rgba(96, 192, 240, 0.04);
`;

const SwanIcon = styled.div`
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 8px rgba(96, 192, 240, 0.4));
`;

const Title = styled.h2`
  text-align: center;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 6px;
  font-size: 1.6rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
`;

const Subtitle = styled.p`
  text-align: center;
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
  margin: 0 0 28px;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const WelcomeName = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-weight: 600;
`;

const Label = styled.label`
  display: block;
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  font-size: 0.85rem;
  margin-bottom: 6px;
  font-family: 'Sora', sans-serif;
`;

const InputField = styled.input`
  width: 100%;
  padding: 12px 14px;
  margin-bottom: 18px;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-family: 'Fira Code', monospace;
  min-height: 48px;
  box-sizing: border-box;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
    text-transform: none;
    letter-spacing: normal;
  }
`;

const PasswordInput = styled(InputField)`
  letter-spacing: 3px;
  text-transform: none;

  &::placeholder {
    letter-spacing: normal;
  }
`;

const SubmitButton = styled(motion.button)`
  width: 100%;
  padding: 14px;
  min-height: 52px;
  border: none;
  border-radius: 10px;
  background: var(--accent-secondary, #8B5CF6);
  color: #fff;
  font-size: 1.05rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  transition: box-shadow 0.2s;
  margin-top: 4px;

  &:hover:not(:disabled) {
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div<{ $type: 'error' | 'success' | 'info' }>`
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 18px;
  font-size: 0.9rem;
  border-left: 4px solid ${({ $type }) =>
    $type === 'error' ? '#C92A54' :
    $type === 'success' ? '#C6A84B' : '#60C0F0'};
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
`;

const LoadingDots = styled.span`
  background: linear-gradient(90deg, #60C0F0, #8B5CF6, #60C0F0);
  background-size: 200% auto;
  animation: ${shimmer} 1.5s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const LoginLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 20px;
  color: var(--accent-primary, #60C0F0);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;

  &:hover {
    color: var(--accent-gold, #C6A84B);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component Logic
// PURPOSE: Token verification + password activation flow
// ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const ClaimAccountPage: React.FC = () => {
  const { token: urlToken } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [token, setToken] = useState(urlToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [firstName, setFirstName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [activated, setActivated] = useState(false);
  const [activatedUsername, setActivatedUsername] = useState('');

  // Auto-verify if token is in URL
  useEffect(() => {
    if (urlToken && urlToken.length >= 6) {
      verifyToken(urlToken);
    }
  }, [urlToken]);

  async function verifyToken(code: string) {
    setVerifying(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/claim/verify/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.success && data.data?.valid) {
        setVerified(true);
        setFirstName(data.data.firstName || '');
        setToken(code);
      } else {
        setStatus({ type: 'error', message: 'Invalid or expired invite code. Please contact your trainer for a new code.' });
        setVerified(false);
      }
    } catch {
      setStatus({ type: 'error', message: 'Unable to verify code. Please check your connection and try again.' });
    } finally {
      setVerifying(false);
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!token || token.length < 6) {
      setStatus({ type: 'error', message: 'Please enter your SWAN invite code.' });
      return;
    }

    if (password.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/claim/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.toUpperCase().trim(),
          password,
          ...(email ? { email } : {}),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setActivated(true);
        setActivatedUsername(data.data?.username || '');
        setStatus({ type: 'success', message: data.message || 'Account activated! You can now log in.' });
      } else {
        setStatus({ type: 'error', message: data.message || 'Activation failed. Please try again or contact your trainer.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SECTION: Render
  // ─────────────────────────────────────────────────────────────

  return (
    <PageOverlay>
      <FormCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <SwanIcon>&#x1F9CA;</SwanIcon>

        {activated ? (
          <>
            <Title>Account Activated</Title>
            <Subtitle>
              Welcome to SwanStudios, <WelcomeName>{firstName || 'Champion'}</WelcomeName>!
              {activatedUsername && <><br />Your username: <strong style={{ color: '#60C0F0' }}>{activatedUsername}</strong></>}
            </Subtitle>
            <SubmitButton
              onClick={() => navigate('/login')}
              whileTap={{ scale: 0.97 }}
            >
              Go to Login
            </SubmitButton>
          </>
        ) : (
          <>
            <Title>Claim Your Account</Title>
            <Subtitle>
              {verified && firstName
                ? <>Welcome, <WelcomeName>{firstName}</WelcomeName>! Set your password to get started.</>
                : 'Enter your SWAN invite code to activate your account.'
              }
            </Subtitle>

            {status && (
              <StatusMessage $type={status.type}>{status.message}</StatusMessage>
            )}

            <form onSubmit={handleActivate}>
              {!verified && (
                <>
                  <Label htmlFor="claim-token">Invite Code</Label>
                  <InputField
                    id="claim-token"
                    type="text"
                    placeholder="SWAN-XXXX"
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    maxLength={9}
                    autoFocus
                    autoComplete="off"
                  />
                  <SubmitButton
                    type="button"
                    onClick={() => verifyToken(token)}
                    disabled={verifying || token.length < 6}
                    whileTap={{ scale: 0.97 }}
                    style={{ marginBottom: 16 }}
                  >
                    {verifying ? <LoadingDots>Verifying...</LoadingDots> : 'Verify Code'}
                  </SubmitButton>
                </>
              )}

              {verified && (
                <>
                  <Label htmlFor="claim-email">Email (optional — use your own email)</Label>
                  <InputField
                    id="claim-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ letterSpacing: 'normal', textTransform: 'none' }}
                    autoComplete="email"
                  />

                  <Label htmlFor="claim-password">New Password</Label>
                  <PasswordInput
                    id="claim-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    autoFocus
                  />

                  <Label htmlFor="claim-confirm">Confirm Password</Label>
                  <PasswordInput
                    id="claim-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                  />

                  <SubmitButton
                    type="submit"
                    disabled={submitting || password.length < 8 || password !== confirmPassword}
                    whileTap={{ scale: 0.97 }}
                  >
                    {submitting ? <LoadingDots>Activating...</LoadingDots> : 'Activate Account'}
                  </SubmitButton>
                </>
              )}
            </form>

            <LoginLink href="/login">
              Already have an account? Log in
            </LoginLink>
          </>
        )}
      </FormCard>
    </PageOverlay>
  );
};

export default ClaimAccountPage;
