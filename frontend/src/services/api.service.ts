/**
 * API Service
 * ===========
 * Centralized API service for making HTTP requests with proper error handling
 * and connection recovery features.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import tokenCleanup from '../utils/tokenCleanup';

// API URL from environment variables with fallbacks
// NOTE: Using empty base URL to leverage Vite's proxy feature
const API_BASE_URL = import.meta.env.MODE === 'development' 
  ? '' // Use empty base URL in development to leverage proxy
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

/**
 * Create an axios instance with default configuration
 */
export const createApiClient = (config?: AxiosRequestConfig): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // Increased timeout for better reliability
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    ...config,
  });

  // Add request interceptor for auth token
  instance.interceptors.request.use(
    (config) => {
      const token = tokenCleanup.getValidatedToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Check for token-related errors first
      if (tokenCleanup.handleTokenError(error)) {
        // Token error handled, let the error propagate for auth context to handle
      }
      
      // Enhanced error logging
      if (error.response) {
        // Server responded with error
        console.error(`API Error (${error.response.status}):`, error.response.data);
      } else if (error.request) {
        // No response received
        console.error('API Error: No response received', { 
          url: error.config?.url,
          method: error.config?.method?.toUpperCase()
        });
        
        // For development: If in development mode and we get a connection error,
        // we'll create a mock response to allow development without backend
        if (import.meta.env.MODE === 'development') {
          // Check if the request URL matches certain patterns
          const url = error.config?.url || '';
          
          if (url.includes('/health')) {
            // Mock health check response
            return Promise.resolve({
              status: 200,
              data: {
                status: 'mock',
                message: 'Using mock data in development mode',
                dbStatus: {
                  connected: true,
                  mongodb: { connected: true },
                  sequelize: { connected: true }
                }
              }
            });
          } else if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
            // For auth endpoints, let the auth context handle the error
            // but add a flag to indicate it's a connection error that should trigger mock login
            error.name = 'ConnectionError';
            return Promise.reject(error);
          }
        }
      } else {
        // Something else happened
        console.error('API Error:', error.message);
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

// Default API client
export const apiClient = createApiClient();

/**
 * API service with retry functionality
 */
class ApiService {
  private client: AxiosInstance;
  private retryCount: number = 2;
  private retryDelay: number = 1000;
  private useMockInDevelopment: boolean = true;

  constructor(client: AxiosInstance = apiClient) {
    this.client = client;
    
    // Enable mock responses in development by default
    this.useMockInDevelopment = import.meta.env.MODE === 'development';
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string | null) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  /**
   * Make a GET request with retry capability
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeWithRetry(() => this.client.get<T>(url, config));
  }

  /**
   * Make a POST request with retry capability
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeWithRetry(() => this.client.post<T>(url, data, config));
  }

  /**
   * Make a PUT request with retry capability
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeWithRetry(() => this.client.put<T>(url, data, config));
  }

  /**
   * Make a PATCH request with retry capability
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeWithRetry(() => this.client.patch<T>(url, data, config));
  }

  /**
   * Make a DELETE request with retry capability
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.executeWithRetry(() => this.client.delete<T>(url, config));
  }

  /**
   * Execute request with automatic retry for network issues
   */
  private async executeWithRetry<T>(
    request: () => Promise<AxiosResponse<T>>,
    retries = this.retryCount
  ): Promise<AxiosResponse<T>> {
    try {
      return await request();
    } catch (error: any) {
      // Only retry on network errors or 5xx server errors
      if (retries > 0 && this.shouldRetry(error)) {
        console.log(`Request failed. Retrying... (${retries} attempts left)`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Increase delay for next retry (exponential backoff)
        this.retryDelay *= 1.5;
        
        return this.executeWithRetry(request, retries - 1);
      }
      
      // In development mode with mocking enabled, provide mock responses for common endpoints
      if (this.useMockInDevelopment && import.meta.env.MODE === 'development') {
        const url = error.config?.url || '';
        const method = error.config?.method?.toLowerCase() || '';
        
        // Try to generate a mock response based on the endpoint
        const mockResponse = this.generateMockResponse(url, method, error.config?.data);
        if (mockResponse) {
          console.log(`Using mock response for ${method.toUpperCase()} ${url}`);
          return mockResponse as AxiosResponse<T>;
        }
      }
      
      throw error;
    }
  }

  /**
   * Generate mock responses for common endpoints in development mode
   */
  private generateMockResponse(url: string, method: string, requestData?: any): AxiosResponse | null {
    // Parse request data if it's a string
    let data = requestData;
    if (typeof requestData === 'string') {
      try {
        data = JSON.parse(requestData);
      } catch {
        // If parsing fails, keep the original data
        data = requestData;
      }
    }
    
    // Health check endpoint
    if (url.includes('/health')) {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          status: 'mock',
          message: 'Using mock health data',
          dbStatus: {
            connected: true,
            mongodb: { connected: true },
            sequelize: { connected: true }
          },
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Authentication endpoints
    if (url.includes('/api/auth/login') && method === 'post') {
      const username = data?.username || data?.email || 'mockuser';
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          token: 'mock-jwt-token',
          user: {
            id: 'mock-user-id',
            username: username,
            email: `${username}@example.com`,
            firstName: 'Mock',
            lastName: 'User',
            role: 'client',
            profileImage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      };
    }
    
    // For other endpoints, return null to indicate no mock is available
    return null;
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetry(error: any): boolean {
    // Retry if no response was received (network error)
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return true;
    }
    
    // Retry on 5xx server errors
    if (error.response && error.response.status >= 500) {
      return true;
    }
    
    // Don't retry other errors
    return false;
  }
  
  /**
   * Check server connection status
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      // In development with mocking enabled, pretend the server is connected
      if (this.useMockInDevelopment && import.meta.env.MODE === 'development') {
        console.log("API connection check failed. Using fallback...");
        return true;
      }
      return false;
    }
  }
  
  /**
   * Enable or disable mock responses in development mode
   */
  setUseMockInDevelopment(useMock: boolean): void {
    this.useMockInDevelopment = useMock;
  }
}

export default new ApiService();
