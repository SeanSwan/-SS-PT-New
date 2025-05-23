// File: frontend/src/components/Reports/ReportAnalyticsDashboard.tsx

import React, { useState, useEffect, createContext, useContext, ReactNode, forwardRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { format, subDays, subMonths } from 'date-fns';

// UI components
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
// Create a custom Skeleton component since the import can't be found
import { useToast } from '../../hooks/use-toast';

// Icons
import {
  BarChart2,
  BarChart4,
  TrendingUp,
  Clock,
  Eye,
  Share2,
  Users,
  Calendar,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  List,
  Activity,
  AlertCircle,
  CheckCircle2,
  User,
  Filter,
  RefreshCw,
  MessageSquare,
  Bell,
  Mail,
  Phone,
  Zap,
  Shield
} from 'lucide-react';

// ---------------------------------------------------------------------------
// CUSTOM SKELETON COMPONENT
// ---------------------------------------------------------------------------
interface SkeletonProps {
  className?: string;
}

const SkeletonBase = styled.div`
  background-color: #e5e7eb;
  border-radius: 4px;
  animation: ${keyframes`
    0% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.5;
    }
  `} 2s ease-in-out infinite;
`;

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return <SkeletonBase className={className} />;
};

// ---------------------------------------------------------------------------
// CUSTOM SELECT COMPONENT WITH TYPESCRIPT SUPPORT
// ---------------------------------------------------------------------------
interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface SelectProps {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

interface SelectTriggerProps {
  children: ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SelectContentProps {
  children: ReactNode;
}

interface SelectItemProps {
  children: ReactNode;
  value: string;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select compound components must be used within a Select component');
  }
  return context;
};

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const StyledTrigger = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: #d1d5db;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const StyledContent = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  width: 100%;
  max-height: 15rem;
  overflow-y: auto;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 50;
  display: ${({ isOpen }) => (isOpen ? 'block' : 'none')};
`;

const StyledItem = styled.button`
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: #f3f4f6;
  }

  &:focus {
    outline: none;
    background-color: #e5e7eb;
  }
`;

const StyledValue = styled.span`
  color: ${({ children }) => (children ? '#374151' : '#9ca3af')};
`;

const Select = ({ children, value, onValueChange, disabled = false }: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <SelectWrapper>
        {children}
      </SelectWrapper>
    </SelectContext.Provider>
  );
};

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ children, className }, ref) => {
    const { isOpen, setIsOpen } = useSelectContext();
    
    return (
      <StyledTrigger
        ref={ref}
        onClick={() => setIsOpen(!isOpen)}
        className={className}
        type="button"
        aria-expanded={isOpen}
      >
        {children}
        <ChevronDown size={16} />
      </StyledTrigger>
    );
  }
);

SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = ({ placeholder }: SelectValueProps) => {
  const { value } = useSelectContext();
  return <StyledValue>{value || placeholder}</StyledValue>;
};

const SelectContent = ({ children }: SelectContentProps) => {
  const { isOpen } = useSelectContext();
  
  return (
    <StyledContent isOpen={isOpen}>
      {children}
    </StyledContent>
  );
};

const SelectItem = ({ children, value: itemValue }: SelectItemProps) => {
  const { onValueChange, setIsOpen } = useSelectContext();
  
  const handleSelect = () => {
    onValueChange(itemValue);
    setIsOpen(false);
  };
  
  return (
    <StyledItem
      onClick={handleSelect}
      role="option"
    >
      {children}
    </StyledItem>
  );
};

// Set up compound component structure
Select.Trigger = SelectTrigger;
Select.Value = SelectValue;
Select.Content = SelectContent;
Select.Item = SelectItem;

// ---------------------------------------------------------------------------
// STYLED COMPONENTS – Layout & Typography
// ---------------------------------------------------------------------------

const DashboardContainer = styled.div`
  background-color: #f9fafb;
  border-radius: 12px;
  padding: 24px;
  
  @media (max-width: 768px) {
    padding: 16px;
    border-radius: 8px;
  }
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
`;

const HeaderTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #111827;
  
  @media (max-width: 640px) {
    font-size: 1.25rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 480px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const IconWrapper = styled.span`
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
`;

const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const StatsTimeSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  
  @media (max-width: 480px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const TimeButton = styled.button<{ active?: boolean }>`
  padding: 8px 12px;
  background-color: ${props => (props.active ? '#0070f3' : 'white')};
  color: ${props => (props.active ? 'white' : '#6b7280')};
  border: 1px solid ${props => (props.active ? '#0070f3' : '#e5e7eb')};
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => (props.active ? '#0070f3' : '#f9fafb')};
    border-color: ${props => (props.active ? '#0070f3' : '#d1d5db')};
  }
  
  @media (max-width: 480px) {
    flex: 1;
    text-align: center;
    padding: 6px 8px;
    font-size: 0.75rem;
  }
`;

const StatCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(Card)`
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const StatTitle = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
`;

const StatIcon = styled.div<{ color?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.color || '#e5e7eb'};
  color: white;
`;

const StatValue = styled.div`
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const StatTrend = styled.div<{ positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: ${props => (props.positive ? '#10b981' : '#ef4444')};
`;

const ChartContainer = styled.div`
  margin-bottom: 32px;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const ChartTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChartCard = styled(Card)`
  padding: 20px;
  height: 400px;
  margin-bottom: 24px;
  
  @media (max-width: 640px) {
    height: 300px;
  }
`;

const MetricSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  
  @media (max-width: 480px) {
    width: 100%;
  }
`;

const MetricButton = styled.button<{ active?: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => (props.active ? '#3b82f6' : '#e5e7eb')};
  background-color: ${props => (props.active ? '#eff6ff' : 'white')};
  color: ${props => (props.active ? '#3b82f6' : '#6b7280')};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    border-color: ${props => (props.active ? '#3b82f6' : '#d1d5db')};
    background-color: ${props => (props.active ? '#dbeafe' : '#f9fafb')};
  }
  
  @media (max-width: 480px) {
    flex: 1;
    text-align: center;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  margin-bottom: 24px;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  padding: 12px 16px;
  text-align: left;
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  border-bottom: 1px solid #e5e7eb;
  
  @media (max-width: 640px) {
    padding: 8px 12px;
    font-size: 0.75rem;
  }
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: #f9fafb;
  }
  &:hover {
    background-color: #f3f4f6;
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #374151;
  
  @media (max-width: 640px) {
    padding: 8px 12px;
    font-size: 0.75rem;
  }
`;

const StatusBadge = styled(Badge)<{ status: 'sent' | 'opened' | 'error' | 'pending' }>`
  background-color: ${props => {
    switch (props.status) {
      case 'sent': return '#dbeafe';
      case 'opened': return '#d1fae5';
      case 'error': return '#fee2e2';
      case 'pending': return '#fef3c7';
      default: return '#e5e7eb';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'sent': return '#1d4ed8';
      case 'opened': return '#047857';
      case 'error': return '#b91c1c';
      case 'pending': return '#92400e';
      default: return '#374151';
    }
  }};
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  
  @media (max-width: 640px) {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
`;

const PaginationText = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const SmallFlex = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 480px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 40px 0;
  color: #6b7280;
`;

const DetailAccordion = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
`;

const DetailHeader = styled.div<{ expanded: boolean }>`
  padding: 16px;
  background-color: ${props => (props.expanded ? '#f3f4f6' : '#f9fafb')};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  &:hover {
    background-color: #f3f4f6;
  }
`;

const DetailTitle = styled.div`
  font-weight: 500;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DetailContent = styled.div<{ expanded: boolean }>`
  max-height: ${props => (props.expanded ? '500px' : '0')};
  overflow: hidden;
  transition: all 0.3s ease;
  padding: ${props => (props.expanded ? '16px' : '0 16px')};
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ThreeColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

// Custom skeleton components
const spinAnimation = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingCard = styled(Card)`
  padding: 24px;
`;

const SkeletonSmall = styled(Skeleton)`
  height: 16px;
  width: 33.333%;
  margin-bottom: 8px;
`;

const SkeletonMedium = styled(Skeleton)`
  height: 40px;
  width: 50%;
  margin-bottom: 8px;
`;

const SkeletonSmallQuarter = styled(Skeleton)`
  height: 16px;
  width: 25%;
`;

const SkeletonHeader = styled(Skeleton)`
  height: 24px;
  width: 25%;
  margin-bottom: 16px;
`;

const SkeletonFull = styled(Skeleton)`
  height: 100%;
  width: 100%;
`;

// Styled components for Reports tab header
const ReportsHeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
`;

// Styled Select trigger to replace Tailwind width utility
const StyledSelectTrigger = styled(Select.Trigger)`
  width: 180px;
  
  @media (max-width: 640px) {
    width: 100%;
  }
`;

// Responsive container for the filter section
const FilterWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 640px) {
    width: 100%;
  }
`;

// Vertical spacing container (replacing space-y-4)
const VerticalSpacing = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// Skeleton item for report loading state
const SkeletonItem = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
`;

// Expanded details container in report table row
const ExpandedDetailsContainer = styled.div`
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
`;

// Styled Recommendations for Delivery Insights
const BlueRecommendation = styled.div`
  padding: 12px;
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
`;

const GreenRecommendation = styled.div`
  padding: 12px;
  background-color: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
`;

const AmberRecommendation = styled.div`
  padding: 12px;
  background-color: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
`;

const PurpleRecommendation = styled.div`
  padding: 12px;
  background-color: #f5f3ff;
  border: 1px solid #e9d5ff;
  border-radius: 8px;
`;

// Responsive tabs
const StyledTabsList = styled(TabsList)`
  @media (max-width: 640px) {
    flex-wrap: wrap;
    
    button {
      flex: 1 0 calc(50% - 4px);
      margin: 2px;
    }
  }
`;

// ---------------------------------------------------------------------------
// MOCK DATA GENERATION (for demo purposes)
// ---------------------------------------------------------------------------
const generateMockData = () => {
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i);
    const month = format(date, 'MMM');
    return {
      month,
      reports: Math.floor(Math.random() * 30) + 10,
      views: Math.floor(Math.random() * 100) + 50,
      shares: Math.floor(Math.random() * 20) + 5,
      recipients: Math.floor(Math.random() * 40) + 20,
    };
  });

  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const day = format(date, 'MMM d');
    return {
      day,
      reports: Math.floor(Math.random() * 5) + 1,
      views: Math.floor(Math.random() * 20) + 5,
      shares: Math.floor(Math.random() * 5) + 1,
      recipients: Math.floor(Math.random() * 10) + 2,
    };
  });

  const clientDistribution = [
    { name: 'Residential', value: 32 },
    { name: 'Commercial', value: 25 },
    { name: 'Industrial', value: 18 },
    { name: 'Government', value: 12 },
    { name: 'Education', value: 8 },
    { name: 'Healthcare', value: 5 },
  ];

  const deliveryMethods = [
    { name: 'Email', value: 68 },
    { name: 'SMS', value: 12 },
    { name: 'Both', value: 20 },
  ];

  const reportStatusDistribution = [
    { name: 'Sent', value: 45 },
    { name: 'Opened', value: 30 },
    { name: 'Error', value: 5 },
    { name: 'Pending', value: 20 },
  ];

  const reportTypes = ['Daily Security', 'Weekly Summary', 'Incident', 'Maintenance', 'Monthly Compliance'];
  const clients = ['Oakwood Properties', 'Highland Corporate Center', 'Riverfront Residences', 'Metro Industrial Park', 'GreenView Apartments', 'Tech Innovation Campus'];

  const recentReports = Array.from({ length: 20 }, (_, i) => {
    const date = subDays(new Date(), Math.floor(Math.random() * 30));
    const reportType = reportTypes[Math.floor(Math.random() * reportTypes.length)];
    const client = clients[Math.floor(Math.random() * clients.length)];
    const recipients = Math.floor(Math.random() * 10) + 1;
    const views = Math.floor(Math.random() * recipients) + 1;
    const status = ['sent', 'opened', 'error', 'pending'][Math.floor(Math.random() * 4)] as 'sent' | 'opened' | 'error' | 'pending';
    return {
      id: `report-${i + 1}`,
      date: format(date, 'MMM d, yyyy'),
      title: `${reportType} Report - ${client}`,
      client,
      recipients,
      views,
      status,
      reportType,
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    monthlyData,
    dailyData,
    clientDistribution,
    deliveryMethods,
    reportStatusDistribution,
    recentReports,
    stats: {
      totalReports: 237,
      totalViews: 896,
      totalRecipients: 542,
      openRate: 82,
      deliverySuccessRate: 98,
      averageResponseTime: 3.5,
    },
    changes: {
      reports: 12,
      views: 8,
      recipients: 15,
      openRate: -2,
      deliverySuccessRate: 1,
      responseTime: -0.5,
    }
  };
};

// ---------------------------------------------------------------------------
// COMPONENT PROPS
// ---------------------------------------------------------------------------
interface ReportAnalyticsDashboardProps {
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * ReportAnalyticsDashboard Component
 * Advanced analytics for security report distribution and engagement
 */
const ReportAnalyticsDashboard: React.FC<ReportAnalyticsDashboardProps> = ({
  clientId,
  startDate,
  endDate
}) => {
  const { toast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'reports' | 'views' | 'shares' | 'recipients'>('reports');
  const [reportFilter, setReportFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<ReturnType<typeof generateMockData> | null>(null);

  // Colors for charts
  const COLORS = ['#0070f3', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Load analytics data on mount and when filters change
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
        const data = generateMockData();
        setAnalytics(data);
        if (timeRange === '7d') {
          setChartData(data.dailyData.slice(-7));
        } else if (timeRange === '30d') {
          setChartData(data.dailyData);
        } else if (timeRange === '90d') {
          setChartData(data.monthlyData.slice(-3));
        } else {
          setChartData(data.monthlyData);
        }
      } catch (error) {
        console.error('Failed to load analytics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, [timeRange, toast]);

  const handleTimeRangeChange = (range: '7d' | '30d' | '90d' | '12m') => {
    setTimeRange(range);
  };

  const handleMetricChange = (metric: 'reports' | 'views' | 'shares' | 'recipients') => {
    setSelectedMetric(metric);
  };

  const handleReportFilterChange = (value: string) => {
    setReportFilter(value);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    const data = generateMockData();
    setAnalytics(data);
    toast({
      title: 'Data Refreshed',
      description: 'Analytics data has been updated',
      variant: 'default'
    });
  };

  const filteredReports = analytics?.recentReports.filter(report => {
    if (reportFilter === 'all') return true;
    return report.reportType.toLowerCase().includes(reportFilter.toLowerCase());
  }) || [];

  const paginatedReports = filteredReports.slice((currentPage - 1) * 10, currentPage * 10);
  const totalPages = Math.ceil(filteredReports.length / 10);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const toggleReportDetails = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  const formatChange = (value: number) => (value > 0 ? `+${value}%` : `${value}%`);

  const exportAnalytics = () => {
    toast({
      title: 'Export Started',
      description: 'Analytics data is being prepared for download',
      variant: 'default'
    });
  };

  // Fixed label function for pie chart to handle undefined percent
  const renderPieChartLabel = ({ name, percent }: { name: string; percent?: number }) => {
    return `${name}: ${percent !== undefined ? (percent * 100).toFixed(0) : '0'}%`;
  };

  return (
    <DashboardContainer>
      <DashboardHeader>
        <HeaderTitle>
          <BarChart2 size={24} />
          Report Analytics Dashboard
        </HeaderTitle>
        <HeaderActions>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconWrapper><RefreshCw size={16} /></IconWrapper>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAnalytics}>
            <IconWrapper><Download size={16} /></IconWrapper>
            Export
          </Button>
        </HeaderActions>
      </DashboardHeader>

      <FilterContainer>
        <StatsTimeSelector>
          <TimeButton active={timeRange === '7d'} onClick={() => handleTimeRangeChange('7d')}>
            7 Days
          </TimeButton>
          <TimeButton active={timeRange === '30d'} onClick={() => handleTimeRangeChange('30d')}>
            30 Days
          </TimeButton>
          <TimeButton active={timeRange === '90d'} onClick={() => handleTimeRangeChange('90d')}>
            90 Days
          </TimeButton>
          <TimeButton active={timeRange === '12m'} onClick={() => handleTimeRangeChange('12m')}>
            12 Months
          </TimeButton>
        </StatsTimeSelector>
      </FilterContainer>

      {isLoading ? (
        <StatCardsGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingCard key={i}>
              <SkeletonSmall />
              <SkeletonMedium />
              <SkeletonSmallQuarter />
            </LoadingCard>
          ))}
        </StatCardsGrid>
      ) : analytics ? (
        <StatCardsGrid>
          <StatCard>
            <StatHeader>
              <StatTitle>Total Reports</StatTitle>
              <StatIcon color="#0070f3">
                <FileText size={18} />
              </StatIcon>
            </StatHeader>
            <StatValue>{analytics.stats.totalReports}</StatValue>
            <StatTrend positive={analytics.changes.reports > 0}>
              {analytics.changes.reports > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {formatChange(analytics.changes.reports)} from last period
            </StatTrend>
          </StatCard>
          <StatCard>
            <StatHeader>
              <StatTitle>Total Views</StatTitle>
              <StatIcon color="#10b981">
                <Eye size={18} />
              </StatIcon>
            </StatHeader>
            <StatValue>{analytics.stats.totalViews}</StatValue>
            <StatTrend positive={analytics.changes.views > 0}>
              {analytics.changes.views > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {formatChange(analytics.changes.views)} from last period
            </StatTrend>
          </StatCard>
          <StatCard>
            <StatHeader>
              <StatTitle>Total Recipients</StatTitle>
              <StatIcon color="#f59e0b">
                <Users size={18} />
              </StatIcon>
            </StatHeader>
            <StatValue>{analytics.stats.totalRecipients}</StatValue>
            <StatTrend positive={analytics.changes.recipients > 0}>
              {analytics.changes.recipients > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {formatChange(analytics.changes.recipients)} from last period
            </StatTrend>
          </StatCard>
          <StatCard>
            <StatHeader>
              <StatTitle>Open Rate</StatTitle>
              <StatIcon color="#8b5cf6">
                <Mail size={18} />
              </StatIcon>
            </StatHeader>
            <StatValue>{analytics.stats.openRate}%</StatValue>
            <StatTrend positive={analytics.changes.openRate > 0}>
              {analytics.changes.openRate > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {formatChange(analytics.changes.openRate)} from last period
            </StatTrend>
          </StatCard>
          <StatCard>
            <StatHeader>
              <StatTitle>Delivery Success</StatTitle>
              <StatIcon color="#22c55e">
                <CheckCircle2 size={18} />
              </StatIcon>
            </StatHeader>
            <StatValue>{analytics.stats.deliverySuccessRate}%</StatValue>
            <StatTrend positive={analytics.changes.deliverySuccessRate > 0}>
              {analytics.changes.deliverySuccessRate > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {formatChange(analytics.changes.deliverySuccessRate)} from last period
            </StatTrend>
          </StatCard>
          <StatCard>
            <StatHeader>
              <StatTitle>Avg. Response Time</StatTitle>
              <StatIcon color="#ef4444">
                <Clock size={18} />
              </StatIcon>
            </StatHeader>
            <StatValue>{analytics.stats.averageResponseTime}h</StatValue>
            <StatTrend positive={analytics.changes.responseTime < 0}>
              {analytics.changes.responseTime < 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {analytics.changes.responseTime < 0
                ? `${Math.abs(analytics.changes.responseTime)}h faster`
                : `${analytics.changes.responseTime}h slower`}
            </StatTrend>
          </StatCard>
        </StatCardsGrid>
      ) : (
        <NoDataMessage>No analytics data available</NoDataMessage>
      )}

      <Tabs defaultValue="overview">
        <StyledTabsList>
          <TabsTrigger value="overview">
            <Activity size={16} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText size={16} />
            Reports
          </TabsTrigger>
          <TabsTrigger value="recipients">
            <Users size={16} />
            Recipients
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Bell size={16} />
            Delivery
          </TabsTrigger>
        </StyledTabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {isLoading ? (
            <ChartCard>
              <SkeletonHeader />
              <SkeletonFull />
            </ChartCard>
          ) : analytics ? (
            <>
              <ChartCard>
                <ChartHeader>
                  <ChartTitle>
                    <TrendingUp size={18} />
                    Report Activity Trends
                  </ChartTitle>
                  <MetricSelector>
                    <MetricButton
                      active={selectedMetric === 'reports'}
                      onClick={() => handleMetricChange('reports')}
                    >
                      Reports
                    </MetricButton>
                    <MetricButton
                      active={selectedMetric === 'views'}
                      onClick={() => handleMetricChange('views')}
                    >
                      Views
                    </MetricButton>
                    <MetricButton
                      active={selectedMetric === 'shares'}
                      onClick={() => handleMetricChange('shares')}
                    >
                      Shares
                    </MetricButton>
                    <MetricButton
                      active={selectedMetric === 'recipients'}
                      onClick={() => handleMetricChange('recipients')}
                    >
                      Recipients
                    </MetricButton>
                  </MetricSelector>
                </ChartHeader>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0070f3" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0070f3" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey={timeRange === '30d' || timeRange === '7d' ? 'day' : 'month'}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="#0070f3"
                      fillOpacity={1}
                      fill="url(#colorMetric)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <TwoColumnGrid>
                <ChartCard>
                  <ChartTitle>
                    <BarChart4 size={18} />
                    Client Distribution
                  </ChartTitle>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.clientDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={renderPieChartLabel}
                      >
                        {analytics.clientDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard>
                  <ChartTitle>
                    <List size={18} />
                    Report Status
                  </ChartTitle>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.reportStatusDistribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0070f3">
                        {analytics.reportStatusDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === 'Sent'
                                ? '#3b82f6'
                                : entry.name === 'Opened'
                                ? '#10b981'
                                : entry.name === 'Error'
                                ? '#ef4444'
                                : '#f59e0b'
                            }
                          />
                        ))}
                        <LabelList dataKey="value" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </TwoColumnGrid>
            </>
          ) : (
            <NoDataMessage>No overview data available</NoDataMessage>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <ReportsHeaderContainer>
              <SectionTitle>Recent Reports</SectionTitle>
              <FilterWrapper>
                <Filter size={16} />
                <Select value={reportFilter} onValueChange={handleReportFilterChange}>
                  <StyledSelectTrigger>
                    <Select.Value placeholder="Filter by type" />
                  </StyledSelectTrigger>
                  <Select.Content>
                    <Select.Item value="all">All Report Types</Select.Item>
                    <Select.Item value="Daily">Daily Security</Select.Item>
                    <Select.Item value="Weekly">Weekly Summary</Select.Item>
                    <Select.Item value="Incident">Incident Reports</Select.Item>
                    <Select.Item value="Maintenance">Maintenance Reports</Select.Item>
                    <Select.Item value="Monthly">Monthly Compliance</Select.Item>
                  </Select.Content>
                </Select>
              </FilterWrapper>
            </ReportsHeaderContainer>

            {isLoading ? (
              <VerticalSpacing>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonItem key={i}>
                    <SkeletonHeader />
                    <SkeletonSmall />
                    <SkeletonSmallQuarter />
                  </SkeletonItem>
                ))}
              </VerticalSpacing>
            ) : paginatedReports.length > 0 ? (
              <>
                <TableContainer>
                  <Table>
                    <thead>
                      <tr>
                        <TableHeader>Report</TableHeader>
                        <TableHeader>Date</TableHeader>
                        <TableHeader>Client</TableHeader>
                        <TableHeader>Recipients</TableHeader>
                        <TableHeader>Views</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Actions</TableHeader>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReports.map((report) => (
                        <React.Fragment key={report.id}>
                          <TableRow>
                            <TableCell>
                              <div style={{ fontWeight: 500 }}>{report.title}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {report.reportType} Report
                              </div>
                            </TableCell>
                            <TableCell>{report.date}</TableCell>
                            <TableCell>{report.client}</TableCell>
                            <TableCell>{report.recipients}</TableCell>
                            <TableCell>{report.views}</TableCell>
                            <TableCell>
                              <StatusBadge status={report.status}>
                                {report.status === 'sent' && <Mail size={12} />}
                                {report.status === 'opened' && <Eye size={12} />}
                                {report.status === 'error' && <AlertCircle size={12} />}
                                {report.status === 'pending' && <Clock size={12} />}
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <SmallFlex>
                                <Button variant="ghost" size="sm">
                                  <Eye size={16} />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleReportDetails(report.id)}
                                >
                                  {expandedReport === report.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>
                              </SmallFlex>
                            </TableCell>
                          </TableRow>
                          {expandedReport === report.id && (
                            <TableRow>
                              <TableCell colSpan={7}>
                                <ExpandedDetailsContainer>
                                  <TwoColumnGrid style={{ marginBottom: '16px' }}>
                                    <div>
                                      <h4 style={{ fontWeight: 500, marginBottom: '8px' }}>Delivery Details</h4>
                                      <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
                                        <strong>Email Recipients:</strong> {Math.floor(report.recipients * 0.8)}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
                                        <strong>SMS Recipients:</strong> {Math.floor(report.recipients * 0.2)}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
                                        <strong>Delivery Time:</strong> {format(new Date(report.date), 'h:mm a')}
                                      </div>
                                      <div style={{ fontSize: '0.875rem' }}>
                                        <strong>Delivery Status:</strong>{' '}
                                        {report.status === 'error'
                                          ? 'Failed delivery to 1 recipient'
                                          : 'All recipients received report'}
                                      </div>
                                    </div>
                                    <div>
                                      <h4 style={{ fontWeight: 500, marginBottom: '8px' }}>Engagement Metrics</h4>
                                      <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
                                        <strong>Open Rate:</strong> {Math.floor((report.views / report.recipients) * 100)}%
                                      </div>
                                      <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
                                        <strong>First Opened:</strong>{' '}
                                        {report.status === 'opened'
                                          ? `${Math.floor(Math.random() * 120) + 5} minutes after delivery`
                                          : 'N/A'}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
                                        <strong>Media Views:</strong> {report.status === 'opened' ? Math.floor(Math.random() * 5) : 0}
                                      </div>
                                      <div style={{ fontSize: '0.875rem' }}>
                                        <strong>Feedback Received:</strong> {Math.random() > 0.7 ? 'Yes' : 'No'}
                                      </div>
                                    </div>
                                  </TwoColumnGrid>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                                    <Button variant="outline" size="sm">
                                      <IconWrapper>
                                        <Eye size={14} />
                                      </IconWrapper>
                                      View Full Details
                                    </Button>
                                  </div>
                                </ExpandedDetailsContainer>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </Table>
                </TableContainer>
                <PaginationContainer>
                  <PaginationText>
                    Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, filteredReports.length)} of{' '}
                    {filteredReports.length} reports
                  </PaginationText>
                  <SmallFlex>
                    <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <PaginationText>
                      Page {currentPage} of {totalPages}
                    </PaginationText>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                      Next
                    </Button>
                  </SmallFlex>
                </PaginationContainer>
              </>
            ) : (
              <NoDataMessage>No reports found matching the selected filters</NoDataMessage>
            )}
          </Card>
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients">
          {isLoading ? (
            <ChartCard>
              <SkeletonHeader />
              <SkeletonFull />
            </ChartCard>
          ) : analytics ? (
            <>
              <TwoColumnGrid>
                <ChartCard>
                  <ChartTitle>
                    <Users size={18} />
                    Recipient Engagement
                  </ChartTitle>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey={timeRange === '30d' || timeRange === '7d' ? 'day' : 'month'} tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="recipients" stroke="#0070f3" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard>
                  <ChartTitle>
                    <Bell size={18} />
                    Delivery Method Breakdown
                  </ChartTitle>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.deliveryMethods}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={renderPieChartLabel}
                      >
                        <Cell fill="#0070f3" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </TwoColumnGrid>
              <Card style={{ padding: '24px' }}>
                <SectionTitle style={{ marginBottom: '16px' }}>Recipient Analytics</SectionTitle>
                <VerticalSpacing>
                  <DetailAccordion>
                    <DetailHeader expanded={true}>
                      <DetailTitle>
                        <Shield size={16} />
                        Security Team Response Metrics
                      </DetailTitle>
                      <ChevronDown size={16} />
                    </DetailHeader>
                    <DetailContent expanded={true}>
                      <ThreeColumnGrid>
                        <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>
                            Average Response Time
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>
                            {analytics.stats.averageResponseTime}h
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Time from report delivery to first view</div>
                        </div>
                        <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>
                            Immediate Response Rate
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>68%</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Reports viewed within 1 hour</div>
                        </div>
                        <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>
                            After-Hours Views
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>32%</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Reports viewed outside business hours</div>
                        </div>
                      </ThreeColumnGrid>
                    </DetailContent>
                  </DetailAccordion>
                  <DetailAccordion>
                    <DetailHeader expanded={false}>
                      <DetailTitle>
                        <User size={16} />
                        Top Report Recipients
                      </DetailTitle>
                      <ChevronDown size={16} />
                    </DetailHeader>
                    <DetailContent expanded={false}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.875rem' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Recipient</th>
                              <th style={{ textAlign: 'left', padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                              <th style={{ textAlign: 'left', padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Reports Received</th>
                              <th style={{ textAlign: 'left', padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Open Rate</th>
                              <th style={{ textAlign: 'left', padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Avg. Response Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>John Smith</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Security Manager</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>47</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>96%</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>0.8h</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Sarah Johnson</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Operations Director</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>42</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>88%</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>1.5h</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Michael Chen</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Property Manager</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>38</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>79%</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>3.2h</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Jessica Patel</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Security Supervisor</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>36</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>94%</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>1.1h</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Robert Wilson</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>Facility Manager</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>32</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>81%</td>
                              <td style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>2.6h</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </DetailContent>
                  </DetailAccordion>
                  <DetailAccordion>
                    <DetailHeader expanded={false}>
                      <DetailTitle>
                        <MessageSquare size={16} />
                        Recipient Feedback Analysis
                      </DetailTitle>
                      <ChevronDown size={16} />
                    </DetailHeader>
                    <DetailContent expanded={false}>
                      <TwoColumnGrid>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '8px' }}>Feedback Overview</div>
                          <VerticalSpacing>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Positive Feedback</span>
                              <span style={{ fontWeight: 500 }}>68%</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '8px' }}>
                              <div style={{ backgroundColor: '#10b981', height: '8px', borderRadius: '9999px', width: '68%' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Neutral Feedback</span>
                              <span style={{ fontWeight: 500 }}>22%</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '8px' }}>
                              <div style={{ backgroundColor: '#3b82f6', height: '8px', borderRadius: '9999px', width: '22%' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Negative Feedback</span>
                              <span style={{ fontWeight: 500 }}>10%</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '8px' }}>
                              <div style={{ backgroundColor: '#ef4444', height: '8px', borderRadius: '9999px', width: '10%' }} />
                            </div>
                          </VerticalSpacing>
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '8px' }}>Common Feedback Themes</div>
                          <VerticalSpacing style={{ fontSize: '0.875rem' }}>
                            <BlueRecommendation>
                              "Detailed and well-organized security information"
                            </BlueRecommendation>
                            <BlueRecommendation>
                              "The visualizations help understand security patterns"
                            </BlueRecommendation>
                            <GreenRecommendation>
                              "Would like more incident response recommendations"
                            </GreenRecommendation>
                            <AmberRecommendation>
                              "Too many reports - could be more consolidated"
                            </AmberRecommendation>
                          </VerticalSpacing>
                        </div>
                      </TwoColumnGrid>
                    </DetailContent>
                  </DetailAccordion>
                </VerticalSpacing>
              </Card>
            </>
          ) : (
            <NoDataMessage>No recipient data available</NoDataMessage>
          )}
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery">
          {isLoading ? (
            <ChartCard>
              <SkeletonHeader />
              <SkeletonFull />
            </ChartCard>
          ) : analytics ? (
            <>
              <TwoColumnGrid>
                <ChartCard>
                  <ChartTitle>
                    <Mail size={18} />
                    Delivery Success Rate
                  </ChartTitle>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey={timeRange === '30d' || timeRange === '7d' ? 'day' : 'month'} tick={{ fontSize: 12 }} />
                      <YAxis domain={[70, 100]} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Success Rate']} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="reports"
                        name="Delivery Success Rate"
                        stroke="#10b981"
                        strokeWidth={2}
                        data={chartData.map(item => ({
                          ...item,
                          reports: 95 + Math.floor(Math.random() * 5)
                        }))}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard>
                  <ChartTitle>
                    <Zap size={18} />
                    Delivery Methods Performance
                  </ChartTitle>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { name: 'Open Rate', email: 82, sms: 94, both: 97 },
                        { name: 'Response Time (min)', email: 67, sms: 23, both: 18 },
                        { name: 'Confirmation Rate', email: 42, sms: 75, both: 86 }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="email" name="Email" fill="#0070f3" />
                      <Bar dataKey="sms" name="SMS" fill="#f59e0b" />
                      <Bar dataKey="both" name="Email & SMS" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </TwoColumnGrid>
              <Card style={{ padding: '24px' }}>
                <SectionTitle style={{ marginBottom: '16px' }}>Delivery Insights</SectionTitle>
                <TwoColumnGrid>
                  <div>
                    <h4 style={{ fontWeight: 500, marginBottom: '12px' }}>Delivery Performance</h4>
                    <table style={{ width: '100%', fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Metric</th>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>SMS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Delivery Success</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>98.2%</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>99.5%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Open Rate</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>82.4%</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>94.1%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Avg. Response Time</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>67 min</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>23 min</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Link Click Rate</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>52.8%</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>73.6%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Media View Rate</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>41.2%</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>N/A</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 500, marginBottom: '12px' }}>Delivery Recommendations</h4>
                    <VerticalSpacing>
                      <BlueRecommendation>
                        <div style={{ fontWeight: 500, color: '#3b82f6' }}>Use SMS for time-sensitive reports</div>
                        <div style={{ fontSize: '0.875rem', color: '#3b82f6' }}>SMS notifications have 71% faster response times than email.</div>
                      </BlueRecommendation>
                      <GreenRecommendation>
                        <div style={{ fontWeight: 500, color: '#10b981' }}>Optimal delivery time: 8-9 AM</div>
                        <div style={{ fontSize: '0.875rem', color: '#10b981' }}>Reports sent early morning have the highest engagement rates.</div>
                      </GreenRecommendation>
                      <AmberRecommendation>
                        <div style={{ fontWeight: 500, color: '#f59e0b' }}>Use both delivery methods for critical incidents</div>
                        <div style={{ fontSize: '0.875rem', color: '#f59e0b' }}>Combined delivery has 97% open rate and 86% confirmation rate.</div>
                      </AmberRecommendation>
                      <PurpleRecommendation>
                        <div style={{ fontWeight: 500, color: '#8b5cf6' }}>Follow up on unviewed reports</div>
                        <div style={{ fontSize: '0.875rem', color: '#8b5cf6' }}>15% of email reports remain unviewed after 24 hours.</div>
                      </PurpleRecommendation>
                    </VerticalSpacing>
                  </div>
                </TwoColumnGrid>
              </Card>
            </>
          ) : (
            <NoDataMessage>No delivery data available</NoDataMessage>
          )}
        </TabsContent>
      </Tabs>

      {isLoading && (
        <LoadingOverlay>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #bfdbfe',
                borderTopColor: '#0070f3',
                borderRadius: '50%',
                animation: `${spinAnimation} 1s linear infinite`,
                margin: '0 auto'
              }}
            />
            <div style={{ marginTop: '16px', color: '#6b7280' }}>Loading analytics data...</div>
          </div>
        </LoadingOverlay>
      )}
    </DashboardContainer>
  );
};

export default ReportAnalyticsDashboard;