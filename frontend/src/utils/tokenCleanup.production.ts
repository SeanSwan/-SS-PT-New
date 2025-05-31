/**
 * PRODUCTION TOKEN CLEANUP UTILITY
 * ================================
 * Production-ready token cleanup that doesn't create infinite loops
 */

class ProductionTokenCleanup {
  private tokenKey = 'token';
  private userKey = 'user';
  private timestampKey = 'tokenTimestamp';
  private refreshTokenKey = 'refreshToken';
  
  private isProduction = import.meta.env.PROD || 
                        window.location.hostname.includes('render.com') || 
                        window.location.hostname.includes('sswanstudios.com');
  
  private cleanupCount = 0;
  private maxCleanups = 3; // Prevent infinite cleanup loops

  /**
   * Clean up all stored tokens and user data (with loop prevention)
   */
  cleanupAllTokens(): boolean {
    // Prevent infinite cleanup loops
    if (this.cleanupCount >= this.maxCleanups) {
      console.warn('[TokenCleanup] Max cleanup attempts reached, skipping to prevent loops');
      return false;
    }

    this.cleanupCount++;

    try {
      // Clear localStorage
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.timestampKey);
      localStorage.removeItem(this.refreshTokenKey);
      
      // Clear sessionStorage
      sessionStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.userKey);
      sessionStorage.removeItem(this.timestampKey);
      sessionStorage.removeItem(this.refreshTokenKey);
      
      // Clear other potential auth storage
      const authKeys = ['authToken', 'jwt', 'accessToken', 'bypass_admin_verification'];
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log(`[TokenCleanup] Tokens cleared (attempt ${this.cleanupCount})`);
      
      // Reset cleanup count after successful cleanup
      setTimeout(() => {
        this.cleanupCount = 0;
      }, 5000);
      
      return true;
    } catch (error) {
      console.error('[TokenCleanup] Failed:', error);
      return false;
    }
  }

  /**
   * Validate JWT structure (production-safe)
   */
  isValidJWTStructure(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Basic JWT structure check
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    try {
      // Try to decode the payload (production-safe)
      const payload = JSON.parse(atob(parts[1]));
      
      // Basic validation
      if (!payload.exp || !payload.iat) {
        return false;
      }
      
      return true;
    } catch (error) {
      // If we can't decode, it's invalid
      return false;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      
      if (!exp) return false;
      
      // Check if expired (with 30 second buffer)
      const currentTime = Math.floor(Date.now() / 1000);
      return exp <= (currentTime + 30);
    } catch (error) {
      return true; // If we can't parse, consider it expired
    }
  }

  /**
   * Get validated token (production-safe)
   */
  getValidatedToken(): string | null {
    try {
      const token = localStorage.getItem(this.tokenKey);
      
      if (!token) {
        return null;
      }

      // Quick structure validation
      if (!this.isValidJWTStructure(token)) {
        console.warn('[TokenCleanup] Invalid token structure detected');
        return null; // Don't auto-cleanup, let the app handle it
      }

      // Check expiration
      if (this.isTokenExpired(token)) {
        console.log('[TokenCleanup] Token expired');
        return null; // Don't auto-cleanup, let refresh token handle it
      }

      return token;
    } catch (error) {
      console.error('[TokenCleanup] Validation error:', error);
      return null;
    }
  }

  /**
   * Store token with basic validation
   */
  storeToken(token: string, user?: any): boolean {
    try {
      if (!this.isValidJWTStructure(token)) {
        console.error('[TokenCleanup] Cannot store invalid token');
        return false;
      }

      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.timestampKey, Date.now().toString());
      
      if (user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }

      console.log('[TokenCleanup] Token stored successfully');
      return true;
    } catch (error) {
      console.error('[TokenCleanup] Storage failed:', error);
      return false;
    }
  }

  /**
   * Handle token errors (production-safe, no loops)
   */
  handleTokenError(error: any): boolean {
    // Prevent infinite error handling
    if (this.cleanupCount >= this.maxCleanups) {
      console.warn('[TokenCleanup] Max error handling attempts reached');
      return false;
    }

    // Only handle specific token errors
    const isTokenError = error?.response?.status === 401 ||
                        error?.response?.data?.errorCode === 'TOKEN_EXPIRED' ||
                        error?.response?.data?.errorCode === 'TOKEN_INVALID';

    if (!isTokenError) {
      return false; // Not a token error
    }

    console.log('[TokenCleanup] Token error detected:', error?.response?.data?.message || 'Unknown error');
    
    // Emit event for app to handle
    window.dispatchEvent(new CustomEvent('tokenError', {
      detail: { 
        error: error?.response?.data?.message || 'Token error',
        errorCode: error?.response?.data?.errorCode 
      }
    }));
    
    return true; // Indicates this was a token error
  }

  /**
   * Initialize cleanup (production-safe)
   */
  initializeTokenCleanup(): void {
    try {
      const token = localStorage.getItem(this.tokenKey);
      
      if (!token) {
        return; // No token to check
      }

      if (!this.isValidJWTStructure(token)) {
        console.warn('[TokenCleanup] Malformed token detected on init');
        
        // Only cleanup if we haven't done too many already
        if (this.cleanupCount < this.maxCleanups) {
          this.cleanupAllTokens();
          
          window.dispatchEvent(new CustomEvent('tokenCleanup', {
            detail: { reason: 'malformed_token' }
          }));
        }
      }
    } catch (error) {
      console.error('[TokenCleanup] Initialization error:', error);
    }
  }

  /**
   * Get token information for debugging
   */
  getTokenInfo(): any {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return { hasToken: false };
    }

    const info: any = {
      hasToken: true,
      isValid: this.isValidJWTStructure(token),
      timestamp: localStorage.getItem(this.timestampKey),
      parts: token.split('.').length,
      cleanupCount: this.cleanupCount
    };

    if (info.isValid) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        info.payload = {
          exp: payload.exp,
          iat: payload.iat,
          userId: payload.id || payload.sub,
          role: payload.role,
          tokenType: payload.tokenType
        };
        
        if (payload.exp) {
          info.expired = Date.now() / 1000 > payload.exp;
          info.timeToExpiry = payload.exp * 1000 - Date.now();
        }
      } catch (error) {
        info.payloadError = error.message;
      }
    }

    return info;
  }

  /**
   * Reset cleanup count (for manual intervention)
   */
  resetCleanupCount(): void {
    this.cleanupCount = 0;
    console.log('[TokenCleanup] Cleanup count reset');
  }

  /**
   * Check if we should skip token operations (to prevent loops)
   */
  shouldSkipOperation(): boolean {
    return this.cleanupCount >= this.maxCleanups;
  }
}

// Create singleton instance
const productionTokenCleanup = new ProductionTokenCleanup();

// Initialize with error handling
try {
  productionTokenCleanup.initializeTokenCleanup();
} catch (error) {
  console.warn('[TokenCleanup] Initialization failed:', error);
}

export default productionTokenCleanup;
