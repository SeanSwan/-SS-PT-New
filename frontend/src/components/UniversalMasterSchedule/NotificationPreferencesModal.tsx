/**
 * Notification Preferences Modal
 * ==============================
 * Allows users to configure notification channels and quiet hours.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  FormField,
  Label,
  StyledInput,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  HelperText,
  SmallText
} from './ui';
import apiService from '../../services/api.service';
import {
  NOTIFICATION_CATEGORY_OPTIONS,
  NOTIFICATION_CHANNEL_OPTIONS,
  createDefaultPreferences,
  getApiErrorMessage,
  normalizePreferences,
  preferenceEnvelope,
  toCanonicalPreferences,
  type NotificationCategoryKey,
  type NotificationChannelKey,
  type NotificationDigestFrequency,
  type NotificationPreferences,
  type QuietHours,
} from './NotificationPreferencesModal.model';
import { NotificationDeliveryOptions } from './NotificationPreferencesModal.delivery';
import {
  CategoryChannels,
  CategoryCopy,
  CategoryDescription,
  CategoryGrid,
  CategoryRow,
  CategorySection,
  CategoryTitle,
  CategoryToggle,
  SectionHeading,
} from './NotificationPreferencesModal.styles';

interface NotificationPreferencesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => createDefaultPreferences());

  useEffect(() => {
    if (!open) {
      setFormError(null);
      setSuccessMessage(null);
      return;
    }

    const loadPreferences = async () => {
      setLoading(true);
      setFormError(null);
      setSuccessMessage(null);

      try {
        const response = await apiService.get('/api/notifications/preferences');
        setPreferences(normalizePreferences(preferenceEnvelope(response.data)));
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        setPreferences(createDefaultPreferences());
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [open]);

  const updatePreference = (key: NotificationChannelKey, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const updateDigestFrequency = (value: NotificationDigestFrequency) => {
    setPreferences((prev) => ({
      ...prev,
      digestFrequency: value,
    }));
  };

  const updateShowPreview = (value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      showPreview: value,
    }));
  };

  const updateCategoryPreference = (
    category: NotificationCategoryKey,
    channel: NotificationChannelKey,
    value: boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          inApp: true,
          [channel]: value,
        },
      },
    }));
  };

  const updateQuietHours = (field: keyof QuietHours, value: string) => {
    setPreferences((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setFormError(null);
    setSuccessMessage(null);

    try {
      setSaving(true);
      const response = await apiService.put('/api/notifications/preferences', {
        preferences: toCanonicalPreferences(preferences)
      });

      const result = response.data;
      if (result?.success === false) {
        setFormError(result?.message || 'Failed to update notification preferences');
        return;
      }

      setSuccessMessage('Notification preferences saved');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      setFormError(getApiErrorMessage(error, 'Could not save notification preferences. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Notification Settings"
      size="lg"
      footer={(
        <>
          <OutlinedButton onClick={onClose} disabled={saving}>
            Close
          </OutlinedButton>
          <PrimaryButton onClick={handleSave} disabled={saving}>
            Save Preferences
          </PrimaryButton>
        </>
      )}
    >
      {loading && (
        <SmallText secondary style={{ marginBottom: '1rem' }}>
          Loading current preferences...
        </SmallText>
      )}

      {formError && (
        <ErrorText style={{ marginBottom: '1rem' }}>
          {formError}
        </ErrorText>
      )}

      {successMessage && (
        <SmallText style={{ color: 'var(--success, #10B981)', marginBottom: '1rem' }}>
          {successMessage}
        </SmallText>
      )}

      <NotificationDeliveryOptions
        preferences={preferences}
        onChannelChange={updatePreference}
        onDigestChange={updateDigestFrequency}
        onPreviewChange={updateShowPreview}
      />

      <CategorySection aria-labelledby="notification-category-heading">
        <SectionHeading as="h3" id="notification-category-heading">
          Notification categories
        </SectionHeading>
        <HelperText>Email, SMS, and push can be tuned per category. In-app alerts remain on.</HelperText>
        <CategoryGrid>
          {NOTIFICATION_CATEGORY_OPTIONS.map((category) => (
            <CategoryRow key={category.key}>
              <CategoryCopy>
                <CategoryTitle>{category.label}</CategoryTitle>
                <CategoryDescription>{category.description}</CategoryDescription>
              </CategoryCopy>
              <CategoryChannels>
                {NOTIFICATION_CHANNEL_OPTIONS.map((channel) => (
                  <CategoryToggle key={channel.key}>
                    <input
                      type="checkbox"
                      aria-label={`${category.label} ${channel.label}`}
                      checked={preferences.categories[category.key]?.[channel.key] ?? false}
                      onChange={(event) => updateCategoryPreference(
                        category.key,
                        channel.key,
                        event.target.checked,
                      )}
                    />
                    <span>{channel.label}</span>
                  </CategoryToggle>
                ))}
              </CategoryChannels>
            </CategoryRow>
          ))}
        </CategoryGrid>
      </CategorySection>

      <FormField>
        <Label htmlFor="quiet-hours-start">Quiet hours start</Label>
        <StyledInput
          id="quiet-hours-start"
          type="time"
          value={preferences.quietHours.start}
          onChange={(e) => updateQuietHours('start', e.target.value)}
        />
        <HelperText>Optional. Leave blank to disable quiet hours.</HelperText>
      </FormField>

      <FormField>
        <Label htmlFor="quiet-hours-end">Quiet hours end</Label>
        <StyledInput
          id="quiet-hours-end"
          type="time"
          value={preferences.quietHours.end}
          onChange={(e) => updateQuietHours('end', e.target.value)}
        />
      </FormField>
    </Modal>
  );
};

export default NotificationPreferencesModal;
