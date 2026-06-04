import React, { useEffect, useState } from 'react';

import { useAuth } from '../../../../context/AuthContext';
import { logger } from '@/utils/logger';
import type { InjuryRiskData } from '../../../../services/enhanced-progress-analytics-service';
import type { InjuryRiskAssessmentProps } from './types';
import { getRiskColor } from './InjuryRiskAssessment.logic';
import InjuryRiskAssessmentView from './InjuryRiskAssessmentView';

/**
 * InjuryRiskAssessment Component
 *
 * Loads trainer-facing injury risk evidence from the canonical progress API,
 * then renders the tokenized NASM risk assessment view.
 */
const InjuryRiskAssessment: React.FC<InjuryRiskAssessmentProps> = ({
  clientId,
  clientData,
  workoutHistory,
}) => {
  const [riskAssessment, setRiskAssessment] = useState<InjuryRiskData | null>(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const { authAxios } = useAuth();

  useEffect(() => {
    let cancelled = false;

    if (!clientData || !clientId || !authAxios) {
      setRiskAssessment(null);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingRisk(true);
    setRiskError(null);

    authAxios.get(`/api/client-progress/${clientId}/risk-assessment`)
      .then((response) => {
        if (cancelled) return;
        const payload = response.data?.data ?? response.data;
        setRiskAssessment(payload && Array.isArray(payload.categories) ? payload : null);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.warn('[InjuryRiskAssessment] Failed to load injury risk assessment:', error);
        setRiskAssessment(null);
        setRiskError('Injury risk assessment is unavailable right now.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRisk(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authAxios, clientData, clientId, workoutHistory.length]);

  return (
    <InjuryRiskAssessmentView
      riskAssessment={riskAssessment}
      isLoadingRisk={isLoadingRisk}
      riskError={riskError}
    />
  );
};

export { getRiskColor };
export default InjuryRiskAssessment;
