/**
 * Real-Time Schedule WebSocket Service
 * ===================================
 * 
 * Provides real-time schedule updates across all admin, trainer, and client dashboards
 * Integrates with your existing Redux store and backend WebSocket service
 * 
 * Features:
 * - ✅ Automatic reconnection on connection loss
 * - ✅ Redux store integration for seamless updates
 * - ✅ Role-based event filtering
 * - ✅ Cross-dashboard synchronization
 * - ✅ Connection status monitoring
 */

import { store } from '../../redux/store';
import { 
  updateSession, 
  addSession, 
  removeSession, 
  updateSyncTimestamp,
  fetchEvents 
} from '../../redux/slices/scheduleSlice';

interface ScheduleWebSocketEvent {
  type: 'session_created' | 'session_updated' | 'session_cancelled' | 'session_booked' | 'session_confirmed' | 'session_completed';
  data: {
    session: any;
    userId?: string;
    trainerId?: string;
    message?: string;
  };
  timestamp: string;
}

class ScheduleWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private isConnected = false;
  private messageQueue: ScheduleWebSocketEvent[] = [];
  
  private readonly WS_URL = import.meta.env.VITE_WS_URL || 
    (import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:10000');

  constructor() {
    this.connect();
  }

  /**
   * Establish WebSocket connection
   */
  private connect(): void {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, skipping WebSocket connection');
        return;
      }

      // Close existing connection
      if (this.ws) {
        this.ws.close();
      }

      this.ws = new WebSocket(`${this.WS_URL}/schedule?token=${token}`);
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('📡 Schedule WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectInterval = 1000; // Reset interval

      // Send any queued messages
      this.processMessageQueue();

      // Notify components of connection status
      this.notifyConnectionStatus(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const eventData: ScheduleWebSocketEvent = JSON.parse(event.data);
        this.handleScheduleEvent(eventData);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('📡 Schedule WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.notifyConnectionStatus(false);

      // Only attempt to reconnect if it wasn't a manual close
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('📡 Schedule WebSocket error:', error);
      this.isConnected = false;
    };
  }

  /**
   * Handle incoming schedule events
   */
  private handleScheduleEvent(event: ScheduleWebSocketEvent): void {
    const { type, data } = event;
    
    switch (type) {
      case 'session_created':
        store.dispatch(addSession(data.session));
        this.showNotification(`New session available: ${this.formatSessionTime(data.session)}`);
        break;

      case 'session_updated':
        store.dispatch(updateSession(data.session));
        break;

      case 'session_booked':
        store.dispatch(updateSession(data.session));
        this.showNotification(`Session booked: ${this.formatSessionTime(data.session)}`);
        break;

      case 'session_confirmed':
        store.dispatch(updateSession(data.session));
        this.showNotification(`Session confirmed: ${this.formatSessionTime(data.session)}`);
        break;

      case 'session_completed':
        store.dispatch(updateSession(data.session));
        this.showNotification(`Session completed: ${this.formatSessionTime(data.session)}`);
        break;

      case 'session_cancelled':
        store.dispatch(updateSession(data.session));
        this.showNotification(`Session cancelled: ${this.formatSessionTime(data.session)}`, 'warning');
        break;

      default:
        console.warn('Unknown schedule event type:', type);
    }

    // Update sync timestamp
    store.dispatch(updateSyncTimestamp());

    // Trigger dashboard sync event
    this.triggerDashboardSync();
  }

  /**
   * Process queued messages after reconnection
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.handleScheduleEvent(message);
      }
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Please refresh the page.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000); // Max 30 seconds
    }, this.reconnectInterval);
  }

  /**
   * Send message to server (if connected)
   */
  public sendMessage(message: any): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Force reconnection
   */
  public reconnect(): void {
    this.reconnectAttempts = 0;
    this.reconnectInterval = 1000;
    this.connect();
  }

  /**
   * Close connection
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Notify components of connection status changes
   */
  private notifyConnectionStatus(connected: boolean): void {
    const event = new CustomEvent('scheduleWebSocketStatusChange', {
      detail: { connected, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
  }

  /**
   * Trigger dashboard sync across all components
   */
  private triggerDashboardSync(): void {
    const event = new CustomEvent('dashboardDataSync', {
      detail: {
        source: 'ScheduleWebSocketService',
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Show notification to user (integrate with your toast system)
   */
  private showNotification(message: string, type: 'info' | 'warning' | 'success' = 'info'): void {
    // Create custom event for toast notifications
    const event = new CustomEvent('scheduleNotification', {
      detail: { message, type, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
  }

  /**
   * Format session time for notifications
   */
  private formatSessionTime(session: any): string {
    const date = new Date(session.sessionDate || session.start);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  /**
   * Subscribe to session updates for specific user/trainer
   */
  public subscribeToUpdates(filters?: { trainerId?: string; userId?: string }): void {
    if (this.isConnected) {
      this.sendMessage({
        type: 'subscribe',
        filters
      });
    }
  }

  /**
   * Unsubscribe from updates
   */
  public unsubscribeFromUpdates(): void {
    if (this.isConnected) {
      this.sendMessage({
        type: 'unsubscribe'
      });
    }
  }
}

// Create singleton instance
export const scheduleWebSocketService = new ScheduleWebSocketService();

// Export hook for components to use WebSocket status
export const useScheduleWebSocket = () => {
  const [isConnected, setIsConnected] = React.useState(
    scheduleWebSocketService.getConnectionStatus()
  );

  React.useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      setIsConnected(event.detail.connected);
    };

    window.addEventListener('scheduleWebSocketStatusChange', handleStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('scheduleWebSocketStatusChange', handleStatusChange as EventListener);
    };
  }, []);

  return {
    isConnected,
    reconnect: () => scheduleWebSocketService.reconnect(),
    subscribe: (filters?: { trainerId?: string; userId?: string }) => 
      scheduleWebSocketService.subscribeToUpdates(filters),
    unsubscribe: () => scheduleWebSocketService.unsubscribeFromUpdates()
  };
};

export default scheduleWebSocketService;

// React import for the hook
import React from 'react';
