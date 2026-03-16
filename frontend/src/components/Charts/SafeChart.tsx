/**
 * SafeChart — Isolated Error Boundary + Suspense Wrapper
 * =======================================================
 * AI Village Phase 2 consensus: each chart gets its own ErrorBoundary
 * + Suspense so one failure doesn't crash the entire dashboard grid.
 */
import React, { Component, Suspense } from 'react';
import styled from 'styled-components';
import { CHART_COLORS, hexAlpha, ChartCard } from './chartTheme';

// ── Error Boundary ──
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class ChartErrorBoundary extends Component<
  { chartName: string; children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorCard role="alert">
          <ErrorIcon aria-hidden="true">⚠</ErrorIcon>
          <ErrorTitle>The data stream has fractured.</ErrorTitle>
          <ErrorSubtext>
            {this.props.chartName} could not render. Please refresh the telemetry.
          </ErrorSubtext>
          <RetryButton onClick={() => this.setState({ hasError: false, error: null })}>
            Restore Connection
          </RetryButton>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <ErrorDetails>{this.state.error.message}</ErrorDetails>
          )}
        </ErrorCard>
      );
    }
    return this.props.children;
  }
}

// ── Skeleton Loader ──
const ChartSkeleton: React.FC = () => (
  <SkeletonCard aria-label="Loading chart…">
    <SkeletonBar style={{ width: '60%', height: 14 }} />
    <SkeletonBar style={{ width: '40%', height: 10, marginTop: 6 }} />
    <SkeletonBody />
  </SkeletonCard>
);

// ── SafeChart Wrapper ──
interface SafeChartProps {
  chartName: string;
  children: React.ReactNode;
}

export const SafeChart: React.FC<SafeChartProps> = ({ chartName, children }) => (
  <ChartErrorBoundary chartName={chartName}>
    <Suspense fallback={<ChartSkeleton />}>
      {children}
    </Suspense>
  </ChartErrorBoundary>
);

export default SafeChart;

// ── Styled Components ──

const ErrorCard = styled(ChartCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
`;

const ErrorIcon = styled.span`
  font-size: 2rem;
`;

const ErrorTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: ${CHART_COLORS.frostWhite};
  margin: 0;
`;

const ErrorSubtext = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: ${CHART_COLORS.textSecondary};
  margin: 0;
`;

const RetryButton = styled.button`
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid ${CHART_COLORS.wingPurple};
  background: ${hexAlpha(CHART_COLORS.wingPurple, 0.2)};
  color: ${CHART_COLORS.frostWhite};
  cursor: pointer;
  min-height: 44px;
  transition: background 0.2s ease;

  &:hover {
    background: ${hexAlpha(CHART_COLORS.wingPurple, 0.4)};
  }

  &:focus-visible {
    outline: 2px solid ${CHART_COLORS.wingPurple};
    outline-offset: 2px;
  }
`;

const ErrorDetails = styled.pre`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: ${CHART_COLORS.errorRed};
  background: ${hexAlpha(CHART_COLORS.midnightSapphire, 0.5)};
  padding: 8px 12px;
  border-radius: 6px;
  max-width: 100%;
  overflow-x: auto;
  margin: 4px 0 0;
`;

const SkeletonCard = styled(ChartCard)`
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
`;

const pulseKeyframes = `
  @keyframes skeletonPulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
`;

const SkeletonBar = styled.div`
  background: ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  border-radius: 4px;
  animation: skeletonPulse 1.5s ease-in-out infinite;
  ${pulseKeyframes}
`;

const SkeletonBody = styled.div`
  flex: 1;
  margin-top: 16px;
  background: ${hexAlpha(CHART_COLORS.iceWing, 0.08)};
  border-radius: 8px;
  animation: skeletonPulse 1.5s ease-in-out infinite;
  ${pulseKeyframes}
`;
