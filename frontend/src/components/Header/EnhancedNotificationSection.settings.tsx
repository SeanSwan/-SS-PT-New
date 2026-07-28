import React, { Suspense } from 'react';
import { Settings } from 'lucide-react';
import styled from 'styled-components';

const NotificationPreferencesModal = React.lazy(() => import('../UniversalMasterSchedule/NotificationPreferencesModal'));

interface HeaderNotificationSettingsControlProps {
  onOpen: () => void;
}

interface HeaderNotificationPreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

const HeaderNotificationSettingsControl: React.FC<HeaderNotificationSettingsControlProps> = ({
  onOpen,
}) => (
  <SettingsButton
    type="button"
    onClick={onOpen}
    aria-label="Notification settings"
    title="Notification settings"
  >
    <Settings size={18} />
  </SettingsButton>
);

export const HeaderNotificationPreferencesModal: React.FC<HeaderNotificationPreferencesModalProps> = ({
  open,
  onClose,
}) => (
  <Suspense fallback={null}>
    {open && (
      <NotificationPreferencesModal
        open={open}
        onClose={onClose}
        onSuccess={() => undefined}
      />
    )}
  </Suspense>
);

const SettingsButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  border: 1px solid var(--notification-control-border, rgba(96, 192, 240, 0.18));
  border-radius: 8px;
  background: var(--notification-control-bg, rgba(96, 192, 240, 0.08));
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: var(--notification-control-bg-hover, rgba(96, 192, 240, 0.16));
    border-color: var(--notification-control-border-hover, rgba(96, 192, 240, 0.35));
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export default HeaderNotificationSettingsControl;
