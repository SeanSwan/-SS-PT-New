/**
 * COMPONENT: ChartWeekDrillTrigger
 * OWNER: Client Dashboard / Progress (Slice 9 — weekly drill-down)
 * PURPOSE: Shared 44px "View week" trigger + dialog state for the weekly
 *          charts (Workout Frequency, Weekly Training Volume). Extracted so
 *          both card files stay under the 300-line cap.
 * NOTE: `openLabel` lets a card ALSO open the dialog from its own chart
 *       events (e.g. tapping a frequency bar) through this single instance.
 */

import React, { useEffect, useState } from 'react';
import WorkoutDayDrilldown from './WorkoutDayDrilldown';
import {
  DrillTriggerButton,
  DrillTriggerRow,
} from './CanonicalProgressChartsGrid.styles';

const ChartWeekDrillTrigger: React.FC<{
  latestWeekLabel: string | null;
  openLabel?: string | null;
  onDialogClose?: () => void;
}> = ({ latestWeekLabel, openLabel = null, onDialogClose }) => {
  const [drillMd, setDrillMd] = useState<string | null>(null);

  useEffect(() => {
    if (openLabel) setDrillMd(openLabel);
  }, [openLabel]);

  const close = () => {
    setDrillMd(null);
    onDialogClose?.();
  };

  if (!latestWeekLabel && !drillMd) return null;

  return (
    <>
      {latestWeekLabel && (
        <DrillTriggerRow>
          <DrillTriggerButton
            type="button"
            onClick={() => setDrillMd(latestWeekLabel)}
            aria-label={`View week of ${latestWeekLabel}`}
          >
            View week - {latestWeekLabel}
          </DrillTriggerButton>
        </DrillTriggerRow>
      )}
      {drillMd && <WorkoutDayDrilldown md={drillMd} mode="week" onClose={close} />}
    </>
  );
};

export default ChartWeekDrillTrigger;
