/**
 * Notification Preferences Delivery Options
 * =========================================
 * Renders channel, digest, and preview controls for notification preferences.
 */

import React from 'react';
import { FormField, Label, StyledInput } from './ui';
import { PreferenceCheckboxWrapper } from './NotificationPreferencesModal.styles';
import {
  NOTIFICATION_CHANNEL_OPTIONS,
  NOTIFICATION_DIGEST_OPTIONS,
  type NotificationChannelKey,
  type NotificationDigestFrequency,
  type NotificationPreferences,
} from './NotificationPreferencesModal.model';

const CHANNEL_LABELS: Record<NotificationChannelKey, string> = {
  email: 'Receive email notifications',
  sms: 'Receive SMS notifications',
  push: 'Receive push notifications',
};

interface NotificationDeliveryOptionsProps {
  preferences: NotificationPreferences;
  onChannelChange: (key: NotificationChannelKey, value: boolean) => void;
  onDigestChange: (value: NotificationDigestFrequency) => void;
  onPreviewChange: (value: boolean) => void;
}

export const NotificationDeliveryOptions: React.FC<NotificationDeliveryOptionsProps> = ({
  preferences,
  onChannelChange,
  onDigestChange,
  onPreviewChange,
}) => (
  <>
    {NOTIFICATION_CHANNEL_OPTIONS.map((channel) => (
      <FormField key={channel.key}>
        <PreferenceCheckboxWrapper>
          <input
            type="checkbox"
            checked={preferences[channel.key]}
            onChange={(event) => onChannelChange(channel.key, event.target.checked)}
          />
          <span>{CHANNEL_LABELS[channel.key]}</span>
        </PreferenceCheckboxWrapper>
      </FormField>
    ))}

    <FormField>
      <Label htmlFor="notification-digest">Notification digest</Label>
      <StyledInput
        as="select"
        id="notification-digest"
        value={preferences.digestFrequency}
        onChange={(event) => onDigestChange(event.target.value as NotificationDigestFrequency)}
      >
        {NOTIFICATION_DIGEST_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </StyledInput>
    </FormField>

    <FormField>
      <PreferenceCheckboxWrapper>
        <input
          type="checkbox"
          checked={preferences.showPreview}
          onChange={(event) => onPreviewChange(event.target.checked)}
        />
        <span>Show message previews</span>
      </PreferenceCheckboxWrapper>
    </FormField>
  </>
);
