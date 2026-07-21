/**
 * ============================================================================
 * FILE: ClientProfilePage.tsx
 * PURPOSE: Client profile settings + chart visibility + pet preview
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Profile settings page where clients manage personal info,
 * fitness goals, notification prefs, chart visibility toggles, and see their pet.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientProfilePage                                 ║
 * ║  PURPOSE: Profile settings + chart toggle + live chart preview║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-28                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  [Avatar] Name / Role                                      │
 * ├────────────────────────────────────────────────────────────┤
 * │ Personal Info: Name, Email, Phone, Member Since            │
 * ├────────────────────────────────────────────────────────────┤
 * │ Companion Pet (compact, no controls)                       │
 * ├────────────────────────────────────────────────────────────┤
 * │ Chart Visibility: [x] Weight [x] Heatmap [ ] Body Fat ... │
 * ├────────────────────────────────────────────────────────────┤
 * │ [Live Chart Preview — renders visible charts]              │
 * ├────────────────────────────────────────────────────────────┤
 * │ Fitness Goals | Notifications | Theme                      │
 * └────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback, Suspense } from 'react';
import styled from 'styled-components';
import { User as UserIcon, Target, Bell, Palette, Save } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import apiService from '../../../../services/api.service';
import ClientMembershipCard from './ClientMembershipCard';
import ChangePasswordCard from './ChangePasswordCard';
import EditProfileChartToggles, {
  DEFAULT_CHART_VISIBILITY,
  type ProfileChartVisibility,
} from '../../../UserDashboard/components/EditProfileChartToggles';

// Lazy-load heavy chart components
const ProfileChartsGrid = React.lazy(
  () => import('../../../UserDashboard/components/ProfileChartsGrid')
);
const CompanionPet = React.lazy(
  () => import('../../../AdvancedGamification/components/CompanionPet/CompanionPet')
);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const PageWrap = styled.div`
  padding: 1.5rem;
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);
  max-width: 800px;
`;

const Card = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
`;

const AvatarRow = styled.div`
  display: flex; align-items: center; gap: 1.25rem; margin-bottom: 0.5rem;
`;

const Avatar = styled.div`
  width: 72px; height: 72px; border-radius: 50%;
  background: var(--accent-primary, #60C0F0);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; font-weight: 700; color: var(--bg-base, #030712);
  flex-shrink: 0;
`;

const AvatarImg = styled.img`
  width: 72px; height: 72px; border-radius: 50%; object-fit: cover;
  border: 2px solid var(--accent-primary, #60C0F0);
`;

const NameBlock = styled.div`
  h2 { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; }
  p { margin: 0.25rem 0 0; color: var(--text-secondary, #94a3b8); font-size: 0.875rem; }
`;

const SectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem; margin: 0 0 1rem;
  display: flex; align-items: center; gap: 0.5rem;
  color: var(--accent-primary, #60C0F0);
`;

const InfoGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const InfoItem = styled.div``;

const InfoLabel = styled.span`
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InfoValue = styled.span`
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
`;

const GoalTextArea = styled.textarea`
  width: 100%; min-height: 88px; padding: 0.75rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px; color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 0.875rem;
  resize: vertical;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const ToggleRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  &:last-child { border-bottom: none; }
`;

const ToggleLabel = styled.span`
  font-size: 0.875rem;
`;

const Toggle = styled.button<{ $active: boolean }>`
  width: 48px; height: 28px; min-height: 44px; min-width: 44px;
  display: flex; align-items: center;
  border-radius: 14px; border: none; cursor: pointer;
  padding: 2px;
  background: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--bg-surface, #1A1A24)'};
  transition: background 0.2s;
  &::after {
    content: '';
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--text-primary, #E0ECF4);
    transform: translateX(${({ $active }) => $active ? '20px' : '0'});
    transition: transform 0.2s;
  }
`;

const SaveButton = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 44px; padding: 0.625rem 1.25rem;
  border-radius: 10px; border: none;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-heading, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 0.8125rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  &:hover:not(:disabled) { box-shadow: 0 0 16px rgba(139, 92, 246, 0.35); transform: scale(1.02); }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 4px; }
`;

const SaveStatus = styled.span<{ $success?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $success }) => $success ? '#4CAF50' : 'var(--text-muted, rgba(224, 236, 244, 0.45))'};
  margin-left: 0.5rem;
`;

const ChartPreviewWrap = styled.div`
  margin-top: 1rem;
`;

const LoadingFallback = styled.div<{ $large?: boolean }>`
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  padding: ${({ $large }) => ($large ? '2rem' : '1rem')};
  text-align: center;
`;

const SaveRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1rem;
`;

const ThemeNote = styled.p`
  font-size: 0.875rem; color: var(--text-secondary, #94a3b8);
  margin: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientProfilePage: React.FC = () => {
  const { user } = useAuth();
  const profileUser = user as (typeof user & {
    chartVisibility?: ProfileChartVisibility;
    photo?: string;
  }) | null;
  const [goalText, setGoalText] = useState(user?.fitnessGoal || '');
  const [notifPrefs, setNotifPrefs] = useState({ email: true, push: true, sms: false });
  const [chartVisibility, setChartVisibility] = useState<ProfileChartVisibility>(
    () => profileUser?.chartVisibility || DEFAULT_CHART_VISIBILITY
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const initials = `${(user?.firstName || '')[0] || ''}${(user?.lastName || '')[0] || ''}`.toUpperCase() || '?';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'N/A';

  const toggleNotif = (key: keyof typeof notifPrefs) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChartToggle = useCallback((key: keyof ProfileChartVisibility) => {
    setChartVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSaveCharts = useCallback(async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await apiService.put('/api/profile', { chartVisibility }, {
        validateStatus: status => status < 500,
      });
      if (res.status >= 200 && res.status < 300) {
        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('Error saving');
      }
    } catch {
      setSaveStatus('Error saving');
    } finally {
      setSaving(false);
    }
  }, [chartVisibility]);

  return (
    <PageWrap>
      {/* Avatar + Name */}
      <Card>
        <AvatarRow>
          {profileUser?.photo
            ? <AvatarImg src={profileUser.photo} alt="Profile" />
            : <Avatar>{initials}</Avatar>
          }
          <NameBlock>
            <h2>{user?.firstName} {user?.lastName}</h2>
            <p>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Client'}</p>
          </NameBlock>
        </AvatarRow>
      </Card>

      {/* Personal Info */}
      <Card>
        <SectionTitle><UserIcon size={18} /> Personal Information</SectionTitle>
        <InfoGrid>
          <InfoItem><InfoLabel>Full Name</InfoLabel><InfoValue>{user?.firstName} {user?.lastName}</InfoValue></InfoItem>
          <InfoItem><InfoLabel>Email</InfoLabel><InfoValue>{user?.email || 'Not set'}</InfoValue></InfoItem>
          <InfoItem><InfoLabel>Username</InfoLabel><InfoValue>{user?.username || 'Not set'}</InfoValue></InfoItem>
          <InfoItem><InfoLabel>Member Since</InfoLabel><InfoValue>{memberSince}</InfoValue></InfoItem>
        </InfoGrid>
      </Card>

      {/* Account Security */}
      <ChangePasswordCard />

      {/* Membership truth + FTC two-tap cancel (§7b promoted item 2) */}
      <ClientMembershipCard />

      {/* Companion Pet (compact preview) */}
      {user?.id && (
        <Card>
          <SectionTitle>Your Companion</SectionTitle>
          <Suspense fallback={<LoadingFallback>Loading...</LoadingFallback>}>
            <CompanionPet userId={user.id as unknown as number} size={140} compact showControls={false} />
          </Suspense>
        </Card>
      )}

      {/* Chart Visibility Toggles */}
      <Card>
        <EditProfileChartToggles
          chartVisibility={chartVisibility}
          onToggle={handleChartToggle}
        />
        <SaveRow>
          <SaveButton onClick={handleSaveCharts} disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Chart Settings'}
          </SaveButton>
          {saveStatus && (
            <SaveStatus $success={saveStatus === 'Saved'}>{saveStatus}</SaveStatus>
          )}
        </SaveRow>

        {/* Live Preview */}
        <ChartPreviewWrap>
          {user?.id && (
            <Suspense fallback={<LoadingFallback $large>Loading charts...</LoadingFallback>}>
              <ProfileChartsGrid
                userId={user.id}
                chartVisibility={chartVisibility}
                isOwnProfile={true}
              />
            </Suspense>
          )}
        </ChartPreviewWrap>
      </Card>

      {/* Fitness Goals */}
      <Card>
        <SectionTitle><Target size={18} /> Fitness Goals</SectionTitle>
        <GoalTextArea
          value={goalText}
          onChange={e => setGoalText(e.target.value)}
          placeholder="Describe your fitness goals... (e.g., Build muscle, improve endurance, lose 15 lbs)"
        />
      </Card>

      {/* Notification Preferences */}
      <Card>
        <SectionTitle><Bell size={18} /> Notification Preferences</SectionTitle>
        <ToggleRow>
          <ToggleLabel>Email Notifications</ToggleLabel>
          <Toggle $active={notifPrefs.email} onClick={() => toggleNotif('email')} aria-label="Toggle email" />
        </ToggleRow>
        <ToggleRow>
          <ToggleLabel>Push Notifications</ToggleLabel>
          <Toggle $active={notifPrefs.push} onClick={() => toggleNotif('push')} aria-label="Toggle push" />
        </ToggleRow>
        <ToggleRow>
          <ToggleLabel>SMS Notifications</ToggleLabel>
          <Toggle $active={notifPrefs.sms} onClick={() => toggleNotif('sms')} aria-label="Toggle SMS" />
        </ToggleRow>
      </Card>

      {/* Theme */}
      <Card>
        <SectionTitle><Palette size={18} /> Theme Preference</SectionTitle>
        <ThemeNote>
          Use the theme toggle in the header to switch between 14 available themes.
          Your current selection is saved automatically.
        </ThemeNote>
      </Card>
    </PageWrap>
  );
};

export default ClientProfilePage;
