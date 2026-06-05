/**
 * CopilotModeTabs
 *
 * Purpose: Pure tab navigation for switching between single-workout and
 * long-horizon AI planning modes inside the workout copilot.
 */

import React from 'react';
import { TabBar, TabButton } from './copilot-local-styles';

export type CopilotModeTab = 'single' | 'long-horizon';

interface CopilotModeTabsProps {
  activeTab: CopilotModeTab;
  onSelectSingle: () => void;
  onSelectLongHorizon: () => void;
}

const CopilotModeTabs: React.FC<CopilotModeTabsProps> = ({
  activeTab,
  onSelectSingle,
  onSelectLongHorizon,
}) => (
  <TabBar role="tablist" aria-label="Workout copilot mode">
    <TabButton
      type="button"
      role="tab"
      aria-selected={activeTab === 'single'}
      $active={activeTab === 'single'}
      onClick={onSelectSingle}
    >
      Single Workout
    </TabButton>
    <TabButton
      type="button"
      role="tab"
      aria-selected={activeTab === 'long-horizon'}
      $active={activeTab === 'long-horizon'}
      onClick={onSelectLongHorizon}
    >
      Long-Horizon
    </TabButton>
  </TabBar>
);

export default React.memo(CopilotModeTabs);
