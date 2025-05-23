/**
 * API Service
 * ===========
 * Centralized API service for making HTTP requests with proper error handling
 * and connection recovery features.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import tokenCleanup from '../utils/tokenCleanup';

// TypeScript declarations
declare global {
  interface Window {
    REACT_APP_FORCE_MOCK_API?: string;
    REACT_APP_SKIP_API_RETRIES?: string;
    REACT_APP_FORCE_MOCK_WEBSOCKET?: string;
    REACT_APP_MOCK_WEBSOCKET?: string;
    enableAdminBypass?: () => string;
    checkAdminBypass?: () => any;
  }
}

// API URL from environment variables with fallbacks
// NOTE: Using empty base URL to leverage Vite's proxy feature
const API_BASE_URL = import.meta.env.MODE === 'development' 
  ? '' // Use empty base URL in development to leverage proxy
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

// In development mode, force mock mode to avoid backend connection issues
const FORCE_MOCK_MODE = import.meta.env.MODE === 'development';

// Force development mode admin tokens to be valid
if (import.meta.env.MODE === 'development') {
  // Ensure mock admin token exists on startup
  const ensureMockAdminToken = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      console.log('[DEV MODE] Creating mock admin token and user');
      
      const mockAdmin = {
        id: 'mock-admin-' + Date.now(),
        username: 'admin',
        email: 'admin@swanstudios.com',
        firstName: 'Admin',
        lastName: 'Dev',
        role: 'admin',
        isActive: true,
        permissions: ['admin:all'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
        id: mockAdmin.id,
        username: mockAdmin.username,
        role: mockAdmin.role,
        exp: Math.floor(Date.now()/1000) + (24*60*60)
      }))}.mock-admin-token`;
      
      localStorage.setItem('token', mockToken);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(mockAdmin));
      localStorage.setItem('bypass_admin_verification', 'true');
      
      console.log('[DEV MODE] Mock admin token created successfully');
    }
  };
  
  // Call immediately
  ensureMockAdminToken();
}

// In development mode, add utility to bypass admin verification
if (import.meta.env.MODE === 'development') {
  // Add admin access helper function to global window object
  window.enableAdminBypass = function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('[DEV MODE] Enabling admin bypass for user:', user.username || 'Unknown');
    localStorage.setItem('bypass_admin_verification', 'true');
    
    // If not already admin, make them admin in the user record
    if (user && user.username) {
      user.role = 'admin';
      localStorage.setItem('user', JSON.stringify(user));
      console.log('[DEV MODE] User role changed to admin');
    }
    
    console.log('[DEV MODE] Admin bypass enabled. Reloading page to apply...');
    setTimeout(() => window.location.reload(), 100);
    return 'Admin bypass enabled. Reloading page...';
  };
  
  // Add debug info helper
  window.checkAdminBypass = function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const bypass = localStorage.getItem('bypass_admin_verification');
    const token = localStorage.getItem('token');
    return {
      user: user?.username || 'No user',
      role: user?.role || 'No role',
      bypassActive: bypass === 'true',
      hasToken: !!token
    };
  };
  
  console.log('[DEV MODE] Admin bypass helpers available in console: enableAdminBypass() and checkAdminBypass()');
}

// Initialize mock mode flags early
if (FORCE_MOCK_MODE && typeof window !== 'undefined') {
  console.log('[DEV MODE] Setting API mock mode flags');
  window.REACT_APP_FORCE_MOCK_API = 'true';
  window.REACT_APP_SKIP_API_RETRIES = 'true';
  
  // Pre-create a mock token if none exists to avoid auth issues
  if (!localStorage.getItem('token')) {
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
      id: 'mock-id-' + Date.now(),
      username: 'admin',
      role: 'admin',
      exp: Math.floor(Date.now()/1000) + (24*60*60)
    }))}.mock-jwt-token`;
    
    localStorage.setItem('token', mockToken);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    console.log('[DEV MODE] Pre-created mock token for development');
  }
}

// Detect WebSocket connection attempts and block in development mode
if (import.meta.env.MODE === 'development' && typeof window !== 'undefined') {
  // Intercept WebSocket connections
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url: string, protocols?: string | string[]) {
    // Check if this is a connection to our backend
    if (url.includes('localhost:10000') || url.includes('ws://localhost')) {
      console.log(`[DEV MODE] Blocking WebSocket connection attempt to ${url}`);
      console.log('[DEV MODE] Using mock WebSocket instead');
      
      // Create a fake WebSocket object that mimics the interface but doesn't connect
      const mockSocket: any = {};
      mockSocket.url = url;
      mockSocket.readyState = 1; // WebSocket.OPEN
      mockSocket.send = () => true;
      mockSocket.close = () => {};
      
      // Call any onopen handlers on next tick
      setTimeout(() => {
        if (mockSocket.onopen) {
          mockSocket.onopen({ target: mockSocket });
        }
      }, 0);
      
      return mockSocket;
    }
    
    // For non-backend connections, use the real WebSocket
    return new originalWebSocket(url, protocols);
  };
  window.WebSocket.prototype = originalWebSocket.prototype;
  window.WebSocket.CLOSED = originalWebSocket.CLOSED;
  window.WebSocket.CLOSING = originalWebSocket.CLOSING;
  window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
  window.WebSocket.OPEN = originalWebSocket.OPEN;
}

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

  // Add request interceptor for auth token and request mocking in development
  instance.interceptors.request.use(
    (config) => {
      // In development mode, check if this is an auth or health endpoint and provide mock response immediately
      if (import.meta.env.MODE === 'development' && 
          (config.url?.includes('/api/auth/') || config.url?.includes('/health'))) {
        console.log(`[DEV MODE] Intercepting request to ${config.url}`);
        
        // Create a promise that never resolves to prevent the actual request
        // This will be caught by our response interceptor that handles mocks
        
        // Ensure the URL is clean for mock generation
        let cleanUrl = config.url || '';
        // Remove any URL parameters
        if (cleanUrl.includes('?')) {
          cleanUrl = cleanUrl.split('?')[0];
        }
        
        console.log(`[DEV MODE] Intercepting and mocking auth request: ${config.method?.toUpperCase()} ${cleanUrl}`);
        
        return {
          ...config,
          // Store a clean version of the URL for easier mock response matching
          cleanUrl,
          // Set a flag to identify this as a request that should be mocked
          mockThisRequest: true,
          // Cancel the request by setting adapter to a function that never resolves
          adapter: () => new Promise(() => {})
        };
      }
      
      // For normal requests, just add the auth token
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
      // Check if this is a request we intentionally canceled to mock
      if (error.config?.mockThisRequest === true) {
        // Use the clean URL if available, otherwise fall back to the original URL
        const url = error.config?.cleanUrl || error.config?.url || '';
        const method = error.config?.method?.toLowerCase() || 'get';
        const data = error.config?.data;
        
        console.log(`[DEV MODE] Handling intercepted request: ${method.toUpperCase()} ${url}`);
        
        // Use a utility to generate mock responses since we can't instantiate ApiService here
        const mockResponse = generateMockResponse(url, method, data);
        
        if (mockResponse) {
          console.log(`[DEV MODE] Providing mock response for intercepted ${method.toUpperCase()} ${url}`);
          return Promise.resolve(mockResponse);
        }
      }
      
      // Check for token-related errors first
      if (tokenCleanup.handleTokenError(error)) {
        // Token error handled, let the error propagate for auth context to handle
        // Don't do additional logging for these in development
        if (import.meta.env.MODE === 'development') {
          return Promise.reject(error);
        }
      }
      
      // Enhanced error logging
      if (error.response) {
        // Don't log auth errors in development mode (avoids console spam)
        const url = error.config?.url || '';
        const isDev = import.meta.env.MODE === 'development';
        
        if (!(isDev && (url.includes('/api/auth/') || url.includes('/health')))) {
          // Server responded with error that's not from auth endpoints in dev mode
          console.error(`API Error (${error.response.status}):`, error.response.data);
        }
      } else if (error.request) {
        // No response received
        // Don't log connection errors for auth endpoints in development mode
        const url = error.config?.url || '';
        const isDev = import.meta.env.MODE === 'development';
        
        if (!(isDev && (url.includes('/api/auth/') || url.includes('/health')))) {
          console.error('API Error: No response received', { 
            url: error.config?.url,
            method: error.config?.method?.toUpperCase()
          });
        }
        
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

/**
 * Generate mock responses for common endpoints in development mode
 */
function generateMockResponse(url: string, method: string, requestData?: any): AxiosResponse | null {
  // SAFETY CHECK: Only generate mocks in development mode
  if (import.meta.env.MODE !== 'development') {
    console.warn('[PRODUCTION] Mock response generation attempted in production mode - this should not happen!');
    return null;
  }
  // Clean the URL to ensure consistent matching
  let cleanUrl = url;
  if (cleanUrl.includes('?')) {
    cleanUrl = cleanUrl.split('?')[0];
  }
  url = cleanUrl;
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
  
  // Auth-related responses
  if (url.includes('/api/auth/')) {
    // Check for different auth endpoints
    
    // 1. Auth/me endpoint
    if (url.includes('/api/auth/me')) {
      console.log('[DEV MODE] Using mock response for auth/me endpoint');
      
      // Get username from localStorage if available for persistence
      const storedUser = localStorage.getItem('user');
      let username = 'admin';
      let firstName = 'Admin';
      let lastName = 'Test';
      let role = 'admin';
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          username = userData.username || username;
          firstName = userData.firstName || firstName;
          lastName = userData.lastName || lastName;
          role = userData.role || role;
        } catch (e) {
          console.warn('[DEV MODE] Failed to parse stored user data, using defaults');
        }
      }
      
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          success: true,
          user: {
            id: 'bf908297-b5ca-447c-8f95-98f00bc9ce87',
            email: `${username}@swanstudios.com`,
            username,
            firstName,
            lastName,
            role,
            isActive: true,
            permissions: role === 'admin' ? ['admin:all'] : role === 'trainer' ? ['trainer:all'] : ['client:self'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            profileImageUrl: null
          }
        }
      };
    }
    
    // 2. Auth/login endpoint
    if (url.includes('/api/auth/login') && method === 'post') {
      const username = data?.username || data?.email || 'mockuser';
      const userRole = username.includes('admin') ? 'admin' : 
                      (username.includes('trainer') ? 'trainer' : 'client');
      
      // Create a proper mock JWT with the standard structure
      const mockUser = {
        id: 'bf908297-b5ca-447c-' + Date.now().toString(16),
        username: username,
        email: `${username}@example.com`,
        firstName: 'Mock',
        lastName: 'User',
        role: userRole,
        isActive: true,
        permissions: userRole === 'admin' ? ['admin:all'] : [],
        profileImageUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Build a mock JWT token
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        exp: Math.floor(Date.now()/1000) + (24*60*60)
      }))}.mock-jwt-token`;
      
      // Store the user and token in localStorage for persistence
      localStorage.setItem('token', mockToken);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      console.log(`[DEV MODE] Mock login successful for ${username} with role ${userRole}`);
      
      // If admin role, set bypass flag for direct admin access
      if (userRole === 'admin') {
        localStorage.setItem('bypass_admin_verification', 'true');
      }
      
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          success: true,
          token: mockToken,
          user: mockUser
        }
      };
    }
    
    // 3. Default generic response for other auth endpoints
    console.log(`[DEV MODE] Using generic mock response for ${url}`);
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
      data: {
        success: true,
        message: 'Mock response for auth endpoint'
      }
    };
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
  
  // For other endpoints, return null to indicate no mock is available
  return null;
}

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
    
    // Always enable mock responses in development
    if (import.meta.env.MODE === 'development') {
      this.useMockInDevelopment = true;
      console.log('[DEV MODE] API Service initialized with mock mode enabled');
      
      // Inject auth mock endpoint directly for critical paths
      if (typeof window !== 'undefined') {
        window.REACT_APP_FORCE_MOCK_API = 'true';
        console.log('[DEV MODE] Force mock API mode enabled for auth endpoints');
      }
    } else {
      this.useMockInDevelopment = false;
    }
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
    // Analyze the request to determine if it's an auth-related endpoint
    const requestFunc = request.toString();
    let url = '';
    let method = 'get';
    
    // Try to extract URL from the request function
    if (requestFunc.includes('get(')) {
      const match = /\.get\(['"](.*?)['"]/.exec(requestFunc);
      if (match) {
        url = match[1];
        method = 'get';
      }
    } else if (requestFunc.includes('post(')) {
      const match = /\.post\(['"](.*?)['"]/.exec(requestFunc);
      if (match) {
        url = match[1];
        method = 'post';
      }
    } else if (requestFunc.includes('put(')) {
      const match = /\.put\(['"](.*?)['"]/.exec(requestFunc);
      if (match) {
        url = match[1];
        method = 'put';
      }
    } else if (requestFunc.includes('patch(')) {
      const match = /\.patch\(['"](.*?)['"]/.exec(requestFunc);
      if (match) {
        url = match[1];
        method = 'patch';
      }
    } else if (requestFunc.includes('delete(')) {
      const match = /\.delete\(['"](.*?)['"]/.exec(requestFunc);
      if (match) {
        url = match[1];
        method = 'delete';
      }
    }
    
    console.log(`[DEV MODE] Analyzing request: ${method.toUpperCase()} ${url}`);
    
    // Clean the URL to help matching
    if (url.startsWith('/')) {
      // Remove leading slash for consistent matching
      url = url.substring(1);
    }
    
    // In development mode, force set bypass flag for admin if needed
    if (import.meta.env.MODE === 'development' && url === 'api/auth/me') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.role === 'admin') {
            console.log('[DEV MODE] Ensuring admin verification bypass flag is set in executeWithRetry');
            localStorage.setItem('bypass_admin_verification', 'true');
          }
        } catch (e) {
          console.warn('[DEV MODE] Failed to parse stored user data');
        }
      }
    }
    
    // In development mode with mocking enabled, immediately use mock data for auth endpoints
    const isAuthEndpoint = url.includes('/api/auth/') || url.includes('api/auth/') || url.includes('auth/');
    const isHealthEndpoint = url.includes('/health');
    const shouldUseMockDirectly = import.meta.env.MODE === 'development' && 
      (FORCE_MOCK_MODE || window.REACT_APP_FORCE_MOCK_API === 'true') && 
      (isAuthEndpoint || isHealthEndpoint);
    
    // Additional check for the specific error URL we saw in logs
    if (import.meta.env.MODE === 'development' && url === 'api/auth/me') {
      console.log('[DEV MODE] Detected specific problem URL (api/auth/me), using mock response directly');
      const mockResponse = this.generateMockResponse('api/auth/me', method);
      if (mockResponse) {
        return mockResponse as AxiosResponse<T>;
      }
    }
    
    if (shouldUseMockDirectly) {
      const mockResponse = this.generateMockResponse(url, method);
      if (mockResponse) {
        console.log(`[DEV MODE] Using mock response for ${method.toUpperCase()} ${url}`);
        return mockResponse as AxiosResponse<T>;
      }
    }
    
    try {
      return await request();
    } catch (error: any) {
      // Skip retries in development mode if flag is set
      if (typeof window !== 'undefined' && 
          window.REACT_APP_SKIP_API_RETRIES === 'true' &&
          import.meta.env.MODE === 'development') {
        console.log('[DEV MODE] Skipping API retries and using mock data where available');
        
        // Try to generate a mock response based on the endpoint
        const url = error.config?.url || '';
        const method = error.config?.method?.toLowerCase() || '';
        const mockResponse = this.generateMockResponse(url, method, error.config?.data);
        
        if (mockResponse) {
          console.log(`[DEV MODE] Using mock response for ${method.toUpperCase()} ${url}`);
          return mockResponse as AxiosResponse<T>;
        }
        
        // If we don't have a mock for this endpoint, re-throw the error
        throw error;
      }
      
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
          console.log(`[DEV MODE] Using mock response for ${method.toUpperCase()} ${url}`);
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
    // SAFETY CHECK: Only generate mocks in development mode
    if (import.meta.env.MODE !== 'development') {
      console.warn('[PRODUCTION] Mock response generation attempted in production mode - this should not happen!');
      return null;
    }
    // Clean the URL to ensure consistent matching
    let cleanUrl = url;
    if (cleanUrl.includes('?')) {
      cleanUrl = cleanUrl.split('?')[0];
    }
    url = cleanUrl;
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
    
    // Auth-related responses
    if (url.includes('/api/auth/')) {
      // Check for different auth endpoints
      
      // 1. Auth/me endpoint
      if (url.includes('/api/auth/me')) {
        console.log('[DEV MODE] Using mock response for auth/me endpoint');
        
        // Get username from localStorage if available for persistence
        const storedUser = localStorage.getItem('user');
        let username = 'admin';
        let firstName = 'Admin';
        let lastName = 'Test';
        let role = 'admin';
        
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            username = userData.username || username;
            firstName = userData.firstName || firstName;
            lastName = userData.lastName || lastName;
            role = userData.role || role;
          } catch (e) {
            console.warn('[DEV MODE] Failed to parse stored user data, using defaults');
          }
        }
        
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
          data: {
            success: true,
            user: {
              id: 'bf908297-b5ca-447c-8f95-98f00bc9ce87',
              email: `${username}@swanstudios.com`,
              username,
              firstName,
              lastName,
              role,
              isActive: true,
              permissions: role === 'admin' ? ['admin:all'] : role === 'trainer' ? ['trainer:all'] : ['client:self'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              profileImageUrl: null
            }
          }
        };
      }
      
      // 2. Auth/login endpoint
      if (url.includes('/api/auth/login') && method === 'post') {
        const username = data?.username || data?.email || 'mockuser';
        const userRole = username.includes('admin') ? 'admin' : 
                        (username.includes('trainer') ? 'trainer' : 'client');
        
        // Create a proper mock JWT with the standard structure
        const mockUser = {
          id: 'bf908297-b5ca-447c-' + Date.now().toString(16),
          username: username,
          email: `${username}@example.com`,
          firstName: 'Mock',
          lastName: 'User',
          role: userRole,
          isActive: true,
          permissions: userRole === 'admin' ? ['admin:all'] : [],
          profileImageUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Build a mock JWT token
        const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
          exp: Math.floor(Date.now()/1000) + (24*60*60)
        }))}.mock-jwt-token`;
        
        // Store the user and token in localStorage for persistence
        localStorage.setItem('token', mockToken);
        localStorage.setItem('tokenTimestamp', Date.now().toString());
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        console.log(`[DEV MODE] Mock login successful for ${username} with role ${userRole}`);
        
        // If admin role, set bypass flag for direct admin access
        if (userRole === 'admin') {
          localStorage.setItem('bypass_admin_verification', 'true');
        }
        
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
          data: {
            success: true,
            token: mockToken,
            user: mockUser
          }
        };
      }
      
      // 3. Default generic response for other auth endpoints
      console.log(`[DEV MODE] Using generic mock response for ${url}`);
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          success: true,
          message: 'Mock response for auth endpoint'
        }
      };
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
    
    // In development mode, set bypass flag for admin users automatically to avoid loops
    if (import.meta.env.MODE === 'development') {
      const userRole = url.includes('login') && data?.username?.toLowerCase().includes('admin') ? 'admin' : null;
      if (userRole === 'admin') {
        console.log('[DEV MODE] Setting admin verification bypass flag');
        localStorage.setItem('bypass_admin_verification', 'true');
      } else if (url.includes('/api/auth/me')) {
        // When checking /api/auth/me, if user is admin, make sure the bypass flag is set
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.role === 'admin') {
              console.log('[DEV MODE] Ensuring admin verification bypass flag is set');
              localStorage.setItem('bypass_admin_verification', 'true');
            }
          } catch (e) {
            console.warn('[DEV MODE] Failed to parse stored user data');
          }
        }
      }
    }
    
    // In development mode, set bypass flag for admin users automatically to avoid loops
    if (import.meta.env.MODE === 'development') {
      const userRole = url.includes('login') && data?.username?.toLowerCase().includes('admin') ? 'admin' : null;
      if (userRole === 'admin') {
        console.log('[DEV MODE] Setting admin verification bypass flag');
        localStorage.setItem('bypass_admin_verification', 'true');
      } else if (url.includes('/api/auth/me')) {
        // When checking /api/auth/me, if user is admin, make sure the bypass flag is set
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.role === 'admin') {
              console.log('[DEV MODE] Ensuring admin verification bypass flag is set');
              localStorage.setItem('bypass_admin_verification', 'true');
            }
          } catch (e) {
            console.warn('[DEV MODE] Failed to parse stored user data');
          }
        }
      }
    }
    
    // Admin endpoints
    if (url.includes('/api/admin/')) {
      console.log(`[DEV MODE] Using mock response for admin endpoint: ${url}`);
      
      // Admin storefront endpoint
      if (url.includes('/api/admin/storefront')) {
        if (method === 'get') {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
            data: {
              success: true,
              items: [
                {
                  id: 1,
                  name: "Platinum Package",
                  description: "Premium training package with 8 sessions",
                  packageType: "fixed",
                  pricePerSession: 175,
                  sessions: 8,
                  months: null,
                  sessionsPerWeek: null,
                  totalSessions: 8,
                  totalCost: 1400,
                  price: 1400,
                  displayPrice: 1400,
                  theme: "cosmic",
                  isActive: true,
                  imageUrl: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                },
                {
                  id: 2,
                  name: "Gold Monthly",
                  description: "Monthly subscription with 4 sessions per week",
                  packageType: "monthly",
                  pricePerSession: 160,
                  sessions: null,
                  months: 3,
                  sessionsPerWeek: 4,
                  totalSessions: 48,
                  totalCost: 7680,
                  price: 7680,
                  displayPrice: 7680,
                  theme: "emerald",
                  isActive: true,
                  imageUrl: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              ]
            }
          };
        }
        
        // POST, PUT, DELETE operations for admin storefront
        if (method === 'post' || method === 'put' || method === 'delete') {
          return {
            status: method === 'post' ? 201 : 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
            data: {
              success: true,
              message: `Package ${method === 'post' ? 'created' : method === 'put' ? 'updated' : 'deleted'} successfully`,
              item: method !== 'delete' ? {
                id: Date.now(),
                name: data?.name || "Mock Package",
                description: data?.description || "Mock package description",
                packageType: data?.packageType || "fixed",
                pricePerSession: data?.pricePerSession || 175,
                sessions: data?.sessions || 8,
                totalCost: (data?.pricePerSession || 175) * (data?.sessions || 8),
                price: (data?.pricePerSession || 175) * (data?.sessions || 8),
                isActive: data?.isActive !== false,
                theme: data?.theme || "cosmic",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              } : null
            }
          };
        }
      }
      
      // Generic admin endpoint response
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          success: true,
          message: 'Mock admin response'
        }
      };
    }
    
    // Admin endpoints
    if (url.includes('/api/admin/')) {
      console.log(`[DEV MODE] Using mock response for admin endpoint: ${url}`);
      
      // Admin storefront endpoint
      if (url.includes('/api/admin/storefront')) {
        if (method === 'get') {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
            data: {
              success: true,
              items: [
                {
                  id: 1,
                  name: "Platinum Package",
                  description: "Premium training package with 8 sessions",
                  packageType: "fixed",
                  pricePerSession: 175,
                  sessions: 8,
                  months: null,
                  sessionsPerWeek: null,
                  totalSessions: 8,
                  totalCost: 1400,
                  price: 1400,
                  displayPrice: 1400,
                  theme: "cosmic",
                  isActive: true,
                  imageUrl: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                },
                {
                  id: 2,
                  name: "Gold Monthly",
                  description: "Monthly subscription with 4 sessions per week",
                  packageType: "monthly",
                  pricePerSession: 160,
                  sessions: null,
                  months: 3,
                  sessionsPerWeek: 4,
                  totalSessions: 48,
                  totalCost: 7680,
                  price: 7680,
                  displayPrice: 7680,
                  theme: "emerald",
                  isActive: true,
                  imageUrl: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              ]
            }
          };
        }
        
        // POST, PUT, DELETE operations for admin storefront
        if (method === 'post' || method === 'put' || method === 'delete') {
          return {
            status: method === 'post' ? 201 : 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
            data: {
              success: true,
              message: `Package ${method === 'post' ? 'created' : method === 'put' ? 'updated' : 'deleted'} successfully`,
              item: method !== 'delete' ? {
                id: Date.now(),
                name: requestData?.name || "Mock Package",
                description: requestData?.description || "Mock package description",
                packageType: requestData?.packageType || "fixed",
                pricePerSession: requestData?.pricePerSession || 175,
                sessions: requestData?.sessions || 8,
                totalCost: (requestData?.pricePerSession || 175) * (requestData?.sessions || 8),
                price: (requestData?.pricePerSession || 175) * (requestData?.sessions || 8),
                isActive: requestData?.isActive !== false,
                theme: requestData?.theme || "cosmic",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              } : null
            }
          };
        }
      }
      
      // Generic admin endpoint response
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          success: true,
          message: 'Mock admin response'
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
    // In development mode, don't retry if configured to skip retries
    if (import.meta.env.MODE === 'development' && 
        ((typeof window !== 'undefined' && window.REACT_APP_SKIP_API_RETRIES === 'true') || 
         FORCE_MOCK_MODE)) {
      return false;
    }
    
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
    // In development mode, always mock a successful connection
    if (import.meta.env.MODE === 'development' || this.useMockInDevelopment) {
      console.log('[DEV MODE] Skipping real API connection check, returning mock success');
      return true;
    }
    
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
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