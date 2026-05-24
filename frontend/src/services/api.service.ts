/**
 * PRODUCTION API SERVICE
 * ======================
 * Production-ready API service for SwanStudios frontend.
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '@/utils/logger';
import {
  createProductionApiClient,
  registerPaywallTrigger,
  unregisterPaywallTrigger,
} from './apiClientFactory';
import { ProductionTokenManager } from './productionTokenManager';

export { registerPaywallTrigger, unregisterPaywallTrigger };

const IS_PRODUCTION = import.meta.env.PROD
  || window.location.hostname.includes('render.com')
  || window.location.hostname.includes('sswanstudios.com')
  || window.location.hostname.includes('swanstudios.com');

const API_BASE_URL = IS_PRODUCTION
  ? 'https://sswanstudios.com'
  : 'http://localhost:10000';

logger.log(`[API] Production mode: ${IS_PRODUCTION}`);
logger.log(`[API] Base URL: ${API_BASE_URL}`);

class ProductionApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = createProductionApiClient(API_BASE_URL, IS_PRODUCTION);
  }

  async checkConnection(): Promise<boolean> {
    try {
      logger.log('[API] Checking server connection...');
      const response = await this.client.get('/api/health', { timeout: 5000 });

      if (response.data && response.status === 200) {
        logger.log('[API] Server connection successful');
        return true;
      }

      logger.warn('[API] Server responded but not with expected format');
      return false;
    } catch (error: any) {
      logger.warn('[API] Server connection failed:', {
        message: error.message,
        status: error.response?.status,
        code: error.code
      });
      return false;
    }
  }

  async login(credentials: { username: string; password: string }) {
    try {
      logger.log('[API] Attempting login...');
      const response = await this.client.post('/api/auth/login', credentials);

      if (response.data.success) {
        if (response.data.forcePasswordChange) {
          ProductionTokenManager.clearAuthData();
          delete this.client.defaults.headers.common['Authorization'];
          logger.log('[API] Force password change required');
          return response.data;
        }

        const { token, refreshToken, user } = response.data;
        ProductionTokenManager.setToken(token);
        ProductionTokenManager.setRefreshToken(refreshToken);
        ProductionTokenManager.setUser(user);

        logger.log('[API] Login successful');
        return response.data;
      }

      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      console.error('[API] Login error:', error);
      throw error;
    }
  }

  async forceChangePassword(tempToken: string, newPassword: string) {
    try {
      const response = await this.client.post('/api/auth/force-change-password', {
        tempToken,
        newPassword
      });

      if (response.data.success) {
        const { token, refreshToken, user } = response.data;
        ProductionTokenManager.setToken(token);
        ProductionTokenManager.setRefreshToken(refreshToken);
        ProductionTokenManager.setUser(user);
        return response.data;
      }

      throw new Error(response.data.message || 'Password change failed');
    } catch (error) {
      console.error('[API] Force password change error:', error);
      throw error;
    }
  }

  async register(userData: any) {
    try {
      const response = await this.client.post('/api/auth/register', userData);

      if (response.data.success) {
        const { token, refreshToken, user } = response.data;
        ProductionTokenManager.setToken(token);
        ProductionTokenManager.setRefreshToken(refreshToken);
        ProductionTokenManager.setUser(user);
        return response.data;
      }

      throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
      console.error('[API] Registration error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/api/auth/me');

      if (response.data.success && response.data.user) {
        ProductionTokenManager.setUser(response.data.user);
        return response.data;
      }

      throw new Error('Failed to fetch user data');
    } catch (error) {
      console.error('[API] Get current user error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.client.post('/api/auth/logout');
    } catch (error) {
      logger.warn('[API] Logout request failed:', error);
    } finally {
      ProductionTokenManager.clearAuthData();
    }
  }

  async validateToken() {
    try {
      const token = ProductionTokenManager.getToken();
      if (!token) {
        return { success: false, valid: false, message: 'No token found' };
      }

      const response = await this.client.get('/api/auth/validate-token');

      if (response.data.success && response.data.valid) {
        ProductionTokenManager.setUser(response.data.user);
        return response.data;
      }

      return { success: false, valid: false, message: 'Token invalid' };
    } catch (error) {
      console.error('[API] Token validation error:', error);
      return { success: false, valid: false, message: 'Validation error' };
    }
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  getStoredUser() {
    return ProductionTokenManager.getUser();
  }

  isAuthenticated(): boolean {
    const token = ProductionTokenManager.getToken();
    const user = ProductionTokenManager.getUser();
    return !!(token && user);
  }

  clearAuthData() {
    ProductionTokenManager.clearAuthData();
  }

  setAuthToken(token: string | null) {
    if (token) {
      ProductionTokenManager.setToken(token);
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  getAuthorizationHeader() {
    return this.client.defaults.headers.common['Authorization'] || null;
  }
}

const productionApiService = new ProductionApiService();

export default productionApiService;
export { ProductionApiService, ProductionTokenManager };
export { ProductionApiService as ApiService };

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).debugAuth = () => {
    logger.log('[DEBUG] Auth Status:', {
      hasToken: !!ProductionTokenManager.getToken(),
      hasRefreshToken: !!ProductionTokenManager.getRefreshToken(),
      hasUser: !!ProductionTokenManager.getUser(),
      user: ProductionTokenManager.getUser(),
      apiBaseUrl: API_BASE_URL,
      isProduction: IS_PRODUCTION
    });
  };

  (window as any).clearAuthData = () => {
    ProductionTokenManager.clearAuthData();
    logger.log('[DEBUG] Auth data cleared');
  };

  (window as any).testAuthEndpoint = async () => {
    try {
      const response = await productionApiService.get('/api/auth/me');
      logger.log('[DEBUG] Auth endpoint test:', response.data);
    } catch (error) {
      console.error('[DEBUG] Auth endpoint test failed:', error);
    }
  };
}
