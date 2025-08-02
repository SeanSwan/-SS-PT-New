/**
 * MCP Server Management Components Index
 * ======================================
 * 
 * Export all MCP server management components for the enterprise admin dashboard
 * Provides centralized access to all MCP-related functionality
 */

export { default as MCPServerCommandCenter } from './MCPServerCommandCenter';
export { default as MCPServerLogViewer } from './MCPServerLogViewer';
export { default as MCPServerConfigManager } from './MCPServerConfigManager';

// Re-export common types and interfaces
export interface MCPServerStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'starting' | 'error';
  port: number;
  uptime?: string;
  lastSeen?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  serverId: string;
  serverName: string;
  metadata?: Record<string, any>;
}
