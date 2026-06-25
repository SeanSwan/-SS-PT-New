/**
 * COMPONENT: ClientObservatoryProgressCube
 * PURPOSE: Main client overview placement for the reusable 3D progress cube.
 */

import React from 'react';
import { useClientProgressCharts } from '../../../../../hooks/analytics/useClientProgressCharts';
import ProgressChartCube from '../../../progress/ProgressChartCube';

const ClientObservatoryProgressCube: React.FC = () => {
  const {
    charts,
    isLoading,
    error,
    nonEmptyChartCount,
    unavailableChartCount,
  } = useClientProgressCharts();

  if (isLoading && nonEmptyChartCount === 0) return null;
  if (error) return null;

  return (
    <ProgressChartCube
      charts={charts}
      nonEmptyChartCount={nonEmptyChartCount}
      unavailableChartCount={unavailableChartCount}
    />
  );
};

export default React.memo(ClientObservatoryProgressCube);
