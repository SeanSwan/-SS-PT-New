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
  CheckboxWrapper,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  HelperText,
  SmallText
} from './ui';

interface NotificationPreferencesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface QuietHours {
  start: string;
  end: string;
}

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  quietHours: QuietHours;
}

const defaultPreferences: NotificationPreferences = {
  email: true,
  sms: true,
  push: false,
  quietHours: { start: '', end: '' }
};

const normalizePreferences = (prefs: any): NotificationPreferences => {
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
    return { ...defaultPreferences };
  }

  return {
    email: prefs.email !== undefined ? Boolean(prefs.email) : true,
    sms: prefs.sms !== undefined ? Boolean(prefs.sms) : true,
    push: prefs.push !== undefined ? Boolean(prefs.push) : false,
    quietHours: {
      start: prefs.quietHours?.start || '',
      end: prefs.quietHours?.end || ''
    }
  };
};

const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    if (!open) {
      setFormError(null);
      setSuccessMessage(null);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setFormError(null);
      setSuccessMessage(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setFormError('Please log in to update notification settings');
          setPreferences({ ...defaultPreferences });
          return;
        }

        const response = await fetch('/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          setPreferences({ ...defaultPreferences });
          return;
        }

        const payload = await response.json();
        const user = payload?.user || payload?.data || payload;
        const prefs = user?.notificationPreferences;

        setPreferences(normalizePreferences(prefs));
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        setPreferences({ ...defaultPreferences });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [open]);

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value
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
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to update notification settings');
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          notificationPreferences: preferences
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to update notification preferences');
        return;
      }

      setSuccessMessage('Notification preferences saved');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      setFormError('Could not save notification preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Notification Settings"
      size="md"
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
        <SmallText style={{ color: '#10b981', marginBottom: '1rem' }}>
          {successMessage}
        </SmallText>
      )}

      <FormField>
        <CheckboxWrapper>
          <input
            type="checkbox"
            checked={preferences.email}
            onChange={(e) => updatePreference('email', e.target.checked)}
          />
          <span>Receive email notifications</span>
        </CheckboxWrapper>
      </FormField>

      <FormField>
        <CheckboxWrapper>
          <input
            type="checkbox"
            checked={preferences.sms}
            onChange={(e) => updatePreference('sms', e.target.checked)}
          />
          <span>Receive SMS notifications</span>
        </CheckboxWrapper>
      </FormField>

      <FormField>
        <CheckboxWrapper>
          <input
            type="checkbox"
            checked={preferences.push}
            onChange={(e) => updatePreference('push', e.target.checked)}
          />
          <span>Receive push notifications</span>
        </CheckboxWrapper>
      </FormField>

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
