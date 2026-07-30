/**
 * Federated authentication HTTP controller.
 *
 * Provider callbacks never place access or refresh tokens in URLs. A successful
 * callback stores a short-lived one-time completion code in the server session;
 * the login page exchanges it for a normal SwanStudios JWT session.
 */
import User from '../models/User.mjs';
import { getPublicAuthProviders, getServerAuthProvider } from '../config/authProviders.mjs';
import {
  consumeOAuthCompletion,
  consumeOAuthTransaction,
  createOAuthTransaction,
  normalizeAuthReturnUrl,
  storeOAuthCompletion,
} from '../services/auth/oauthStateService.mjs';
import {
  buildProviderAuthorizationUrl,
  exchangeProviderAuthorizationCode,
} from '../services/auth/oauthProviderClient.mjs';
import { resolveFederatedAccount } from '../services/auth/federatedAccountService.mjs';
import { issueAuthSession } from '../services/auth/authSessionService.mjs';
import { isMagicLinkEnabled } from '../services/auth/magicLinkService.mjs';
import logger from '../utils/logger.mjs';

const frontendBaseUrl = () => {
  const configured = process.env.AUTH_FRONTEND_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return 'https://sswanstudios.com';
  return process.env.FRONTEND_URL?.split(',')[0]?.trim()?.replace(/\/$/, '')
    || 'http://localhost:5173';
};

const providerOrThrow = (providerId) => {
  const provider = getServerAuthProvider(providerId);
  if (!provider) {
    throw Object.assign(new Error('Authentication provider is unavailable'), {
      code: 'AUTH_PROVIDER_UNAVAILABLE', status: 404,
    });
  }
  return provider;
};

const callbackInput = (request) => ({ ...request.query, ...request.body });
const safeErrorCode = (error) => /^[A-Z0-9_]{3,64}$/.test(error?.code || '')
  ? error.code : 'OAUTH_CALLBACK_FAILED';

const frontendLoginUrl = (params = {}, fragmentParams = {}) => {
  const url = new URL('/login', frontendBaseUrl());
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const fragment = new URLSearchParams();
  Object.entries(fragmentParams).forEach(([key, value]) => {
    if (value) fragment.set(key, value);
  });
  if (fragment.size) url.hash = fragment.toString();
  return url.toString();
};

const frontendReturnUrl = (path, params = {}) => {
  const url = new URL(normalizeAuthReturnUrl(path), frontendBaseUrl());
  Object.entries(params).forEach(([key, value]) => value && url.searchParams.set(key, value));
  return url.toString();
};

export const listAuthProviders = (_request, response) => response.json({
  success: true,
  methods: {
    emailPassword: true,
    magicLink: isMagicLinkEnabled(),
    passkey: false,
    providers: getPublicAuthProviders(),
  },
});

export async function startFederatedLogin(request, response) {
  try {
    const provider = providerOrThrow(request.params.provider);
    const transaction = await createOAuthTransaction(request, {
      provider: provider.id,
      returnUrl: request.query.returnUrl,
      mode: 'login',
    });
    return response.redirect(302, buildProviderAuthorizationUrl(provider, transaction));
  } catch (error) {
    return response.status(error.status || 500).json({
      success: false, code: safeErrorCode(error), message: 'Unable to start provider login',
    });
  }
}

export async function startFederatedLink(request, response) {
  try {
    const provider = providerOrThrow(request.params.provider);
    const currentPassword = String(request.body?.currentPassword || '');
    const user = await User.findByPk(request.user.id);
    const stepUpVerified = Boolean(user && currentPassword && await user.checkPassword(currentPassword));
    if (!stepUpVerified) {
      throw Object.assign(new Error('Recent authentication is required'), {
        code: 'AUTH_STEP_UP_REQUIRED', status: 401,
      });
    }
    const transaction = await createOAuthTransaction(request, {
      provider: provider.id,
      returnUrl: request.body?.returnUrl,
      mode: 'link',
      userId: request.user.id,
    });
    return response.json({
      success: true,
      authorizationUrl: buildProviderAuthorizationUrl(provider, transaction),
    });
  } catch (error) {
    return response.status(error.status || 500).json({
      success: false, code: safeErrorCode(error), message: 'Unable to start account linking',
    });
  }
}

export async function completeFederatedCallback(request, response) {
  const providerId = request.params.provider;
  try {
    const provider = providerOrThrow(providerId);
    const input = callbackInput(request);
    const transaction = await consumeOAuthTransaction(request, {
      provider: provider.id,
      state: input.state,
    });
    if (input.error) {
      throw Object.assign(new Error('Provider authorization was declined'), {
        code: 'OAUTH_ACCESS_DENIED', status: 401,
      });
    }
    const profile = await exchangeProviderAuthorizationCode(provider, {
      code: input.code,
      codeVerifier: transaction.codeVerifier,
      nonce: transaction.nonce,
      appleUser: input.user,
    });
    const user = await resolveFederatedAccount({
      provider: provider.id,
      profile,
      mode: transaction.mode,
      userId: transaction.userId,
    });

    if (transaction.mode === 'link') {
      return response.redirect(302, frontendReturnUrl(transaction.returnUrl, {
        linkedProvider: provider.id,
      }));
    }

    const exchange = await storeOAuthCompletion(request, {
      provider: provider.id,
      userId: user.id,
      returnUrl: transaction.returnUrl,
    });
    return response.redirect(302, frontendLoginUrl({}, {
      oauth: provider.id,
      exchange,
      returnUrl: transaction.returnUrl,
    }));
  } catch (error) {
    logger.warn('Federated callback rejected', {
      provider: providerId,
      code: safeErrorCode(error),
    });
    return response.redirect(302, frontendLoginUrl({ oauthError: safeErrorCode(error) }));
  }
}

export async function exchangeFederatedCompletion(request, response) {
  try {
    const completion = await consumeOAuthCompletion(request, request.body?.exchange);
    const user = await User.findByPk(completion.userId);
    if (!user || user.isActive === false || user.isLocked || user.accountStatus !== 'active') {
      return response.status(401).json({ success: false, code: 'AUTH_USER_UNAVAILABLE' });
    }
    return response.json(await issueAuthSession(user, request));
  } catch (error) {
    return response.status(error.status || 401).json({
      success: false,
      code: safeErrorCode(error),
      message: 'Provider login could not be completed',
    });
  }
}