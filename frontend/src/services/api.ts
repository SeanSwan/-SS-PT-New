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
  }
  
  /**
   * Check if mock mode is enabled
   */
  isMockModeEnabled(): boolean {
    return this.mockMode;
  }
  
  /**
   * Make a GET request to the specified endpoint
   */
  async get<T = any>(endpoint: string, params?: any): Promise<T> {
    const config: AxiosRequestConfig = { params };
    const response: AxiosResponse<T> = await this.axios.get<T>(endpoint, config);
    return response.data;
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
}

// Create and export API client instance
const api = new ApiClient(API_BASE_URL);
export default api;
