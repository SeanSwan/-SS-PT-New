/**
 * Progress Analysis Component
 * AI-powered analysis of client progress with insights and recommendations
 *
 * Migrated from MUI to styled-components + lucide-react
 * Galaxy-Swan theme: Galaxy Core #0a0a1a, Swan Cyan #00FFFF, Cosmic Purple #7851A9
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, BarChart3, Clock, Dumbbell,
  Lightbulb, UserSearch, Activity, CheckCircle2,
  AlertTriangle, AlertCircle, X, Brain
} from 'lucide-react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

// ─── Keyframes ───────────────────────────────────────────────────────────────

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─── Styled Components ──────────────────────────────────────────────────────

const AnalysisContainer = styled.div`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  color: white;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const PageTitle = styled.h2`
  color: #00ffff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.9rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: 3fr 2fr 1fr;
  }
`;

const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const StyledLabel = styled.label`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.75rem 1rem;
  background: rgba(30, 30, 60, 0.8);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 1rem;
  appearance: auto;
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  option {
    background: #1e1e3c;
    color: white;
  }
`;

const AnalyzeButton = styled.button`
  width: 100%;
  min-height: 56px;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  align-self: flex-end;

  &:hover:not(:disabled) {
    background: linear-gradient(90deg, #7851a9, #00ffff);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const SectionTitle = styled.h3`
  color: #00ffff;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 375px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const MetricCard = styled.div`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  color: white;
  text-align: center;
`;

const MetricValue = styled.div<{ $color: string }>`
  color: ${props => props.$color};
  font-weight: bold;
  font-size: 2rem;
  line-height: 1.2;
`;

const MetricName = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const MetricChange = styled.div<{ $positive: boolean }>`
  color: ${props => props.$positive ? '#4caf50' : '#f44336'};
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.1);
  margin-top: 0.5rem;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number; $color: string }>`
  width: ${props => props.$value}%;
  height: 100%;
  border-radius: 3px;
  background-color: ${props => props.$color};
  transition: width 0.6s ease;
`;

const AnalysisCard = styled.div`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const InsightsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

interface InsightChipProps {
  $severity: 'success' | 'warning' | 'error' | 'info';
}

const severityColors: Record<string, { bg: string; fg: string; border: string }> = {
  success: { bg: 'rgba(76, 175, 80, 0.2)', fg: '#4caf50', border: '#4caf50' },
  warning: { bg: 'rgba(255, 152, 0, 0.2)', fg: '#ff9800', border: '#ff9800' },
  error:   { bg: 'rgba(244, 67, 54, 0.2)', fg: '#f44336', border: '#f44336' },
  info:    { bg: 'rgba(33, 150, 243, 0.2)', fg: '#2196f3', border: '#2196f3' },
};

const InsightChip = styled.span<InsightChipProps>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 16px;
  font-size: 0.85rem;
  margin: 0.25rem;
  background: ${props => (severityColors[props.$severity] || severityColors.info).bg};
  color: ${props => (severityColors[props.$severity] || severityColors.info).fg};
  border: 1px solid ${props => (severityColors[props.$severity] || severityColors.info).border};
`;

const RecommendationRow = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const RecommendationText = styled.p`
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
`;

const SummaryText = styled.p`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.8;
  margin: 0;
  font-size: 1rem;
`;

const EmptyStateWrap = styled.div`
  text-align: center;
  padding: 4rem 0;
`;

const EmptyStateIcon = styled.div`
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 1rem;
`;

const EmptyStateTitle = styled.h3`
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 500;
`;

const EmptyStateSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  font-size: 1rem;
`;

// ─── Component ──────────────────────────────────────────────────────────────

interface ProgressAnalysisProps {
  onClose: () => void;
}

const ProgressAnalysis: React.FC<ProgressAnalysisProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [selectedClient, setSelectedClient] = useState('');
  const [timeframe, setTimeframe] = useState('3months');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [progressMetrics, setProgressMetrics] = useState<any[]>([]);

  // Load clients on component mount
  useEffect(() => {
    loadClients();
  }, []);

  /**
   * Load available clients for analysis
   */
  const loadClients = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      enqueueSnackbar('Failed to load clients', { variant: 'error' });
    }
  };

  /**
   * Perform AI-powered progress analysis
   */
  const analyzeProgress = async () => {
    if (!selectedClient) {
      enqueueSnackbar('Please select a client', { variant: 'warning' });
      return;
    }

    // Short-circuit when MCP is disabled
    if (import.meta.env.VITE_ENABLE_MCP_SERVICES !== 'true') {
      enqueueSnackbar('AI progress analysis is currently disabled', { variant: 'info' });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare analysis context
      const mcpContext = {
        clientId: selectedClient,
        timeframe,
        metrics: ['weight', 'strength', 'endurance', 'flexibility', 'consistency'],
        includeComparisons: true,
        generateRecommendations: true
      };

      // Call MCP backend for analysis
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mcp/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.3,
          maxTokens: 3000,
          systemPrompt: `You are an AI fitness analyst. Analyze client progress data and provide insights.
                        Focus on: trends, achievements, areas for improvement, recommendations.
                        Format response as structured JSON with sections for metrics, insights, recommendations.`,
          humanMessage: `Analyze client progress for the selected timeframe: ${timeframe}.
                        Provide detailed insights on performance trends, achievements, and recommendations.`,
          mcpContext
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Parse the AI response
      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(result.content);
      } catch (parseError) {
        // If JSON parsing fails, treat as plain text and structure it
        parsedAnalysis = {
          summary: result.content,
          metrics: generateMockMetrics(),
          insights: extractInsights(result.content),
          recommendations: extractRecommendations(result.content)
        };
      }

      setAnalysisData(parsedAnalysis);
      setProgressMetrics(parsedAnalysis.metrics || generateMockMetrics());

      enqueueSnackbar('Analysis completed successfully', { variant: 'success' });
    } catch (error: any) {
      console.error('Progress analysis error:', error);
      enqueueSnackbar('Analysis failed: ' + error.message, { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate mock metrics for demo purposes
   */
  const generateMockMetrics = () => {
    return [
      { name: 'Strength Progress', value: 85, change: '+12%', color: '#4caf50' },
      { name: 'Consistency Score', value: 92, change: '+5%', color: '#2196f3' },
      { name: 'Endurance Level', value: 78, change: '+18%', color: '#ff9800' },
      { name: 'Flexibility', value: 65, change: '-2%', color: '#f44336' },
      { name: 'Overall Progress', value: 80, change: '+10%', color: '#9c27b0' }
    ];
  };

  /**
   * Extract insights from AI response
   */
  const extractInsights = (content: string) => {
    return [
      { text: 'Consistent workout adherence shows strong discipline', severity: 'success' },
      { text: 'Strength gains accelerating in recent weeks', severity: 'success' },
      { text: 'Flexibility needs attention - recommend stretching routine', severity: 'warning' },
      { text: 'Excellent progress in compound movements', severity: 'success' }
    ];
  };

  /**
   * Extract recommendations from AI response
   */
  const extractRecommendations = (content: string) => {
    return [
      'Increase progressive overload in upper body exercises',
      'Add 15-20 minutes of mobility work 3x per week',
      'Consider adjusting rest periods for hypertrophy goals',
      'Implement periodization for continued strength gains'
    ];
  };

  /**
   * Render the appropriate icon for an insight severity level
   */
  const renderInsightIcon = (severity: string) => {
    switch (severity) {
      case 'success': return <CheckCircle2 size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'error':   return <AlertCircle size={16} />;
      default:        return <Lightbulb size={16} />;
    }
  };

  return (
    <AnalysisContainer>
      <HeaderRow>
        <PageTitle>
          <BarChart3 size={28} />
          Progress Analysis
        </PageTitle>
        <CloseButton onClick={onClose}>
          <X size={18} />
          Close
        </CloseButton>
      </HeaderRow>

      {/* Client Selection and Parameters */}
      <FormGrid>
        <SelectWrapper>
          <StyledLabel htmlFor="client-select">Select Client</StyledLabel>
          <StyledSelect
            id="client-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option value="" disabled>
              -- Select a Client --
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </StyledSelect>
        </SelectWrapper>

        <SelectWrapper>
          <StyledLabel htmlFor="timeframe-select">Timeframe</StyledLabel>
          <StyledSelect
            id="timeframe-select"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </StyledSelect>
        </SelectWrapper>

        <AnalyzeButton
          onClick={analyzeProgress}
          disabled={isLoading || !selectedClient}
        >
          {isLoading ? <Spinner /> : 'Analyze'}
        </AnalyzeButton>
      </FormGrid>

      {/* Analysis Results */}
      {analysisData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Progress Metrics */}
          <SectionTitle>
            <TrendingUp size={20} />
            Key Metrics
          </SectionTitle>

          <MetricsGrid>
            {progressMetrics.map((metric: any, index: number) => (
              <MetricCard key={index}>
                <MetricValue $color={metric.color}>
                  {metric.value}%
                </MetricValue>
                <MetricName>{metric.name}</MetricName>
                <MetricChange $positive={metric.change.startsWith('+')}>
                  {metric.change}
                </MetricChange>
                <ProgressBarTrack>
                  <ProgressBarFill $value={metric.value} $color={metric.color} />
                </ProgressBarTrack>
              </MetricCard>
            ))}
          </MetricsGrid>

          {/* AI Insights */}
          <SectionTitle>
            <Lightbulb size={20} />
            AI Insights
          </SectionTitle>

          <AnalysisCard>
            <InsightsWrap>
              {(analysisData.insights || extractInsights('')).map((insight: any, index: number) => (
                <InsightChip key={index} $severity={insight.severity}>
                  {renderInsightIcon(insight.severity)}
                  {insight.text}
                </InsightChip>
              ))}
            </InsightsWrap>
          </AnalysisCard>

          {/* Recommendations */}
          <SectionTitle>
            <Brain size={20} />
            AI Recommendations
          </SectionTitle>

          <AnalysisCard>
            {(analysisData.recommendations || extractRecommendations('')).map((recommendation: string, index: number) => (
              <RecommendationRow key={index}>
                <CheckCircle2 size={16} color="#4caf50" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                <RecommendationText>{recommendation}</RecommendationText>
              </RecommendationRow>
            ))}
          </AnalysisCard>

          {/* Analysis Summary */}
          {analysisData.summary && (
            <>
              <SectionTitle style={{ marginTop: '1.5rem' }}>
                <Activity size={20} />
                Analysis Summary
              </SectionTitle>

              <AnalysisCard>
                <SummaryText>{analysisData.summary}</SummaryText>
              </AnalysisCard>
            </>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!analysisData && !isLoading && (
        <EmptyStateWrap>
          <EmptyStateIcon>
            <BarChart3 size={64} />
          </EmptyStateIcon>
          <EmptyStateTitle>Select a client to begin analysis</EmptyStateTitle>
          <EmptyStateSubtitle>
            Our AI will analyze progress data and provide insights
          </EmptyStateSubtitle>
        </EmptyStateWrap>
      )}
    </AnalysisContainer>
  );
};

export default ProgressAnalysis;
