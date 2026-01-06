export interface AdminDashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
  description: string;
  trend: number[];
  target?: number;
  format: 'number' | 'currency' | 'percentage' | 'text';
}

export interface SystemHealthMetric {
  service: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  details: string;
}

export interface AdminQuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  permission?: string;
}
