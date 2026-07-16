/**
 * ============================================================================
 * FILE: tokenDebugTool.ts
 * PURPOSE: Development-only token diagnostics without exposing credentials.
 * ============================================================================
 *
 * Browser helpers report token presence, length, validity, and expiry metadata.
 * They never return or log raw storage values, JWT claims, or auth headers.
 */

import tokenCleanup from './tokenCleanup';
import { logger } from '@/utils/logger';
import apiService from '../services/api.service';

type StorageKind = 'localStorage' | 'sessionStorage';

interface StoredTokenPresence {
  present: true;
  length: number;
}

type TokenPresenceMap = Record<string, StoredTokenPresence>;

interface RawTokenInfo {
  hasToken?: boolean;
  isValid?: boolean;
  expired?: boolean;
  expiresAt?: string | number | Date | null;
  userId?: string | number | null;
  subject?: string | null;
  [key: string]: unknown;
}

interface SafeTokenInfo {
  hasToken: boolean;
  isValid: boolean;
  expired: boolean;
  expiresAt: string | number | Date | null;
  hasSubject: boolean;
}

const isDevBuild = import.meta.env.DEV;

const redactTokenInfo = (info: RawTokenInfo): SafeTokenInfo => ({
  hasToken: Boolean(info.hasToken),
  isValid: Boolean(info.isValid),
  expired: Boolean(info.expired),
  expiresAt: info.expiresAt ?? null,
  hasSubject: Boolean(info.subject ?? info.userId),
});

class TokenDebugTool {
  constructor() {
    if (isDevBuild && typeof window !== 'undefined') {
      window.debugTokens = this.debugAllTokens.bind(this);
      window.cleanupTokens = this.cleanupTokens.bind(this);
      window.showTokenInfo = this.showTokenInfo.bind(this);
    }
  }

  /** Report safe token metadata from all supported stores. */
  debugAllTokens() {
    logger.group('[TokenDebug] Token diagnostics');

    const tokenInfo = redactTokenInfo(tokenCleanup.getTokenInfo());
    const localStorageTokens = this.getAllStorageTokens('localStorage');
    const sessionStorageTokens = this.getAllStorageTokens('sessionStorage');
    const axiosHeaders = this.checkAxiosHeaders();

    logger.table(tokenInfo);
    logger.debug('[TokenDebug] localStorage token presence', localStorageTokens);
    logger.debug('[TokenDebug] sessionStorage token presence', sessionStorageTokens);
    logger.debug('[TokenDebug] request auth state', axiosHeaders);
    logger.debug('[TokenDebug] recommendations', this.getRecommendations(tokenInfo));
    logger.groupEnd();

    return {
      tokenInfo,
      localStorage: localStorageTokens,
      sessionStorage: sessionStorageTokens,
      axiosHeaders,
    };
  }

  /** Return presence metadata only; never return a storage value. */
  getAllStorageTokens(storageType: StorageKind): TokenPresenceMap {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const tokens: TokenPresenceMap = {};
    const tokenKeys = [
      'token',
      'authToken',
      'jwt',
      'accessToken',
      'refreshToken',
      'user',
      'tokenTimestamp',
      'auth',
      'session',
    ];

    tokenKeys.forEach((key) => {
      const value = storage.getItem(key);
      if (value) {
        tokens[key] = { present: true, length: value.length };
      }
    });

    return tokens;
  }

  /** Report whether an authorization header exists without exposing its value. */
  checkAxiosHeaders(): { hasAuthorizationHeader: boolean; error?: string } {
    try {
      return {
        hasAuthorizationHeader: Boolean(apiService.getAuthorizationHeader()),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown header check error';
      return { hasAuthorizationHeader: false, error: message };
    }
  }

  /** Build safe remediation hints from redacted token status. */
  getRecommendations(tokenInfo: Pick<SafeTokenInfo, 'hasToken' | 'isValid' | 'expired'>): string[] {
    const recommendations: string[] = [];

    if (!tokenInfo.hasToken) {
      recommendations.push('No token found - user needs to log in');
    } else if (!tokenInfo.isValid) {
      recommendations.push('Token is malformed - clear authentication state');
    } else if (tokenInfo.expired) {
      recommendations.push('Token is expired - refresh or log in again');
    } else {
      recommendations.push('Token structure and expiry metadata are valid');
    }

    const localTokens = this.getAllStorageTokens('localStorage');
    const sessionTokens = this.getAllStorageTokens('sessionStorage');
    const totalTokens = Object.keys({ ...localTokens, ...sessionTokens }).length;

    if (totalTokens > 3) {
      recommendations.push(
        'Found ' + totalTokens + ' token-related items - consider cleanup',
      );
    }

    return recommendations;
  }

  /** Clear token state through the canonical cleanup helper. */
  cleanupTokens() {
    logger.debug('[TokenDebug] Cleaning token state');
    const result = tokenCleanup.cleanupAllTokens();
    logger.debug('[TokenDebug] Cleanup ' + (result ? 'completed' : 'failed'));
    return result;
  }

  /** Show redacted token metadata only. */
  showTokenInfo(): SafeTokenInfo {
    const info = redactTokenInfo(tokenCleanup.getTokenInfo());
    logger.table(info);
    return info;
  }

  /** Validate token structure without logging or returning token contents. */
  testTokenValidation(testToken?: string | null): boolean {
    const token = testToken ?? localStorage.getItem('token');

    if (!token) {
      logger.debug('[TokenDebug] No token available for validation');
      return false;
    }

    const isValid = tokenCleanup.isValidJWTStructure(token);
    logger.debug('[TokenDebug] Validation result', {
      length: token.length,
      isValid,
      isExpired: isValid ? tokenCleanup.isTokenExpired(token) : null,
    });
    return isValid;
  }
}

const tokenDebugTool = new TokenDebugTool();

export default tokenDebugTool;
