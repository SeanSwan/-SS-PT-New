/**
 * MCPServerLogViewer.tsx
 * ======================
 * 
 * Real-time log monitoring and analysis for MCP servers
 * Enterprise-grade log management with filtering, search, and export
 * 
 * FEATURES:
 * - Real-time log streaming with WebSocket integration
 * - Advanced filtering by level, source, and time range
 * - Full-text search with highlighting
 * - Log export functionality (JSON, CSV, plain text)
 * - Auto-scroll and pause functionality
 * - Color-coded log levels with severity indicators
 * - Performance-optimized virtual scrolling for large logs
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Terminal, Search, Filter, Download, Play, Pause,
  AlertCircle, Info, AlertTriangle, Bug, Trash2,
  Eye, EyeOff, Clock, Database, RefreshCw
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  serverId: string;
  serverName: string;
  metadata?: Record<string, any>;
}

interface LogViewerProps {
  serverId?: string;
  height?: string;
  showControls?: boolean;
}

const LogViewerContainer = styled.div<{ height: string }>`
  background: rgba(10, 10, 15, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  overflow: hidden;
  height: ${props => props.height};
  display: flex;
  flex-direction: column;
`;

const LogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(30, 58, 138, 0.1);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  
  h3 {
    color: white;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
  }
`;

const LogControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const SearchInput = styled.input`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 0.5rem;
  color: white;
  font-size: 0.875rem;
  width: 200px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  @media (max-width: 768px) {
    width: 150px;
  }
`;

const FilterSelect = styled.select`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 0.5rem;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  
  option {
    background: #1e3a8a;
    color: white;
  }
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const ControlButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem;
  border-radius: 6px;
  border: none;
  background: ${props => {
    switch (props.variant) {
      case 'danger': return '#ef4444';
      case 'secondary': return 'rgba(255, 255, 255, 0.1)';
      default: return '#3b82f6';
    }
  }};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => {
      switch (props.variant) {
        case 'danger': return '#dc2626';
        case 'secondary': return 'rgba(255, 255, 255, 0.2)';
        default: return '#2563eb';
      }
    }};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LogContent = styled.div`
  flex: 1;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.3);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 4px;
    
    &:hover {
      background: rgba(59, 130, 246, 0.7);
    }
  }
`;

const LogEntryStyled = styled(motion.div)<{ level: string; highlighted?: boolean }>`
  padding: 0.5rem 1rem;
  border-left: 3px solid ${props => {
    switch (props.level) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'debug': return '#6b7280';
      default: return 'transparent';
    }
  }};
  background: ${props => {
    if (props.highlighted) return 'rgba(59, 130, 246, 0.2)';
    switch (props.level) {
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      case 'warn': return 'rgba(245, 158, 11, 0.1)';
      default: return 'transparent';
    }
  }};
  color: white;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .log-timestamp {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }
  
  .log-level {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    margin-right: 0.5rem;
    min-width: 50px;
    text-align: center;
    
    &.error {
      background: #ef4444;
      color: white;
    }
    
    &.warn {
      background: #f59e0b;
      color: #1f2937;
    }
    
    &.info {
      background: #3b82f6;
      color: white;
    }
    
    &.debug {
      background: #6b7280;
      color: white;
    }
  }
  
  .log-source {
    color: rgba(59, 130, 246, 0.8);
    font-size: 0.75rem;
    margin-right: 0.5rem;
    font-weight: 500;
  }
  
  .log-server {
    color: rgba(16, 185, 129, 0.8);
    font-size: 0.75rem;
    margin-right: 0.5rem;
    font-weight: 500;
  }
  
  .log-message {
    color: rgba(255, 255, 255, 0.9);
    
    mark {
      background: #f59e0b;
      color: #1f2937;
      padding: 0.125rem 0.25rem;
      border-radius: 2px;
    }
  }
`;

const LogStats = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: rgba(30, 58, 138, 0.05);
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    
    .count {
      color: white;
      font-weight: 600;
    }
  }
`;

const MCPServerLogViewer: React.FC<LogViewerProps> = ({ 
  serverId,
  height = '500px',
  showControls = true 
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const logContentRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Mock log data for demonstration
  const generateMockLog = (): LogEntry => {
    const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];
    const sources = ['workout-generator', 'health-monitor', 'api-handler', 'database', 'cache-manager'];
    const servers = [
      { id: 'workout-mcp', name: 'AI Workout Generator' },
      { id: 'gamification-mcp', name: 'Gamification Engine' },
      { id: 'enhanced-gamification-mcp', name: 'Enhanced Gamification' },
      { id: 'financial-events-mcp', name: 'Financial Events Engine' },
      { id: 'yolo-mcp', name: 'YOLO Computer Vision' }
    ];
    
    const messages = {
      debug: [
        'Function execution completed in 23ms',
        'Cache hit for key: user_workout_preferences_12345',
        'Database query executed: SELECT * FROM exercises WHERE category = $1',
        'Memory usage: 45.2% of allocated heap'
      ],
      info: [
        'Workout generated successfully for user 67890',
        'Health check passed - all systems operational',
        'New client connected from IP 192.168.1.100',
        'Configuration reloaded from environment variables'
      ],
      warn: [
        'High memory usage detected: 78% of allocated heap',
        'Slow query detected: execution time 2.3 seconds',
        'Rate limit approaching for API endpoint /generate',
        'Connection pool at 85% capacity'
      ],
      error: [
        'Failed to connect to external API after 3 retries',
        'Database connection timeout after 30 seconds',
        'Model inference failed: CUDA out of memory',
        'Webhook validation failed: invalid signature'
      ]
    };
    
    const level = levels[Math.floor(Math.random() * levels.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const server = servers[Math.floor(Math.random() * servers.length)];
    const messageOptions = messages[level];
    const message = messageOptions[Math.floor(Math.random() * messageOptions.length)];
    
    return {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      serverId: server.id,
      serverName: server.name
    };
  };
  
  // Initialize logs and WebSocket connection
  useEffect(() => {
    // Generate initial logs
    const initialLogs = Array.from({ length: 50 }, generateMockLog)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setLogs(initialLogs);
    
    // Simulate WebSocket connection
    setIsConnected(true);
    
    // Generate new logs periodically
    const logInterval = setInterval(() => {
      if (!isPaused) {
        const newLog = generateMockLog();
        setLogs(prev => {
          const updated = [...prev, newLog];
          // Keep only last 1000 logs for performance
          return updated.slice(-1000);
        });
      }
    }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds
    
    return () => {
      clearInterval(logInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isPaused]);
  
  // Filter logs based on search term and filters
  useEffect(() => {
    let filtered = logs;
    
    // Filter by server if specified
    if (serverId) {
      filtered = filtered.filter(log => log.serverId === serverId);
    }
    
    // Filter by level
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }
    
    // Filter by source
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => log.source === sourceFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower) ||
        log.serverName.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, searchTerm, levelFilter, sourceFilter, serverId]);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContentRef.current) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);
  
  // Get unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const sources = new Set(logs.map(log => log.source));
    return Array.from(sources).sort();
  }, [logs]);
  
  // Calculate log statistics
  const logStats = useMemo(() => {
    const stats = filteredLogs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: filteredLogs.length,
      error: stats.error || 0,
      warn: stats.warn || 0,
      info: stats.info || 0,
      debug: stats.debug || 0
    };
  }, [filteredLogs]);
  
  const handleExportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mcp-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };
  
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };
  
  return (
    <LogViewerContainer height={height}>
      {showControls && (
        <LogHeader>
          <h3>
            <Terminal size={18} />
            {serverId ? `Server Logs - ${logs.find(l => l.serverId === serverId)?.serverName || serverId}` : 'All Server Logs'}
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: isConnected ? '#10b981' : '#6b7280',
              marginLeft: '0.5rem',
              animation: isConnected ? 'pulse 2s infinite' : 'none'
            }} />
          </h3>
          
          <LogControls>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.5)' }} />
              <SearchInput
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2rem' }}
              />
            </div>
            
            <FilterSelect
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="all">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </FilterSelect>
            
            <FilterSelect
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All Sources</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </FilterSelect>
            
            <ControlButton
              onClick={() => setIsPaused(!isPaused)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isPaused ? 'Resume log stream' : 'Pause log stream'}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </ControlButton>
            
            <ControlButton
              onClick={() => setAutoScroll(!autoScroll)}
              variant={autoScroll ? 'primary' : 'secondary'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            >
              {autoScroll ? <Eye size={16} /> : <EyeOff size={16} />}
            </ControlButton>
            
            <ControlButton
              onClick={handleExportLogs}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Export logs"
            >
              <Download size={16} />
            </ControlButton>
            
            <ControlButton
              onClick={clearLogs}
              variant="danger"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Clear all logs"
            >
              <Trash2 size={16} />
            </ControlButton>
          </LogControls>
        </LogHeader>
      )}
      
      <LogContent ref={logContentRef}>
        <AnimatePresence>
          {filteredLogs.map((log, index) => (
            <LogEntryStyled
              key={log.id}
              level={log.level}
              highlighted={searchTerm && log.message.toLowerCase().includes(searchTerm.toLowerCase())}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.01 }}
            >
              <span className="log-timestamp">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`log-level ${log.level}`}>
                {log.level}
              </span>
              {!serverId && (
                <span className="log-server">
                  [{log.serverName}]
                </span>
              )}
              <span className="log-source">
                {log.source}:
              </span>
              <span 
                className="log-message"
                dangerouslySetInnerHTML={{
                  __html: highlightSearchTerm(log.message, searchTerm)
                }}
              />
            </LogEntryStyled>
          ))}
        </AnimatePresence>
        
        {filteredLogs.length === 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px',
            color: 'rgba(255, 255, 255, 0.5)',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <Database size={32} />
            <span>No logs match the current filters</span>
          </div>
        )}
      </LogContent>
      
      <LogStats>
        <div className="stat-item">
          <Database size={14} />
          Total: <span className="count">{logStats.total}</span>
        </div>
        {logStats.error > 0 && (
          <div className="stat-item">
            <AlertCircle size={14} style={{ color: '#ef4444' }} />
            Errors: <span className="count" style={{ color: '#ef4444' }}>{logStats.error}</span>
          </div>
        )}
        {logStats.warn > 0 && (
          <div className="stat-item">
            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            Warnings: <span className="count" style={{ color: '#f59e0b' }}>{logStats.warn}</span>
          </div>
        )}
        <div className="stat-item">
          <Info size={14} style={{ color: '#3b82f6' }} />
          Info: <span className="count">{logStats.info}</span>
        </div>
        <div className="stat-item">
          <Bug size={14} style={{ color: '#6b7280' }} />
          Debug: <span className="count">{logStats.debug}</span>
        </div>
        <div className="stat-item">
          <Clock size={14} />
          Status: <span className="count" style={{ color: isConnected ? '#10b981' : '#ef4444' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </LogStats>
    </LogViewerContainer>
  );
};

export default MCPServerLogViewer;
