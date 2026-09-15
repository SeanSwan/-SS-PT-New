/** Browser client for server-advertised authentication methods. */
import type { AxiosInstance } from 'axios';
import { createProductionApiClient } from './apiClientFactory';
import { ProductionTokenManager } from './productionTokenManager';

export type PublicAuthProvider = { id: string; label: string };
export type AuthMethods = {
  emailPassword: boolean;
  magicLink: boolean;
  passkey: boolean;
  providers: PublicAuthProvider[];
};

type AuthCompletion = {
  success: true;
  user: { id: number; role?: string } & Record<string, unknown>;
  token: string;
  refreshToken: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const parseAuthMethods = (payload: unknown): AuthMethods => {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.methods)) {
    throw new Error('Invalid authentication methods response');
  }

  const methods = payload.methods;
  if (
    typeof methods.emailPassword !== 'boolean'
    || typeof methods.magicLink !== 'boolean'
    || typeof methods.passkey !== 'boolean'
    || !Array.isArray(methods.providers)
  ) {
    throw new Error('Invalid authentication methods response');
  }

  const providerIds = new Set<string>();
  const providers = methods.providers.map((provider) => {
    if (
      !isRecord(provider)
      || typeof provider.id !== 'string'
      || !provider.id.trim()
      || typeof provider.label !== 'string'
      || !provider.label.trim()
      || providerIds.has(provider.id)
    ) {
      throw new Error('Invalid authentication methods response');
    }
    providerIds.add(provider.id);
    return { id: provider.id, label: provider.label };
  });

  return {
    emailPassword: methods.emailPassword,
    magicLink: methods.magicLink,
    passkey: methods.passkey,
    providers,
  };
};

const isProduction = import.meta.env.PROD
  || window.location.hostname.includes('render.com')
  || window.location.hostname.includes('sswanstudios.com')
  || window.location.hostname.includes('swanstudios.com');
const apiBaseUrl = isProduction ? 'https://sswanstudios.com' : 'http://localhost:10000';

class FederatedAuthApi {
  private client: AxiosInstance;

  constructor() {
    this.client = createProductionApiClient(apiBaseUrl, isProduction);
  }

  private storeSession(result: AuthCompletion): AuthCompletion {
    if (!result?.success || !result.token || !result.user) throw new Error('Invalid authentication response');
    ProductionTokenManager.setToken(result.token);
    ProductionTokenManager.setRefreshToken(result.refreshToken);
    ProductionTokenManager.setUser(result.user);
    return result;
  }

  async getAuthMethods(): Promise<AuthMethods> {
    const response = await this.client.get('/api/auth/providers');
    return parseAuthMethods(response.data);
  }

  startFederatedLogin(provider: string, returnUrl: string): void {
    const startUrl = new URL(`/api/auth/oauth/${encodeURIComponent(provider)}/start`, apiBaseUrl);
    startUrl.searchParams.set('returnUrl', returnUrl);
    window.location.assign(startUrl.toString());
  }

  async completeFederatedLogin(exchange: string): Promise<AuthCompletion> {
    const response = await this.client.post('/api/auth/oauth/exchange', { exchange });
    return this.storeSession(response.data);
  }

  async requestMagicLink(email: string, returnUrl: string): Promise<{ success: true }> {
    const response = await this.client.post('/api/auth/magic-link/request', { email, returnUrl });
    return response.data;
  }

  async completeMagicLink(token: string): Promise<AuthCompletion> {
    const response = await this.client.post('/api/auth/magic-link/exchange', { token });
    return this.storeSession(response.data);
  }
}

export default new FederatedAuthApi();
export { FederatedAuthApi };
