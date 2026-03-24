/**
 * Token Debug Tool
 * ================
 * Debug utility to check and fix token issues
 * Can be run from browser console: window.debugTokens()
 */

import tokenCleanup from './tokenCleanup';
import { logger } from '@/utils/logger';

class TokenDebugTool {
  constructor() {
    // Make it available globally for debugging
    if (typeof window !== 'undefined') {
      window.debugTokens = this.debugAllTokens.bind(this);
      window.cleanupTokens = this.cleanupTokens.bind(this);
      window.showTokenInfo = this.showTokenInfo.bind(this);
    }
  }

  /**
   * Debug all token-related information
   */
  debugAllTokens() {
    console.group('🔍 Token Debug Information');
    
    // Get token info
    const tokenInfo = tokenCleanup.getTokenInfo();
    logger.log('📊 Token Info:', tokenInfo);
    
    // Check localStorage
    const localStorageTokens = this.getAllStorageTokens('localStorage');
    logger.log('💾 localStorage tokens:', localStorageTokens);
    
    // Check sessionStorage
    const sessionStorageTokens = this.getAllStorageTokens('sessionStorage');
    logger.log('🔒 sessionStorage tokens:', sessionStorageTokens);
    
    // Check if token is being sent in requests
    logger.log('🌐 Token in axios headers:', this.checkAxiosHeaders());
    
    // Provide recommendations
    logger.log('💡 Recommendations:', this.getRecommendations(tokenInfo));
    
    console.groupEnd();
    
    return {
      tokenInfo,
      localStorage: localStorageTokens,
      sessionStorage: sessionStorageTokens,
      axiosHeaders: this.checkAxiosHeaders()
    };
  }

  /**
   * Get all token-related items from storage
   */
  getAllStorageTokens(storageType) {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const tokens = {};
    
    // Common token key names
    const tokenKeys = [
      'token', 'authToken', 'jwt', 'accessToken', 'refreshToken',
      'user', 'tokenTimestamp', 'auth', 'session'
    ];
    
    tokenKeys.forEach(key => {
      const value = storage.getItem(key);
      if (value) {
        tokens[key] = value;
      }
    });
    
    return tokens;
  }

  /**
   * Check axios default headers for token
   */
  checkAxiosHeaders() {
    try {
      // Import api service to check headers
      import('../services/api.service').then(module => {
        const authHeader = module.apiClient.defaults.headers.common['Authorization'];
        logger.log('Authorization header:', authHeader);
        return authHeader || 'No Authorization header found';
      });
      return 'Checking...';
    } catch (error) {
      return `Error checking headers: ${error.message}`;
    }
  }

  /**
   * Get recommendations based on token status
   */
  getRecommendations(tokenInfo) {
    const recommendations = [];
    
    if (!tokenInfo.hasToken) {
      recommendations.push('❌ No token found - User needs to log in');
    } else if (!tokenInfo.isValid) {
      recommendations.push('⚠️ Token is malformed - Should be cleaned up');
    } else if (tokenInfo.expired) {
      recommendations.push('⏰ Token is expired - Needs refresh or re-login');
    } else {
      recommendations.push('✅ Token appears to be valid');
    }
    
    // Check for multiple tokens
    const localTokens = this.getAllStorageTokens('localStorage');
    const sessionTokens = this.getAllStorageTokens('sessionStorage');
    const totalTokens = Object.keys({...localTokens, ...sessionTokens}).length;
    
    if (totalTokens > 3) {
      recommendations.push(`🗂️ Found ${totalTokens} token-related items - Consider cleanup`);
    }
    
    return recommendations;
  }

  /**
   * Clean up all tokens
   */
  cleanupTokens() {
    logger.log('🧹 Cleaning up all tokens...');
    const result = tokenCleanup.cleanupAllTokens();
    logger.log(result ? '✅ Cleanup successful' : '❌ Cleanup failed');
    return result;
  }

  /**
   * Show detailed token information
   */
  showTokenInfo() {
    const info = tokenCleanup.getTokenInfo();
    console.table(info);
    return info;
  }

  /**
   * Test token validation
   */
  testTokenValidation(testToken) {
    if (!testToken) {
      testToken = localStorage.getItem('token');
    }
    
    if (!testToken) {
      logger.log('❌ No token to test');
      return false;
    }
    
    console.group('🧪 Testing Token Validation');
    
    const isValid = tokenCleanup.isValidJWTStructure(testToken);
    logger.log('Token:', testToken.substring(0, 50) + '...');
    logger.log('Is valid JWT structure:', isValid);
    
    if (isValid) {
      try {
        const parts = testToken.split('.');
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        
        logger.log('Header:', header);
        logger.log('Payload:', payload);
        
        if (payload.exp) {
          const now = Date.now() / 1000;
          const isExpired = now > payload.exp;
          logger.log('Is expired:', isExpired);
          logger.log('Expires at:', new Date(payload.exp * 1000));
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    
    console.groupEnd();
    return isValid;
  }

  /**
   * Generate a mock JWT for testing
   */
  generateMockJWT() {
    const header = btoa(JSON.stringify({
      alg: 'HS256',
      typ: 'JWT'
    }));
    
    const payload = btoa(JSON.stringify({
      sub: 'test-user-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      role: 'client'
    }));
    
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }
}

// Initialize the debug tool
const tokenDebugTool = new TokenDebugTool();

export default tokenDebugTool;
