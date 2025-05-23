/**
 * Debug Helpers
 * 
 * Utility functions to help diagnose and fix issues with data sharing
 * between client, admin, and trainer dashboards.
 */

import { authAxiosInstance } from './axiosConfig';

/**
 * Check API Connectivity
 * Tests connectivity to key API endpoints and returns status information
 */
export const checkApiConnectivity = async (endpoints: string[] = []) => {
  const defaultEndpoints = [
    '/api/sessions',
    '/api/notifications',
    '/api/users/profile',
    '/api/workouts',
    '/api/gamification/profile'
  ];
  
  const apiEndpoints = endpoints.length > 0 ? endpoints : defaultEndpoints;
  const results: Record<string, any> = {};
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await authAxiosInstance.get(endpoint);
      results[endpoint] = {
        status: response.status,
        ok: true,
        statusText: response.statusText
      };
    } catch (error: any) {
      results[endpoint] = {
        status: error.response?.status || 'error',
        ok: false,
        statusText: error.response?.statusText || error.message
      };
    }
  }
  
  return results;
};

/**
 * Verify Data Visibility
 * Checks if data is visible to different user roles
 */
export const verifyDataVisibility = async () => {
  try {
    // Get current user role
    const profileResponse = await authAxiosInstance.get('/api/users/profile');
    const currentRole = profileResponse.data.role;
    
    // Get sessions data
    const sessionsResponse = await authAxiosInstance.get('/api/sessions');
    const sessionCount = sessionsResponse.data.length;
    
    // Get notifications data
    const notificationsResponse = await authAxiosInstance.get('/api/notifications');
    const notificationCount = notificationsResponse.data.notifications?.length || 0;
    
    return {
      ok: true,
      role: currentRole,
      sessionCount,
      notificationCount,
      message: `Verified data visibility for ${currentRole} role`
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message,
      message: `Error verifying data visibility: ${error.message}`
    };
  }
};

/**
 * Check Session Flow
 * Validates if sessions purchased show up in client dashboard
 */
export const checkSessionFlow = async (clientId?: string) => {
  try {
    // Get recent orders for specific client or all clients
    const endpoint = clientId 
      ? `/api/orders?userId=${clientId}` 
      : '/api/orders';
    
    const ordersResponse = await authAxiosInstance.get(endpoint);
    const orders = ordersResponse.data;
    
    // Filter orders containing session packages
    const sessionOrders = orders.filter((order: any) => 
      order.items?.some((item: any) => item.itemType === 'training')
    );
    
    // Get client data
    const usersResponse = await authAxiosInstance.get('/api/users');
    const users = usersResponse.data;
    
    // Get sessions data
    const sessionsResponse = await authAxiosInstance.get('/api/sessions');
    const sessions = sessionsResponse.data;
    
    // Analyze session flow
    const flowAnalysis = sessionOrders.map((order: any) => {
      const sessionItems = order.items.filter((item: any) => item.itemType === 'training');
      const userId = order.userId;
      const purchaseDate = new Date(order.createdAt);
      
      // Find corresponding client
      const client = users.find((user: any) => user.id === userId);
      
      // Check if sessions were added to client's account
      const clientHasSessions = client && client.availableSessions > 0;
      
      // Check for sessions scheduled after purchase
      const clientSessions = sessions.filter((session: any) => 
        session.userId === userId && new Date(session.bookingDate) > purchaseDate
      );
      
      return {
        orderId: order.id,
        orderDate: purchaseDate,
        clientId: userId,
        clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
        sessionsPurchased: sessionItems.reduce((total: number, item: any) => total + (item.sessionCount || 0), 0),
        sessionsCredited: clientHasSessions,
        sessionsScheduled: clientSessions.length,
        status: clientHasSessions && clientSessions.length > 0 ? 'Complete' : 
                clientHasSessions ? 'Partial - No Sessions Scheduled' : 'Broken - No Sessions Credited'
      };
    });
    
    return {
      ok: true,
      flowAnalysis,
      sessionOrders: sessionOrders.length,
      message: `Analyzed ${sessionOrders.length} orders with session packages`
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message,
      message: `Error checking session flow: ${error.message}`
    };
  }
};

/**
 * Check MCP Server connectivity
 */
export const checkMcpServers = async () => {
  try {
    const results = {
      workout: false,
      gamification: false
    };
    
    try {
      const workoutResponse = await authAxiosInstance.get('/mcp/workout/status');
      results.workout = workoutResponse.status === 200;
    } catch (error) {
      results.workout = false;
    }
    
    try {
      const gamificationResponse = await authAxiosInstance.get('/mcp/gamification/status');
      results.gamification = gamificationResponse.status === 200;
    } catch (error) {
      results.gamification = false;
    }
    
    return {
      ok: true,
      results,
      message: `MCP Servers: Workout ${results.workout ? 'Connected' : 'Disconnected'}, Gamification ${results.gamification ? 'Connected' : 'Disconnected'}`
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message,
      message: `Error checking MCP servers: ${error.message}`
    };
  }
};

/**
 * Force data synchronization
 * Attempts to synchronize data across dashboards
 */
export const forceSynchronization = async () => {
  try {
    const response = await authAxiosInstance.post('/api/admin/sync-data');
    return {
      ok: true,
      message: 'Data synchronization completed successfully'
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message,
      message: `Error during data synchronization: ${error.message}`
    };
  }
};

/**
 * Add debug logger to console
 * Useful for tracking data flow in the frontend
 */
export const initDebugLogger = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Override console.log
  console.log = (...args) => {
    const timestamp = new Date().toISOString();
    originalLog(`[DEBUG ${timestamp}]`, ...args);
    
    // Log important data flow events
    if (
      args.some(arg => 
        typeof arg === 'string' && (
          arg.includes('sessions') || 
          arg.includes('notification') || 
          arg.includes('workout') || 
          arg.includes('gamification')
        )
      )
    ) {
      // Could send these logs to a remote logging service or localStorage
    }
    
    return originalLog(...args);
  };
  
  // Override console.error
  console.error = (...args) => {
    const timestamp = new Date().toISOString();
    originalError(`[ERROR ${timestamp}]`, ...args);
    
    // Could send error logs to a monitoring service
    
    return originalError(...args);
  };
  
  // Override console.warn
  console.warn = (...args) => {
    const timestamp = new Date().toISOString();
    originalWarn(`[WARN ${timestamp}]`, ...args);
    
    return originalWarn(...args);
  };
  
  // Return function to restore original console methods
  return () => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  };
};

export default {
  checkApiConnectivity,
  verifyDataVisibility,
  checkSessionFlow,
  checkMcpServers,
  forceSynchronization,
  initDebugLogger
};
