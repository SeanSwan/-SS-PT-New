/**
 * OAuth/OIDC provider protocol adapter.
 *
 * Uses authorization codes, verifies OIDC signatures/issuer/audience/nonce,
 * requests minimal identity scopes, and never returns provider tokens to the
 * caller. Facebook and TikTok profiles are fetched server-side over TLS.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const providerError = (code, message, status = 502) => Object.assign(new Error(message), { code, status });

export function validateOidcNonce(claims, expectedNonce) {
  const actual = typeof claims?.nonce === 'string' ? Buffer.from(claims.nonce) : Buffer.alloc(0);
  const expected = typeof expectedNonce === 'string' ? Buffer.from(expectedNonce) : Buffer.alloc(0);
  if (!actual.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw providerError('PROVIDER_NONCE_INVALID', 'Provider nonce is invalid', 401);
  }
}
export function buildProviderAuthorizationUrl(provider, transaction) {
  const url = new URL(provider.authorizationEndpoint);
  url.searchParams.set(provider.id === 'tiktok' ? 'client_key' : 'client_id', provider.clientId);
  url.searchParams.set('redirect_uri', provider.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', provider.scopes.join(' '));
  url.searchParams.set('state', transaction.state);
  if (provider.usesNonce) url.searchParams.set('nonce', transaction.nonce);
  if (provider.usesPkce) {
    url.searchParams.set('code_challenge', transaction.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }
  if (provider.responseMode) url.searchParams.set('response_mode', provider.responseMode);
  if (provider.id === 'google') url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const parseResponse = async (response) => {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = Object.fromEntries(new URLSearchParams(text));
  }
  if (!response.ok || data.error) {
    throw providerError('PROVIDER_TOKEN_EXCHANGE_FAILED', 'Provider token exchange failed', 401);
  }
  return data;
};

async function exchangeCode(provider, code, codeVerifier) {
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: provider.redirectUri,
    client_secret: provider.clientSecret,
  });
  body.set(provider.id === 'tiktok' ? 'client_key' : 'client_id', provider.clientId);
  if (provider.usesPkce) body.set('code_verifier', codeVerifier);
  const response = await fetchWithTimeout(provider.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  return parseResponse(response);
}

const normalizedAppleUser = (appleUser) => {
  if (!appleUser) return {};
  try {
    const parsed = typeof appleUser === 'string' ? JSON.parse(appleUser) : appleUser;
    return {
      firstName: parsed?.name?.firstName || null,
      lastName: parsed?.name?.lastName || null,
    };
  } catch {
    return {};
  }
};

async function oidcProfile(provider, tokens, nonce, appleUser) {
  if (!tokens.id_token) throw providerError('PROVIDER_ID_TOKEN_REQUIRED', 'Provider identity token is missing', 401);
  const verification = await jwtVerify(
    tokens.id_token,
    createRemoteJWKSet(new URL(provider.jwksUri)),
    {
      issuer: provider.issuer,
      audience: provider.clientId,
    },
  );
  const claims = verification.payload;
  if (provider.usesNonce) validateOidcNonce(claims, nonce);
  const appleName = provider.id === 'apple' ? normalizedAppleUser(appleUser) : {};
  return {
    subject: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    firstName: claims.given_name || appleName.firstName || null,
    lastName: claims.family_name || appleName.lastName || null,
    photo: typeof claims.picture === 'string' ? claims.picture : null,
  };
}

async function facebookProfile(provider, tokens) {
  if (!tokens.access_token) throw providerError('PROVIDER_ACCESS_TOKEN_REQUIRED', 'Provider access token is missing', 401);
  const url = new URL(provider.userInfoEndpoint);
  url.searchParams.set('fields', 'id,first_name,last_name,email,picture.type(large)');
  url.searchParams.set('appsecret_proof', createHmac('sha256', provider.clientSecret)
    .update(tokens.access_token).digest('hex'));
  const profile = await parseResponse(await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
  }));
  return {
    subject: profile.id,
    email: profile.email || null,
    emailVerified: Boolean(profile.email),
    firstName: profile.first_name || null,
    lastName: profile.last_name || null,
    photo: profile.picture?.data?.url || null,
  };
}

async function tiktokProfile(provider, tokens) {
  if (!tokens.access_token) throw providerError('PROVIDER_ACCESS_TOKEN_REQUIRED', 'Provider access token is missing', 401);
  const url = new URL(provider.userInfoEndpoint);
  url.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name');
  const response = await parseResponse(await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
  }));
  const profile = response.data?.user || {};
  const names = String(profile.display_name || '').trim().split(/\s+/);
  return {
    subject: profile.open_id,
    email: null,
    emailVerified: false,
    firstName: names[0] || null,
    lastName: names.slice(1).join(' ') || null,
    photo: profile.avatar_url || null,
  };
}

export async function exchangeProviderAuthorizationCode(provider, {
  code, codeVerifier, nonce, appleUser = null,
}) {
  if (!code) throw providerError('OAUTH_CODE_REQUIRED', 'Authorization code is missing', 400);
  const tokens = await exchangeCode(provider, code, codeVerifier);
  if (provider.id === 'facebook') return facebookProfile(provider, tokens);
  if (provider.id === 'tiktok') return tiktokProfile(provider, tokens);
  return oidcProfile(provider, tokens, nonce, appleUser);
}