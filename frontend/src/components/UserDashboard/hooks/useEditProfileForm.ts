/**
 * ============================================================================
 * FILE: useEditProfileForm.ts
 * PURPOSE: Form state management hook for EditProfileModal
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages all form fields, handles submit logic, and
 * provides change handlers for the EditProfileModal component tree.
 * HOW IT FITS IN THE APP: EditProfileModal -> useEditProfileForm
 * KEY DECISIONS: Extracted to keep modal under 300 lines. Parses socialLinks,
 *   chartVisibility, and transformationSettings from user preferences.
 */
import { useState, useCallback } from 'react';
import type { SocialLinks, CustomSocialLink } from '../components/EditProfileSocialFields';
import type { ProfileChartVisibility } from '../components/EditProfileChartToggles';
import { DEFAULT_CHART_VISIBILITY } from '../components/EditProfileChartToggles';
import type { TransformationPhotoSettings } from '../components/TransformationPhotoTypes';
import { DEFAULT_TRANSFORMATION_SETTINGS } from '../components/TransformationPhotoTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface ProfileInput {
  firstName?: string;
  lastName?: string;
  bio?: string;
  fitnessGoal?: string;
  phone?: string;
  city?: string;
  state?: string;
  socialLinks?: Partial<SocialLinks> & { twitter?: string };
  chartVisibility?: Partial<ProfileChartVisibility>;
  transformationSettings?: Partial<TransformationPhotoSettings>;
  [key: string]: unknown;
}

export interface EditProfileFormData {
  firstName: string;
  lastName: string;
  bio: string;
  fitnessGoals: string;
  phone: string;
  city: string;
  state: string;
  socialLinks: SocialLinks;
  chartVisibility: ProfileChartVisibility;
  transformationSettings: TransformationPhotoSettings;
}

interface UseEditProfileFormReturn {
  form: EditProfileFormData;
  isSaving: boolean;
  setField: (field: keyof EditProfileFormData, value: string) => void;
  setSocialLink: (platform: keyof Omit<SocialLinks, 'custom'>, value: string) => void;
  setCustomLink: (field: keyof CustomSocialLink, value: string) => void;
  toggleChart: (key: keyof ProfileChartVisibility) => void;
  setTransformationSetting: <K extends keyof TransformationPhotoSettings>(
    key: K,
    value: TransformationPhotoSettings[K]
  ) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// PURPOSE: All form state + submit logic in one place
// WHY: Keeps the modal component under 300 lines
// ─────────────────────────────────────────────────────────────

export function useEditProfileForm(
  profile: ProfileInput | null,
  onSave: (data: Record<string, unknown>) => Promise<void>,
): UseEditProfileFormReturn {
  // Migrate legacy 'twitter' field to custom link if it exists
  const legacyTwitter = profile?.socialLinks?.twitter;
  const existingCustom = profile?.socialLinks?.custom;

  const [form, setForm] = useState<EditProfileFormData>({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    bio: profile?.bio || '',
    fitnessGoals: profile?.fitnessGoal || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    state: profile?.state || '',
    socialLinks: {
      instagram: profile?.socialLinks?.instagram || '',
      facebook: profile?.socialLinks?.facebook || '',
      tiktok: profile?.socialLinks?.tiktok || '',
      custom: existingCustom
        ? { label: existingCustom.label || '', url: existingCustom.url || '' }
        : legacyTwitter
          ? { label: 'Twitter', url: legacyTwitter }
          : { label: '', url: '' },
    },
    chartVisibility: {
      ...DEFAULT_CHART_VISIBILITY,
      ...(profile?.chartVisibility || {}),
    },
    transformationSettings: {
      ...DEFAULT_TRANSFORMATION_SETTINGS,
      ...(profile?.transformationSettings || {}),
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  const setField = useCallback((field: keyof EditProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setSocialLink = useCallback((platform: keyof Omit<SocialLinks, 'custom'>, value: string) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value },
    }));
  }, []);

  const setCustomLink = useCallback((field: keyof CustomSocialLink, value: string) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        custom: { ...prev.socialLinks.custom, [field]: value },
      },
    }));
  }, []);

  const toggleChart = useCallback((key: keyof ProfileChartVisibility) => {
    setForm((prev) => ({
      ...prev,
      chartVisibility: {
        ...prev.chartVisibility,
        [key]: !prev.chartVisibility[key],
      },
    }));
  }, []);

  const setTransformationSetting = useCallback(<K extends keyof TransformationPhotoSettings>(
    key: K,
    value: TransformationPhotoSettings[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      transformationSettings: {
        ...prev.transformationSettings,
        [key]: value,
      },
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        firstName: form.firstName,
        lastName: form.lastName,
        bio: form.bio,
        fitnessGoal: form.fitnessGoals,
        phone: form.phone,
        city: form.city,
        state: form.state,
        socialLinks: form.socialLinks,
        chartVisibility: form.chartVisibility,
        transformationSettings: form.transformationSettings,
      });
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  }, [form, onSave]);

  return {
    form, isSaving, setField, setSocialLink, setCustomLink,
    toggleChart, setTransformationSetting, handleSubmit,
  };
}
