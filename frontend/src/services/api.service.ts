/**
 * PRODUCTION API SERVICE
 * ======================
 * Production-ready API service for SwanStudios frontend
 * Handles authentication, token management, and error handling for Render deployment
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Production configuration
const IS_PRODUCTION = import.meta.env.PROD || 
                     window.location.hostname.includes('render.com') || 
                     window.location.hostname.includes('sswanstudios.com') ||
                     window.location.hostname.includes('swanstudios.com');

const API_BASE_URL = IS_PRODUCTION
  ? 'https://ss-pt-new.onrender.com'
  : 'http://localhost:10000';

console.log(`[API] Production mode: ${IS_PRODUCTION}`);
console.log(`[API] Base URL: ${API_BASE_URL}`);

/**
 * Production Token Manager
 * Handles all token operations with proper error handling
 */
class ProductionTokenManager {
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
      console.warn('[TokenManager] Error getting token:', error);
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
      console.warn('[TokenManager] Error getting refresh token:', error);
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
      console.warn('[TokenManager] Error getting user:', error);
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
      console.log('[TokenManager] Auth data cleared');
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
      
      // Check if token expires within the next 30 seconds
      const currentTime = Math.floor(Date.now() / 1000);
      return exp <= (currentTime + 30);
    } catch (error) {
      console.warn('[TokenManager] Error checking token expiry:', error);
      return true;
    }
  }

  static async refreshAccessToken(): Promise<string | null> {
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
      console.log('[TokenManager] Attempting token refresh...');
      
      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
        refreshToken: refreshToken
      });

      if (response.data.success && response.data.token) {
        const newToken = response.data.token;
        const newRefreshToken = response.data.refreshToken || refreshToken;

        this.setToken(newToken);
        this.setRefreshToken(newRefreshToken);

        console.log('[TokenManager] Token refreshed successfully');

        this.refreshSubscribers.forEach(callback => callback(newToken));
        this.refreshSubscribers = [];
        this.isRefreshing = false;

        return newToken;
      } else {
        throw new Error('Invalid refresh response');
      }
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
    console.warn(`[TokenManager] Auth failure ${this.authFailureCount}/${this.MAX_AUTH_FAILURES}`);
    
    if (this.authFailureCount >= this.MAX_AUTH_FAILURES) {
      console.error('[TokenManager] Max auth failures reached, clearing auth data');
      this.clearAuthData();
      return true;
    }
    
    return false;
  }
}

/**
 * Create production-ready axios instance
 */
const createProductionApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: IS_PRODUCTION ? 30000 : 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true,
  });

  // Request interceptor
  client.interceptors.request.use(
    async (config) => {
      const token = ProductionTokenManager.getToken();
      
      if (token) {
        if (ProductionTokenManager.isTokenExpired(token)) {
          console.log('[API] Token is expired, attempting refresh...');
          const newToken = await ProductionTokenManager.refreshAccessToken();
          
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      if (IS_PRODUCTION) {
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
      }

      return config;
    },
    (error) => {
      console.error('[API] Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      ProductionTokenManager['authFailureCount'] = 0;
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const errorData = error.response.data as any;
        
        if (errorData?.errorCode === 'TOKEN_EXPIRED' || errorData?.message?.includes('expired')) {
          console.log('[API] Token expired, attempting refresh...');
          
          const newToken = await ProductionTokenManager.refreshAccessToken();
          
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          } else {
            ProductionTokenManager.clearAuthData();
            
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
              window.location.href = '/login';
            }
          }
        } else {
          const shouldRedirect = ProductionTokenManager.incrementAuthFailure();
          if (shouldRedirect && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }

      console.error('[API] Response error:', {
        status: error.response?.status,
        message: error.message,
        url: originalRequest?.url
      });

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Production API Service
 */
class ProductionApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = createProductionApiClient();
  }

  // Authentication methods
  async login(credentials: { username: string; password: string }) {
    try {
      console.log('[API] Attempting login...');
      const response = await this.client.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        const { token, refreshToken, user } = response.data;
        
        ProductionTokenManager.setToken(token);
        ProductionTokenManager.setRefreshToken(refreshToken);
        ProductionTokenManager.setUser(user);
        
        console.log('[API] Login successful');
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('[API] Login error:', error);
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
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
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
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('[API] Get current user error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.client.post('/api/auth/logout');
    } catch (error) {
      console.warn('[API] Logout request failed:', error);
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
      } else {
        return { success: false, valid: false, message: 'Token invalid' };
      }
    } catch (error) {
      console.error('[API] Token validation error:', error);
      return { success: false, valid: false, message: 'Validation error' };
    }
  }

  // HTTP methods
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

  // Utility methods
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
}

// Create and export default instance
const productionApiService = new ProductionApiService();

// Export for compatibility
export default productionApiService;
export { ProductionApiService, ProductionTokenManager };

// Global debug functions for production troubleshooting
if (typeof window !== 'undefined') {
  (window as any).debugAuth = () => {
    console.log('[DEBUG] Auth Status:', {
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
    console.log('[DEBUG] Auth data cleared');
  };

  (window as any).testAuthEndpoint = async () => {
    try {
      const response = await productionApiService.get('/api/auth/me');
      console.log('[DEBUG] Auth endpoint test:', response.data);
    } catch (error) {
      console.error('[DEBUG] Auth endpoint test failed:', error);
    }
  };
}
