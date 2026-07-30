/**
 * Federated authentication provider registry.
 *
 * Providers fail closed: a public button exists only when its explicit feature
 * flag and every server credential required for a verifiable code flow exist.
 * Secrets never leave this module through the public provider projection.
 */
const enabledFlag = (name) => process.env[name] === 'true';
const callbackBaseUrl = () => {
  const configured = process.env.AUTH_CALLBACK_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return process.env.NODE_ENV === 'production'
    ? 'https://sswanstudios.com'
    : 'http://localhost:10000';
};

const providerDefinitions = () => {
  const facebookVersion = process.env.FACEBOOK_GRAPH_VERSION?.trim();
  return {
    google: {
      id: 'google', label: 'Google', enabled: enabledFlag('AUTH_GOOGLE_ENABLED'),
      clientId: process.env.GOOGLE_AUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      scopes: ['openid', 'email', 'profile'], usesPkce: true, usesNonce: true,
    },
    apple: {
      id: 'apple', label: 'Apple', enabled: enabledFlag('AUTH_APPLE_ENABLED'),
      clientId: process.env.APPLE_AUTH_CLIENT_ID,
      clientSecret: process.env.APPLE_AUTH_CLIENT_SECRET,
      authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
      tokenEndpoint: 'https://appleid.apple.com/auth/token',
      jwksUri: 'https://appleid.apple.com/auth/keys',
      issuer: 'https://appleid.apple.com',
      scopes: ['name', 'email'], responseMode: 'form_post', usesPkce: false, usesNonce: true,
    },
    facebook: {
      id: 'facebook', label: 'Facebook', enabled: enabledFlag('AUTH_FACEBOOK_ENABLED'),
      clientId: process.env.FACEBOOK_AUTH_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_AUTH_CLIENT_SECRET,
      authorizationEndpoint: facebookVersion
        ? `https://www.facebook.com/${facebookVersion}/dialog/oauth` : null,
      tokenEndpoint: facebookVersion
        ? `https://graph.facebook.com/${facebookVersion}/oauth/access_token` : null,
      userInfoEndpoint: facebookVersion
        ? `https://graph.facebook.com/${facebookVersion}/me` : null,
      scopes: ['email', 'public_profile'], usesPkce: false, usesNonce: false,
      extraRequirement: facebookVersion,
    },
    tiktok: {
      id: 'tiktok', label: 'TikTok', enabled: enabledFlag('AUTH_TIKTOK_ENABLED'),
      clientId: process.env.TIKTOK_AUTH_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_AUTH_CLIENT_SECRET,
      authorizationEndpoint: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenEndpoint: 'https://open.tiktokapis.com/v2/oauth/token/',
      userInfoEndpoint: 'https://open.tiktokapis.com/v2/user/info/',
      scopes: ['user.info.basic'], usesPkce: false, usesNonce: false,
    },
  };
};

const isConfigured = (provider) => Boolean(
  provider.enabled
  && provider.clientId
  && provider.clientSecret
  && provider.authorizationEndpoint
  && provider.tokenEndpoint
  && (provider.extraRequirement ?? true)
);

const completeProvider = (provider) => ({
  ...provider,
  redirectUri: `${callbackBaseUrl()}/api/auth/oauth/${provider.id}/callback`,
});

export const getPublicAuthProviders = () => Object.values(providerDefinitions())
  .filter(isConfigured)
  .map(({ id, label }) => ({ id, label }));

export const getServerAuthProvider = (providerId) => {
  const provider = providerDefinitions()[providerId];
  return provider && isConfigured(provider) ? completeProvider(provider) : null;
};

export const SUPPORTED_AUTH_PROVIDERS = Object.freeze(['google', 'apple', 'facebook', 'tiktok']);