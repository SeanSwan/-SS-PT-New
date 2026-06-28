/**
 * FILE: DashboardBackgroundStudio.tsx
 * PURPOSE: Shared themeable dashboard background surface and settings panel.
 * PARENT: Admin, trainer, and client dashboard home routes.
 */

import React from 'react';
import { ChevronDown, Palette } from 'lucide-react';
import brandLogo from '../../../assets/Logo.png';
import UserDashboardBackgroundControls from '../../UserDashboard/backgrounds/UserDashboardBackgroundControls';
import useUserDashboardBackgroundPreference from '../../UserDashboard/backgrounds/useUserDashboardBackgroundPreference';
import {
  CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
  USER_DASHBOARD_BACKGROUND_ROTATION_INTERVALS,
} from '../../UserDashboard/backgrounds/UserDashboardBackgrounds';
import {
  DashboardBackgroundSettingsBody,
  DashboardBackgroundSettingsDetails,
  DashboardBackgroundSettingsSummary,
  DashboardBackgroundSummaryMain,
  DashboardBackgroundSummaryMeta,
  DashboardBackgroundSurfaceContent,
  DashboardBackgroundSurfaceFrame,
} from './DashboardBackgroundStudio.styles';

type DashboardBackgroundState = ReturnType<typeof useUserDashboardBackgroundPreference>;

interface DashboardBackgroundSurfaceProps {
  children: React.ReactNode;
}

interface DashboardBackgroundSettingsPanelProps {
  scopeLabel: 'Admin' | 'Trainer' | 'Client';
}

const DashboardBackgroundContext = React.createContext<DashboardBackgroundState | null>(null);

export const DashboardBackgroundSurface: React.FC<DashboardBackgroundSurfaceProps> = ({ children }) => {
  const dashboardBackground = useUserDashboardBackgroundPreference(brandLogo);

  return (
    <DashboardBackgroundContext.Provider value={dashboardBackground}>
      <DashboardBackgroundSurfaceFrame
        data-testid="dashboard-background-surface"
        style={dashboardBackground.backgroundStyle}
      >
        <DashboardBackgroundSurfaceContent>
          {children}
        </DashboardBackgroundSurfaceContent>
      </DashboardBackgroundSurfaceFrame>
    </DashboardBackgroundContext.Provider>
  );
};

export const DashboardBackgroundSettingsPanel: React.FC<DashboardBackgroundSettingsPanelProps> = ({ scopeLabel }) => {
  const dashboardBackground = React.useContext(DashboardBackgroundContext);
  const [open, setOpen] = React.useState(true);

  if (!dashboardBackground) return null;

  const customActive = dashboardBackground.preference.selectedId === CUSTOM_USER_DASHBOARD_BACKGROUND_ID;
  const activeName = customActive ? 'Custom Photo' : dashboardBackground.activeBackground.name;
  const rotationInterval = USER_DASHBOARD_BACKGROUND_ROTATION_INTERVALS.find(
    (item) => item.minutes === dashboardBackground.preference.intervalMinutes,
  );
  const rotationLabel = rotationInterval?.label ?? `${dashboardBackground.preference.intervalMinutes} min`;
  const modeLabel = dashboardBackground.preference.mode === 'rotate'
    ? `Rotate ${rotationLabel}`
    : 'Fixed';

  return (
    <DashboardBackgroundSettingsDetails
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <DashboardBackgroundSettingsSummary aria-label={`${scopeLabel} dashboard background theme picker`}>
        <DashboardBackgroundSummaryMain>
          <Palette size={18} aria-hidden="true" />
          <span className="background-summary-copy">
            <span>Background themes</span>
            <strong>{scopeLabel} dashboard theme picker</strong>
            <small>Choose fixed, rotating, or custom image backgrounds.</small>
          </span>
        </DashboardBackgroundSummaryMain>
        <DashboardBackgroundSummaryMeta>
          <span>{open ? 'Close picker' : 'Open picker'}</span>
          <em>{activeName} - {modeLabel}</em>
          <ChevronDown size={15} aria-hidden="true" />
        </DashboardBackgroundSummaryMeta>
      </DashboardBackgroundSettingsSummary>
      {open && (
        <DashboardBackgroundSettingsBody>
          <UserDashboardBackgroundControls
            preference={dashboardBackground.preference}
            activeBackground={dashboardBackground.activeBackground}
            customUploadError={dashboardBackground.customUploadError}
            onModeChange={dashboardBackground.setMode}
            onBackgroundSelect={dashboardBackground.setSelectedId}
            onIntervalChange={dashboardBackground.setIntervalMinutes}
            onCustomImageFile={(file) => { void dashboardBackground.setCustomImageFile(file); }}
          />
        </DashboardBackgroundSettingsBody>
      )}
    </DashboardBackgroundSettingsDetails>
  );
};

export default DashboardBackgroundSurface;
