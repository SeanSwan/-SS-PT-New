import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Target,
} from 'lucide-react';

// Import chart components
import ProgressAreaChart from '../../../FitnessStats/charts/ProgressAreaChart';
import BarProgressChart from '../../../FitnessStats/charts/BarProgressChart';

// Import proper type definitions
import type { ComparisonAnalyticsProps, ComparisonMetric } from './types';

/* ─── Galaxy-Swan Theme Tokens ─── */
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(29,31,43,1)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textSecondary: 'rgba(226,232,240,0.6)',
  accent: '#0ea5e9',
  cyan: '#00ffff',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#FF6B6B',
};

/* ─── Styled Components ─── */

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const GlassPanel = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: ${theme.text};
`;

const Subtitle = styled.p`
  margin: 0 0 24px 0;
  font-size: 0.85rem;
  color: ${theme.textSecondary};
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const FlexCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: center;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, auto);
  }
`;

const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const StyledLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StyledSelect = styled.select`
  appearance: none;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  padding: 10px 36px 10px 12px;
  font-size: 0.875rem;
  min-height: 44px;
  cursor: pointer;
  outline: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23e2e8f0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${theme.accent};
  }

  & option {
    background: #1d1f2b;
    color: ${theme.text};
  }
`;

const SwitchWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-height: 44px;
  font-size: 0.875rem;
  color: ${theme.text};
  user-select: none;
`;

const ToggleTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $checked }) => ($checked ? theme.accent : 'rgba(255,255,255,0.15)')};
  transition: background 0.2s;
  flex-shrink: 0;
`;

const ToggleThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

/* ─── Table Styled Components ─── */

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledThead = styled.thead`
  border-bottom: 1px solid ${theme.border};
`;

const StyledTh = styled.th<{ $align?: string }>`
  padding: 12px 16px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${theme.textSecondary};
  text-align: ${({ $align }) => $align || 'left'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

const StyledTd = styled.td<{ $align?: string }>`
  padding: 14px 16px;
  font-size: 0.875rem;
  color: ${theme.text};
  text-align: ${({ $align }) => $align || 'left'};
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

const MetricName = styled.span`
  font-weight: 500;
  color: ${theme.text};
  display: block;
`;

const MetricCaption = styled.span`
  font-size: 0.75rem;
  color: ${theme.textSecondary};
  display: block;
  margin-top: 2px;
`;

const MetricScore = styled.span<{ $bold?: boolean }>`
  font-weight: ${({ $bold }) => ($bold ? 700 : 400)};
  color: ${({ $bold }) => ($bold ? theme.text : theme.textSecondary)};
  display: block;
`;

const ProgressBarWrapper = styled.div`
  min-width: 80px;
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  margin-top: 6px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 2px;
  transition: width 0.4s ease;
`;

const PercentileChip = styled.span<{ $variant: 'success' | 'warning' | 'error' }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $variant }) =>
    $variant === 'success'
      ? 'rgba(76,175,80,0.15)'
      : $variant === 'warning'
        ? 'rgba(255,193,7,0.15)'
        : 'rgba(255,107,107,0.15)'};
  color: ${({ $variant }) =>
    $variant === 'success'
      ? theme.success
      : $variant === 'warning'
        ? theme.warning
        : theme.error};
`;

const ImprovementText = styled.span<{ $color: string }>`
  font-weight: 500;
  color: ${({ $color }) => $color};
`;

/* ─── Insights Styled Components ─── */

const InsightsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AlertBox = styled.div<{ $severity: 'success' | 'warning' | 'info' | 'error' }>`
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid
    ${({ $severity }) =>
      $severity === 'success'
        ? theme.success
        : $severity === 'warning'
          ? theme.warning
          : $severity === 'error'
            ? theme.error
            : theme.accent};
`;

const AlertTitle = styled.p`
  margin: 0 0 6px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${theme.text};
`;

const AlertBody = styled.p`
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: ${theme.textSecondary};
`;

const AlertRec = styled.p`
  margin: 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: ${theme.text};
`;

/**
 * ComparisonAnalytics Component
 *
 * Advanced comparison analytics for trainers to compare client progress with:
 * - Other clients with similar profiles
 * - Average performance benchmarks
 * - Personal historical performance
 * - Goal targets and milestones
 */
const ComparisonAnalytics: React.FC<ComparisonAnalyticsProps> = ({
  clientId,
  clientData,
  comparisonData
}) => {
  const [comparisonType, setComparisonType] = useState<'clients' | 'average' | 'historical' | 'goals'>('average');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['strength', 'cardio', 'flexibility']);
  const [showPercentiles, setShowPercentiles] = useState(true);
  const [timeframe, setTimeframe] = useState('3months');

  // Generate comparison mock data
  const comparisonAnalytics = useMemo(() => {
    if (!clientData) return null;

    const generateComparisonData = () => {
      switch (comparisonType) {
        case 'average':
          return {
            title: 'vs. Average Performance',
            subtitle: 'Compared to clients with similar profile and goals',
            metrics: [
              {
                name: 'Overall Strength',
                client: 75,
                comparison: 65,
                percentile: 78,
                trend: 'above',
                improvement: '+15%'
              },
              {
                name: 'Cardiovascular Endurance',
                client: 68,
                comparison: 70,
                percentile: 62,
                trend: 'below',
                improvement: '-3%'
              },
              {
                name: 'Flexibility',
                client: 60,
                comparison: 58,
                percentile: 55,
                trend: 'above',
                improvement: '+3%'
              },
              {
                name: 'Core Stability',
                client: 85,
                comparison: 60,
                percentile: 92,
                trend: 'above',
                improvement: '+42%'
              },
              {
                name: 'Balance',
                client: 65,
                comparison: 62,
                percentile: 58,
                trend: 'above',
                improvement: '+5%'
              }
            ],
            insights: [
              {
                type: 'strength',
                title: 'Exceptional Core Development',
                description: 'Client shows significantly above-average core stability, ranking in the 92nd percentile.',
                recommendation: 'Continue current core program and consider advanced progressions.'
              },
              {
                type: 'warning',
                title: 'Cardio Focus Needed',
                description: 'Cardiovascular endurance is slightly below average for similar clients.',
                recommendation: 'Incorporate more aerobic activities and HIIT sessions.'
              },
              {
                type: 'info',
                title: 'Balanced Progress',
                description: 'Overall progress trajectory is positive with room for cardiovascular improvement.',
                recommendation: 'Maintain current strength training, increase cardio frequency.'
              }
            ]
          };

        case 'clients':
          return {
            title: 'vs. Similar Clients',
            subtitle: 'Compared to 12 clients with matching goals and experience level',
            metrics: [
              {
                name: 'Workout Consistency',
                client: 84,
                comparison: 76,
                percentile: 73,
                trend: 'above',
                improvement: '+11%'
              },
              {
                name: 'Progressive Overload',
                client: 78,
                comparison: 72,
                percentile: 68,
                trend: 'above',
                improvement: '+8%'
              },
              {
                name: 'Form Quality',
                client: 82,
                comparison: 79,
                percentile: 65,
                trend: 'above',
                improvement: '+4%'
              },
              {
                name: 'Recovery Rate',
                client: 71,
                comparison: 74,
                percentile: 45,
                trend: 'below',
                improvement: '-4%'
              }
            ],
            insights: [
              {
                type: 'success',
                title: 'Excellent Consistency',
                description: 'Workout attendance and consistency exceeds 73% of similar clients.',
                recommendation: 'Use this as motivation to continue current scheduling approach.'
              },
              {
                type: 'warning',
                title: 'Recovery Attention Needed',
                description: 'Recovery metrics suggest potential overtraining or insufficient rest.',
                recommendation: 'Consider adding rest days or reducing training intensity.'
              }
            ]
          };

        case 'historical':
          return {
            title: 'vs. Personal History',
            subtitle: 'Progress comparison over the past 6 months',
            metrics: [
              {
                name: '3 Months Ago',
                client: 75,
                comparison: 65,
                percentile: null,
                trend: 'above',
                improvement: '+15%'
              },
              {
                name: '6 Months Ago',
                client: 75,
                comparison: 58,
                percentile: null,
                trend: 'above',
                improvement: '+29%'
              },
              {
                name: 'Starting Point',
                client: 75,
                comparison: 45,
                percentile: null,
                trend: 'above',
                improvement: '+67%'
              }
            ],
            insights: [
              {
                type: 'success',
                title: 'Consistent Improvement',
                description: 'Steady progress with 67% overall improvement since starting.',
                recommendation: 'Current program is effective - continue with periodic adjustments.'
              },
              {
                type: 'info',
                title: 'Plateauing Trend',
                description: 'Progress rate has slowed in recent months - normal adaptation response.',
                recommendation: 'Consider program variation or periodization adjustments.'
              }
            ]
          };

        case 'goals':
          return {
            title: 'vs. Target Goals',
            subtitle: 'Progress toward established fitness milestones',
            metrics: [
              {
                name: 'Weight Loss Goal',
                client: 78,
                comparison: 100,
                percentile: null,
                trend: 'approaching',
                improvement: '78% Complete',
                target: 'Lose 15 lbs',
                current: '11.7 lbs lost'
              },
              {
                name: 'Strength Goal',
                client: 85,
                comparison: 100,
                percentile: null,
                trend: 'approaching',
                improvement: '85% Complete',
                target: 'Bench 100kg',
                current: '85kg achieved'
              },
              {
                name: 'Endurance Goal',
                client: 60,
                comparison: 100,
                percentile: null,
                trend: 'in-progress',
                improvement: '60% Complete',
                target: 'Run 5K under 25min',
                current: '27:30 current time'
              }
            ],
            insights: [
              {
                type: 'success',
                title: 'Strength Goal Nearly Achieved',
                description: 'Only 15kg away from bench press goal - excellent progress.',
                recommendation: 'Focus on progressive overload with proper form and recovery.'
              },
              {
                type: 'info',
                title: 'Endurance Requires Focus',
                description: 'Cardiovascular goals need more targeted training approach.',
                recommendation: 'Increase running frequency and incorporate interval training.'
              }
            ]
          };

        default:
          return null;
      }
    };

    return generateComparisonData();
  }, [comparisonType, clientData, timeframe]);

  const renderMetricsComparison = () => {
    if (!comparisonAnalytics) return null;

    return (
      <GlassPanel>
        <FlexRow>
          <ArrowLeftRight color="#00ffff" size={24} />
          <SectionTitle style={{ margin: 0 }}>{comparisonAnalytics.title}</SectionTitle>
        </FlexRow>

        <Subtitle>
          {comparisonAnalytics.subtitle}
        </Subtitle>

        <div style={{ overflowX: 'auto' }}>
          <StyledTable>
            <StyledThead>
              <tr>
                <StyledTh>Metric</StyledTh>
                <StyledTh $align="center">Client Score</StyledTh>
                <StyledTh $align="center">Comparison</StyledTh>
                {showPercentiles && comparisonType === 'average' && (
                  <StyledTh $align="center">Percentile</StyledTh>
                )}
                <StyledTh $align="center">Performance</StyledTh>
                <StyledTh $align="center">Change</StyledTh>
              </tr>
            </StyledThead>
            <tbody>
              {comparisonAnalytics.metrics.map((metric: ComparisonMetric) => (
                <tr key={metric.name}>
                  <StyledTd>
                    <MetricName>
                      {metric.name}
                    </MetricName>
                    {metric.target && (
                      <MetricCaption>
                        Target: {metric.target}
                      </MetricCaption>
                    )}
                    {metric.current && (
                      <MetricCaption>
                        Current: {metric.current}
                      </MetricCaption>
                    )}
                  </StyledTd>

                  <StyledTd $align="center">
                    <ProgressBarWrapper>
                      <MetricScore $bold>
                        {metric.client}
                      </MetricScore>
                      <ProgressBarTrack>
                        <ProgressBarFill $width={metric.client} $color="#00ffff" />
                      </ProgressBarTrack>
                    </ProgressBarWrapper>
                  </StyledTd>

                  <StyledTd $align="center">
                    <ProgressBarWrapper>
                      <MetricScore>
                        {metric.comparison}
                      </MetricScore>
                      <ProgressBarTrack>
                        <ProgressBarFill $width={metric.comparison} $color="rgba(255, 255, 255, 0.3)" />
                      </ProgressBarTrack>
                    </ProgressBarWrapper>
                  </StyledTd>

                  {showPercentiles && comparisonType === 'average' && (
                    <StyledTd $align="center">
                      {metric.percentile && (
                        <PercentileChip
                          $variant={
                            metric.percentile >= 70
                              ? 'success'
                              : metric.percentile >= 50
                                ? 'warning'
                                : 'error'
                          }
                        >
                          {metric.percentile}th
                        </PercentileChip>
                      )}
                    </StyledTd>
                  )}

                  <StyledTd $align="center">
                    <FlexCenter>
                      {metric.trend === 'above' || metric.trend === 'approaching' ? (
                        <TrendingUp size={16} color="#4CAF50" />
                      ) : metric.trend === 'below' ? (
                        <TrendingDown size={16} color="#FF6B6B" />
                      ) : (
                        <Target size={16} color="#FFC107" />
                      )}
                    </FlexCenter>
                  </StyledTd>

                  <StyledTd $align="center">
                    <ImprovementText
                      $color={
                        metric.improvement.startsWith('+') ? '#4CAF50' :
                        metric.improvement.startsWith('-') ? '#FF6B6B' :
                        theme.text
                      }
                    >
                      {metric.improvement}
                    </ImprovementText>
                  </StyledTd>
                </tr>
              ))}
            </tbody>
          </StyledTable>
        </div>
      </GlassPanel>
    );
  };

  const renderInsights = () => {
    if (!comparisonAnalytics?.insights) return null;

    return (
      <GlassPanel>
        <SectionTitle>
          Analytics Insights
        </SectionTitle>

        <InsightsStack>
          {comparisonAnalytics.insights.map((insight: any, index: number) => (
            <AlertBox
              key={index}
              $severity={
                insight.type === 'success' ? 'success' :
                insight.type === 'warning' ? 'warning' :
                'info'
              }
            >
              <AlertTitle>
                {insight.title}
              </AlertTitle>
              <AlertBody>
                {insight.description}
              </AlertBody>
              <AlertRec>
                Recommendation: {insight.recommendation}
              </AlertRec>
            </AlertBox>
          ))}
        </InsightsStack>
      </GlassPanel>
    );
  };

  return (
    <PageWrapper>
      {/* Controls */}
      <GlassPanel>
        <SectionTitle>
          Comparison Analytics
        </SectionTitle>

        <ControlsGrid>
          <FieldWrapper>
            <StyledLabel htmlFor="comparison-type">Comparison Type</StyledLabel>
            <StyledSelect
              id="comparison-type"
              value={comparisonType}
              onChange={(e) => setComparisonType(e.target.value as any)}
            >
              <option value="average">vs. Average</option>
              <option value="clients">vs. Similar Clients</option>
              <option value="historical">vs. Personal History</option>
              <option value="goals">vs. Target Goals</option>
            </StyledSelect>
          </FieldWrapper>

          <FieldWrapper>
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
          </FieldWrapper>

          <SwitchWrapper>
            <HiddenCheckbox
              type="checkbox"
              checked={showPercentiles}
              onChange={(e) => setShowPercentiles(e.target.checked)}
            />
            <ToggleTrack $checked={showPercentiles}>
              <ToggleThumb $checked={showPercentiles} />
            </ToggleTrack>
            Show Percentiles
          </SwitchWrapper>
        </ControlsGrid>
      </GlassPanel>

      {/* Metrics Comparison */}
      {renderMetricsComparison()}

      {/* Insights */}
      {renderInsights()}
    </PageWrapper>
  );
};

export default ComparisonAnalytics;
