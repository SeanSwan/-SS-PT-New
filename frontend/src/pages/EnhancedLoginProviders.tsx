/** Server-driven federated and passwordless sign-in options. */
import { useEffect, useRef, useState } from 'react';
import apiService, { type AuthMethods } from '../services/federatedAuthApi';
import {
  Divider,
  MethodNotice,
  ProviderButton,
  ProviderList,
  ProviderMark,
  ProviderSection,
  ProviderSpacer,
} from './EnhancedLoginProviders.styles';

type Provider = { id: string; label: string };
type AuthenticatedUser = { id: number; role?: string } & Record<string, unknown>;
type Props = {
  exchange?: string | null;
  identifier?: string;
  magicToken?: string | null;
  returnUrl: string;
  onAuthenticated: (user: AuthenticatedUser, returnUrl: string) => void;
  onError: (message: string) => void;
};

const providerMark = (provider: Provider) => ({
  google: 'G', apple: 'A', facebook: 'f', tiktok: 'T',
}[provider.id] || provider.label.slice(0, 1).toUpperCase());
const emptyMethods: AuthMethods = {
  emailPassword: true, magicLink: false, passkey: false, providers: [],
};

const clearAuthArtifactsFromLocation = () => {
  const url = new URL(window.location.href);
  ['exchange', 'magic', 'oauth', 'returnUrl'].forEach((key) => url.searchParams.delete(key));
  url.hash = '';
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
};
export default function EnhancedLoginProviders({
  exchange, identifier = '', magicToken, returnUrl, onAuthenticated, onError,
}: Props) {
  const [methods, setMethods] = useState<AuthMethods>(emptyMethods);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const oauthCompletionStarted = useRef(false);
  const magicCompletionStarted = useRef(false);

  useEffect(() => {
    let active = true;
    apiService.getAuthMethods()
      .then((result) => active && setMethods(result))
      .catch(() => { /* Password login remains available when discovery is offline. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!exchange || oauthCompletionStarted.current) return;
    oauthCompletionStarted.current = true;
    clearAuthArtifactsFromLocation();
    setBusyProvider('callback');
    apiService.completeFederatedLogin(exchange)
      .then((result) => onAuthenticated(result.user, returnUrl))
      .catch(() => {
        setBusyProvider(null);
        onError('Provider sign-in expired or could not be completed. Please try again.');
      });
  }, [exchange, onAuthenticated, onError, returnUrl]);

  useEffect(() => {
    if (!magicToken || magicCompletionStarted.current) return;
    magicCompletionStarted.current = true;
    setBusyProvider('magic');
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    apiService.completeMagicLink(magicToken)
      .then((result) => onAuthenticated(result.user, returnUrl))
      .catch(() => {
        setBusyProvider(null);
        onError('Email sign-in link is invalid or expired. Please request a new one.');
      });
  }, [magicToken, onAuthenticated, onError, returnUrl]);

  const startProvider = (provider: Provider) => {
    setBusyProvider(provider.id);
    try {
      apiService.startFederatedLogin(provider.id, returnUrl);
    } catch {
      setBusyProvider(null);
      onError(`Unable to start ${provider.label} sign-in. Please try again.`);
    }
  };

  const requestMagicLink = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      onError('Enter your email address above, then request a sign-in link.');
      return;
    }
    setBusyProvider('magic');
    setNotice('');
    try {
      await apiService.requestMagicLink(identifier.trim(), returnUrl);
      setNotice('Check your email for a one-time SwanStudios sign-in link.');
    } catch {
      onError('Unable to send a sign-in link right now. Please use another method.');
    } finally {
      setBusyProvider(null);
    }
  };

  if (!methods.providers.length && !methods.magicLink) return null;
  return (
    <ProviderSection aria-label="Other sign-in options">
      <Divider><span>Or continue with</span></Divider>
      <ProviderList>
        {methods.magicLink && (
          <ProviderButton type="button" disabled={busyProvider !== null}
            onClick={requestMagicLink} aria-label="Email me a sign-in link">
            <ProviderMark aria-hidden="true">@</ProviderMark>
            <span>Email me a sign-in link</span><ProviderSpacer aria-hidden="true" />
          </ProviderButton>
        )}
        {methods.providers.map((provider) => (
          <ProviderButton key={provider.id} type="button" disabled={busyProvider !== null}
            onClick={() => startProvider(provider)} aria-label={`Continue with ${provider.label}`}>
            <ProviderMark aria-hidden="true">{providerMark(provider)}</ProviderMark>
            <span>Continue with {provider.label}</span><ProviderSpacer aria-hidden="true" />
          </ProviderButton>
        ))}
      </ProviderList>
      {notice && <MethodNotice role="status">{notice}</MethodNotice>}
    </ProviderSection>
  );
}