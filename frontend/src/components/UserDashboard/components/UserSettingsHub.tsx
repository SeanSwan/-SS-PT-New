/**
 * COMPONENT: UserSettingsHub
 * OWNER: User Dashboard / Settings (Wave-1 trust repair)
 * PURPOSE: One surface for profile, privacy, training context, notifications and
 *          public-chart visibility. Presentation lives in ./UserSettingsHub.styles.
 *
 * THE BUG THIS SURFACE EXISTS TO NOT REPEAT: it once reported "Saved" without
 * writing. Two rules follow from that and must survive every future edit —
 *   1. A success state is only ever set after a write is CONFIRMED. Both save paths
 *      (the injected onUpdateProfile and the direct PUT fallback) reject a 2xx whose
 *      body says `success:false`; they must not drift apart again.
 *   2. The result is announced in a live region, not only painted. A save the user
 *      cannot perceive is the same defect wearing a different coat.
 *
 * CONTRACT: onUpdateProfile is REQUIRED at every mount site. When it is absent the
 * component falls back to its own PUT — historically the branch the P0 travelled
 * through, so it is held to the identical success contract.
 *
 * TESTS: ./UserSettingsHub.saveContract.test.tsx (behavioural — it replaced a
 * source-text test that was green while the P0 shipped).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye, HeartPulse, Save, Shield, UserCog } from 'lucide-react';
import type { UserProfile } from '../../../services/profileService';
import apiService from '../../../services/api.service';
import {
  Wrap, Hero, Eyebrow, PlanCard, FlagRow, Flag, Grid, Panel, Title, Label,
  Input, TextArea, Select, ToggleRow, Switch, SecondaryButton, SaveBar,
  SaveButton, Status, LiveRegion,
} from './UserSettingsHub.styles';
import { useSubscription } from '../../../hooks/useSubscription';
import EditProfileChartToggles, {
  DEFAULT_CHART_VISIBILITY,
  type ProfileChartVisibility,
} from './EditProfileChartToggles';

type ProfileVisibility = 'public' | 'friends_only' | 'private';

type SettingsProfile = UserProfile & {
  profileVisibility?: ProfileVisibility;
  showBadges?: boolean;
  showAchievements?: boolean;
  showStats?: boolean;
  showWorkoutHistory?: boolean;
  showLevel?: boolean;
  notificationPreferences?: { email?: boolean; sms?: boolean; push?: boolean; autoShareWorkoutsToFeed?: boolean; [key: string]: unknown };
};

interface SettingsForm {
  fitnessGoal: string;
  trainingExperience: string;
  healthConcerns: string;
  emergencyContact: string;
  profileVisibility: ProfileVisibility;
  showBadges: boolean;
  showAchievements: boolean;
  showStats: boolean;
  showWorkoutHistory: boolean;
  showLevel: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  autoShareWorkouts: boolean;
  chartVisibility: ProfileChartVisibility;
}

interface UserSettingsHubProps {
  profile: UserProfile | null;
  onUpdateProfile?: (data: Record<string, unknown>) => Promise<void>;
  onOpenEditProfile?: () => void;
}

const asSettingsProfile = (profile: UserProfile | null): SettingsProfile | null => profile as SettingsProfile | null;

const buildChartVisibility = (profile: SettingsProfile | null): ProfileChartVisibility => ({
  ...DEFAULT_CHART_VISIBILITY,
  ...((profile?.chartVisibility || {}) as Partial<ProfileChartVisibility>),
});

const buildForm = (profile: UserProfile | null): SettingsForm => {
  const p = asSettingsProfile(profile);
  const prefs = p?.notificationPreferences || {};

  return {
    fitnessGoal: p?.fitnessGoal || '',
    trainingExperience: p?.trainingExperience || '',
    healthConcerns: p?.healthConcerns || '',
    emergencyContact: p?.emergencyContact || '',
    profileVisibility: p?.profileVisibility || 'public',
    showBadges: p?.showBadges ?? true,
    showAchievements: p?.showAchievements ?? true,
    showStats: p?.showStats ?? true,
    showWorkoutHistory: p?.showWorkoutHistory ?? false,
    showLevel: p?.showLevel ?? true,
    emailNotifications: p?.emailNotifications ?? prefs.email ?? true,
    smsNotifications: p?.smsNotifications ?? prefs.sms ?? true,
    pushNotifications: prefs.push ?? true,
    autoShareWorkouts: prefs.autoShareWorkoutsToFeed !== false,
    chartVisibility: buildChartVisibility(p),
  };
};

const UserSettingsHub: React.FC<UserSettingsHubProps> = ({ profile, onUpdateProfile }) => {
  const navigate = useNavigate();
  const {
    subscription,
    hasGuardianAccess,
    hasCrystallineAccess,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useSubscription();
  // Revenue-facing. `subscription?.tierName || 'Swan Starter'` names the FREE
  // tier whenever the fetch is pending or failed, so a paying Crystalline
  // member is told they are on the free plan, directly beside a "Manage
  // Membership" CTA. Name the plan only when it is actually known.
  const planKnown = Boolean(subscription?.tierName) && !subscriptionError;
  const [form, setForm] = useState<SettingsForm>(() => buildForm(profile));
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildForm(profile));
  }, [profile]);

  const setField = useCallback(<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggle = useCallback((key: keyof Pick<SettingsForm,
    'showBadges' | 'showAchievements' | 'showStats' | 'showWorkoutHistory' | 'showLevel' | 'emailNotifications' | 'smsNotifications' | 'pushNotifications' | 'autoShareWorkouts'
  >) => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleChartToggle = useCallback((key: keyof ProfileChartVisibility) => {
    setForm(prev => ({
      ...prev,
      chartVisibility: { ...prev.chartVisibility, [key]: !prev.chartVisibility[key] },
    }));
  }, []);

  // The 'Saved' flash is cleared on a timer; without this the timer outlives the
  // component and fires setState after unmount when the user navigates within 3s.
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => () => { if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current); }, []);

  const handleSave = useCallback(async () => {
    // Cancel a pending clear: without this, a save within 3s of the previous one
    // inherits the old timer, which wipes the NEW status early.
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    setIsSaving(true);
    setSaveStatus(null);

    const existingPrefs = asSettingsProfile(profile)?.notificationPreferences || {};
    const payload: Record<string, unknown> = {
      fitnessGoal: form.fitnessGoal,
      trainingExperience: form.trainingExperience,
      healthConcerns: form.healthConcerns,
      emergencyContact: form.emergencyContact,
      profileVisibility: form.profileVisibility,
      showBadges: form.showBadges,
      showAchievements: form.showAchievements,
      showStats: form.showStats,
      showWorkoutHistory: form.showWorkoutHistory,
      showLevel: form.showLevel,
      emailNotifications: form.emailNotifications,
      smsNotifications: form.smsNotifications,
      notificationPreferences: {
        ...existingPrefs,
        email: form.emailNotifications,
        sms: form.smsNotifications,
        push: form.pushNotifications,
        autoShareWorkoutsToFeed: form.autoShareWorkouts,
      },
      chartVisibility: form.chartVisibility,
    };

    try {
      if (onUpdateProfile) {
        await onUpdateProfile(payload);
      } else {
        const res = await apiService.put('/api/profile', payload, { validateStatus: status => status < 500 });
        if (res.status < 200 || res.status >= 300) throw new Error(res.data?.message || 'Unable to save settings');
        // profileService.updateProfile treats `success === false` as a failure even on a 2xx.
        // This branch must not be the weaker path: a 200 that says it did not write is not a save.
        if (res.data?.success === false) throw new Error(res.data?.message || 'Unable to save settings');
      }
      setSaveStatus('Saved');
      saveTimerRef.current = window.setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      // The server's reason was built at the throw site; showing a generic string
      // discarded it. Transport-level strings stay generic — they are not user-facing.
      const raw = err instanceof Error ? err.message : '';
      const transportNoise = /^(request failed with status|network error|timeout)/i.test(raw);
      setSaveStatus(raw && !transportNoise ? raw : 'Unable to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [form, onUpdateProfile, profile]);

  return (
    <Wrap>
      <Hero>
        <div>
          <Eyebrow><UserCog size={14} /> Profile & Settings</Eyebrow>
          <h2>Make SwanStudios feel like home.</h2>
          <p>Control your profile, privacy, training context, notifications, public charts, and Ascension access from one place.</p>
        </div>
        <PlanCard>
          <span>Current plan</span>
          {planKnown ? (
            <strong>{subscription!.tierName}</strong>
          ) : (
            <strong aria-live="polite">
              {subscriptionLoading ? 'Checking your plan…' : 'Plan unavailable right now'}
            </strong>
          )}
          {planKnown && subscription?.isInTrial && <small>{subscription.trialDaysRemaining} trial days remaining</small>}
          {planKnown && (
            <FlagRow><Flag $on={hasGuardianAccess}>Guardian analytics</Flag><Flag $on={hasCrystallineAccess}>Crystalline tools</Flag></FlagRow>
          )}
          <SecondaryButton type="button" onClick={() => navigate('/ascension')}>Manage Membership</SecondaryButton>
        </PlanCard>
      </Hero>

      <Grid>
        <Panel>
          <Title><Eye size={18} /> Public Profile Privacy</Title>
          <Label htmlFor="profile-visibility">Visibility</Label>
          <Select id="profile-visibility" value={form.profileVisibility} onChange={event => setField('profileVisibility', event.target.value as ProfileVisibility)}>
            <option value="public">Public</option>
            <option value="friends_only">Friends only</option>
            <option value="private">Private</option>
          </Select>
          <Toggle label="Show badges" active={form.showBadges} onClick={() => toggle('showBadges')} />
          <Toggle label="Show achievements" active={form.showAchievements} onClick={() => toggle('showAchievements')} />
          <Toggle label="Show stats" active={form.showStats} onClick={() => toggle('showStats')} />
          <Toggle label="Show workout history" active={form.showWorkoutHistory} onClick={() => toggle('showWorkoutHistory')} />
          <Toggle label="Show level and XP" active={form.showLevel} onClick={() => toggle('showLevel')} />
          <Toggle label="Auto-share completed workouts to the community feed" active={form.autoShareWorkouts} onClick={() => toggle('autoShareWorkouts')} />
        </Panel>

        <Panel>
          <Title><Bell size={18} /> Notifications</Title>
          <Toggle label="Email notifications" active={form.emailNotifications} onClick={() => toggle('emailNotifications')} />
          <Toggle label="SMS notifications" active={form.smsNotifications} onClick={() => toggle('smsNotifications')} />
          <Toggle label="Push notifications" active={form.pushNotifications} onClick={() => toggle('pushNotifications')} />
        </Panel>

        <Panel $wide>
          <Title><HeartPulse size={18} /> Training Profile</Title>
          <Label htmlFor="fitness-goal">Fitness goal</Label>
          <TextArea id="fitness-goal" value={form.fitnessGoal} onChange={event => setField('fitnessGoal', event.target.value)} />
          <Label htmlFor="training-experience">Training experience</Label>
          <TextArea id="training-experience" value={form.trainingExperience} onChange={event => setField('trainingExperience', event.target.value)} />
          <Label htmlFor="health-concerns">Health notes</Label>
          <TextArea id="health-concerns" value={form.healthConcerns} onChange={event => setField('healthConcerns', event.target.value)} />
          <Label htmlFor="emergency-contact">Emergency contact</Label>
          <Input id="emergency-contact" value={form.emergencyContact} onChange={event => setField('emergencyContact', event.target.value)} />
        </Panel>

        <Panel $wide>
          <Title><Shield size={18} /> Chart Visibility</Title>
          <EditProfileChartToggles chartVisibility={form.chartVisibility} onToggle={handleChartToggle} />
        </Panel>
      </Grid>

      <SaveBar>
        <SaveButton type="button" onClick={handleSave} disabled={isSaving}><Save size={16} />{isSaving ? 'Saving...' : 'Save Settings'}</SaveButton>
        {/* Always mounted: a live region inserted at the same moment as its text is
            unreliably announced. The visible copy is aria-hidden to avoid a double read. */}
        <LiveRegion role="status" aria-live="polite">{saveStatus ?? ''}</LiveRegion>
        {saveStatus && <Status aria-hidden="true" $good={saveStatus === 'Saved'}>{saveStatus}</Status>}
      </SaveBar>
    </Wrap>
  );
};

const Toggle: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <ToggleRow><span>{label}</span><Switch type="button" aria-pressed={active} $on={active} onClick={onClick} /></ToggleRow>
);

export default React.memo(UserSettingsHub);
