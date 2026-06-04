import React, { useEffect, useState } from 'react';

import { useAuth } from '../../../../context/AuthContext';
import { logger } from '@/utils/logger';
import type { ComparisonAnalyticsProps, ComparisonData } from './types';
import {
  DEFAULT_COMPARISON_TYPE,
  type ComparisonType,
} from './ComparisonAnalytics.logic';
import ComparisonAnalyticsView from './ComparisonAnalyticsView';

/**
 * ComparisonAnalytics Component
 *
 * Loads real comparison data for the canonical trainer progress route and
 * delegates rendering to the tokenized comparison analytics view.
 */
const ComparisonAnalytics: React.FC<ComparisonAnalyticsProps> = ({
  clientId,
  clientData,
  comparisonData,
}) => {
  const [comparisonType, setComparisonType] = useState<ComparisonType>(DEFAULT_COMPARISON_TYPE);
  const [showPercentiles, setShowPercentiles] = useState(true);
  const [timeframe, setTimeframe] = useState('3months');
  const [comparisonAnalytics, setComparisonAnalytics] = useState<ComparisonData | null>(comparisonData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const { authAxios } = useAuth();

  useEffect(() => {
    let cancelled = false;

    if (!clientData || !clientId) {
      setComparisonAnalytics(null);
      setErrorText(null);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (comparisonData?.comparisonType === comparisonType) {
      setComparisonAnalytics(comparisonData);
      setErrorText(null);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!authAxios) {
      setComparisonAnalytics(null);
      setErrorText('Comparison analytics require an authenticated dashboard session.');
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    setErrorText(null);

    authAxios.get(`/api/client-progress/${clientId}/comparison`, {
      params: { type: comparisonType, timeframe },
    })
      .then((response) => {
        if (cancelled) return;
        const payload = response.data?.data ?? response.data;
        setComparisonAnalytics(payload && Array.isArray(payload.metrics) ? payload : null);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.warn('[ComparisonAnalytics] Failed to load comparison analytics:', error);
        setComparisonAnalytics(null);
        setErrorText('Comparison analytics are unavailable right now.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authAxios, clientData, clientId, comparisonData, comparisonType, timeframe]);

  return (
    <ComparisonAnalyticsView
      comparisonType={comparisonType}
      showPercentiles={showPercentiles}
      timeframe={timeframe}
      comparisonAnalytics={comparisonAnalytics}
      isLoading={isLoading}
      errorText={errorText}
      onComparisonTypeChange={setComparisonType}
      onShowPercentilesChange={setShowPercentiles}
      onTimeframeChange={setTimeframe}
    />
  );
};

export default ComparisonAnalytics;
