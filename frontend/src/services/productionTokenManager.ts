import axios from 'axios';
import { logger } from '@/utils/logger';

type TokenObserver = (token: string | null) => void;
export type RefreshOutcome = {
  status: 'refreshed' | 'expired' | 'superseded';
  token: string | null;
  generation: number;
};
type RefreshWaiter = (outcome: RefreshOutcome) => void;

export class ProductionTokenManager {
  private static readonly TOKEN_KEY = 'token';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_KEY = 'user';
  private static readonly TOKEN_TIMESTAMP_KEY = 'tokenTimestamp';

  private static authFailureCount = 0;
  private static readonly MAX_AUTH_FAILURES = 3;
  private static tokenObservers = new Set<TokenObserver>();
  private static storageObserverAttached = false;
  private static refreshGeneration = 0;
  private static nextRefreshId = 0;
  private static activeRefreshId: number | null = null;
  private static refreshSubscribers: RefreshWaiter[] = [];

  private static readonly handleStorageChange = (event: StorageEvent): void => {
    if (event.key !== null && ![this.TOKEN_KEY, this.REFRESH_TOKEN_KEY, this.USER_KEY, this.TOKEN_TIMESTAMP_KEY].includes(event.key)) return;
    this.invalidateActiveRefresh();
    this.notifyTokenObservers(event.key === this.TOKEN_KEY ? event.newValue : undefined);
  };

  private static ensureStorageObserver(): void {
    if (this.storageObserverAttached || typeof window === 'undefined') return;
    window.addEventListener('storage', this.handleStorageChange);
    this.storageObserverAttached = true;
  }

  private static notifyTokenObservers(tokenOverride?: string | null): void {
    const token = tokenOverride === undefined ? this.getToken() : tokenOverride;
    this.tokenObservers.forEach((observer) => {
      try {
        observer(token);
      } catch (error) {
        logger.warn('[TokenManager] Auth observer failed:', error);
      }
    });
  }

  static getAuthGeneration(): number {
    this.ensureStorageObserver();
    return this.refreshGeneration;
  }

  private static refreshOutcome(status: RefreshOutcome['status'], token: string | null = null): RefreshOutcome {
    return { status, token, generation: this.refreshGeneration };
  }

  private static settleRefresh(refreshId: number, outcome: RefreshOutcome): void {
    if (this.activeRefreshId !== refreshId) return;
    this.activeRefreshId = null;
    const subscribers = this.refreshSubscribers;
    this.refreshSubscribers = [];
    subscribers.forEach((resolve) => resolve(outcome));
  }

  private static invalidateActiveRefresh(): void {
    this.refreshGeneration += 1;
    const activeRefreshId = this.activeRefreshId;
    this.activeRefreshId = null;
    const subscribers = this.refreshSubscribers;
    this.refreshSubscribers = [];
    subscribers.forEach((resolve) => resolve(this.refreshOutcome('superseded')));
    // The request which owns activeRefreshId may still be in flight. Its
    // generation check prevents its late response from restoring auth or
    // settling a newer refresh operation.
    if (activeRefreshId !== null) logger.debug('[TokenManager] Active refresh invalidated');
  }

  static subscribe(observer: TokenObserver): () => void {
    this.tokenObservers.add(observer);
    this.ensureStorageObserver();
    return () => this.tokenObservers.delete(observer);
  }

  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      logger.warn('[TokenManager] Error getting token:', error);
      return null;
    }
  }

  static setToken(token: string): void {
    this.setTokenInternal(token, true);
  }

  private static setTokenInternal(token: string, invalidateRefresh: boolean): void {
    if (invalidateRefresh) this.invalidateActiveRefresh();
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.TOKEN_TIMESTAMP_KEY, Date.now().toString());
      this.authFailureCount = 0;
      this.notifyTokenObservers();
    } catch (error) {
      console.error('[TokenManager] Error setting token:', error);
    }
  }

  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      logger.warn('[TokenManager] Error getting refresh token:', error);
      return null;
    }
  }

  static setRefreshToken(refreshToken: string): void {
    this.setRefreshTokenInternal(refreshToken, true);
  }

  private static setRefreshTokenInternal(refreshToken: string, invalidateRefresh: boolean): void {
    if (invalidateRefresh) this.invalidateActiveRefresh();
    try {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('[TokenManager] Error setting refresh token:', error);
    }
  }

  static getUser(): any {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      logger.warn('[TokenManager] Error getting user:', error);
      return null;
    }
  }

  static setUser(user: any): void {
    this.invalidateActiveRefresh();
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('[TokenManager] Error setting user:', error);
    }
  }

  static clearAuthData(): void {
    this.invalidateActiveRefresh();
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.TOKEN_TIMESTAMP_KEY);
      this.authFailureCount = 0;
      this.notifyTokenObservers();
      logger.log('[TokenManager] Auth data cleared');
    } catch (error) {
      console.error('[TokenManager] Error clearing auth data:', error);
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      if (!token) return true;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;

      if (!exp) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      return exp <= (currentTime + 30);
    } catch (error) {
      logger.warn('[TokenManager] Error checking token expiry:', error);
      return true;
    }
  }

  static async refreshAccessToken(apiBaseUrl?: string): Promise<string | null> {
    return (await this.refreshAccessTokenOutcome(apiBaseUrl)).token;
  }

  /** API callers must distinguish expired current auth from superseded work. */
  static async refreshAccessTokenOutcome(apiBaseUrl?: string): Promise<RefreshOutcome> {
    this.ensureStorageObserver();
    if (this.activeRefreshId !== null) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    const refreshId = ++this.nextRefreshId;
    const generation = this.refreshGeneration;
    this.activeRefreshId = refreshId;
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      const outcome = this.refreshOutcome('expired');
      this.settleRefresh(refreshId, outcome);
      return outcome;
    }

    try {
      logger.log('[TokenManager] Attempting token refresh...');

      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const baseUrl = apiBaseUrl || (
        hostname.includes('render.com')
        || hostname.includes('sswanstudios.com')
        || hostname.includes('swanstudios.com')
          ? 'https://sswanstudios.com'
          : 'http://localhost:10000'
      );
      const response = await axios.post(`${baseUrl}/api/auth/refresh-token`, { refreshToken });

      if (response.data.success && response.data.token) {
        const newToken = response.data.token;
        const newRefreshToken = response.data.refreshToken || refreshToken;

        if (generation !== this.refreshGeneration || this.getRefreshToken() !== refreshToken) {
          const outcome = this.refreshOutcome('superseded');
          this.settleRefresh(refreshId, outcome);
          return outcome;
        }

        this.setTokenInternal(newToken, false);
        // Token observers may synchronously replace authentication. Do not let
        // the retired refresh write credentials or claim the new generation.
        if (generation !== this.refreshGeneration) {
          const outcome = this.refreshOutcome('superseded');
          this.settleRefresh(refreshId, outcome);
          return outcome;
        }
        this.setRefreshTokenInternal(newRefreshToken, false);

        logger.log('[TokenManager] Token refreshed successfully');

        const outcome = this.refreshOutcome('refreshed', newToken);
        this.settleRefresh(refreshId, outcome);
        return outcome;
      }

      throw new Error('Invalid refresh response');
    } catch (error) {
      console.error('[TokenManager] Token refresh failed:', error);
      let superseded = generation !== this.refreshGeneration;
      if (!superseded) {
        const invalidationGeneration = generation + 1;
        this.clearAuthData();
        // Our clear advances once; any additional advance belongs to an
        // observer's replacement login and must never be reported expired.
        superseded = this.refreshGeneration !== invalidationGeneration;
      }
      const outcome = this.refreshOutcome(superseded ? 'superseded' : 'expired');
      this.settleRefresh(refreshId, outcome);
      return outcome;
    }
  }

  static incrementAuthFailure(): boolean {
    this.authFailureCount++;
    logger.warn(`[TokenManager] Auth failure ${this.authFailureCount}/${this.MAX_AUTH_FAILURES}`);

    if (this.authFailureCount >= this.MAX_AUTH_FAILURES) {
      console.error('[TokenManager] Max auth failures reached, clearing auth data');
      this.clearAuthData();
      return true;
    }

    return false;
  }

  static resetAuthFailureCount(): void {
    this.authFailureCount = 0;
  }
}
