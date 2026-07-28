/**
 * FILE: UserDashboardBackgroundControlsDisclosure.tsx
 * PURPOSE: Compact disclosure wrapper for dashboard background controls.
 * PARENT: UserDashboard.V3 cover editor background picker.
 */
import React from 'react';
import { ChevronDown, Palette } from 'lucide-react';
import UserDashboardBackgroundControls, { type UserDashboardBackgroundControlsProps } from './UserDashboardBackgroundControls';
import { CUSTOM_USER_DASHBOARD_BACKGROUND_ID } from './UserDashboardBackgrounds';
import {
  BackgroundDisclosureBody,
  BackgroundDisclosureDetails,
  BackgroundDisclosureMeta,
  BackgroundDisclosureSummary,
  BackgroundDisclosureTitle,
} from './UserDashboardBackgroundControlsDisclosure.styles';

interface UserDashboardBackgroundControlsDisclosureProps extends UserDashboardBackgroundControlsProps {
  summaryLabel?: string;
}

const UserDashboardBackgroundControlsDisclosure: React.FC<UserDashboardBackgroundControlsDisclosureProps> = ({
  summaryLabel = 'Dashboard background',
  ...controlsProps
}) => {
  const [open, setOpen] = React.useState(false);
  const customActive = controlsProps.preference.selectedId === CUSTOM_USER_DASHBOARD_BACKGROUND_ID;
  const activeName = customActive ? 'Custom Photo' : controlsProps.activeBackground.name;
  const ariaLabel = open ? `Close ${summaryLabel.toLowerCase()} picker` : `Open ${summaryLabel.toLowerCase()} picker`;
  const toggleOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setOpen((current) => !current);
  };

  return (
    <BackgroundDisclosureDetails open={open}>
      <BackgroundDisclosureSummary role="button" aria-expanded={open} aria-label={ariaLabel} onClick={toggleOpen}>
        <BackgroundDisclosureTitle>
          <Palette size={17} aria-hidden="true" />
          <span>{summaryLabel}</span>
          <strong>{activeName}</strong>
        </BackgroundDisclosureTitle>
        <BackgroundDisclosureMeta>
          {open ? 'Hide picker' : 'Choose background'}
          <ChevronDown size={15} aria-hidden="true" />
        </BackgroundDisclosureMeta>
      </BackgroundDisclosureSummary>
      {open && (
        <BackgroundDisclosureBody>
          <UserDashboardBackgroundControls {...controlsProps} />
        </BackgroundDisclosureBody>
      )}
    </BackgroundDisclosureDetails>
  );
};

export default React.memo(UserDashboardBackgroundControlsDisclosure);
