import axios from 'axios';
import { logger } from '@/utils/logger';

export class ProductionTokenManager {
  private static readonly TOKEN_KEY = 'token';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_KEY = 'user';
  private static readonly TOKEN_TIMESTAMP_KEY = 'tokenTimestamp';

  private static authFailureCount = 0;
  private static readonly MAX_AUTH_FAILURES = 3;
  private static isRefreshing = false;
  private static refreshSubscribers: Array<(token: string) => void> = [];

  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      logger.warn('[TokenManager] Error getting token:', error);
      return null;
    }
  }

  static setToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.TOKEN_TIMESTAMP_KEY, Date.now().toString());
      this.authFailureCount = 0;
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
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('[TokenManager] Error setting user:', error);
    }
  }

  static clearAuthData(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.TOKEN_TIMESTAMP_KEY);
      this.authFailureCount = 0;
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
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.isRefreshing = false;
      return null;
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

        this.setToken(newToken);
        this.setRefreshToken(newRefreshToken);

        logger.log('[TokenManager] Token refreshed successfully');

        this.refreshSubscribers.forEach(callback => callback(newToken));
        this.refreshSubscribers = [];
        this.isRefreshing = false;

        return newToken;
      }

      throw new Error('Invalid refresh response');
    } catch (error) {
      console.error('[TokenManager] Token refresh failed:', error);
      this.clearAuthData();
      this.refreshSubscribers.forEach(callback => callback(''));
      this.refreshSubscribers = [];
      this.isRefreshing = false;
      return null;
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
