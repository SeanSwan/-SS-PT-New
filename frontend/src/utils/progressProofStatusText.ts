/**
 * progressProofStatusText
 * =======================
 *
 * Shared dashboard copy helper for the 12-chart workout progress proof
 * contract used by client, trainer, and admin progress surfaces.
 */

const TOTAL_PROGRESS_CHARTS = 12;

const toChartCount = (value: number): number => (
  Number.isFinite(value) ? Math.max(0, Math.min(Math.round(value), TOTAL_PROGRESS_CHARTS)) : 0
);

type ProgressProofStatus = 'unavailable' | 'empty' | 'full' | 'building';

const getProgressProofStatus = (
  populated: number,
  unavailable: number,
): ProgressProofStatus => {
  if (unavailable > 0) return 'unavailable';
  if (populated === 0) return 'empty';
  if (populated === TOTAL_PROGRESS_CHARTS) return 'full';
  return 'building';
};

const statusTextByProofStatus: Record<
  ProgressProofStatus,
  (populated: number, unavailable: number) => string
> = {
  unavailable: (populated, unavailable) => {
    const feedLabel = unavailable === 1 ? 'feed' : 'feeds';
    return [
      `${populated} of ${TOTAL_PROGRESS_CHARTS} charts populated`,
      `${unavailable} ${feedLabel} unavailable`,
    ].join(' - ');
  },
  empty: () => 'No saved workout proof yet - log a workout to populate charts',
  full: () => `Full progress proof ready - ${TOTAL_PROGRESS_CHARTS} charts populated`,
  building: (populated) => (
    `Progress proof building - ${populated} of ${TOTAL_PROGRESS_CHARTS} charts populated`
  ),
};

export const getProgressProofStatusText = (
  nonEmptyChartCount: number,
  unavailableChartCount = 0,
): string => {
  const populated = toChartCount(nonEmptyChartCount);
  const unavailable = toChartCount(unavailableChartCount);
  const status = getProgressProofStatus(populated, unavailable);
  return statusTextByProofStatus[status](populated, unavailable);
};
