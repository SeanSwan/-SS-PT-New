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
 * KEY DECISIONS: Extracted to keep modal under 300 lines. Parses socialLinks
 *   and chartVisibility from the preferences JSON field on the user model.
 */
import { useState, useCallback } from 'react';
import type { SocialLinks } from '../components/EditProfileSocialFields';
import type { ProfileChartVisibility } from '../components/EditProfileChartToggles';
import { DEFAULT_CHART_VISIBILITY } from '../components/EditProfileChartToggles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

/** Shape of the profile object passed in (from profileService or UserDashboardTypes) */
interface ProfileInput {
  firstName?: string;
  lastName?: string;
  bio?: string;
  fitnessGoal?: string;
  phone?: string;
  city?: string;
  state?: string;
  socialLinks?: SocialLinks;
  chartVisibility?: Partial<ProfileChartVisibility>;
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
}

interface UseEditProfileFormReturn {
  form: EditProfileFormData;
  isSaving: boolean;
  setField: (field: keyof EditProfileFormData, value: string) => void;
  setSocialLink: (platform: keyof SocialLinks, value: string) => void;
  toggleChart: (key: keyof ProfileChartVisibility) => void;
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
      twitter: profile?.socialLinks?.twitter || '',
      tiktok: profile?.socialLinks?.tiktok || '',
    },
    chartVisibility: {
      ...DEFAULT_CHART_VISIBILITY,
      ...(profile?.chartVisibility || {}),
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  const setField = useCallback((field: keyof EditProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setSocialLink = useCallback((platform: keyof SocialLinks, value: string) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value },
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
      });
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  }, [form, onSave]);

  return { form, isSaving, setField, setSocialLink, toggleChart, handleSubmit };
}
