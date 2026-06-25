/**
 * HOOK: useClientSettingsDetails
 * PURPOSE: Loads real client profile, training, and privacy values for the
 * Clients & Team Settings tab without adding fetch logic to the legacy view.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { isNonDeductingClientAccount, normalizeAvailableSessions } from '../clientSessionSignal';
import { getNumericClientId } from './clientTabId';

export interface ClientSettingsDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fitnessGoal: string;
  trainingExperience: string;
  availableSessions: number | '';
  clientSource: string;
  sessionBillingMode: string;
  healthConcerns: string;
  emergencyContact: string;
  isActive: boolean;
  profileIsPublic: boolean;
  showAchievements: boolean;
  showWorkoutHistory: boolean;
  emailNotifications: boolean;
}

const splitFallbackName = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

const textValue = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const normalizeGoal = (value: unknown): string => textValue(value).toLowerCase().replace(/_/g, '-');

const coerceSessions = (value: unknown): number | '' => {
  if (value === '' || value == null) return '';
  return normalizeAvailableSessions(value as number | string);
};

const unwrapClient = (payload: any) => payload?.data?.client || payload?.client || payload?.data || payload || {};

const buildFallback = (clientName?: string): ClientSettingsDetails => {
  const name = splitFallbackName(clientName);

  return {
    firstName: name.firstName,
    lastName: name.lastName,
    email: '',
    phone: '',
    fitnessGoal: '',
    trainingExperience: '',
    availableSessions: '',
    clientSource: '',
    sessionBillingMode: 'paid_sessions',
    healthConcerns: '',
    emergencyContact: '',
    isActive: true,
    profileIsPublic: false,
    showAchievements: false,
    showWorkoutHistory: false,
    emailNotifications: false,
  };
};

export const useClientSettingsDetails = (clientId: number | string, clientName?: string) => {
  const { authAxios } = useAuth() as any;
  const [details, setDetails] = useState<ClientSettingsDetails>(() => buildFallback(clientName));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDetails(buildFallback(clientName));
  }, [clientName]);

  useEffect(() => {
    const numericClientId = getNumericClientId(clientId);
    if (!numericClientId || !authAxios) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    authAxios.get(`/api/admin/clients/${numericClientId}`)
      .then((response: any) => {
        if (cancelled) return;
        const client = unwrapClient(response.data);
        const clientSource = textValue(client.clientSource);
        const sessionBillingMode = textValue(client.sessionBillingMode, 'paid_sessions');
        setDetails({
          firstName: textValue(client.firstName, buildFallback(clientName).firstName),
          lastName: textValue(client.lastName, buildFallback(clientName).lastName),
          email: textValue(client.email),
          phone: textValue(client.phone),
          fitnessGoal: normalizeGoal(client.fitnessGoal),
          trainingExperience: textValue(client.trainingExperience),
          availableSessions: isNonDeductingClientAccount({ clientSource, sessionBillingMode }) ? 0 : coerceSessions(client.availableSessions),
          clientSource,
          sessionBillingMode,
          healthConcerns: textValue(client.healthConcerns),
          emergencyContact: textValue(client.emergencyContact),
          isActive: client.isActive !== false,
          profileIsPublic: client.profileVisibility === 'public',
          showAchievements: client.showAchievements === true,
          showWorkoutHistory: client.showWorkoutHistory === true,
          emailNotifications: client.emailNotifications === true,
        });
      })
      .catch(() => {
        if (!cancelled) setDetails(buildFallback(clientName));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authAxios, clientId, clientName]);

  const mergeDetails = useCallback((updates: Partial<ClientSettingsDetails>) => {
    setDetails((current) => ({ ...current, ...updates }));
  }, []);

  return useMemo(() => ({ details, loading, mergeDetails }), [details, loading, mergeDetails]);
};
