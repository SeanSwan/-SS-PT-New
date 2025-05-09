/**
 * API Client
 * =========
 * Centralized API client for making requests to the backend
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  FetchPlansParams, 
  SavePlanParams, 
  WorkoutPlan 
} from '../pages/workout/types/plan.types';
import {
  FetchSessionsParams,
  SaveSessionParams,
  WorkoutSession
} from '../pages/workout/types/session.types';

// Import mock data helper
import mockDataHelper, { isMockDataEnabled } from '../utils/mockDataHelper';

// API base URL from environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Centralized API client class
 */
class ApiClient {
  private axios: AxiosInstance;
  private mockMode: boolean = false;
  
  constructor(baseURL: string) {
    // Create axios instance with base configuration
    this.axios = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle authentication errors
        if (error.response && error.response.status === 401) {
          // Clear token if it's expired or invalid
          localStorage.removeItem('authToken');
          
          // Redirect to login page if not already there
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/signup') {
            // Store the current path for redirect after login
            localStorage.setItem('redirectAfterLogin', currentPath);
            window.location.href = '/login';
          }
        }
        
        // Add additional error information
        const enhancedError = {
          ...error,
          message: error.response?.data?.message || error.message || 'An unknown error occurred',
          status: error.response?.status || 500,
        };
        
        return Promise.reject(enhancedError);
      }
    );
  }
  
  /**
   * Enable or disable mock mode for development/testing
   */
  enableMockMode(enable: boolean): void {
    this.mockMode = enable;
    
    if (enable) {
      mockDataHelper.enableMockData();
    } else {
      mockDataHelper.disableMockData();
    }
  }
  
  /**
   * Check if mock mode is enabled
   */
  isMockModeEnabled(): boolean {
    return this.mockMode || isMockDataEnabled();
  }
  
  /**
   * Get mock data for a specific endpoint
   * Returns mock data if mock mode is enabled, otherwise returns null
   */
  getMockData(endpoint: string): any {
    if (!this.isMockModeEnabled()) return null;
    
    // Determine which mock data to return based on the endpoint
    if (endpoint.includes('/notifications')) {
      return mockDataHelper.getMockNotifications();
    }
    
    if (endpoint.includes('/sessions')) {
      return mockDataHelper.getMockSessions();
    }
    
    if (endpoint.includes('/workout')) {
      return mockDataHelper.getMockWorkouts();
    }
    
    if (endpoint.includes('/gamification')) {
      return mockDataHelper.getMockGamification();
    }
    
    return null;
  }
  
  /**
   * Make a GET request to the specified endpoint
   */
  async get<T = any>(endpoint: string, params?: any): Promise<T> {
    // Check if we should use mock data - ALWAYS use mock data for certain endpoints if mock mode is enabled
    if (this.isMockModeEnabled()) {
      const mockData = this.getMockData(endpoint);
      if (mockData) {
        console.log(`[API Mock] GET ${endpoint}`, mockData);
        return mockData as T;
      }
    }
    
    try {
      const config: AxiosRequestConfig = { params };
      const response: AxiosResponse<T> = await this.axios.get<T>(endpoint, config);
      return response.data;
    } catch (error) {
      console.warn(`[API Error] GET ${endpoint} failed:`, error.message || 'Unknown error');
      
      // If we get a connection error, automatically switch to mock mode
      const isConnectionError = 
        error.message?.includes('Network Error') || 
        error.message?.includes('ECONNREFUSED') || 
        error.code === 'ECONNREFUSED' || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('ERR_CONNECTION_REFUSED');
      
      if (isConnectionError) {
        console.log('[API] Connection error detected, switching to mock data mode');
        this.enableMockMode(true);
      }
      
      // Try to get mock data regardless of current mode for connection errors
      if (isConnectionError || this.mockMode) {
        const mockData = this.getMockData(endpoint);
        if (mockData) {
          console.log(`[API Fallback] GET ${endpoint}`, mockData);
          return mockData as T;
        }
      }
      
      // For notifications endpoint specifically, return empty data on error
      if (endpoint.includes('/notifications')) {
        console.log('[API Fallback] Returning empty notifications array');
        return { notifications: [], unreadCount: 0 } as unknown as T;
      }
      
      // If no mock data is available, throw the original error
      throw error;
    }
  }
  
  /**
   * Make a POST request to the specified endpoint
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axios.post<T>(endpoint, data);
    return response.data;
  }
  
  /**
   * Make a PUT request to the specified endpoint
   */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axios.put<T>(endpoint, data);
    return response.data;
  }
  
  /**
   * Make a PATCH request to the specified endpoint
   */
  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axios.patch<T>(endpoint, data);
    return response.data;
  }
  
  /**
   * Make a DELETE request to the specified endpoint
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    const response: AxiosResponse<T> = await this.axios.delete<T>(endpoint);
    return response.data;
  }
  
  // API endpoints grouped by domain
  auth = {
    login: (credentials: { email: string; password: string }) => 
      this.post('/auth/login', credentials),
    
    register: (userData: any) => 
      this.post('/auth/register', userData),
    
    checkAuth: () => 
      this.get('/auth/me'),
    
    resetPassword: (email: string) =>
      this.post('/auth/reset-password', { email }),
      
    setNewPassword: (token: string, password: string) =>
      this.post('/auth/reset-password/confirm', { token, password }),
  };
  
  user = {
    getProfile: () => 
      this.get('/users/profile'),
    
    updateProfile: (profileData: any) => 
      this.put('/users/profile', profileData),
    
    getClients: () => 
      this.get('/users/clients'),
    
    getUser: (userId: string) => 
      this.get(`/users/${userId}`),
  };
  
  workout = {
    // Progress and statistics endpoints
    getClientProgress: (userId: string) => 
      this.get(`/workout/progress/${userId}`),
    
    getWorkoutStatistics: (userId: string, params: any) => 
      this.get(`/workout/statistics/${userId}`, params),
    
    // Workout plan endpoints
    getWorkoutPlans: (params: FetchPlansParams) => 
      this.get('/api/workout/plans', params),
    
    getWorkoutPlan: (planId: string) => 
      this.get(`/api/workout/plans/${planId}`),
    
    createWorkoutPlan: (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>) => 
      this.post('/api/workout/plans', plan),
    
    updateWorkoutPlan: (planId: string, plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>) => 
      this.put(`/api/workout/plans/${planId}`, plan),
    
    deleteWorkoutPlan: (planId: string) => 
      this.delete(`/api/workout/plans/${planId}`),
    
    cloneWorkoutPlan: (sourcePlanId: string, overrides?: { 
        title?: string; 
        description?: string; 
        durationWeeks?: number 
      }) => 
      this.post('/api/workout/plans/clone', { sourcePlanId, overrides }),
      
    archiveWorkoutPlan: (planId: string) => 
      this.post(`/api/workout/plans/${planId}/archive`),
      
    restoreWorkoutPlan: (planId: string) => 
      this.post(`/api/workout/plans/${planId}/restore`),
    
    // Workout session endpoints
    getWorkoutSessions: (params: FetchSessionsParams) => 
      this.get('/api/workout/sessions', params),
    
    getWorkoutSession: (sessionId: string) => 
      this.get(`/api/workout/sessions/${sessionId}`),
    
    createWorkoutSession: (session: Omit<WorkoutSession, 'id'>) => 
      this.post('/api/workout/sessions', session),
    
    updateWorkoutSession: (sessionId: string, session: Omit<WorkoutSession, 'id'>) => 
      this.put(`/api/workout/sessions/${sessionId}`, session),
    
    deleteWorkoutSession: (sessionId: string) => 
      this.delete(`/api/workout/sessions/${sessionId}`),
      
    startWorkoutSession: (session: Partial<Omit<WorkoutSession, 'id'>>) => 
      this.post('/api/workout/sessions/start', session),
      
    endWorkoutSession: (sessionId: string, data: { duration?: number; notes?: string }) => 
      this.post(`/api/workout/sessions/${sessionId}/end`, data),
  };
  
  exercise = {
    getExercises: (params?: any) => 
      this.get('/exercises', params),
    
    getExercise: (exerciseId: string) => 
      this.get(`/exercises/${exerciseId}`),
    
    createExercise: (exerciseData: any) => 
      this.post('/exercises', exerciseData),
    
    updateExercise: (exerciseId: string, exerciseData: any) => 
      this.put(`/exercises/${exerciseId}`, exerciseData),
    
    deleteExercise: (exerciseId: string) => 
      this.delete(`/exercises/${exerciseId}`),
  };
  
  // E-commerce endpoints
  store = {
    getProducts: (params?: any) => 
      this.get('/products', params),
      
    getProduct: (productId: string) => 
      this.get(`/products/${productId}`),
      
    getCategories: () => 
      this.get('/products/categories'),
  };
  
  cart = {
    getCart: () => 
      this.get('/cart'),
      
    addToCart: (productId: string, quantity: number) => 
      this.post('/cart/items', { productId, quantity }),
      
    updateCartItem: (itemId: string, quantity: number) => 
      this.put(`/cart/items/${itemId}`, { quantity }),
      
    removeFromCart: (itemId: string) => 
      this.delete(`/cart/items/${itemId}`),
      
    clearCart: () => 
      this.delete('/cart'),
  };
  
  checkout = {
    createCheckoutSession: (cartId: string) => 
      this.post('/checkout/create-session', { cartId }),
      
    getOrderStatus: (orderId: string) => 
      this.get(`/checkout/orders/${orderId}`),
  };
  
  sessions = {
    getSessionPackages: () => 
      this.get('/session-packages'),
      
    getUserSessionCredits: (userId?: string) => 
      this.get(`/sessions/credits${userId ? `?userId=${userId}` : ''}`),
      
    useSessionCredit: (planId?: string, date?: string, notes?: string) => 
      this.post('/sessions/use-credit', { planId, date, notes }),
      
    getUserBookedSessions: (userId?: string, params?: any) => 
      this.get(`/sessions/booked${userId ? `?userId=${userId}` : ''}`, params),
  };

  // Orientation form endpoints
  orientation = {
    getAllOrientations: () => 
      this.get('/orientation/all'),
      
    getOrientationByUserId: (userId: string) => 
      this.get(`/orientation/user/${userId}`),
      
    submitOrientationForm: (formData: any) => 
      this.post('/orientation/signup', formData),
  };

  // Notification endpoints
  notifications = {
    getAll: () => 
      this.get('/notifications'),
      
    markAsRead: (notificationId: string) => 
      this.put(`/notifications/${notificationId}/read`),
      
    markAllAsRead: () => 
      this.put('/notifications/read-all'),
      
    delete: (notificationId: string) => 
      this.delete(`/notifications/${notificationId}`),
  };
}

// Create and export API client instance
const api = new ApiClient(API_BASE_URL);
export default api;
