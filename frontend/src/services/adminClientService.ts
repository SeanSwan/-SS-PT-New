/**
 * Admin Client Service - Business-Critical API Integration
 * ======================================================
 * 
 * Service layer for all admin client management operations
 * Integrates with existing backend adminClientController
 * 
 * FUNCTIONALITY:
 * - Client CRUD operations (Create, Read, Update, Delete)
 * - Client data collection and onboarding
 * - Trainer assignment management
 * - Client analytics and reporting
 * - Bulk operations for multiple clients
 * - Integration with payment/session systems
 */

import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

/**
 * Admin Client Service Class
 */
class AdminClientService {
  /**
   * Get all clients with filtering and pagination
   */
  async getClients(params = {}) {
    try {
      const response = await api.get('/admin/clients', { params });
      return {
        clients: response.data.clients || [],
        stats: {
          totalClients: response.data.count || 0,
          activeClients: response.data.clients?.filter(c => c.isActive)?.length || 0,
          newThisMonth: response.data.newThisMonth || 0,
          totalRevenue: response.data.totalRevenue || 0,
          sessionsBooked: response.data.sessionsBooked || 0,
          averageSessionsPerClient: response.data.averageSessionsPerClient || 0
        }
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('Failed to fetch clients');
    }
  }
  
  /**
   * Get detailed information for a specific client
   */
  async getClientDetails(clientId) {
    try {
      const response = await api.get(`/admin/clients/${clientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching client details:', error);
      throw new Error('Failed to fetch client details');
    }
  }
  
  /**
   * Create a new client with comprehensive data
   */
  async createClient(clientData) {
    try {
      const response = await api.post('/admin/clients', {
        ...clientData,
        // Set initial password (client will be prompted to change)
        password: this.generateTempPassword(),
        // Ensure client role
        role: 'client',
        isActive: true,
        // Set available sessions from package
        availableSessions: clientData.availableSessions || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating client:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to create client');
    }
  }
  
  /**
   * Update existing client information
   */
  async updateClient(clientId, updateData) {
    try {
      const response = await api.put(`/admin/clients/${clientId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating client:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to update client');
    }
  }
  
  /**
   * Delete a client (soft delete - mark as inactive)
   */
  async deleteClient(clientId) {
    try {
      await api.delete(`/admin/clients/${clientId}`);
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw new Error('Failed to delete client');
    }
  }
  
  /**
   * Assign trainer to client
   */
  async assignTrainer(clientId, trainerId) {
    try {
      const response = await api.post(`/admin/clients/${clientId}/assign-trainer`, {
        trainerId
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning trainer:', error);
      throw new Error('Failed to assign trainer');
    }
  }
  
  /**
   * Reset client password
   */
  async resetClientPassword(clientId) {
    try {
      const response = await api.post(`/admin/clients/${clientId}/reset-password`);
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error('Failed to reset password');
    }
  }
  
  /**
   * Get client workout statistics
   */
  async getClientWorkoutStats(clientId) {
    try {
      const response = await api.get(`/admin/clients/${clientId}/workout-stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching workout stats:', error);
      throw new Error('Failed to fetch workout statistics');
    }
  }
  
  /**
   * Generate workout plan for client
   */
  async generateWorkoutPlan(clientId, planData) {
    try {
      const response = await api.post(`/admin/clients/${clientId}/generate-workout-plan`, planData);
      return response.data;
    } catch (error) {
      console.error('Error generating workout plan:', error);
      throw new Error('Failed to generate workout plan');
    }
  }
  
  /**
   * Bulk operations for multiple clients
   */
  async bulkUpdate(clientIds, updateData) {
    try {
      const response = await api.post('/admin/clients/bulk-update', {
        clientIds,
        updateData
      });
      return response.data;
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw new Error('Failed to update clients');
    }
  }
  
  /**
   * Export client data
   */
  async exportClients(format = 'csv', filters = {}) {
    try {
      const response = await api.get('/admin/clients/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clients-export-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exporting clients:', error);
      throw new Error('Failed to export client data');
    }
  }
  
  /**
   * Get client analytics dashboard data
   */
  async getClientAnalytics(timeRange = '30d') {
    try {
      const response = await api.get('/admin/clients/analytics', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw new Error('Failed to fetch analytics data');
    }
  }
  
  /**
   * Search clients with advanced filters
   */
  async searchClients(searchQuery, filters = {}) {
    try {
      const response = await api.get('/admin/clients/search', {
        params: {
          q: searchQuery,
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching clients:', error);
      throw new Error('Failed to search clients');
    }
  }
  
  /**
   * Get client session history
   */
  async getClientSessions(clientId, params = {}) {
    try {
      const response = await api.get(`/admin/clients/${clientId}/sessions`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching client sessions:', error);
      throw new Error('Failed to fetch client sessions');
    }
  }
  
  /**
   * Get client payment history
   */
  async getClientPayments(clientId, params = {}) {
    try {
      const response = await api.get(`/admin/clients/${clientId}/payments`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching client payments:', error);
      throw new Error('Failed to fetch client payments');
    }
  }
  
  /**
   * Add sessions to client account
   */
  async addSessions(clientId, sessionCount, packageId = null) {
    try {
      const response = await api.post(`/admin/clients/${clientId}/add-sessions`, {
        sessionCount,
        packageId
      });
      return response.data;
    } catch (error) {
      console.error('Error adding sessions:', error);
      throw new Error('Failed to add sessions');
    }
  }
  
  /**
   * Get MCP (AI) system status for client features
   */
  async getMCPStatus() {
    try {
      const response = await api.get('/admin/mcp-status');
      return response.data;
    } catch (error) {
      console.error('Error fetching MCP status:', error);
      // Don't throw error for MCP status - it's not critical
      return { status: 'unavailable' };
    }
  }

  // ==================== P0: BILLING & SESSIONS ====================

  /**
   * Get billing overview for a client (session credits, pending orders, upcoming sessions)
   */
  async getBillingOverview(clientId: string) {
    try {
      const response = await api.get(`/admin/clients/${clientId}/billing-overview`);
      return response.data;
    } catch (error) {
      console.error('Error fetching billing overview:', error);
      throw new Error('Failed to fetch billing overview');
    }
  }

  /**
   * Apply payment to an order (idempotent - prevents double-charging)
   * @param orderId - The order ID to apply payment to
   * @param paymentData - Payment details { method, reference }
   */
  async applyPayment(orderId: string | number, paymentData: { method: string; reference?: string }) {
    try {
      const response = await api.post(`/orders/${orderId}/apply-payment`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Error applying payment:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to apply payment');
    }
  }

  /**
   * Book a session for a client (admin booking on behalf of client)
   * @param data - Session booking details { clientId, sessionDate, trainerId, duration, notes }
   */
  async bookSessionForClient(data: {
    clientId: number | string;
    sessionDate: string;
    trainerId: number | string;
    duration: number;
    notes?: string;
  }) {
    try {
      const response = await api.post('/sessions/admin/book', data);
      return response.data;
    } catch (error) {
      console.error('Error booking session for client:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to book session');
    }
  }

  /**
   * Add session credits to a client (admin grant)
   * Uses existing session-packages endpoint
   */
  async addSessionCredits(clientId: string | number, data: {
    sessions: number;
    reason?: string;
    adminNote?: string;
  }) {
    try {
      const response = await api.post('/session-packages/add-sessions', {
        userId: clientId,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('Error adding session credits:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to add session credits');
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Generate temporary password for new clients
   */
  generateTempPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill remaining length
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
  
  /**
   * Format client data for display
   */
  formatClientData(client) {
    return {
      ...client,
      fullName: `${client.firstName} ${client.lastName}`,
      age: client.dateOfBirth ? this.calculateAge(client.dateOfBirth) : null,
      memberSince: client.createdAt ? new Date(client.createdAt).getFullYear() : null,
      lastActivity: client.lastActivity ? new Date(client.lastActivity) : null
    };
  }
  
  /**
   * Calculate age from date of birth
   */
  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  
  /**
   * Validate client data before submission
   */
  validateClientData(clientData) {
    const errors = {};
    
    // Required fields
    if (!clientData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!clientData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!clientData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(clientData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!clientData.phone?.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    if (!clientData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// P0: Billing Overview Types
export interface BillingOverviewData {
  client: {
    id: number;
    name: string;
    email: string;
  };
  sessionsRemaining: number;
  lastPurchase: {
    id: number;
    packageName: string;
    sessions: number;
    amount: number;
    grantedAt: string;
    paymentAppliedAt: string | null;
    paymentReference: string | null;
  } | null;
  pendingOrders: Array<{
    id: number;
    packageName: string;
    sessions: number;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  nextSession: {
    id: number;
    date: string;
    duration: number;
    status: string;
    notes: string | null;
    trainer: {
      id: number;
      name: string;
    } | null;
  } | null;
  recentSessions: Array<{
    id: number;
    date: string;
    duration: number;
    completedAt: string;
    trainer: {
      id: number;
      name: string;
    } | null;
  }>;
}

export interface ApplyPaymentData {
  method: 'stripe' | 'cash' | 'venmo' | 'check' | 'other';
  reference?: string;
}

export interface BookSessionData {
  clientId: number | string;
  sessionDate: string;
  trainerId: number | string;
  duration: number;
  notes?: string;
}

export interface AddSessionCreditsData {
  sessions: number;
  reason?: string;
  adminNote?: string;
}

// TypeScript interface for the service
export interface AdminClientServiceInterface {
  getClients(params?: any): Promise<any>;
  getClientDetails(clientId: string): Promise<any>;
  createClient(clientData: any): Promise<any>;
  updateClient(clientId: string, updateData: any): Promise<any>;
  deleteClient(clientId: string): Promise<boolean>;
  assignTrainer(clientId: string, trainerId: string): Promise<any>;
  resetClientPassword(clientId: string): Promise<any>;
  getClientWorkoutStats(clientId: string): Promise<any>;
  generateWorkoutPlan(clientId: string, planData: any): Promise<any>;
  bulkUpdate(clientIds: string[], updateData: any): Promise<any>;
  exportClients(format?: string, filters?: any): Promise<boolean>;
  getClientAnalytics(timeRange?: string): Promise<any>;
  searchClients(searchQuery: string, filters?: any): Promise<any>;
  getClientSessions(clientId: string, params?: any): Promise<any>;
  getClientPayments(clientId: string, params?: any): Promise<any>;
  addSessions(clientId: string, sessionCount: number, packageId?: string | null): Promise<any>;
  getMCPStatus(): Promise<any>;
  // P0: Billing & Sessions
  getBillingOverview(clientId: string): Promise<{ success: boolean; data: BillingOverviewData }>;
  applyPayment(orderId: string | number, paymentData: ApplyPaymentData): Promise<any>;
  bookSessionForClient(data: BookSessionData): Promise<any>;
  addSessionCredits(clientId: string | number, data: AddSessionCreditsData): Promise<any>;
}

// Factory function for creating the service with custom API instance
export const createAdminClientService = (apiInstance?: any): AdminClientServiceInterface => {
  return new AdminClientService();
};

// Export singleton instance
export const adminClientService = new AdminClientService();
export default adminClientService;
