export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactions: number;
}

export interface RevenueChartData {
  overview: {
    totalRevenue: number;
    monthlyRecurring: number;
    averageTransaction: number;
    totalCustomers: number;
  };
  revenueHistory: RevenueDataPoint[];
}
