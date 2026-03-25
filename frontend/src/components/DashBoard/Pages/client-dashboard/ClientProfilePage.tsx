/**
 * ============================================================================
 * FILE: ClientProfilePage.tsx
 * PURPOSE: Client profile display with personal info, goals, and preferences
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays client profile information including avatar,
 * personal details, fitness goals, and notification/theme preferences.
 * HOW IT FITS IN THE APP: ClientDashboard → ClientProfilePage (Profile tab)
 * KEY DECISIONS: Read-only toggles for now; edit functionality is a future sprint.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientProfilePage                                 ║
 * ║  PURPOSE: Profile & settings display for authenticated client ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  [Avatar Circle]  Name / Email / Role                      │
 * ├────────────────────────────────────────────────────────────┤
 * │ Personal Info: Name, Email, Phone, Member Since            │
 * ├────────────────────────────────────────────────────────────┤
 * │ Fitness Goals: editable text area                          │
 * ├────────────────────────────────────────────────────────────┤
 * │ Notifications: Email ☑  Push ☑  SMS ☐                     │
 * ├────────────────────────────────────────────────────────────┤
 * │ Theme: references theme changer                            │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none
 * State:     { goalText, notifPrefs }
 * API Calls: none (reads from AuthContext)
 * Children:  none
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { User as UserIcon, Mail, Phone, CalendarDays, Target, Bell, Palette } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const PageWrap = styled.div`
  padding: 1.5rem;
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);
  max-width: 720px;
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

const InfoItem = styled.div`
  label {
    display: block; font-size: 0.75rem;
    color: var(--text-muted, #64748b); margin-bottom: 0.25rem;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  span {
    font-size: 0.9375rem; font-weight: 500;
    color: var(--text-primary, #E0ECF4);
  }
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

const ThemeNote = styled.p`
  font-size: 0.875rem; color: var(--text-secondary, #94a3b8);
  margin: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [goalText, setGoalText] = useState('');
  const [notifPrefs, setNotifPrefs] = useState({ email: true, push: true, sms: false });

  const initials = `${(user?.firstName || '')[0] || ''}${(user?.lastName || '')[0] || ''}`.toUpperCase() || '?';
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A';

  const toggleNotif = (key: keyof typeof notifPrefs) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <PageWrap>
      <Card>
        <AvatarRow>
          {user?.profileImageUrl
            ? <AvatarImg src={user.profileImageUrl} alt="Profile" />
            : <Avatar>{initials}</Avatar>
          }
          <NameBlock>
            <h2>{user?.firstName} {user?.lastName}</h2>
            <p>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Client'}</p>
          </NameBlock>
        </AvatarRow>
      </Card>

      <Card>
        <SectionTitle><UserIcon size={18} /> Personal Information</SectionTitle>
        <InfoGrid>
          <InfoItem><label>Full Name</label><span>{user?.firstName} {user?.lastName}</span></InfoItem>
          <InfoItem><label>Email</label><span>{user?.email || 'Not set'}</span></InfoItem>
          <InfoItem><label>Username</label><span>{user?.username || 'Not set'}</span></InfoItem>
          <InfoItem><label>Member Since</label><span>{memberSince}</span></InfoItem>
        </InfoGrid>
      </Card>

      <Card>
        <SectionTitle><Target size={18} /> Fitness Goals</SectionTitle>
        <GoalTextArea
          value={goalText}
          onChange={e => setGoalText(e.target.value)}
          placeholder="Describe your fitness goals... (e.g., Build muscle, improve endurance, lose 15 lbs)"
        />
      </Card>

      <Card>
        <SectionTitle><Bell size={18} /> Notification Preferences</SectionTitle>
        <ToggleRow>
          <ToggleLabel>Email Notifications</ToggleLabel>
          <Toggle $active={notifPrefs.email} onClick={() => toggleNotif('email')} aria-label="Toggle email notifications" />
        </ToggleRow>
        <ToggleRow>
          <ToggleLabel>Push Notifications</ToggleLabel>
          <Toggle $active={notifPrefs.push} onClick={() => toggleNotif('push')} aria-label="Toggle push notifications" />
        </ToggleRow>
        <ToggleRow>
          <ToggleLabel>SMS Notifications</ToggleLabel>
          <Toggle $active={notifPrefs.sms} onClick={() => toggleNotif('sms')} aria-label="Toggle SMS notifications" />
        </ToggleRow>
      </Card>

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
