import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Bell, Eye, HeartPulse, Save, Shield, UserCog } from 'lucide-react';
import type { UserProfile } from '../../../services/profileService';
import apiService from '../../../services/api.service';
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

  const handleSave = useCallback(async () => {
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
      }
      setSaveStatus('Saved');
      window.setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus('Unable to save settings');
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
        {saveStatus && <Status $good={saveStatus === 'Saved'}>{saveStatus}</Status>}
      </SaveBar>
    </Wrap>
  );
};

const Toggle: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <ToggleRow><span>{label}</span><Switch type="button" aria-pressed={active} $on={active} onClick={onClick} /></ToggleRow>
);

export default React.memo(UserSettingsHub);

const Wrap = styled.section`display: flex; flex-direction: column; gap: 1rem;`;
const Hero = styled.div`display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 1rem; padding: 1.25rem; border-radius: 18px; border: 1px solid rgba(96,192,240,.18); background: linear-gradient(135deg, rgba(96,192,240,.12), rgba(139,92,246,.12)); @media(max-width:760px){grid-template-columns:1fr;}`;
const Eyebrow = styled.div`display:inline-flex; align-items:center; gap:.4rem; color:var(--accent-primary,#60C0F0); font-size:.78rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase;`;
const PlanCard = styled.div`display:flex; flex-direction:column; gap:.55rem; padding:1rem; border-radius:14px; background:rgba(10,10,20,.55); span,small{color:rgba(224,236,244,.68); font-size:.78rem;} strong{color:var(--text-primary,#E0ECF4);}`;
const FlagRow = styled.div`display:flex; flex-wrap:wrap; gap:.45rem;`;
const Flag = styled.div<{ $on: boolean }>`padding:.32rem .5rem; border-radius:999px; font-size:.72rem; color:${p=>p.$on?'#E0ECF4':'rgba(224,236,244,.52)'}; border:1px solid ${p=>p.$on?'rgba(96,192,240,.5)':'rgba(255,255,255,.08)'};`;
const Grid = styled.div`display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; @media(max-width:900px){grid-template-columns:1fr;}`;
const Panel = styled.div<{ $wide?: boolean }>`grid-column:${p=>p.$wide?'1 / -1':'auto'}; padding:1rem; border-radius:16px; border:1px solid rgba(96,192,240,.14); background:rgba(20,20,30,.72);`;
const Title = styled.h3`display:flex; align-items:center; gap:.5rem; margin:0 0 1rem; color:var(--text-primary,#E0ECF4); font-size:1rem;`;
const Label = styled.label`display:block; margin:.8rem 0 .35rem; color:rgba(224,236,244,.72); font-size:.76rem; font-weight:800; text-transform:uppercase;`;
const Input = styled.input`width:100%; min-height:44px; padding:.7rem .8rem; border-radius:10px; border:1px solid rgba(96,192,240,.16); background:rgba(10,10,20,.72); color:var(--text-primary,#E0ECF4);`;
const TextArea = styled.textarea`width:100%; min-height:86px; padding:.7rem .8rem; border-radius:10px; border:1px solid rgba(96,192,240,.16); background:rgba(10,10,20,.72); color:var(--text-primary,#E0ECF4); resize:vertical;`;
const Select = styled.select`width:100%; min-height:44px; padding:.7rem .8rem; border-radius:10px; border:1px solid rgba(96,192,240,.16); background:rgba(10,10,20,.92); color:var(--text-primary,#E0ECF4);`;
const ToggleRow = styled.div`display:flex; align-items:center; justify-content:space-between; gap:1rem; min-height:48px; border-bottom:1px solid rgba(255,255,255,.06); color:var(--text-primary,#E0ECF4);`;
const Switch = styled.button<{ $on: boolean }>`width:52px; height:30px; min-width:52px; border-radius:999px; border:1px solid ${p=>p.$on?'rgba(96,192,240,.75)':'rgba(255,255,255,.12)'}; background:${p=>p.$on?'linear-gradient(135deg,#60C0F0,#8B5CF6)':'rgba(255,255,255,.08)'}; cursor:pointer; position:relative; &::after{content:''; position:absolute; top:4px; left:${p=>p.$on?'26px':'4px'}; width:20px; height:20px; border-radius:50%; background:#fff; transition:left .18s ease;}`;
const SecondaryButton = styled.button`min-height:44px; padding:0 1rem; border:1px solid rgba(96,192,240,.3); border-radius:10px; background:rgba(96,192,240,.12); color:var(--text-primary,#E0ECF4); font-weight:800; cursor:pointer;`;
const SaveBar = styled.div`position:sticky; bottom:.75rem; display:flex; align-items:center; gap:.75rem; padding:.85rem; border-radius:16px; border:1px solid rgba(96,192,240,.2); background:rgba(10,10,20,.9); backdrop-filter:blur(16px);`;
const SaveButton = styled.button`display:inline-flex; align-items:center; gap:.45rem; min-height:44px; padding:0 1.2rem; border:none; border-radius:10px; background:linear-gradient(135deg,#8B5CF6,#60C0F0); color:#fff; font-weight:800; cursor:pointer; &:disabled{opacity:.55; cursor:wait;}`;
const Status = styled.span<{ $good: boolean }>`color:${p=>p.$good?'#4ADE80':'#FCA5A5'}; font-size:.85rem; font-weight:800;`;
