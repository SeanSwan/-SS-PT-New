/**
 * PerformanceReportsPanel.tsx
 * ===========================
 * 
 * Enterprise Performance Analytics & Reporting Dashboard
 * Comprehensive performance reports, trend analysis, and KPI monitoring for operational excellence
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Real-time performance metrics and KPI dashboard
 * - Advanced trend analysis with predictive insights
 * - Custom report generation and scheduling
 * - Multi-dimensional data visualization
 * - Export capabilities (PDF, CSV, Excel)
 * - Performance benchmarking against industry standards
 * - Automated alert system for metric thresholds
 * - Interactive data drilling and filtering
 * 
 * Master Prompt Alignment:
 * - Enterprise-grade business intelligence
 * - 7-star data visualization excellence
 * - Professional reporting infrastructure
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import DemoDataBanner from './DemoDataBanner';
import {
  FileText,
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react';

// === STYLED COMPONENTS ===
const ReportsContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(248, 250, 252, 1) 100%);
`;

const ReportsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(59, 130, 246, 0.2);
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .header-icon {
    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
    border-radius: 12px;
    padding: 0.75rem;
    color: white;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 2px solid ${props => props.$variant === 'primary' ? '#3b82f6' : '#e5e7eb'};
  background: ${props => props.$variant === 'primary' ? '#3b82f6' : 'white'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#64748b'};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$variant === 'primary' ? '#2563eb' : '#f8fafc'};
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const KPICard = styled(motion.div)<{ $trend: 'up' | 'down' | 'stable' }>`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => {
    switch (props.$trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      case 'stable': return '#f59e0b';
      default: return '#3b82f6';
    }
  }};
  
  .kpi-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  
  .kpi-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  .kpi-trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: ${props => {
      switch (props.$trend) {
        case 'up': return '#10b981';
        case 'down': return '#ef4444';
        case 'stable': return '#f59e0b';
        default: return '#64748b';
      }
    }};
  }
  
  .kpi-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 0.5rem;
  }
  
  .kpi-label {
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }
  
  .kpi-description {
    font-size: 0.8rem;
    color: #9ca3af;
    line-height: 1.4;
  }
`;

const ChartsSection = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(motion.div)`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .chart-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e40af;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .chart-filters {
    display: flex;
    gap: 0.5rem;
  }
`;

const FilterChip = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid ${props => props.$active ? '#3b82f6' : '#e5e7eb'};
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f8fafc'};
    border-color: #3b82f6;
  }
`;

const ChartPlaceholder = styled.div`
  height: 300px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(248, 250, 252, 1) 100%);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(59, 130, 246, 0.2);
  color: #64748b;
  gap: 1rem;
  
  .chart-icon {
    width: 60px;
    height: 60px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
  }
`;

const ReportsTable = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const TableHeader = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TableContent = styled.div`
  .table-row {
    display: grid;
    grid-template-columns: 1fr 120px 120px 120px 80px;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    align-items: center;
    transition: all 0.3s ease;
    
    &:hover {
      background: #f8fafc;
    }
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .table-header {
    display: grid;
    grid-template-columns: 1fr 120px 120px 120px 80px;
    padding: 1rem 1.5rem;
    border-bottom: 2px solid #e5e7eb;
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const StatusBadge = styled.span<{ $status: 'active' | 'completed' | 'scheduled' | 'failed' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'active': return 'rgba(16, 185, 129, 0.1)';
      case 'completed': return 'rgba(59, 130, 246, 0.1)';
      case 'scheduled': return 'rgba(245, 158, 11, 0.1)';
      case 'failed': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return '#047857';
      case 'completed': return '#1e40af';
      case 'scheduled': return '#d97706';
      case 'failed': return '#dc2626';
      default: return '#374151';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
`;

// === MOCK DATA ===
const mockKPIs = [
  {
    id: 1,
    label: 'Monthly Revenue',
    value: '$47,829',
    trend: 'up' as const,
    change: '+12.5%',
    description: 'Revenue growth vs last month',
    icon: DollarSign
  },
  {
    id: 2,
    label: 'Active Users',
    value: '2,847',
    trend: 'up' as const,
    change: '+8.2%',
    description: 'Daily active user increase',
    icon: Users
  },
  {
    id: 3,
    label: 'Session Completion',
    value: '94.3%',
    trend: 'stable' as const,
    change: '+0.1%',
    description: 'Training session completion rate',
    icon: Target
  },
  {
    id: 4,
    label: 'Platform Uptime',
    value: '99.97%',
    trend: 'up' as const,
    change: '+0.02%',
    description: 'System availability this month',
    icon: Activity
  }
];

const mockReports = [
  {
    id: 1,
    name: 'Monthly Business Performance',
    type: 'Business Intelligence',
    lastRun: '2 hours ago',
    status: 'completed' as const,
    size: '2.4 MB'
  },
  {
    id: 2,
    name: 'User Engagement Analytics',
    type: 'User Analytics',
    lastRun: '6 hours ago',
    status: 'completed' as const,
    size: '1.8 MB'
  },
  {
    id: 3,
    name: 'Revenue Trend Analysis',
    type: 'Financial',
    lastRun: 'Running...',
    status: 'active' as const,
    size: 'Generating...'
  },
  {
    id: 4,
    name: 'Weekly Trainer Performance',
    type: 'Performance',
    lastRun: 'Scheduled for tomorrow',
    status: 'scheduled' as const,
    size: 'N/A'
  }
];

// === MAIN COMPONENT ===
const PerformanceReportsPanel: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const timeframeOptions = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: '1y', label: '1 Year' }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const handleExport = (format: string) => {
    console.log(`Exporting report in ${format} format`);
  };

  const handleDownloadReport = (reportId: number) => {
    console.log(`Downloading report ${reportId}`);
  };

  return (
    <ReportsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <ReportsHeader>
        <HeaderTitle>
          <div className="header-icon">
            <FileText size={24} />
          </div>
          Performance Analytics Hub
        </HeaderTitle>
        
        <HeaderActions>
          <ActionButton
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </ActionButton>
          
          <ActionButton
            $variant="primary"
            onClick={() => handleExport('pdf')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            Export Report
          </ActionButton>
        </HeaderActions>
      </ReportsHeader>

      <DemoDataBanner noApi />

      {/* KPI Dashboard */}
      <KPIGrid>
        {mockKPIs.map((kpi) => {
          const IconComponent = kpi.icon;
          return (
            <KPICard
              key={kpi.id}
              $trend={kpi.trend}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div className="kpi-header">
                <div className="kpi-icon">
                  <IconComponent size={20} />
                </div>
                <div className="kpi-trend">
                  {kpi.trend === 'up' ? <TrendingUp size={16} /> : 
                   kpi.trend === 'down' ? <TrendingDown size={16} /> : 
                   <Activity size={16} />}
                  {kpi.change}
                </div>
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-description">{kpi.description}</div>
            </KPICard>
          );
        })}
      </KPIGrid>

      {/* Charts Section */}
      <ChartsSection>
        <ChartCard
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="chart-header">
            <div className="chart-title">
              <LineChart size={20} />
              Revenue Trend Analysis
            </div>
            <div className="chart-filters">
              {timeframeOptions.map((option) => (
                <FilterChip
                  key={option.id}
                  $active={activeTimeframe === option.id}
                  onClick={() => setActiveTimeframe(option.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
          </div>
          
          <ChartPlaceholder>
            <div className="chart-icon">
              <LineChart size={30} />
            </div>
            <div>Interactive revenue trend chart would render here</div>
            <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              Real-time data visualization with drill-down capabilities
            </div>
          </ChartPlaceholder>
        </ChartCard>

        <ChartCard
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="chart-header">
            <div className="chart-title">
              <PieChart size={20} />
              User Engagement
            </div>
          </div>
          
          <ChartPlaceholder style={{ height: '240px' }}>
            <div className="chart-icon">
              <PieChart size={30} />
            </div>
            <div>User engagement breakdown</div>
            <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              Sessions, workouts, social interactions
            </div>
          </ChartPlaceholder>
        </ChartCard>
      </ChartsSection>

      {/* Reports Table */}
      <ReportsTable>
        <TableHeader>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
            Generated Reports
          </h2>
          
          <ActionButton
            onClick={() => console.log('Generate new report')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileText size={16} />
            New Report
          </ActionButton>
        </TableHeader>

        <TableContent>
          <div className="table-header">
            <div>Report Name</div>
            <div>Type</div>
            <div>Last Run</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          
          {mockReports.map((report) => (
            <motion.div
              key={report.id}
              className="table-row"
              whileHover={{ backgroundColor: '#f8fafc' }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <div style={{ fontWeight: '500', color: '#1e40af', marginBottom: '0.25rem' }}>
                  {report.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Size: {report.size}
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                {report.type}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                {report.lastRun}
              </div>
              <div>
                <StatusBadge $status={report.status}>
                  {report.status === 'active' && <Activity size={12} style={{ marginRight: '0.25rem' }} />}
                  {report.status === 'completed' && <CheckCircle size={12} style={{ marginRight: '0.25rem' }} />}
                  {report.status === 'scheduled' && <Clock size={12} style={{ marginRight: '0.25rem' }} />}
                  {report.status === 'failed' && <AlertCircle size={12} style={{ marginRight: '0.25rem' }} />}
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </StatusBadge>
              </div>
              <div>
                {report.status === 'completed' && (
                  <ActionButton
                    onClick={() => handleDownloadReport(report.id)}
                    style={{ padding: '0.5rem', minHeight: 'auto' }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Download size={14} />
                  </ActionButton>
                )}
              </div>
            </motion.div>
          ))}
        </TableContent>
      </ReportsTable>
    </ReportsContainer>
  );
};

export default PerformanceReportsPanel;
