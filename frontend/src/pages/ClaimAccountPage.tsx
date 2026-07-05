/**
 * ============================================================================
 * FILE: ClaimAccountPage.tsx
 * PURPOSE: Public landing page for clients to claim their STUB account via SWAN-XXXXXXXX code
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-27
 * AI VILLAGE VALIDATED: 2026-03-27
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Renders a "Claim Your Account" form where Move Fitness / external clients
 *   enter their SWAN-XXXXXXXX invite code (or arrive via QR link with token pre-filled)
 *   and set a password to activate their account.
 *
 * HOW IT FITS IN THE APP:
 *   Admin creates STUB client -> generates SWAN-XXXXXXXX token -> QR code / manual code
 *   Client scans QR -> /claim/SWAN-XXXXXXXX -> this page -> POST /api/claim/activate
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
import {
  ActivatedUsername,
  FormCard,
  InputField,
  Label,
  LoadingDots,
  LoginLink,
  PageOverlay,
  PasswordInput,
  PasswordPolicyHint,
  StatusMessage,
  SubmitButton,
  Subtitle,
  SwanIcon,
  Title,
  WelcomeName,
} from './ClaimAccountPage.styles';
import { PASSWORD_POLICY_COPY, isActivationPasswordStrong } from './activationPasswordPolicy';


const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const CLAIM_TOKEN_PLACEHOLDER = 'SWAN-XXXXXXXX';
const CLAIM_TOKEN_MAX_LENGTH = CLAIM_TOKEN_PLACEHOLDER.length;
const CLAIM_TOKEN_PATTERN = /SWAN-[A-Z0-9]{8}/i;
const normalizeClaimTokenInput = (value: string): string => {
  const trimmed = value.trim();
  const matchedToken = trimmed.match(CLAIM_TOKEN_PATTERN)?.[0] ?? trimmed;
  return matchedToken.toUpperCase().slice(0, CLAIM_TOKEN_MAX_LENGTH);
};

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

  function handleClaimTokenPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pastedToken = normalizeClaimTokenInput(e.clipboardData.getData('text'));
    if (!pastedToken) return;
    e.preventDefault();
    setToken(pastedToken);
  }

  async function verifyToken(code: string) {
    const normalizedCode = normalizeClaimTokenInput(code);
    if (!normalizedCode || normalizedCode.length < 6) {
      setStatus({ type: 'error', message: 'Please enter your SWAN invite code.' });
      setVerified(false);
      return;
    }

    setVerifying(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/claim/verify/${encodeURIComponent(normalizedCode)}`);
      const data = await res.json();

      if (data.success && data.data?.valid) {
        setVerified(true);
        setFirstName(data.data.firstName || '');
        setToken(normalizedCode);
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

    const normalizedToken = normalizeClaimTokenInput(token);

    if (!verified) {
      setToken(normalizedToken);
      await verifyToken(normalizedToken);
      return;
    }

    if (!normalizedToken || normalizedToken.length < 6) {
      setStatus({ type: 'error', message: 'Please enter your SWAN invite code.' });
      return;
    }

    if (!isActivationPasswordStrong(password)) {
      setStatus({ type: 'error', message: PASSWORD_POLICY_COPY });
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
          token: normalizedToken,
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
              {activatedUsername && <><br />Your username: <ActivatedUsername>{activatedUsername}</ActivatedUsername></>}
            </Subtitle>
            <SubmitButton
              onClick={() => navigate(activatedUsername
                ? `/login?username=${encodeURIComponent(activatedUsername)}&claimed=1`
                : '/login?claimed=1')}
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
                    placeholder={CLAIM_TOKEN_PLACEHOLDER}
                    value={token}
                    onChange={(e) => setToken(normalizeClaimTokenInput(e.target.value))}
                    onPaste={handleClaimTokenPaste}
                    maxLength={CLAIM_TOKEN_MAX_LENGTH}
                    autoFocus
                    autoComplete="off"
                  />
                  <SubmitButton
                    type="button"
                    onClick={() => verifyToken(token)}
                    disabled={verifying || normalizeClaimTokenInput(token).length < 6}
                    whileTap={{ scale: 0.97 }}
                    style={{ marginBottom: 16 }}
                  >
                    {verifying ? <LoadingDots>Verifying...</LoadingDots> : 'Verify Code'}
                  </SubmitButton>
                </>
              )}

              {verified && (
                <>
                  <Label htmlFor="claim-email">Email (optional - use your own email)</Label>
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
                    placeholder="Strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <PasswordPolicyHint>{PASSWORD_POLICY_COPY}</PasswordPolicyHint>

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
                    disabled={submitting || !isActivationPasswordStrong(password) || password !== confirmPassword}
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
