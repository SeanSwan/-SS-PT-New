import React from 'react';
import {
  ArrowLeftRight,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import type { ComparisonData, ComparisonMetric } from './types';
import {
  AlertBody,
  AlertBox,
  AlertRec,
  AlertTitle,
  ControlsGrid,
  FieldWrapper,
  FlexCenter,
  FlexRow,
  GlassPanel,
  HiddenCheckbox,
  ImprovementText,
  InsightsStack,
  MetricCaption,
  MetricName,
  MetricScore,
  PageWrapper,
  PercentileChip,
  ProgressBarFill,
  ProgressBarTrack,
  ProgressBarWrapper,
  SectionTitle,
  StatePanel,
  StateText,
  StyledLabel,
  StyledSelect,
  StyledTable,
  StyledTd,
  StyledTh,
  StyledThead,
  Subtitle,
  SwitchWrapper,
  ToggleThumb,
  ToggleTrack,
} from './ComparisonAnalytics.styles';
import {
  clampProgressWidth,
  comparisonInsightKey,
  comparisonTypeOptions,
  getImprovementTone,
  getInsightSeverity,
  getPercentileVariant,
  getTrendTone,
  isComparisonType,
  timeframeOptions,
  type ComparisonType,
} from './ComparisonAnalytics.logic';

interface ComparisonAnalyticsViewProps {
  comparisonType: ComparisonType;
  showPercentiles: boolean;
  timeframe: string;
  comparisonAnalytics: ComparisonData | null;
  isLoading: boolean;
  errorText: string | null;
  onComparisonTypeChange: (value: ComparisonType) => void;
  onShowPercentilesChange: (value: boolean) => void;
  onTimeframeChange: (value: string) => void;
}

const renderTrendIcon = (metric: ComparisonMetric) => {
  const color = getTrendTone(metric.trend);
  if (metric.trend === 'above' || metric.trend === 'approaching') return <TrendingUp size={16} color={color} />;
  if (metric.trend === 'below') return <TrendingDown size={16} color={color} />;
  return <Target size={16} color={color} />;
};

const MetricsComparison: React.FC<Pick<
  ComparisonAnalyticsViewProps,
  'comparisonAnalytics' | 'comparisonType' | 'errorText' | 'isLoading' | 'showPercentiles'
>> = ({
  comparisonAnalytics,
  comparisonType,
  errorText,
  isLoading,
  showPercentiles,
}) => {
  if (isLoading) {
    return (
      <StatePanel>
        <SectionTitle>Loading comparison analytics</SectionTitle>
        <StateText>Reading real client progress records for this comparison.</StateText>
      </StatePanel>
    );
  }

  if (errorText) {
    return (
      <StatePanel>
        <SectionTitle>Comparison unavailable</SectionTitle>
        <StateText>{errorText}</StateText>
      </StatePanel>
    );
  }

  if (!comparisonAnalytics || comparisonAnalytics.metrics.length === 0) {
    return (
      <StatePanel>
        <SectionTitle>{comparisonAnalytics?.title || 'No comparison data yet'}</SectionTitle>
        <StateText>
          {comparisonAnalytics?.subtitle || 'No real benchmark data was returned for this client yet.'}
        </StateText>
      </StatePanel>
    );
  }

  return (
    <GlassPanel>
      <FlexRow>
        <ArrowLeftRight color="var(--accent-primary, #60C0F0)" size={24} />
        <SectionTitle style={{ margin: 0 }}>{comparisonAnalytics.title}</SectionTitle>
      </FlexRow>
      <Subtitle>{comparisonAnalytics.subtitle}</Subtitle>

      <div style={{ overflowX: 'auto' }}>
        <StyledTable>
          <StyledThead>
            <tr>
              <StyledTh>Metric</StyledTh>
              <StyledTh $align="center">Client Score</StyledTh>
              <StyledTh $align="center">Comparison</StyledTh>
              {showPercentiles && comparisonType === 'average' && <StyledTh $align="center">Percentile</StyledTh>}
              <StyledTh $align="center">Performance</StyledTh>
              <StyledTh $align="center">Change</StyledTh>
            </tr>
          </StyledThead>
          <tbody>
            {comparisonAnalytics.metrics.map((metric) => (
              <tr key={metric.name}>
                <StyledTd>
                  <MetricName>{metric.name}</MetricName>
                  {metric.target && <MetricCaption>Target: {metric.target}</MetricCaption>}
                  {metric.current && <MetricCaption>Current: {metric.current}</MetricCaption>}
                </StyledTd>
                <StyledTd $align="center">
                  <ProgressBarWrapper>
                    <MetricScore $bold>{metric.client}</MetricScore>
                    <ProgressBarTrack>
                      <ProgressBarFill $width={clampProgressWidth(metric.client)} $color="var(--accent-primary, #60C0F0)" />
                    </ProgressBarTrack>
                  </ProgressBarWrapper>
                </StyledTd>
                <StyledTd $align="center">
                  <ProgressBarWrapper>
                    <MetricScore>{metric.comparison}</MetricScore>
                    <ProgressBarTrack>
                      <ProgressBarFill $width={clampProgressWidth(metric.comparison)} $color="var(--surface-strong, rgba(255, 255, 255, 0.3))" />
                    </ProgressBarTrack>
                  </ProgressBarWrapper>
                </StyledTd>
                {showPercentiles && comparisonType === 'average' && (
                  <StyledTd $align="center">
                    {metric.percentile !== undefined && metric.percentile !== null && (
                      <PercentileChip $variant={getPercentileVariant(metric.percentile)}>
                        {metric.percentile}th
                      </PercentileChip>
                    )}
                  </StyledTd>
                )}
                <StyledTd $align="center"><FlexCenter>{renderTrendIcon(metric)}</FlexCenter></StyledTd>
                <StyledTd $align="center">
                  <ImprovementText $color={getImprovementTone(metric.improvement)}>
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

const InsightsPanel: React.FC<Pick<ComparisonAnalyticsViewProps, 'comparisonAnalytics' | 'errorText' | 'isLoading'>> = ({
  comparisonAnalytics,
  errorText,
  isLoading,
}) => {
  if (isLoading || errorText || !comparisonAnalytics?.insights?.length) return null;

  return (
    <GlassPanel>
      <SectionTitle>Analytics Insights</SectionTitle>
      <InsightsStack>
        {comparisonAnalytics.insights.map((insight) => (
          <AlertBox key={comparisonInsightKey(insight)} $severity={getInsightSeverity(insight.type)}>
            <AlertTitle>{insight.title}</AlertTitle>
            <AlertBody>{insight.description}</AlertBody>
            <AlertRec>Recommendation: {insight.recommendation}</AlertRec>
          </AlertBox>
        ))}
      </InsightsStack>
    </GlassPanel>
  );
};

const ComparisonAnalyticsView: React.FC<ComparisonAnalyticsViewProps> = ({
  comparisonType,
  showPercentiles,
  timeframe,
  comparisonAnalytics,
  isLoading,
  errorText,
  onComparisonTypeChange,
  onShowPercentilesChange,
  onTimeframeChange,
}) => (
  <PageWrapper>
    <GlassPanel>
      <SectionTitle>Comparison Analytics</SectionTitle>
      <ControlsGrid>
        <FieldWrapper>
          <StyledLabel htmlFor="comparison-type">Comparison Type</StyledLabel>
          <StyledSelect
            id="comparison-type"
            value={comparisonType}
            onChange={(event) => {
              if (isComparisonType(event.target.value)) onComparisonTypeChange(event.target.value);
            }}
          >
            {comparisonTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </StyledSelect>
        </FieldWrapper>
        <FieldWrapper>
          <StyledLabel htmlFor="timeframe-select">Timeframe</StyledLabel>
          <StyledSelect
            id="timeframe-select"
            value={timeframe}
            onChange={(event) => onTimeframeChange(event.target.value)}
          >
            {timeframeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </StyledSelect>
        </FieldWrapper>
        <SwitchWrapper>
          <HiddenCheckbox
            type="checkbox"
            checked={showPercentiles}
            onChange={(event) => onShowPercentilesChange(event.target.checked)}
          />
          <ToggleTrack $checked={showPercentiles}>
            <ToggleThumb $checked={showPercentiles} />
          </ToggleTrack>
          Show Percentiles
        </SwitchWrapper>
      </ControlsGrid>
    </GlassPanel>
    <MetricsComparison
      comparisonAnalytics={comparisonAnalytics}
      comparisonType={comparisonType}
      errorText={errorText}
      isLoading={isLoading}
      showPercentiles={showPercentiles}
    />
    <InsightsPanel comparisonAnalytics={comparisonAnalytics} errorText={errorText} isLoading={isLoading} />
  </PageWrapper>
);

export default ComparisonAnalyticsView;
