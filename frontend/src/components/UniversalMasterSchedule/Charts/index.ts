/**
 * Charts Module Index
 * ==================
 * 
 * Central export point for all Universal Master Schedule chart components.
 * Provides professional, real-time data visualization using Recharts.
 */

export { default as RevenueLineChart } from './RevenueLineChart';
export { default as TrainerPerformanceBarChart } from './TrainerPerformanceBarChart';
export { default as SessionDistributionPieChart } from './SessionDistributionPieChart';

// Chart data interfaces
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  sessions: number;
  projected?: number;
}

export interface TrainerPerformanceData {
  name: string;
  revenue: number;
  sessions: number;
  rating: number;
  clients: number;
  socialEngagement: number;
  utilizationRate: number;
  retention: number;
  nasmCompliance: number;
}

export interface SessionDistributionData {
  name: string;
  value: number;
  percentage: number;
  status: 'completed' | 'scheduled' | 'available' | 'cancelled' | 'confirmed' | 'requested';
  color: string;
}

// Chart configuration
export const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  gradient: {
    blue: ['#3b82f6', '#1d4ed8'],
    green: ['#22c55e', '#16a34a'],
    orange: ['#f59e0b', '#d97706'],
    red: ['#ef4444', '#dc2626'],
    purple: ['#8b5cf6', '#7c3aed']
  }
};

export const SESSION_STATUS_COLORS = {
  available: '#22c55e',
  requested: '#f59e0b',
  scheduled: '#3b82f6',
  confirmed: '#06b6d4',
  completed: '#6c757d',
  cancelled: '#ef4444'
};

// Utility functions for chart data processing
export const processRevenueData = (sessions: any[]): RevenueDataPoint[] => {
  // Group sessions by date and calculate revenue
  const dateGroups = sessions.reduce((acc, session) => {
    const date = new Date(session.sessionDate || session.createdAt).toDateString();
    if (!acc[date]) {
      acc[date] = { sessions: 0, revenue: 0 };
    }
    acc[date].sessions += 1;
    if (session.status === 'completed') {
      acc[date].revenue += session.price || 100; // Default session price
    }
    return acc;
  }, {});

  return Object.entries(dateGroups).map(([date, data]: [string, any]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: data.revenue,
    sessions: data.sessions,
    projected: data.revenue * 1.15 // 15% growth projection
  }));
};

export const processTrainerData = (trainers: any[], sessions: any[]): TrainerPerformanceData[] => {
  return trainers.map(trainer => {
    const trainerSessions = sessions.filter(s => s.trainerId === trainer.id);
    const completedSessions = trainerSessions.filter(s => s.status === 'completed');
    const revenue = completedSessions.length * 100; // Assuming $100 per session
    
    return {
      name: `${trainer.firstName} ${trainer.lastName}`,
      revenue,
      sessions: trainerSessions.length,
      rating: 4.2 + Math.random() * 0.8, // Mock rating
      clients: Math.floor(Math.random() * 20) + 5,
      socialEngagement: Math.floor(Math.random() * 50) + 50,
      utilizationRate: Math.floor(Math.random() * 30) + 70,
      retention: Math.floor(Math.random() * 20) + 80,
      nasmCompliance: Math.floor(Math.random() * 10) + 90
    };
  });
};

export const processSessionDistribution = (sessions: any[]): SessionDistributionData[] => {
  const statusCounts = sessions.reduce((acc, session) => {
    const status = session.status || 'available';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const total = sessions.length;
  
  return Object.entries(statusCounts).map(([status, count]: [string, any]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    percentage: (count / total) * 100,
    status: status as any,
    color: SESSION_STATUS_COLORS[status as keyof typeof SESSION_STATUS_COLORS] || '#6c757d'
  }));
};

// Chart theme configuration
export const chartTheme = {
  background: 'transparent',
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)'
  },
  grid: {
    stroke: 'rgba(255, 255, 255, 0.1)',
    strokeDasharray: '3 3'
  },
  tooltip: {
    background: 'rgba(0, 0, 0, 0.9)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
  },
  legend: {
    color: '#ffffff',
    fontSize: '12px'
  }
};
