/**
 * Token Cleanup Utility
 * =====================
 * Handles cleanup and validation of JWT tokens to fix malformed token issues
 */

import logger from '../utils/logger.mjs';

class TokenCleanupUtility {
  constructor() {
    this.tokenKey = 'token';
    this.userKey = 'user';
    this.timestampKey = 'tokenTimestamp';
  }

  /**
   * Clean up all stored tokens and user data
   */
  cleanupAllTokens() {
    try {
      // Clear localStorage
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.timestampKey);
      
      // Clear sessionStorage
      sessionStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.userKey);
      sessionStorage.removeItem(this.timestampKey);
      
      // Clear any other potential token storage locations
      ['authToken', 'jwt', 'accessToken', 'refreshToken'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('Token cleanup completed');
      return true;
    } catch (error) {
      console.error('Token cleanup failed:', error);
      return false;
    }
  }

  /**
   * Validate if a token is well-formed (basic JWT structure check)
   */
  isValidJWTStructure(token) {
    // In development mode, special handling for mock tokens
    if (process.env.NODE_ENV === 'development' && 
        (token?.includes('mock-signature') || token?.includes('mock-jwt-token') || token?.includes('mock-admin-token'))) {
      console.log('[DEV MODE] Accepting mock token as valid');
      return true;
    }
    
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Check if it's a basic JWT structure (three parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    try {
      // Try to decode the header (first part)
      const header = JSON.parse(atob(parts[0]));
      if (!header.alg || !header.typ) {
        return false;
      }
      
      // Try to decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp && !payload.iat) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a clean, validated token from storage
   */
  getValidatedToken() {
    try {
      const token = localStorage.getItem(this.tokenKey);
      
      if (!token) {
        return null;
      }

      // Check if token has valid JWT structure
      if (!this.isValidJWTStructure(token)) {
        console.warn('Malformed JWT token detected, cleaning up...');
        this.cleanupAllTokens();
        return null;
      }

      // Check if token is expired
      const timestamp = localStorage.getItem(this.timestampKey);
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age > maxAge) {
          console.log('Token expired, cleaning up...');
          this.cleanupAllTokens();
          return null;
        }
      }

      return token;
    } catch (error) {
      console.error('Token validation failed:', error);
      this.cleanupAllTokens();
      return null;
    }
  }

  /**
   * Store a token with validation
   */
  storeToken(token, user = null) {
    try {
      // Validate token before storing
      if (!this.isValidJWTStructure(token)) {
        console.error('Attempted to store malformed JWT token');
        return false;
      }

      // Store the token
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.timestampKey, Date.now().toString());
      
      // Store user data if provided
      if (user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }

      console.log('Token stored successfully');
      return true;
    } catch (error) {
      console.error('Failed to store token:', error);
      return false;
    }
  }

  /**
   * Check for and clean malformed tokens on app initialization
   */
  initializeTokenCleanup() {
    try {
      const token = localStorage.getItem(this.tokenKey);
      
      if (token && !this.isValidJWTStructure(token)) {
        console.warn('Detected malformed token on initialization, cleaning up...');
        this.cleanupAllTokens();
        
        // Emit a custom event to notify the app about the cleanup
        window.dispatchEvent(new CustomEvent('tokenCleanup', {
          detail: { reason: 'malformed_token' }
        }));
      }
    } catch (error) {
      console.error('Token cleanup initialization failed:', error);
      this.cleanupAllTokens();
    }
  }

  /**
   * Handle token-related errors from API responses
   */
  handleTokenError(error) {
    // In development mode with mock tokens, don't clean up on 401 errors
    if (process.env.NODE_ENV === 'development') {
      const token = localStorage.getItem(this.tokenKey);
      if (token && (token.includes('mock-signature') || token.includes('mock-jwt-token') || token.includes('mock-admin-token'))) {
        console.log('[DEV MODE] Ignoring token error for mock token');
        return false;
      }
      
      // Also check for admin bypass flag
      const bypass = localStorage.getItem('bypass_admin_verification');
      if (bypass === 'true') {
        console.log('[DEV MODE] Ignoring token error due to admin bypass flag');
        return false;
      }
    }
    
    // Check if it's a token-related error
    if (error?.response?.status === 401 || 
        error?.response?.data?.message?.toLowerCase().includes('token') ||
        error?.response?.data?.message?.toLowerCase().includes('unauthorized')) {
      
      console.log('Token error detected, cleaning up tokens...');
      this.cleanupAllTokens();
      
      // Emit a custom event to notify the app
      window.dispatchEvent(new CustomEvent('tokenError', {
        detail: { error: error.response?.data?.message || 'Token error' }
      }));
      
      return true;
    }
    
    return false;
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo() {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return { hasToken: false };
    }

    const info = {
      hasToken: true,
      isValid: this.isValidJWTStructure(token),
      timestamp: localStorage.getItem(this.timestampKey),
      parts: token.split('.').length
    };

    if (info.isValid) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        info.payload = {
          exp: payload.exp,
          iat: payload.iat,
          userId: payload.sub || payload.userId,
          role: payload.role
        };
        
        // Check if expired
        if (payload.exp) {
          info.expired = Date.now() / 1000 > payload.exp;
        }
      } catch (error) {
        info.payloadError = error.message;
      }
    }

    return info;
  }
}

// Export singleton instance
const tokenCleanup = new TokenCleanupUtility();

// Initialize cleanup on module load
tokenCleanup.initializeTokenCleanup();

export default tokenCleanup;
