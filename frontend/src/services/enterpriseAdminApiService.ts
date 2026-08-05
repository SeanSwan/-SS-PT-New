/**
 * ENTERPRISE ADMIN API SERVICE
 * =============================
 * 
 * AAA 7-Star Enterprise Admin Dashboard API Service
 * Handles real API calls for business intelligence and social media management
 * Built for production deployment with comprehensive error handling and security
 * 
 * FEATURES:
 * - Retired MCP compatibility responses
 * - Business intelligence and analytics data
 * - Social media management APIs
 * - System health and performance monitoring
 * - Administrative controls and user management
 * - Security monitoring and audit logs
 */

import productionApiService from './api.service';
import 'axios';
import { logger } from '@/utils/logger';

// =====================================================
// TYPE DEFINITIONS FOR ENTERPRISE ADMIN FEATURES
// =====================================================

export interface MCPServerStatus {
  id: string;
  name: string;
  description: string;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'error' | 'warning' | 'retired';
  port: number;
  pid?: number;
  uptime: string;
  lastSeen: string;
  version: string;
  performance: {
    cpu: number;
    memory: number;
    network: { in: number; out: number };
    requests: number;
    errors: number;
    responseTime: number;
  };
  config: {
    autoRestart: boolean;
    maxMemory: number;
    maxCpu: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    environment: Record<string, string>;
  };
  healthChecks: {
    last: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
      duration: number;
    }>;
  };
}

export interface MCPServerLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  serverId: string;
  serverName: string;
  metadata?: Record<string, any>;
}

export interface BusinessIntelligenceMetrics {
  kpis: {
    monthlyRecurringRevenue: number;
    customerLifetimeValue: number;
    customerAcquisitionCost: number;
    churnRate: number;
    netPromoterScore: number;
    monthlyActiveUsers: number;
    revenueGrowthRate: number;
    profitMargin: number;
    sessionUtilizationRate: number;
    trainerProductivityScore: number;
  };
  trends: {
    revenue: Array<{ date: string; value: number }>;
    users: Array<{ date: string; value: number }>;
    sessions: Array<{ date: string; value: number }>;
    retention: Array<{ date: string; value: number }>;
  };
  forecasts: {
    revenueProjection: {
      nextMonth: number;
      nextQuarter: number;
      nextYear: number;
      confidence: number;
    };
    churnRisk: {
      highRiskClients: number;
      mediumRiskClients: number;
      lowRiskClients: number;
      preventionOpportunity: number;
    };
  };
}

export interface SocialMediaPost {
  id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube';
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    followerCount: number;
  };
  content: {
    text?: string;
    images: string[];
    videos: string[];
    hashtags: string[];
    mentions: string[];
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    saves: number;
  };
  moderation: {
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    flagReasons: string[];
    reviewedBy?: string;
    reviewedAt?: string;
    aiConfidenceScore: number;
    sentimentScore: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    database: { status: 'healthy' | 'degraded' | 'critical'; responseTime: number; message: string };
    redis: { status: 'healthy' | 'degraded' | 'critical'; responseTime: number; message: string };
    mcpServers: { status: 'healthy' | 'degraded' | 'critical'; onlineCount: number; totalCount: number };
    api: { status: 'healthy' | 'degraded' | 'critical'; responseTime: number; errorRate: number };
    storage: { status: 'healthy' | 'degraded' | 'critical'; usage: number; available: number };
  };
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  uptime: {
    current: string;
    percentage: number;
    since: string;
  };
}

export interface AdminAnalytics {
  users: {
    total: number;
    active: number;
    newToday: number;
    growth: number;
    distribution: Array<{ role: string; count: number; percentage: number }>;
  };
  sessions: {
    total: number;
    completed: number;
    cancelled: number;
    scheduled: number;
    revenue: number;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
    throughput: number;
  };
  financials: {
    totalRevenue: number;
    monthlyRevenue: number;
    pendingPayments: number;
    refunds: number;
  };
}

// =====================================================
// ENTERPRISE ADMIN API SERVICE CLASS
// =====================================================

class EnterpriseAdminApiService {
  
  // =====================================================
  // RETIRED MCP SERVER MANAGEMENT COMPATIBILITY
  // =====================================================

  private retiredMcpServer(serverId = 'legacy-mcp'): MCPServerStatus {
    return {
      id: serverId,
      name: 'Legacy MCP Stack',
      description: 'Retired. SwanStudios uses first-party APIs for workout, gamification, analytics, and AI workflows.',
      status: 'retired',
      port: 0,
      uptime: 'retired',
      lastSeen: new Date().toISOString(),
      version: 'retired',
      performance: {
        cpu: 0,
        memory: 0,
        network: { in: 0, out: 0 },
        requests: 0,
        errors: 0,
        responseTime: 0
      },
      config: {
        autoRestart: false,
        maxMemory: 0,
        maxCpu: 0,
        logLevel: 'info',
        environment: {}
      },
      healthChecks: {
        last: new Date().toISOString(),
        status: 'unhealthy',
        checks: [
          {
            name: 'retired',
            status: 'warn',
            message: 'Legacy MCP endpoints are retired; use SwanStudios APIs.',
            duration: 0
          }
        ]
      }
    };
  }
  
  /**
   * Get retired MCP compatibility status.
   */
  async getMCPServers(): Promise<MCPServerStatus[]> {
    return [this.retiredMcpServer()];
  }
  
  /**
   * Get retired details for a legacy MCP server id.
   */
  async getMCPServerDetails(serverId: string): Promise<MCPServerStatus> {
    return this.retiredMcpServer(serverId);
  }
  
  /**
   * Legacy MCP start is retired.
   */
  async startMCPServer(serverId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: `Legacy MCP server ${serverId} is retired.` };
  }
  
  /**
   * Legacy MCP stop is retired.
   */
  async stopMCPServer(serverId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: `Legacy MCP server ${serverId} is retired.` };
  }
  
  /**
   * Legacy MCP restart is retired.
   */
  async restartMCPServer(serverId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: `Legacy MCP server ${serverId} is retired.` };
  }
  
  /**
   * Legacy MCP logs are retired.
   */
  async getMCPServerLogs(serverId: string, _limit: number = 100): Promise<MCPServerLog[]> {
    return [{
      id: `${serverId}-retired`,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Legacy MCP logs are retired. Use first-party API monitoring.',
      source: 'mcp-retirement',
      serverId,
      serverName: 'Legacy MCP Stack'
    }];
  }
  
  /**
   * Legacy MCP configuration is retired.
   */
  async updateMCPServerConfig(serverId: string, _config: Partial<MCPServerStatus['config']>): Promise<{ success: boolean; message: string }> {
    return { success: false, message: `Legacy MCP server ${serverId} configuration is retired.` };
  }
  
  // =====================================================
  // BUSINESS INTELLIGENCE APIs
  // =====================================================
  
  /**
   * Get comprehensive business intelligence metrics
   */
  async getBusinessIntelligenceMetrics(): Promise<BusinessIntelligenceMetrics> {
    try {
      const response = await productionApiService.get('/api/admin/business-intelligence/metrics');
      return response.data.metrics;
    } catch (error) {
      console.error('[Admin API] Failed to fetch business intelligence metrics:', error);
      throw new Error('Failed to fetch business intelligence data');
    }
  }
  
  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<any> {
    try {
      const response = await productionApiService.get(`/api/admin/analytics/revenue?range=${timeRange}`);
      return response.data.analytics;
    } catch (error) {
      console.error('[Admin API] Failed to fetch revenue analytics:', error);
      throw new Error('Failed to fetch revenue analytics');
    }
  }
  
  /**
   * Get client retention analysis
   */
  async getClientRetentionAnalysis(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/analytics/retention');
      return response.data.retention;
    } catch (error) {
      console.error('[Admin API] Failed to fetch retention analysis:', error);
      throw new Error('Failed to fetch client retention data');
    }
  }
  
  /**
   * Get performance optimization insights
   */
  async getPerformanceOptimizationInsights(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/analytics/performance-optimization');
      return response.data.insights;
    } catch (error) {
      console.error('[Admin API] Failed to fetch performance insights:', error);
      throw new Error('Failed to fetch performance optimization data');
    }
  }
  
  // =====================================================
  // SOCIAL MEDIA MANAGEMENT APIs
  // =====================================================
  
  /**
   * Get social media posts for moderation
   */
  async getSocialMediaPosts(filters: {
    platform?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ posts: SocialMediaPost[]; total: number }> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
      
      const response = await productionApiService.get(`/api/admin/social-media/posts?${params}`);
      return response.data;
    } catch (error) {
      console.error('[Admin API] Failed to fetch social media posts:', error);
      throw new Error('Failed to fetch social media posts');
    }
  }
  
  /**
   * Moderate a social media post
   */
  async moderateSocialMediaPost(postId: string, action: 'approve' | 'reject' | 'flag', reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await productionApiService.post(`/api/admin/social-media/posts/${postId}/moderate`, {
        action,
        reason
      });
      return response.data;
    } catch (error) {
      console.error(`[Admin API] Failed to moderate post ${postId}:`, error);
      throw new Error(`Failed to moderate post ${postId}`);
    }
  }
  
  /**
   * Get social media analytics
   */
  async getSocialMediaAnalytics(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/social-media/analytics');
      return response.data.analytics;
    } catch (error) {
      console.error('[Admin API] Failed to fetch social media analytics:', error);
      throw new Error('Failed to fetch social media analytics');
    }
  }
  
  /**
   * Get community engagement metrics
   */
  async getCommunityEngagementMetrics(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/social-media/community-metrics');
      return response.data.metrics;
    } catch (error) {
      console.error('[Admin API] Failed to fetch community metrics:', error);
      throw new Error('Failed to fetch community engagement data');
    }
  }
  
  // =====================================================
  // SYSTEM HEALTH & MONITORING APIs
  // =====================================================
  
  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await productionApiService.get('/api/admin/system/health');
      return response.data.health;
    } catch (error) {
      console.error('[Admin API] Failed to fetch system health:', error);
      throw new Error('Failed to fetch system health status');
    }
  }
  
  /**
   * Get admin analytics dashboard data
   */
  async getAdminAnalytics(): Promise<AdminAnalytics> {
    try {
      const response = await productionApiService.get('/api/admin/analytics/dashboard');
      return response.data.analytics;
    } catch (error) {
      console.error('[Admin API] Failed to fetch admin analytics:', error);
      throw new Error('Failed to fetch admin analytics data');
    }
  }
  
  /**
   * Get security monitoring data
   */
  async getSecurityMonitoring(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/security/monitoring');
      return response.data.security;
    } catch (error) {
      console.error('[Admin API] Failed to fetch security monitoring:', error);
      throw new Error('Failed to fetch security monitoring data');
    }
  }
  
  /**
   * Get API performance metrics
   */
  async getAPIPerformanceMetrics(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/monitoring/api-performance');
      return response.data.performance;
    } catch (error) {
      console.error('[Admin API] Failed to fetch API performance:', error);
      throw new Error('Failed to fetch API performance metrics');
    }
  }
  
  /**
   * Get database optimization insights
   */
  async getDatabaseOptimizationInsights(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/database/optimization');
      return response.data.optimization;
    } catch (error) {
      console.error('[Admin API] Failed to fetch database insights:', error);
      throw new Error('Failed to fetch database optimization data');
    }
  }
  
  // =====================================================
  // USER & TRAINER MANAGEMENT APIs  
  // =====================================================
  
  /**
   * Get comprehensive user analytics
   */
  async getUserAnalytics(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/users/analytics');
      return response.data.analytics;
    } catch (error) {
      console.error('[Admin API] Failed to fetch user analytics:', error);
      throw new Error('Failed to fetch user analytics');
    }
  }
  
  /**
   * Get trainer performance metrics
   */
  async getTrainerPerformanceMetrics(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/trainers/performance');
      return response.data.performance;
    } catch (error) {
      console.error('[Admin API] Failed to fetch trainer performance:', error);
      throw new Error('Failed to fetch trainer performance metrics');
    }
  }
  
  /**
   * Get client progress analytics
   */
  async getClientProgressAnalytics(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/clients/progress-analytics');
      return response.data.analytics;
    } catch (error) {
      console.error('[Admin API] Failed to fetch client progress analytics:', error);
      throw new Error('Failed to fetch client progress data');
    }
  }
  
  // =====================================================
  // REAL-TIME NOTIFICATIONS & ALERTS
  // =====================================================
  
  // SWA-138 S4: getActiveAlerts/acknowledgeAlert removed — they called the
  // retired 501 stub and had zero consumers. Use /api/admin/alert-state.

  /**
   * Create custom alert rule
   */
  async createAlertRule(rule: any): Promise<{ success: boolean; ruleId: string; message: string }> {
    try {
      const response = await productionApiService.post('/api/admin/alerts/rules', rule);
      return response.data;
    } catch (error) {
      console.error('[Admin API] Failed to create alert rule:', error);
      throw new Error('Failed to create alert rule');
    }
  }
  
  // =====================================================
  // WEBSOCKET CONNECTIONS FOR REAL-TIME DATA
  // =====================================================
  
  /**
   * Establish WebSocket connection for real-time admin data
   */
  createAdminWebSocketConnection(): WebSocket | null {
    try {
      const token = productionApiService.getStoredUser()?.token;
      if (!token) {
        logger.warn('[Admin API] No token available for WebSocket connection');
        return null;
      }
      
      const wsUrl = productionApiService.isAuthenticated()
        ? `wss://sswanstudios.com/ws/admin?token=${token}`
        : `ws://localhost:10000/ws/admin?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        logger.log('[Admin API] WebSocket connection established');
      };
      
      ws.onclose = () => {
        logger.log('[Admin API] WebSocket connection closed');
      };
      
      ws.onerror = (error) => {
        console.error('[Admin API] WebSocket error:', error);
      };
      
      return ws;
    } catch (error) {
      console.error('[Admin API] Failed to create WebSocket connection:', error);
      return null;
    }
  }
  
  // =====================================================
  // UTILITY METHODS
  // =====================================================
  
  /**
   * Check if admin features are available
   */
  async checkAdminFeaturesAvailability(): Promise<boolean> {
    try {
      const response = await productionApiService.get('/api/admin/features/availability');
      return response.data.available === true;
    } catch (error) {
      logger.warn('[Admin API] Admin features availability check failed:', error);
      return false;
    }
  }
  
  /**
   * Get admin dashboard configuration
   */
  async getAdminDashboardConfig(): Promise<any> {
    try {
      const response = await productionApiService.get('/api/admin/dashboard/config');
      return response.data.config;
    } catch (error) {
      console.error('[Admin API] Failed to fetch dashboard config:', error);
      throw new Error('Failed to fetch admin dashboard configuration');
    }
  }
  
  /**
   * Export admin data for reporting
   */
  async exportAdminData(exportType: 'users' | 'sessions' | 'revenue' | 'performance', format: 'csv' | 'json' | 'xlsx' = 'csv'): Promise<Blob> {
    try {
      const response = await productionApiService.get(`/api/admin/export/${exportType}?format=${format}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error(`[Admin API] Failed to export ${exportType} data:`, error);
      throw new Error(`Failed to export ${exportType} data`);
    }
  }
}

// =====================================================
// EXPORT SINGLETON INSTANCE
// =====================================================

const enterpriseAdminApiService = new EnterpriseAdminApiService();

export default enterpriseAdminApiService;
export { EnterpriseAdminApiService };

// Global debug function for admin API troubleshooting
if (typeof window !== 'undefined') {
  (window as any).debugAdminAPI = () => {
    logger.log('[DEBUG] Admin API Service:', {
      authenticated: productionApiService.isAuthenticated(),
      user: productionApiService.getStoredUser(),
      baseUrl: productionApiService.get('/').then(r => r.config.baseURL).catch(() => 'unknown')
    });
  };
  
  (window as any).testAdminEndpoint = async (endpoint: string) => {
    try {
      const response = await productionApiService.get(`/api/admin/${endpoint}`);
      logger.log(`[DEBUG] Admin endpoint /${endpoint} test:`, response.data);
    } catch (error) {
      console.error(`[DEBUG] Admin endpoint /${endpoint} test failed:`, error);
    }
  };
}
