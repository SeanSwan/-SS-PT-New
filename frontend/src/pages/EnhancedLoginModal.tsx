/**
 * EnhancedLoginModal
 *
 * Canonical /login surface. Authentication opens the product; onboarding stays
 * a voluntary dashboard action and is intentionally absent from this route.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import type { Variants } from 'framer-motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUniversalTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import AuthLayout from '../layouts/AuthLayout';
import { logger } from '@/utils/logger';
import { PASSWORD_POLICY_COPY, isActivationPasswordStrong } from './activationPasswordPolicy';
import { resolvePostPasswordChangeRoute } from './postPasswordChangeRoute';
import EnhancedLoginProviders from './EnhancedLoginProviders';
import {
  AuthLink,
  AuthLinks,
  BrandName,
  ClaimedWelcome,
  CloseButton,
  ConnectionStatus,
  CredentialForm,
  ErrorMessage,
  FieldGroup,
  FieldLabel,
  FormSubtitle,
  FormTitle,
  FormWrapper,
  InputField,
  InputShell,
  LoginContainer,
  LogoCircle,
  LogoImage,
  ModalHeader,
  PasswordPolicyHint,
  PasswordToggle,
  SubmitButton,
} from './EnhancedLoginModal.styles';

const itemVariants: Variants = { hidden: { opacity: 1 }, visible: { opacity: 1 } };
const isSafeLocalReturnUrl = (value: string | null): value is string =>
  Boolean(value && value.startsWith('/') && !value.startsWith('//')
    && !value.includes('\\') && !/[\u0000-\u001f\u007f]/.test(value));

const PasswordField = ({
  id, label, name, value, visible, disabled, autoComplete, onChange, onToggle, onFocus,
}: {
  id: string; label: string; name: string; value: string; visible: boolean; disabled: boolean;
  autoComplete: 'current-password' | 'new-password';
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void; onFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
}) => (
  <FieldGroup>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <InputShell>
      <InputField
        id={id}
        type={visible ? 'text' : 'password'}
        name={name}
        placeholder={label}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        autoComplete={autoComplete}
        data-password="true"
        required
        disabled={disabled}
        variants={itemVariants}
      />
      <PasswordToggle
        type="button"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-controls={id}
        aria-pressed={visible}
        onClick={onToggle}
        disabled={disabled}
      >
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </PasswordToggle>
    </InputShell>
  </FieldGroup>
);

const EnhancedLoginModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated } = useAuth();
  useUniversalTheme();
  const [searchParams] = useSearchParams();
  const fragmentParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const isFreshlyClaimed = searchParams.get('claimed') === '1';
  const requestedReturnUrl = fragmentParams.get('returnUrl') || searchParams.get('returnUrl');
  const hasSafeReturnUrl = isSafeLocalReturnUrl(requestedReturnUrl);
  const safeReturnUrl = hasSafeReturnUrl ? requestedReturnUrl : '/user-dashboard';
  const [credentials, setCredentials] = useState({
    username: searchParams.get('username') ?? '', password: '',
  });
  const [error, setError] = useState(() => searchParams.get('oauthError')
    ? 'Provider sign-in could not be completed. Please try again.'
    : '');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState({ connected: false, checked: false });
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigateAfterLogin = useCallback((role?: string) => {
    if (hasSafeReturnUrl) return navigate(safeReturnUrl, { replace: true });
    if (role === 'admin') return navigate('/dashboard/admin');
    if (role === 'trainer') return navigate('/dashboard/trainer/overview');
    if (role === 'client') return navigate("/dashboard/client/overview");
    return navigate("/user-dashboard");
  }, [hasSafeReturnUrl, navigate, safeReturnUrl]);

  useEffect(() => {
    let active = true;
    apiService.checkConnection()
      .then((status: boolean | { connected?: boolean }) => {
        if (!active) return;
        const connected = typeof status === 'boolean' ? status : Boolean(status?.connected);
        setServerStatus({ connected, checked: true });
      })
      .catch(() => active && setServerStatus({ connected: false, checked: true }));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) navigateAfterLogin(user.role);
  }, [isAuthenticated, navigateAfterLogin, user]);

  const ensureVisible = (event: React.FocusEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    window.setTimeout(() => {
      if (input.isConnected && typeof input.scrollIntoView === 'function') {
        input.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }, 160);
  };

  const handleClose = () => window.history.length > 1 ? navigate(-1) : navigate('/');
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    localStorage.removeItem('bypass_admin_verification');
    localStorage.removeItem('admin_emergency_mode');

    try {
      if (!serverStatus.connected && serverStatus.checked) {
        logger.warn('Attempting login without a confirmed server connection');
      }
      const result = await login(credentials.username, credentials.password);
      if (result.success && result.forcePasswordChange && result.tempToken) {
        setForcePasswordChange(true);
        setTempToken(result.tempToken);
      } else if (result.success && result.user) {
        navigateAfterLogin(result.user.role);
      } else if (result.success) {
        setError('Login succeeded but no user profile was returned. Please try again.');
      } else {
        setError(result.error || result.message || 'Invalid email or password. Please try again.');
      }
    } catch (caught: any) {
      const isNetworkError = !serverStatus.connected || caught?.code === 'ERR_NETWORK';
      setError(isNetworkError
        ? 'Unable to connect to the server. Check your connection and try again.'
        : caught?.message || caught?.response?.data?.message || 'Unable to sign in. Please try again.');
      logger.warn('Login failed', { status: caught?.status || caught?.response?.status || 'unknown' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!isActivationPasswordStrong(newPassword)) return setError(PASSWORD_POLICY_COPY);
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setIsLoading(true);
    try {
      const result = await apiService.forceChangePassword(tempToken, newPassword);
      if (result.success && result.user) {
        window.location.href = resolvePostPasswordChangeRoute(result.user.role);
      } else {
        setError('Password change failed. Please try again.');
      }
    } catch (caught: any) {
      setError(caught?.response?.data?.message || caught?.message || 'Password change failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <LoginContainer>
        <FormWrapper aria-labelledby="login-title">
          <CloseButton type="button" onClick={handleClose} aria-label="Close login">
            <X size={20} aria-hidden="true" />
          </CloseButton>
          <ModalHeader>
            <LogoCircle><LogoImage src="/Logo.png" alt="" /></LogoCircle>
            <BrandName>SwanStudios</BrandName>
          </ModalHeader>
          <FormTitle id="login-title">
            {forcePasswordChange ? 'Set Your New Password' : 'Access Your Account'}
          </FormTitle>
          <FormSubtitle>
            {forcePasswordChange ? 'Secure your account before continuing.' : 'Sign in to continue your training journey.'}
          </FormSubtitle>

          {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
          {isFreshlyClaimed && !error && !forcePasswordChange && (
            <ClaimedWelcome role="status">
              Account activated — welcome to SwanStudios! Log in with your new password.
            </ClaimedWelcome>
          )}

          {forcePasswordChange ? (
            <CredentialForm onSubmit={handlePasswordChange}>
              <PasswordField id="new-password" label="New Password" name="newPassword" value={newPassword}
                visible={showNewPassword} disabled={isLoading} autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)} onFocus={ensureVisible}
                onToggle={() => setShowNewPassword((visible) => !visible)} />
              <PasswordPolicyHint variants={itemVariants}>{PASSWORD_POLICY_COPY}</PasswordPolicyHint>
              <PasswordField id="confirm-password" label="Confirm New Password" name="confirmPassword"
                value={confirmPassword} visible={showConfirmPassword} disabled={isLoading} autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)} onFocus={ensureVisible}
                onToggle={() => setShowConfirmPassword((visible) => !visible)} />
              <SubmitButton type="submit" disabled={isLoading}>
                {isLoading ? 'Updating…' : 'Set Password & Continue'}
              </SubmitButton>
            </CredentialForm>
          ) : (
            <>
              <CredentialForm onSubmit={handleSubmit}>
                <FieldGroup>
                  <FieldLabel htmlFor="login-username">Username or Email</FieldLabel>
                  <InputField id="login-username" type="text" name="username" placeholder="Username or Email"
                    value={credentials.username} onChange={handleChange} onFocus={ensureVisible}
                    autoComplete="username" autoCapitalize="none" spellCheck={false} inputMode="email"
                    required disabled={isLoading} variants={itemVariants} />
                </FieldGroup>
                <PasswordField id="login-password" label="Password" name="password" value={credentials.password}
                  visible={showPassword} disabled={isLoading} autoComplete="current-password"
                  onChange={handleChange} onFocus={ensureVisible}
                  onToggle={() => setShowPassword((visible) => !visible)} />
                <SubmitButton type="submit" disabled={isLoading}>
                  {isLoading ? 'Authenticating…' : 'Sign In'}
                </SubmitButton>
              </CredentialForm>
              <EnhancedLoginProviders
                exchange={fragmentParams.get('exchange') || searchParams.get('exchange')}
                identifier={credentials.username}
                magicToken={fragmentParams.get('magic')}
                returnUrl={safeReturnUrl}
                onAuthenticated={(authenticatedUser, destination) => window.location.replace(
                  hasSafeReturnUrl
                    ? destination
                    : resolvePostPasswordChangeRoute(authenticatedUser.role as Parameters<typeof resolvePostPasswordChangeRoute>[0]),
                )}
                onError={setError}
              />
              <AuthLinks>
                <AuthLink to="/forgot-password">Forgot Password?</AuthLink>
                <AuthLink to="/signup">Create Account</AuthLink>
              </AuthLinks>
            </>
          )}
          {serverStatus.checked && (
            <ConnectionStatus $connected={serverStatus.connected} role="status">
              {serverStatus.connected ? 'Server Connected' : 'Server unavailable'}
            </ConnectionStatus>
          )}
        </FormWrapper>
      </LoginContainer>
    </AuthLayout>
  );
};

export default EnhancedLoginModal;