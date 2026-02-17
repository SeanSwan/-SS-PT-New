/**
 * AI/ML Monitoring Dashboard Component
 * Comprehensive monitoring of AI models, performance metrics, and intelligent insights
 * PHASE 2B: Converted from mock data to real API integration
 * Migrated from MUI to styled-components + lucide-react (Galaxy-Swan theme)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import styled, { keyframes, css } from 'styled-components';
import {
  Brain,
  Bot,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Wrench,
  Info,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Camera,
  ThumbsUp,
  Eye,
  SlidersHorizontal,
  Download,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  RadarChart,
  Radar as RadarComponent,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  Treemap
} from 'recharts';

// Types
interface AIModel {
  id: string;
  name: string;
  type: 'computer_vision' | 'nlp' | 'recommendation' | 'prediction' | 'analysis';
  status: 'active' | 'training' | 'idle' | 'error' | 'maintenance';
  version: string;
  lastUpdated: string;
  accuracy: number;
  latency: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  requests: number;
  successfulPredictions: number;
  confidence: {
    average: number;
    distribution: { range: string; count: number }[];
  };
  performanceHistory: {
    timestamp: string;
    accuracy: number;
    latency: number;
    throughput: number;
  }[];
  features: string[];
  trainingMetrics: {
    epochs: number;
    learningRate: number;
    batchSize: number;
    validationAccuracy: number;
    trainingLoss: number;
    validationLoss: number;
  };
}

interface AIInsight {
  id: string;
  type: 'recommendation' | 'anomaly' | 'optimization' | 'alert';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  timestamp: string;
  relatedModel: string;
  actionable: boolean;
  suggestedActions: string[];
  data?: any;
}

interface ModelUsageMetric {
  modelId: string;
  feature: string;
  usageCount: number;
  successRate: number;
  averageConfidence: number;
  userSatisfaction: number;
  businessImpact: number;
}

interface AIPerformanceMetric {
  date: string;
  formAnalysisAccuracy: number;
  formAnalysisLatency: number;
  recommendationCTR: number;
  workoutGenerationSuccess: number;
  nutritionAnalysisAccuracy: number;
  sentimentAnalysisAccuracy: number;
  anomalyDetectionPrecision: number;
  totalInferences: number;
  costPerInference: number;
}

interface MCPAgent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  type: string;
  version: string;
  lastSeen: string;
  activeConnections: number;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  capabilities: string[];
  health: {
    score: number;
    issues: string[];
  };
}

// ── Theme tokens ──
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  cyan: '#00ffff',
  green: '#4caf50',
  blue: '#2196f3',
  orange: '#ff9800',
  red: '#f44336',
  purple: '#9c27b0',
  glassBg: 'rgba(255, 255, 255, 0.02)',
  glassHover: 'rgba(255, 255, 255, 0.05)',
  surface: '#0a0a1a',
};

// ── Animations ──
const pulseAnim = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

const spinAnim = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ── Styled Components ──

const PageRoot = styled.div`
  background-color: ${theme.surface};
  min-height: 100vh;
  padding: 24px;
`;

const PageHeader = styled.div`
  margin-bottom: 32px;
`;

const PageTitle = styled.h1`
  color: ${theme.cyan};
  font-weight: 700;
  font-size: 2rem;
  margin: 0 0 4px 0;
`;

const PageSubtitle = styled.h2`
  color: ${theme.textMuted};
  font-weight: 400;
  font-size: 1.15rem;
  margin: 0;
`;

const GlassPanel = styled.div`
  background-color: ${theme.glassBg};
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  &:hover {
    background-color: ${theme.glassHover};
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 255, 255, 0.15);
  }
`;

const CardBody = styled.div`
  padding: 20px;
`;

const ModelCardWrap = styled(GlassPanel)<{ $status: string }>`
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 16px 16px 0 0;
    background: linear-gradient(
      90deg,
      ${({ $status }) =>
        $status === 'active' ? theme.green :
        $status === 'training' ? theme.blue :
        $status === 'error' ? theme.red :
        $status === 'maintenance' ? theme.orange : '#757575'},
      transparent
    );
  }
`;

const StatusDot = styled.span<{ $status: string }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${({ $status }) =>
    ($status === 'active' || $status === 'online') ? theme.green :
    $status === 'training' ? theme.blue :
    ($status === 'error' || $status === 'offline') ? theme.red :
    $status === 'maintenance' ? theme.orange : '#757575'};
  box-shadow: 0 0 8px ${({ $status }) =>
    ($status === 'active' || $status === 'online') ? theme.green :
    $status === 'training' ? theme.blue :
    ($status === 'error' || $status === 'offline') ? theme.red :
    $status === 'maintenance' ? theme.orange : '#757575'};
  ${({ $status }) =>
    ($status === 'active' || $status === 'online') &&
    css`animation: ${pulseAnim} 2s infinite;`}
`;

const MetricCardWrap = styled(GlassPanel)<{ $accentColor?: string }>`
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${({ $accentColor }) => $accentColor || theme.cyan}, transparent);
  }
`;

const GridRow = styled.div<{ $cols?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: ${({ $gap }) => $gap ?? 24}px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GridRow2 = styled.div<{ $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ $gap }) => $gap ?? 16}px;
`;

const GridRow3 = styled.div<{ $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ $gap }) => $gap ?? 16}px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GridRow4 = styled.div<{ $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ $gap }) => $gap ?? 16}px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FlexRow = styled.div<{ $gap?: number; $align?: string; $justify?: string; $wrap?: boolean }>`
  display: flex;
  align-items: ${({ $align }) => $align || 'center'};
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  gap: ${({ $gap }) => $gap ?? 8}px;
  ${({ $wrap }) => $wrap && 'flex-wrap: wrap;'}
`;

const FlexCol = styled.div<{ $gap?: number; $align?: string }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $align }) => $align || 'stretch'};
  gap: ${({ $gap }) => $gap ?? 8}px;
`;

const AvatarCircle = styled.div<{ $bgColor: string; $color: string }>`
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $bgColor }) => $bgColor};
  color: ${({ $color }) => $color};
`;

const SectionTitle = styled.h3`
  color: ${theme.cyan};
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Label = styled.span`
  color: ${theme.textMuted};
  font-size: 0.75rem;
  display: block;
`;

const MetricValue = styled.span<{ $color?: string }>`
  color: ${({ $color }) => $color || theme.text};
  font-size: 1.15rem;
  font-weight: 600;
  display: block;
`;

const BodyText = styled.p<{ $muted?: boolean; $size?: string }>`
  color: ${({ $muted }) => $muted ? theme.textMuted : theme.text};
  font-size: ${({ $size }) => $size || '0.875rem'};
  margin: 0;
  line-height: 1.5;
`;

const SubtitleText = styled.span<{ $bold?: boolean }>`
  color: ${theme.text};
  font-size: 0.875rem;
  font-weight: ${({ $bold }) => $bold ? 600 : 400};
`;

const Chip = styled.span<{ $color?: string; $outlined?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  ${({ $color, $outlined }) => $outlined
    ? css`
        border: 1px solid ${$color || theme.border};
        color: ${$color || theme.text};
        background: transparent;
      `
    : css`
        background-color: ${$color ? `${$color}22` : 'rgba(14,165,233,0.15)'};
        color: ${$color || theme.accent};
        border: 1px solid ${$color ? `${$color}44` : 'rgba(14,165,233,0.3)'};
      `}
`;

const getChipColor = (value: string, map: Record<string, string>) =>
  map[value] || '#757575';

const ActionButton = styled.button<{ $variant?: 'outlined' | 'filled' | 'text'; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: ${({ $small }) => $small ? '6px 12px' : '10px 20px'};
  border-radius: 8px;
  font-size: ${({ $small }) => $small ? '0.8rem' : '0.875rem'};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  min-width: 44px;

  ${({ $variant }) => {
    switch ($variant) {
      case 'filled':
        return css`
          background: linear-gradient(135deg, ${theme.cyan}, #00c8ff);
          color: #0a0a1a;
          border: none;
          &:hover { background: linear-gradient(135deg, #00e6ff, #00b3ff); }
        `;
      case 'text':
        return css`
          background: transparent;
          color: ${theme.text};
          border: none;
          &:hover { background: rgba(255,255,255,0.05); }
        `;
      default: // outlined
        return css`
          background: transparent;
          color: ${theme.cyan};
          border: 1px solid ${theme.border};
          &:hover { background: rgba(14,165,233,0.1); border-color: ${theme.accent}; }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RoundButton = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${theme.textMuted};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: ${theme.text};
  }
`;

const SmallRoundButton = styled.button`
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${theme.textMuted};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: ${theme.text};
  }
`;

// ── Progress Bar ──
const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number; $color: string }>`
  height: 100%;
  width: ${({ $value }) => Math.min(100, Math.max(0, $value))}%;
  background-color: ${({ $color }) => $color};
  border-radius: 4px;
  transition: width 0.4s ease;
`;

const ThinProgressTrack = styled.div`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background-color: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ThinProgressFill = styled.div<{ $value: number; $color: string }>`
  height: 100%;
  width: ${({ $value }) => Math.min(100, Math.max(0, $value))}%;
  background-color: ${({ $color }) => $color};
  border-radius: 2px;
  transition: width 0.4s ease;
`;

// ── Spinner ──
const Spinner = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  border: 3px solid rgba(0, 255, 255, 0.15);
  border-top-color: ${theme.cyan};
  border-radius: 50%;
  animation: ${spinAnim} 0.8s linear infinite;
`;

// ── Tab Bar ──
const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 24px;
  overflow-x: auto;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  background: transparent;
  border: none;
  border-bottom: 3px solid ${({ $active }) => $active ? theme.cyan : 'transparent'};
  color: ${({ $active }) => $active ? theme.cyan : '#a0a0a0'};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  white-space: nowrap;

  &:hover {
    color: ${theme.cyan};
    background: rgba(0, 255, 255, 0.05);
  }
`;

// ── Alert Box ──
const AlertBox = styled.div<{ $severity: 'error' | 'warning' | 'info' | 'success' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 8px;
  margin-bottom: 16px;
  ${({ $severity }) => {
    const colors = {
      error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' },
      warning: { bg: 'rgba(255, 152, 0, 0.1)', border: 'rgba(255, 152, 0, 0.3)', text: '#fbbf24' },
      info: { bg: 'rgba(14, 165, 233, 0.1)', border: 'rgba(14, 165, 233, 0.3)', text: '#38bdf8' },
      success: { bg: 'rgba(76, 175, 80, 0.1)', border: 'rgba(76, 175, 80, 0.3)', text: '#4ade80' },
    };
    const c = colors[$severity];
    return css`
      background-color: ${c.bg};
      border: 1px solid ${c.border};
      color: ${c.text};
    `;
  }}
`;

// ── Select ──
const NativeSelect = styled.select`
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid ${theme.border};
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  color: ${theme.text};
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  min-width: 120px;
  &:focus {
    border-color: ${theme.accent};
  }
`;

// ── Switch ──
const SwitchLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.75rem;
  color: ${theme.textMuted};
  min-height: 44px;
`;

const SwitchTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background-color: ${({ $checked }) => $checked ? theme.accent : 'rgba(255,255,255,0.2)'};
  transition: background-color 0.2s ease;
`;

const SwitchThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => $checked ? '18px' : '2px'};
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: white;
  transition: left 0.2s ease;
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

// ── Table ──
const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledTHead = styled.thead`
  & th {
    padding: 12px 16px;
    text-align: left;
    color: ${theme.textMuted};
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const StyledTBody = styled.tbody`
  & tr {
    cursor: pointer;
    transition: background-color 0.15s ease;
    &:hover {
      background-color: rgba(255, 255, 255, 0.03);
    }
  }
  & td {
    padding: 12px 16px;
    color: ${theme.text};
    font-size: 0.875rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    vertical-align: middle;
  }
`;

// ── Dialog / Modal ──
const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

const DialogPanel = styled.div`
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 16px;
  max-width: 720px;
  width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  backdrop-filter: blur(20px);
`;

const DialogHeader = styled.div`
  padding: 20px 24px 12px;
  color: ${theme.cyan};
  font-size: 1.25rem;
  font-weight: 600;
`;

const DialogBody = styled.div`
  padding: 0 24px 20px;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 16px 0;
`;

// ── Insight Paper ──
const InsightPaper = styled.div<{ $borderColor: string }>`
  width: 100%;
  padding: 16px;
  background-color: ${theme.glassBg};
  border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: ${theme.glassHover};
  }
`;

// ── Floating Action (FAB) ──
const FABContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 900;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
`;

const FABMain = styled.button`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, ${theme.cyan}, #00c8ff);
  color: #0a0a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
  transition: all 0.2s ease;
  &:hover {
    background: linear-gradient(135deg, #00e6ff, #00b3ff);
    transform: scale(1.08);
  }
`;

const FABAction = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid ${theme.border};
  color: ${theme.text};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(14, 165, 233, 0.2);
    border-color: ${theme.accent};
  }
`;

const ChecklistItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  color: ${theme.text};
  font-size: 0.875rem;
  list-style: none;
`;

const EmptyStateWrap = styled.div`
  text-align: center;
  padding: 32px 0;
`;

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const TwoEqualGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

// ── Component ──

const AIMonitoringPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState(true);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [expandedModels, setExpandedModels] = useState<string[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  // Real API state management (following UserAnalyticsPanel pattern)
  const [mcpHealthData, setMcpHealthData] = useState<any>(null);
  const [loading, setLoading] = useState({
    overview: false,
    models: false,
    insights: false,
    performance: false
  });
  const [errors, setErrors] = useState({
    overview: null as string | null,
    models: null as string | null,
    insights: null as string | null,
    performance: null as string | null
  });

  // API call functions
  const fetchMCPHealthData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, overview: true }));
      setErrors(prev => ({ ...prev, overview: null }));

      const response = await authAxios.get('/api/admin/mcp/health');

      if (response.data.success) {
        setMcpHealthData(response.data.data);
        console.log('✅ Real MCP health data loaded successfully');
      } else {
        throw new Error(response.data.message || 'Failed to load MCP health data');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load MCP health data';
      setErrors(prev => ({ ...prev, overview: errorMessage }));
      console.error('❌ Failed to load real MCP health data:', errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  }, [authAxios]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    console.log('🔄 Refreshing all AI monitoring data...');
    await fetchMCPHealthData();
    console.log('✅ All AI monitoring data refreshed');
  }, [fetchMCPHealthData]);

  // Initial data load
  useEffect(() => {
    fetchMCPHealthData();
  }, [fetchMCPHealthData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!isRealTime) return;

    const interval = setInterval(() => {
      refreshAllData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isRealTime, refreshAllData]);

  // Helper function to check if data is loading
  const isLoadingData = (dataType: keyof typeof loading) => loading[dataType];
  const hasError = (dataType: keyof typeof errors) => !!errors[dataType];

  // Helper component for loading states
  const LoadingSpinner = ({ message = 'Loading data...' }: { message?: string }) => (
    <FlexCol $align="center" $gap={16} style={{ padding: '32px 0' }}>
      <Spinner />
      <BodyText $muted $size="0.875rem">{message}</BodyText>
    </FlexCol>
  );

  // Helper component for error states
  const ErrorMessage = ({ error, onRetry, dataType }: { error: string; onRetry: () => void; dataType: string }) => (
    <AlertBox $severity="error">
      <div style={{ flex: 1 }}>
        Failed to load {dataType}: {error}
      </div>
      <ActionButton $variant="text" $small onClick={onRetry}>
        <RefreshCw size={14} />
        Retry
      </ActionButton>
    </AlertBox>
  );

  // Transform real API data to component format
  const mcpAgents: MCPAgent[] = useMemo(() => {
    if (!mcpHealthData?.agents) {
      return [];
    }

    return mcpHealthData.agents.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      type: agent.type || 'Unknown',
      version: agent.version || '1.0.0',
      lastSeen: agent.lastSeen || new Date().toISOString(),
      activeConnections: agent.metrics?.activeConnections || 0,
      totalRequests: agent.metrics?.totalRequests || 0,
      successRate: agent.metrics?.successRate || 0,
      averageResponseTime: agent.metrics?.averageResponseTime || 0,
      capabilities: agent.capabilities || [],
      health: {
        score: agent.health?.score || 0,
        issues: agent.health?.issues || []
      }
    }));
  }, [mcpHealthData]);

  const aiModels: AIModel[] = useMemo(() => {
    if (!mcpHealthData?.models) {
      return [];
    }

    return mcpHealthData.models.map((model: any) => ({
      id: model.id,
      name: model.name,
      type: model.type,
      status: model.status,
      version: model.version || '1.0.0',
      lastUpdated: model.lastUpdated || new Date().toISOString(),
      accuracy: model.metrics?.accuracy || 0,
      latency: model.metrics?.latency || 0,
      throughput: model.metrics?.throughput || 0,
      errorRate: model.metrics?.errorRate || 0,
      memoryUsage: model.metrics?.memoryUsage || 0,
      cpuUsage: model.metrics?.cpuUsage || 0,
      requests: model.metrics?.requests || 0,
      successfulPredictions: model.metrics?.successfulPredictions || 0,
      confidence: {
        average: model.confidence?.average || 0,
        distribution: model.confidence?.distribution || []
      },
      performanceHistory: model.performanceHistory || [],
      features: model.features || [],
      trainingMetrics: {
        epochs: model.trainingMetrics?.epochs || 0,
        learningRate: model.trainingMetrics?.learningRate || 0,
        batchSize: model.trainingMetrics?.batchSize || 0,
        validationAccuracy: model.trainingMetrics?.validationAccuracy || 0,
        trainingLoss: model.trainingMetrics?.trainingLoss || 0,
        validationLoss: model.trainingMetrics?.validationLoss || 0
      }
    }));
  }, [mcpHealthData]);

  const aiInsights: AIInsight[] = useMemo(() => {
    if (!mcpHealthData?.insights) {
      return [];
    }

    return mcpHealthData.insights.map((insight: any) => ({
      id: insight.id,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      impact: insight.impact,
      confidence: insight.confidence || 0,
      timestamp: insight.timestamp,
      relatedModel: insight.relatedModel || 'Unknown',
      actionable: insight.actionable || false,
      suggestedActions: insight.suggestedActions || [],
      data: insight.data
    }));
  }, [mcpHealthData]);

  const performanceMetrics: AIPerformanceMetric[] = useMemo(() => {
    if (!mcpHealthData?.performanceHistory) {
      return [];
    }

    return mcpHealthData.performanceHistory.map((metric: any) => ({
      date: metric.date,
      formAnalysisAccuracy: metric.formAnalysisAccuracy || 0,
      formAnalysisLatency: metric.formAnalysisLatency || 0,
      recommendationCTR: metric.recommendationCTR || 0,
      workoutGenerationSuccess: metric.workoutGenerationSuccess || 0,
      nutritionAnalysisAccuracy: metric.nutritionAnalysisAccuracy || 0,
      sentimentAnalysisAccuracy: metric.sentimentAnalysisAccuracy || 0,
      anomalyDetectionPrecision: metric.anomalyDetectionPrecision || 0,
      totalInferences: metric.totalInferences || 0,
      costPerInference: metric.costPerInference || 0
    }));
  }, [mcpHealthData]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'online': return theme.green;
      case 'training': return theme.blue;
      case 'error': case 'offline': return theme.red;
      case 'maintenance': case 'idle': return theme.orange;
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': case 'online': return <CheckCircle2 size={18} />;
      case 'training': return <GraduationCap size={18} />;
      case 'error': case 'offline': return <XCircle size={18} />;
      case 'maintenance': case 'idle': return <Wrench size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'computer_vision': return <Camera size={20} />;
      case 'nlp': return <Brain size={20} />;
      case 'recommendation': return <ThumbsUp size={20} />;
      case 'prediction': return <TrendingUp size={20} />;
      case 'analysis': return <BarChart3 size={20} />;
      default: return <Bot size={20} />;
    }
  };

  const toggleModelExpansion = useCallback((modelId: string) => {
    setExpandedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  }, []);

  const handleInsightClick = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setAlertDialogOpen(true);
  };

  const impactColorMap: Record<string, string> = {
    high: theme.red,
    medium: theme.orange,
    low: theme.green,
  };

  const statusChipColorMap: Record<string, string> = {
    active: theme.green,
    online: theme.green,
    training: theme.blue,
    error: theme.red,
    offline: theme.red,
    maintenance: theme.orange,
    idle: theme.orange,
  };

  const renderOverviewTab = () => {
    // Show loading state if overview data is loading
    if (isLoadingData('overview')) {
      return <LoadingSpinner message="Loading AI monitoring overview..." />;
    }

    return (
      <div>
        {/* Error State */}
        {hasError('overview') && (
          <ErrorMessage
            error={errors.overview!}
            onRetry={fetchMCPHealthData}
            dataType="AI monitoring data"
          />
        )}

        {/* MCP Agents Overview */}
        <SectionTitle>MCP Agents Status</SectionTitle>
        <GridRow3 $gap={16} style={{ marginBottom: 24 }}>
          {mcpAgents.map((agent) => (
            <ModelCardWrap $status={agent.status} key={agent.id}>
              <CardBody>
                <FlexRow $justify="space-between" $align="flex-start" style={{ marginBottom: 16 }}>
                  <FlexRow $gap={12}>
                    <AvatarCircle
                      $bgColor={`${getStatusColor(agent.status)}20`}
                      $color={getStatusColor(agent.status)}
                    >
                      <Bot size={20} />
                    </AvatarCircle>
                    <div>
                      <SubtitleText $bold style={{ fontSize: '1.05rem', display: 'block' }}>
                        {agent.name}
                      </SubtitleText>
                      <Label>{agent.type} &bull; v{agent.version}</Label>
                    </div>
                  </FlexRow>
                  <FlexRow $gap={8}>
                    <StatusDot $status={agent.status} />
                    <Chip $color={statusChipColorMap[agent.status]}>
                      {agent.status}
                    </Chip>
                  </FlexRow>
                </FlexRow>

                <GridRow2 $gap={12} style={{ marginBottom: 16 }}>
                  <div>
                    <Label>Connections</Label>
                    <MetricValue $color={theme.green}>{agent.activeConnections}</MetricValue>
                  </div>
                  <div>
                    <Label>Success Rate</Label>
                    <MetricValue $color={theme.blue}>{agent.successRate}%</MetricValue>
                  </div>
                  <div>
                    <Label>Requests</Label>
                    <MetricValue $color={theme.orange}>{agent.totalRequests}</MetricValue>
                  </div>
                  <div>
                    <Label>Response Time</Label>
                    <MetricValue $color={theme.purple}>{agent.averageResponseTime}ms</MetricValue>
                  </div>
                </GridRow2>

                <div style={{ marginBottom: 12 }}>
                  <SubtitleText $bold style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem' }}>
                    Health Score
                  </SubtitleText>
                  <FlexRow $gap={8}>
                    <ProgressBarTrack style={{ flex: 1 }}>
                      <ProgressBarFill
                        $value={agent.health.score}
                        $color={
                          agent.health.score > 95 ? theme.green :
                          agent.health.score > 80 ? theme.orange : theme.red
                        }
                      />
                    </ProgressBarTrack>
                    <SubtitleText $bold>{agent.health.score}%</SubtitleText>
                  </FlexRow>
                </div>

                <Label>
                  Last seen: {new Date(agent.lastSeen).toLocaleString()}
                </Label>
              </CardBody>
            </ModelCardWrap>
          ))}
        </GridRow3>

        {/* AI Models Performance + AI Insights */}
        <TwoColGrid>
          {/* AI Models Performance */}
          <GlassPanel>
            <CardBody>
              <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 24 }}>
                <SectionTitle style={{ margin: 0 }}>
                  <BarChart3 size={20} />
                  AI Models Performance
                </SectionTitle>
                <FlexRow $gap={12}>
                  <NativeSelect
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                  </NativeSelect>
                  <SwitchLabel>
                    <HiddenCheckbox
                      type="checkbox"
                      checked={isRealTime}
                      onChange={(e) => setIsRealTime(e.target.checked)}
                    />
                    <SwitchTrack $checked={isRealTime}>
                      <SwitchThumb $checked={isRealTime} />
                    </SwitchTrack>
                    Real-time
                  </SwitchLabel>
                </FlexRow>
              </FlexRow>

              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="date" stroke="#e0e0e0" />
                    <YAxis yAxisId="left" stroke="#e0e0e0" />
                    <YAxis yAxisId="right" orientation="right" stroke="#e0e0e0" />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: '#1d1f2b',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: 8
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="formAnalysisAccuracy"
                      fill="url(#accuracyGradient)"
                      stroke={theme.green}
                      strokeWidth={2}
                      name="Form Analysis Accuracy (%)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="formAnalysisLatency"
                      stroke={theme.orange}
                      strokeWidth={3}
                      name="Latency (ms)"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="recommendationCTR"
                      stroke={theme.blue}
                      strokeWidth={2}
                      name="Recommendation CTR (%)"
                    />
                    <defs>
                      <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.green} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={theme.green} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </GlassPanel>

          {/* AI Insights */}
          <GlassPanel>
            <CardBody>
              <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 16 }}>
                <SectionTitle style={{ margin: 0 }}>
                  <Lightbulb size={20} />
                  AI Insights
                </SectionTitle>
                <RoundButton title="Download insights">
                  <Download size={18} />
                </RoundButton>
              </FlexRow>

              <FlexCol $gap={8}>
                {aiInsights.slice(0, 5).map((insight) => (
                  <InsightPaper
                    key={insight.id}
                    $borderColor={impactColorMap[insight.impact] || theme.green}
                    onClick={() => handleInsightClick(insight)}
                  >
                    <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 8 }}>
                      <SubtitleText $bold>{insight.title}</SubtitleText>
                      <Chip $color={impactColorMap[insight.impact]}>
                        {insight.impact}
                      </Chip>
                    </FlexRow>
                    <BodyText $muted style={{ marginBottom: 8 }}>
                      {insight.description}
                    </BodyText>
                    <FlexRow $justify="space-between">
                      <Label>{insight.relatedModel}</Label>
                      <Label>{insight.confidence}% confidence</Label>
                    </FlexRow>
                  </InsightPaper>
                ))}
              </FlexCol>

              {aiInsights.length === 0 && (
                <EmptyStateWrap>
                  <Brain size={64} color={theme.green} style={{ marginBottom: 16 }} />
                  <MetricValue $color={theme.green} style={{ marginBottom: 8 }}>
                    All AI Systems Optimal
                  </MetricValue>
                  <BodyText $muted>
                    No insights or recommendations at this time
                  </BodyText>
                </EmptyStateWrap>
              )}
            </CardBody>
          </GlassPanel>
        </TwoColGrid>
      </div>
    );
  };

  const renderModelsTab = () => (
    <div>
      <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 24 }}>
        <SectionTitle style={{ margin: 0 }}>AI Models Status</SectionTitle>
        <ActionButton onClick={refreshAllData}>
          <RefreshCw size={16} />
          Refresh Models
        </ActionButton>
      </FlexRow>

      <TwoEqualGrid>
        {aiModels.map((model) => (
          <ModelCardWrap $status={model.status} key={model.id}>
            <CardBody>
              <FlexRow $justify="space-between" $align="flex-start" style={{ marginBottom: 16 }}>
                <FlexRow $gap={12}>
                  <AvatarCircle
                    $bgColor={`${getStatusColor(model.status)}20`}
                    $color={getStatusColor(model.status)}
                  >
                    {getModelTypeIcon(model.type)}
                  </AvatarCircle>
                  <div>
                    <SubtitleText $bold style={{ fontSize: '1.05rem', display: 'block' }}>
                      {model.name}
                    </SubtitleText>
                    <Label>{model.type} &bull; v{model.version}</Label>
                  </div>
                </FlexRow>
                <FlexRow $gap={8}>
                  <StatusDot $status={model.status} />
                  <Chip $color={statusChipColorMap[model.status]}>
                    {model.status}
                  </Chip>
                </FlexRow>
              </FlexRow>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div>
                  <Label>Accuracy</Label>
                  <MetricValue $color={theme.green}>{model.accuracy}%</MetricValue>
                </div>
                <div>
                  <Label>Latency</Label>
                  <MetricValue $color={theme.orange}>{model.latency}ms</MetricValue>
                </div>
                <div>
                  <Label>Requests</Label>
                  <MetricValue $color={theme.blue}>{model.requests}</MetricValue>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <SubtitleText $bold style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem' }}>
                  Resource Usage
                </SubtitleText>
                <div style={{ marginBottom: 8 }}>
                  <FlexRow $justify="space-between">
                    <Label>CPU</Label>
                    <Label>{model.cpuUsage}%</Label>
                  </FlexRow>
                  <ThinProgressTrack>
                    <ThinProgressFill
                      $value={model.cpuUsage}
                      $color={model.cpuUsage > 80 ? theme.red : model.cpuUsage > 60 ? theme.orange : theme.green}
                    />
                  </ThinProgressTrack>
                </div>
                <div>
                  <FlexRow $justify="space-between">
                    <Label>Memory</Label>
                    <Label>{model.memoryUsage}%</Label>
                  </FlexRow>
                  <ThinProgressTrack>
                    <ThinProgressFill $value={model.memoryUsage} $color={theme.blue} />
                  </ThinProgressTrack>
                </div>
              </div>

              <FlexRow $gap={8}>
                <ActionButton $small $variant="text">
                  <Eye size={14} />
                  Details
                </ActionButton>
                <ActionButton $small $variant="text">
                  <SlidersHorizontal size={14} />
                  Configure
                </ActionButton>
                <ActionButton $small $variant="text">
                  <GraduationCap size={14} />
                  Retrain
                </ActionButton>
              </FlexRow>
            </CardBody>
          </ModelCardWrap>
        ))}
      </TwoEqualGrid>
    </div>
  );

  const renderInsightsTab = () => (
    <div>
      <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 24 }}>
        <SectionTitle style={{ margin: 0 }}>AI Insights &amp; Recommendations</SectionTitle>
        <ActionButton>
          <Download size={16} />
          Export Insights
        </ActionButton>
      </FlexRow>

      <GlassPanel>
        <CardBody>
          <div style={{ overflowX: 'auto' }}>
            <StyledTable>
              <StyledTHead>
                <tr>
                  <th>Insight</th>
                  <th>Type</th>
                  <th>Impact</th>
                  <th>Confidence</th>
                  <th>Model</th>
                  <th>Actions</th>
                </tr>
              </StyledTHead>
              <StyledTBody>
                {aiInsights.map((insight) => (
                  <tr key={insight.id} onClick={() => handleInsightClick(insight)}>
                    <td>
                      <div>
                        <SubtitleText $bold style={{ display: 'block', marginBottom: 4 }}>
                          {insight.title}
                        </SubtitleText>
                        <BodyText $muted>{insight.description}</BodyText>
                      </div>
                    </td>
                    <td>
                      <Chip $outlined $color={theme.textMuted}>
                        {insight.type}
                      </Chip>
                    </td>
                    <td>
                      <Chip $color={impactColorMap[insight.impact]}>
                        {insight.impact}
                      </Chip>
                    </td>
                    <td>
                      <BodyText>{insight.confidence}%</BodyText>
                    </td>
                    <td>
                      <BodyText style={{ fontFamily: 'monospace' }}>
                        {insight.relatedModel}
                      </BodyText>
                    </td>
                    <td>
                      <FlexRow $gap={4}>
                        <SmallRoundButton title="View details">
                          <Info size={16} />
                        </SmallRoundButton>
                        {insight.actionable && (
                          <SmallRoundButton title="Take action">
                            <ExternalLink size={16} />
                          </SmallRoundButton>
                        )}
                      </FlexRow>
                    </td>
                  </tr>
                ))}
              </StyledTBody>
            </StyledTable>
          </div>
        </CardBody>
      </GlassPanel>
    </div>
  );

  const renderPerformanceTab = () => (
    <div>
      <SectionTitle>AI Performance Analytics</SectionTitle>

      <TwoEqualGrid>
        <GlassPanel>
          <CardBody>
            <SectionTitle>Model Accuracy Trends</SectionTitle>

            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="date" stroke="#e0e0e0" />
                  <YAxis stroke="#e0e0e0" />
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: '#1d1f2b',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: 8
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="formAnalysisAccuracy"
                    stroke={theme.green}
                    strokeWidth={2}
                    name="Form Analysis"
                  />
                  <Line
                    type="monotone"
                    dataKey="nutritionAnalysisAccuracy"
                    stroke={theme.blue}
                    strokeWidth={2}
                    name="Nutrition Analysis"
                  />
                  <Line
                    type="monotone"
                    dataKey="sentimentAnalysisAccuracy"
                    stroke={theme.orange}
                    strokeWidth={2}
                    name="Sentiment Analysis"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </GlassPanel>

        <GlassPanel>
          <CardBody>
            <SectionTitle>Inference Volume &amp; Cost</SectionTitle>

            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="date" stroke="#e0e0e0" />
                  <YAxis yAxisId="left" stroke="#e0e0e0" />
                  <YAxis yAxisId="right" orientation="right" stroke="#e0e0e0" />
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: '#1d1f2b',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: 8
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="totalInferences"
                    fill={theme.green}
                    name="Total Inferences"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="costPerInference"
                    stroke={theme.red}
                    strokeWidth={3}
                    name="Cost per Inference ($)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </GlassPanel>
      </TwoEqualGrid>
    </div>
  );

  // Loading and error states
  if (isLoadingData('overview') && !mcpHealthData) {
    return (
      <PageRoot style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FlexCol $align="center" $gap={16}>
          <Spinner $size={60} />
          <SectionTitle>Loading AI Monitoring Data...</SectionTitle>
        </FlexCol>
      </PageRoot>
    );
  }

  if (hasError('overview') && !mcpHealthData) {
    return (
      <PageRoot>
        <AlertBox $severity="error">
          <div style={{ flex: 1 }}>
            <MetricValue style={{ marginBottom: 4 }}>Failed to Load AI Monitoring Data</MetricValue>
            <BodyText>{errors.overview}</BodyText>
          </div>
          <ActionButton $small onClick={fetchMCPHealthData} disabled={isLoadingData('overview')}>
            {isLoadingData('overview') ? <Spinner $size={16} /> : 'Retry'}
          </ActionButton>
        </AlertBox>
      </PageRoot>
    );
  }

  const tabPanels = [
    renderOverviewTab(),
    renderModelsTab(),
    renderInsightsTab(),
    renderPerformanceTab()
  ];

  return (
    <PageRoot>
      <PageHeader>
        <PageTitle>AI Monitoring Dashboard</PageTitle>
        <PageSubtitle>
          Comprehensive monitoring of AI models, performance metrics, and intelligent insights
        </PageSubtitle>
      </PageHeader>

      <TabBar>
        <TabButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
          <Brain size={18} />
          Overview
        </TabButton>
        <TabButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
          <Bot size={18} />
          AI Models
        </TabButton>
        <TabButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
          <Lightbulb size={18} />
          Insights
        </TabButton>
        <TabButton $active={activeTab === 3} onClick={() => setActiveTab(3)}>
          <BarChart3 size={18} />
          Performance
        </TabButton>
      </TabBar>

      <div>
        {tabPanels[activeTab]}
      </div>

      {/* Insight Details Dialog */}
      <Overlay $open={alertDialogOpen} onClick={() => setAlertDialogOpen(false)}>
        <DialogPanel onClick={(e) => e.stopPropagation()}>
          <DialogHeader>AI Insight Details</DialogHeader>
          <DialogBody>
            {selectedInsight && (
              <div>
                <MetricValue style={{ marginBottom: 8, fontSize: '1.15rem' }}>
                  {selectedInsight.title}
                </MetricValue>
                <BodyText $muted style={{ marginBottom: 16 }}>
                  {selectedInsight.description}
                </BodyText>

                <FlexRow $gap={8} style={{ marginBottom: 16 }}>
                  <Chip $outlined $color={theme.textMuted}>
                    {selectedInsight.type}
                  </Chip>
                  <Chip $color={impactColorMap[selectedInsight.impact]}>
                    {selectedInsight.impact}
                  </Chip>
                </FlexRow>

                <Divider />

                <SubtitleText $bold style={{ display: 'block', marginBottom: 8 }}>
                  Related Information
                </SubtitleText>
                <BodyText $muted style={{ marginBottom: 4 }}>
                  Model: {selectedInsight.relatedModel}
                </BodyText>
                <BodyText $muted style={{ marginBottom: 4 }}>
                  Confidence: {selectedInsight.confidence}%
                </BodyText>
                <BodyText $muted style={{ marginBottom: 4 }}>
                  Time: {new Date(selectedInsight.timestamp).toLocaleString()}
                </BodyText>

                <Divider />

                <SubtitleText $bold style={{ display: 'block', marginBottom: 8 }}>
                  Suggested Actions
                </SubtitleText>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {selectedInsight.suggestedActions.map((action, index) => (
                    <ChecklistItem key={index}>
                      <CheckCircle2 size={16} color={theme.green} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{action}</span>
                    </ChecklistItem>
                  ))}
                </ul>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <ActionButton $variant="text" onClick={() => setAlertDialogOpen(false)}>
              Close
            </ActionButton>
            {selectedInsight?.actionable && (
              <ActionButton $variant="filled">Take Action</ActionButton>
            )}
          </DialogFooter>
        </DialogPanel>
      </Overlay>

      {/* Floating Action Button */}
      <FABContainer>
        {fabOpen && (
          <>
            <FABAction
              title="Export AI Data"
              onClick={() => {
                console.log('📁 Export AI data functionality to be implemented');
                setFabOpen(false);
              }}
            >
              <Download size={18} />
            </FABAction>
            <FABAction
              title="Retrain Models"
              onClick={() => {
                console.log('🧠 Model retraining functionality to be implemented');
                setFabOpen(false);
              }}
            >
              <GraduationCap size={18} />
            </FABAction>
            <FABAction
              title="Refresh Data"
              onClick={() => {
                refreshAllData();
                setFabOpen(false);
              }}
            >
              <RefreshCw size={18} />
            </FABAction>
          </>
        )}
        <FABMain
          aria-label="AI Actions"
          onClick={() => setFabOpen(prev => !prev)}
        >
          {fabOpen ? <XCircle size={24} /> : <Brain size={24} />}
        </FABMain>
      </FABContainer>
    </PageRoot>
  );
};

export default AIMonitoringPanel;
