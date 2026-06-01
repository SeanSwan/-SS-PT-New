export type RevenueStatus = 'live' | 'updating' | 'error';

export interface RevenueOverview {
  totalRevenue: number;
  monthlyRecurring: number;
  averageTransaction: number;
  totalCustomers: number;
}

export interface RevenueChanges {
  revenue: number;
  customers: number;
  transactions: number;
  conversion: number;
}

export interface RevenueHistoryPoint {
  month: string;
  revenue: number;
  transactions: number;
}

export interface RevenuePackage {
  name: string;
  revenue: number;
}

export interface RevenueTransaction {
  id: string | number;
  amount: number;
  date: string;
  package: string;
  status: string;
  customer?: {
    name?: string;
  };
}

export interface RevenueAnalyticsData {
  overview: RevenueOverview;
  changes: RevenueChanges;
  revenueHistory: RevenueHistoryPoint[];
  topPackages: RevenuePackage[];
  recentTransactions: RevenueTransaction[];
}
