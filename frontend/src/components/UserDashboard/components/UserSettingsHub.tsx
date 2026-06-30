import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Bell,
  Eye,
  HeartPulse,
  Lock,
  Palette,
  Save,
  Shield,
  Sparkles,
  UserCog,
} from 'lucide-react';
import type { UserProfile } from '../../../services/profileService';
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
  notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    quietHours?: {
      enabled?: boolean;
      start?: string;
      end?: string;
    };
    [key: string]: unknown;
  };
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
  chartVisibility: ProfileChartVisibility;
}

interface UserSettingsHubProps {
  profile: UserProfile | null;
  onUpdateProfile: (data: Record<string, unknown>) => Promise<void>;
  onOpenEditProfile: () => void;
}

const asSettingsProfile = (profile: UserProfile | null): SettingsProfile | null => profile as SettingsProfile | null;

const buildChartVisibility = (profile: SettingsProfile | null): ProfileChartVisibility => ({
  ...DEFAULT_CHART_VISIBILITY,
  ...((profile?.chartVisibility || {}) as Partial<ProfileChartVisibility>),
});

const buildForm = (profile: UserProfile | null): SettingsForm => {
  const settingsProfile = asSettingsProfile(profile);
  const notificationPreferences = settingsProfile?.notificationPreferences || {};

  return {
    fitnessGoal: settingsProfile?.fitnessGoal || '',
    trainingExperience: settingsProfile?.trainingExperience || '',
    healthConcerns: settingsProfile?.healthConcerns || '',
    emergencyContact: settingsProfile?.emergencyContact || '',
    profileVisibility: settingsProfile?.profileVisibility || 'public',
    showBadges: settingsProfile?.showBadges ?? true,
    showAchievements: settingsProfile?.showAchievements ?? true,
    showStats: settingsProfile?.showStats ?? true,
    showWorkoutHistory: settingsProfile?.showWorkoutHistory ?? false,
    showLevel: settingsProfile?.showLevel ?? true,
    emailNotifications: settingsProfile?.emailNotifications ?? notificationPreferences.email ?? true,
    smsNotifications: settingsProfile?.smsNotifications ?? notificationPreferences.sms ?? true,
    pushNotifications: notificationPreferences.push ?? true,
    chartVisibility: buildChartVisibility(settingsProfile),
  };
};

const UserSettingsHub: React.FC<UserSettingsHubProps> = ({
  profile,
  onUpdateProfile,
  onOpenEditProfile,
}) => {
  const navigate = useNavigate();
  const { subscription, hasGuardianAccess, hasCrystallineAccess } = useSubscription();
  const [form, setForm] = useState<SettingsForm>(() => buildForm(profile));
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildForm(profile));
  }, [profile?.id, profile?.updatedAt]);

  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(profile?.firstName),
      Boolean(profile?.lastName),
      Boolean(profile?.photo),
      Boolean(profile?.bio),
      Boolean(form.fitnessGoal),
      Boolean(form.trainingExperience),
      Boolean(form.emergencyContact),
      Boolean(profile?.bannerPhoto),
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [form.emergencyContact, form.fitnessGoal, form.trainingExperience, profile]);

  const setField = useCallback(<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleBoolean = useCallback((key: keyof Pick<
    SettingsForm,
    'showBadges' | 'showAchievements' | 'showStats' | 'showWorkoutHistory' | 'showLevel' | 'emailNotifications' | 'smsNotifications' | 'pushNotifications'
  >) => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleChartToggle = useCallback((key: keyof ProfileChartVisibility) => {
    setForm(prev => ({
      ...prev,
      chartVisibility: {
        ...prev.chartVisibility,
        [key]: !prev.chartVisibility[key],
      },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const settingsProfile = asSettingsProfile(profile);
      await onUpdateProfile({
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
          ...(settingsProfile?.notificationPreferences || {}),
          email: form.emailNotifications,
          sms: form.smsNotifications,
          push: form.pushNotifications,
        },
        chartVisibility: form.chartVisibility,
      });
      setSaveStatus('Saved');
      window.setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus('Unable to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [form, onUpdateProfile, profile]);

  return (
    <SettingsWrap>
      <HeroCard>
        <HeroCopy>
          <Eyebrow><UserCog size={14} /> Profile & Settings</Eyebrow>
          <h2>Make SwanStudios feel like home.</h2>
          <p>
            Tune your public identity, privacy, notifications, training context,
            analytics visibility, and Ascension access from one place.
          </p>
        </HeroCopy>
        <CompletionCard aria-label={`Profile completion ${profileCompletion}%`}>
          <CompletionValue>{profileCompletion}%</CompletionValue>
          <CompletionLabel>Home Base Complete</CompletionLabel>
          <CompletionTrack>
            <CompletionFill $pct={profileCompletion} />
          </CompletionTrack>
        </CompletionCard>
      </HeroCard>

      <Grid>
        <Panel>
          <PanelHeader>
            <Sparkles size={18} />
            <div>
              <h3>Ascension Membership</h3>
              <p>Your active access layer and upgrade path.</p>
            </div>
          </PanelHeader>
          <MembershipCard>
            <span>Current Plan</span>
            <strong>{subscription?.tierName || 'Swan Starter'}</strong>
            {subscription?.isInTrial && (
              <TrialNote>{subscription.trialDaysRemaining} trial day{subscription.trialDaysRemaining === 1 ? '' : 's'} remaining</TrialNote>
            )}
            <MembershipFlags>
              <Flag $active={hasGuardianAccess}>Guardian analytics</Flag>
              <Flag $active={hasCrystallineAccess}>Crystalline tools</Flag>
            </MembershipFlags>
            <SecondaryButton type="button" onClick={() => navigate('/ascension')}>
              Manage Membership
            </SecondaryButton>
          </MembershipCard>
        </Panel>

        <Panel>
          <PanelHeader>
            <Eye size={18} />
            <div>
              <h3>Public Profile Privacy</h3>
              <p>Decide what others can see when they visit your profile.</p>
            </div>
          </PanelHeader>
          <FieldLabel htmlFor="profile-visibility">Profile visibility</FieldLabel>
          <Select
            id="profile-visibility"
            value={form.profileVisibility}
            onChange={event => setField('profileVisibility', event.target.value as ProfileVisibility)}
          >
            <option value="public">Public</option>
            <option value="friends_only">Friends only</option>
            <option value="private">Private</option>
          </Select>
          <ToggleRow>
            <span>Show badges</span>
            <Switch $active={form.showBadges} onClick={() => toggleBoolean('showBadges')} type="button" aria-pressed={form.showBadges} />
          </ToggleRow>
          <ToggleRow>
            <span>Show achievements</span>
            <Switch $active={form.showAchievements} onClick={() => toggleBoolean('showAchievements')} type="button" aria-pressed={form.showAchievements} />
          </ToggleRow>
          <ToggleRow>
            <span>Show stats</span>
            <Switch $active={form.showStats} onClick={() => toggleBoolean('showStats')} type="button" aria-pressed={form.showStats} />
          </ToggleRow>
          <ToggleRow>
            <span>Show workout history</span>
            <Switch $active={form.showWorkoutHistory} onClick={() => toggleBoolean('showWorkoutHistory')} type="button" aria-pressed={form.showWorkoutHistory} />
          </ToggleRow>
          <ToggleRow>
            <span>Show level and XP</span>
            <Switch $active={form.showLevel} onClick={() => toggleBoolean('showLevel')} type="button" aria-pressed={form.showLevel} />
          </ToggleRow>
        </Panel>

        <Panel>
          <PanelHeader>
            <HeartPulse size={18} />
            <div>
              <h3>Training Profile</h3>
              <p>Give Swan Coach and your trainers better context.</p>
            </div>
          </PanelHeader>
          <FieldLabel htmlFor="fitness-goal">Fitness goal</FieldLabel>
          <TextArea
            id="fitness-goal"
            value={form.fitnessGoal}
            onChange={event => setField('fitnessGoal', event.target.value)}
            placeholder="Build strength, lose 15 lbs, improve mobility, prepare for an event..."
          />
          <FieldLabel htmlFor="training-experience">Training experience</FieldLabel>
          <TextArea
            id="training-experience"
            value={form.trainingExperience}
            onChange={event => setField('trainingExperience', event.target.value)}
            placeholder="Beginner, returning after injury, athlete, experienced lifter..."
          />
          <FieldLabel htmlFor="health-concerns">Health notes</FieldLabel>
          <TextArea
            id="health-concerns"
            value={form.healthConcerns}
            onChange={event => setField('healthConcerns', event.target.value)}
            placeholder="Injuries, pain areas, restrictions, or anything your coach should know."
          />
          <FieldLabel htmlFor="emergency-contact">Emergency contact</FieldLabel>
          <Input
            id="emergency-contact"
            value={form.emergencyContact}
            onChange={event => setField('emergencyContact', event.target.value)}
            placeholder="Name and phone number"
          />
        </Panel>

        <Panel>
          <PanelHeader>
            <Bell size={18} />
            <div>
              <h3>Notifications</h3>
              <p>Control how SwanStudios reaches you.</p>
            </div>
          </PanelHeader>
          <ToggleRow>
            <span>Email notifications</span>
            <Switch $active={form.emailNotifications} onClick={() => toggleBoolean('emailNotifications')} type="button" aria-pressed={form.emailNotifications} />
          </ToggleRow>
          <ToggleRow>
            <span>SMS notifications</span>
            <Switch $active={form.smsNotifications} onClick={() => toggleBoolean('smsNotifications')} type="button" aria-pressed={form.smsNotifications} />
          </ToggleRow>
          <ToggleRow>
            <span>Push notifications</span>
            <Switch $active={form.pushNotifications} onClick={() => toggleBoolean('pushNotifications')} type="button" aria-pressed={form.pushNotifications} />
          </ToggleRow>
        </Panel>

        <WidePanel>
          <PanelHeader>
            <Shield size={18} />
            <div>
              <h3>Chart Visibility</h3>
              <p>Choose which progress charts appear on your public profile.</p>
            </div>
          </PanelHeader>
          <EditProfileChartToggles
            chartVisibility={form.chartVisibility}
            onToggle={handleChartToggle}
          />
        </WidePanel>

        <WidePanel>
          <PanelHeader>
            <Palette size={18} />
            <div>
              <h3>Home Base Personalization</h3>
              <p>Use the profile editor for name, bio, social links, avatar, banner, and transformation-photo settings.</p>
            </div>
          </PanelHeader>
          <ActionRow>
            <SecondaryButton type="button" onClick={onOpenEditProfile}>Open Profile Editor</SecondaryButton>
            <HomeBaseNote>
              Banner composition, profile image, public identity, and transformation display settings are saved to your profile.
            </HomeBaseNote>
          </ActionRow>
        </WidePanel>
      </Grid>

      <SaveBar>
        <SaveButton type="button" onClick={handleSave} disabled={isSaving}>
          <Save size={16} />
          {isSaving ? 'Saving Settings...' : 'Save Settings'}
        </SaveButton>
        {saveStatus && <SaveStatus $success={saveStatus === 'Saved'}>{saveStatus}</SaveStatus>}
        <SecurityNote><Lock size={13} /> Settings are saved to your account and respected across dashboard/profile surfaces.</SecurityNote>
      </SaveBar>
    </SettingsWrap>
  );
};

export default React.memo(UserSettingsHub);

const SettingsWrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HeroCard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 1rem;
  align-items: stretch;
  padding: 1.25rem;
  border-radius: 18px;
  border: 1px solid rgba(96, 192, 240, 0.18);
  background: linear-gradient(135deg, rgba(96, 192, 240, 0.12), rgba(139, 92, 246, 0.12));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const HeroCopy = styled.div`
  h2 { margin: 0.35rem 0; font-size: 1.35rem; color: var(--text-primary, #E0ECF4); }
  p { margin: 0; color: var(--text-secondary, rgba(224, 236, 244, 0.72)); line-height: 1.55; }
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const CompletionCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.45rem;
  padding: 1rem;
  border-radius: 14px;
  background: rgba(10, 10, 20, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const CompletionValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent-primary, #60C0F0);
`;

const CompletionLabel = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.82rem;
`;

const CompletionTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
`;

const CompletionFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  height: 100%;
  background: linear-gradient(90deg, #60C0F0, #8B5CF6);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid rgba(96, 192, 240, 0.14);
  background: rgba(20, 20, 30, 0.72);
`;

const WidePanel = styled(Panel)`
  grid-column: 1 / -1;
`;

const PanelHeader = styled.div`
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  margin-bottom: 1rem;
  color: var(--accent-primary, #60C0F0);

  h3 { margin: 0; font-size: 1rem; color: var(--text-primary, #E0ECF4); }
  p { margin: 0.25rem 0 0; color: var(--text-secondary, rgba(224, 236, 244, 0.65)); font-size: 0.82rem; line-height: 1.45; }
`;

const FieldLabel = styled.label`
  display: block;
  margin: 0.8rem 0 0.35rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.16);
  background: rgba(10, 10, 20, 0.72);
  color: var(--text-primary, #E0ECF4);
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.16);
  background: rgba(10, 10, 20, 0.72);
  color: var(--text-primary, #E0ECF4);
  resize: vertical;
`;

const Select = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.16);
  background: rgba(10, 10, 20, 0.92);
  color: var(--text-primary, #E0ECF4);
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.88rem;

  &:last-child { border-bottom: none; }
`;

const Switch = styled.button<{ $active: boolean }>`
  width: 52px;
  height: 30px;
  min-width: 52px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(96, 192, 240, 0.75)' : 'rgba(255, 255, 255, 0.12)')};
  background: ${({ $active }) => ($active ? 'linear-gradient(135deg, #60C0F0, #8B5CF6)' : 'rgba(255, 255, 255, 0.08)')};
  cursor: pointer;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 4px;
    left: ${({ $active }) => ($active ? '26px' : '4px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.18s ease;
  }
`;

const MembershipCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem;
  border-radius: 14px;
  background: rgba(10, 10, 20, 0.55);

  span { color: var(--text-secondary, rgba(224, 236, 244, 0.65)); font-size: 0.78rem; }
  strong { color: var(--text-primary, #E0ECF4); font-size: 1.15rem; }
`;

const TrialNote = styled.div`
  color: var(--accent-gold, #C6A84B);
  font-size: 0.82rem;
`;

const MembershipFlags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Flag = styled.div<{ $active: boolean }>`
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  color: ${({ $active }) => ($active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.52)')};
  border: 1px solid ${({ $active }) => ($active ? 'rgba(96, 192, 240, 0.5)' : 'rgba(255, 255, 255, 0.08)')};
  background: ${({ $active }) => ($active ? 'rgba(96, 192, 240, 0.14)' : 'rgba(255, 255, 255, 0.04)')};
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
`;

const SecondaryButton = styled.button`
  min-height: 44px;
  padding: 0 1rem;
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 10px;
  background: rgba(96, 192, 240, 0.12);
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  cursor: pointer;
`;

const HomeBaseNote = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font-size: 0.84rem;
  line-height: 1.5;
`;

const SaveBar = styled.div`
  position: sticky;
  bottom: 0.75rem;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(10, 10, 20, 0.9);
  backdrop-filter: blur(16px);
`;

const SaveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0 1.2rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  color: #fff;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: wait;
  }
`;

const SaveStatus = styled.span<{ $success: boolean }>`
  color: ${({ $success }) => ($success ? '#4ADE80' : '#FCA5A5')};
  font-size: 0.85rem;
  font-weight: 700;
`;

const SecurityNote = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.58));
  font-size: 0.78rem;
`;
