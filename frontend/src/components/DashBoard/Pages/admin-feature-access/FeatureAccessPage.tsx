/**
 * ============================================================================
 * FILE: FeatureAccessPage.tsx
 * PURPOSE: Admin page for toggling per-user feature access (Content Studio, etc.)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows a list of all users with custom Crystalline Toggle
 * switches so Sean can grant/revoke access to premium features per user.
 * HOW IT FITS IN THE APP: Admin Dashboard → System → Feature Access
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: FeatureAccessPage                                ║
 * ║  PURPOSE: Per-user feature flag management for admin         ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Feature Access Control                                      │
 * ├────────────────────────────────────────────────────────────┤
 * │ [Feature: Content Studio ▾]  [Search users...]             │
 * ├────────────────────────────────────────────────────────────┤
 * │ 📷 Sean Swan         admin    ✅ Always On (Admin)         │
 * │ 📷 Jackie Smith      client   [═══○] OFF                  │
 * │ 📷 Anand Kumar       client   [●═══] ON                   │
 * │ 📷 Jane Doe          trainer  [═══○] OFF                  │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useEffect, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../../../utils/imageUrl';
import { Shield, Search, Users } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { FEATURE_ACCESS_FEATURES } from './featureAccessCatalog';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface UserFlag {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  photo: string | null;
  enabled: boolean;
  isAdmin: boolean;
  grantedAt: string | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Page = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
`;

const ControlRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const FeatureSelect = styled.select`
  background: var(--bg-surface, #003080);
  border: 1px solid var(--border-soft, #4070C0);
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  min-height: 44px;
  min-width: 240px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
  }

  option {
    background: #0A0A0F;
    color: #E0ECF4;
    font-family: 'Sora', sans-serif;
  }
`;

const SearchInput = styled.input`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  padding: 0.65rem 1rem 0.65rem 40px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  min-height: 44px;
  flex: 1;
  min-width: 200px;
  transition: border-color 0.3s ease;

  &::placeholder {
    color: rgba(224, 236, 244, 0.6);
  }

  &:focus {
    outline: none;
    border-color: #60C0F0;
    box-shadow: 0 0 8px rgba(96, 192, 240, 0.3);
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(224, 236, 244, 0.6);
  }
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 16px;
  overflow: hidden;
`;

const UserRow = styled.div<{ $isAdmin?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
  transition: background 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(96, 192, 240, 0.04);
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`;

const Avatar = styled.div<{ $src?: string | null }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe ? `url(${cssUrlValue(safe)}) center/cover` : 'rgba(139, 92, 246, 0.2)';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B5CF6;
  font-size: 0.8rem;
  font-weight: 600;
`;

const UserDetails = styled.div`
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserMeta = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  display: flex;
  gap: 8px;
  align-items: center;
`;

const RoleBadge = styled.span<{ $role: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 4px;
  color: ${({ $role }) =>
    $role === 'admin' ? '#C6A84B' :
    $role === 'trainer' ? '#8B5CF6' :
    '#60C0F0'};
  background: ${({ $role }) =>
    $role === 'admin' ? 'rgba(198, 168, 75, 0.15)' :
    $role === 'trainer' ? 'rgba(139, 92, 246, 0.15)' :
    'rgba(96, 192, 240, 0.15)'};
`;

const AdminBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: #C6A84B;
  opacity: 0.8;
`;

// ─── Crystalline Toggle Switch ────────────────────────────────
const ToggleTrack = styled.button<{ $on: boolean; $disabled?: boolean }>`
  width: 48px;
  height: 26px;
  border-radius: 13px;
  border: 1px solid ${({ $on }) => ($on ? 'rgba(96, 192, 240, 0.6)' : 'rgba(224, 236, 244, 0.2)')};
  background: ${({ $on }) => ($on ? '#002060' : '#141419')};
  box-shadow: ${({ $on }) => ($on ? '0 0 12px rgba(96, 192, 240, 0.5), inset 0 0 8px rgba(96, 192, 240, 0.2)' : 'none')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  position: relative;
  padding: 0;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  flex-shrink: 0;
  min-height: 44px;
  min-width: 48px;
  display: flex;
  align-items: center;

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }
`;

const ToggleThumb = styled.div<{ $on: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #E0ECF4;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: ${({ $on }) => ($on ? '24px' : '3px')};
  transition: left 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: rgba(224, 236, 244, 0.5);
  font-size: 0.9rem;
`;

const CountBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: #60C0F0;
  margin-left: 8px;
`;

// ─── Frost Shimmer Skeleton ──────────────────────────────────
const iceShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const SkeletonRow = styled.div`
  height: 64px;
  border-radius: 12px;
  margin: 4px 0;
  background: linear-gradient(90deg,
    #141419 25%,
    rgba(96, 192, 240, 0.05) 50%,
    #141419 75%
  );
  background-size: 200% 100%;
  animation: ${iceShimmer} 2.5s infinite linear;
  border: 1px solid rgba(96, 192, 240, 0.05);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const FeatureAccessPage: React.FC = () => {
  const { authAxios } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState(FEATURE_ACCESS_FEATURES[0].key);
  const [users, setUsers] = useState<UserFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get(`/api/feature-flags/${selectedFeature}`);
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios, selectedFeature]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggle = async (userId: number, currentEnabled: boolean) => {
    setTogglingIds(prev => new Set(prev).add(userId));
    try {
      await authAxios.put(`/api/feature-flags/${selectedFeature}/${userId}`, {
        enabled: !currentEnabled,
      });
      // Optimistic update
      setUsers(prev =>
        prev.map(u =>
          u.userId === userId
            ? { ...u, enabled: !currentEnabled, grantedAt: !currentEnabled ? new Date().toISOString() : u.grantedAt }
            : u
        )
      );
    } catch {
      // Revert on failure — refetch
      fetchUsers();
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const enabledCount = users.filter(u => u.enabled).length;

  return (
    <Page>
      <Header>
        <HeaderIcon>
          <Shield size={20} />
        </HeaderIcon>
        <Title>Feature Access Control</Title>
        <CountBadge>{enabledCount} / {users.length} enabled</CountBadge>
      </Header>

      <ControlRow>
        <FeatureSelect
          value={selectedFeature}
          onChange={(e) => setSelectedFeature(e.target.value)}
          aria-label="Select feature to manage"
        >
          {FEATURE_ACCESS_FEATURES.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </FeatureSelect>
        <SearchWrapper>
          <Search size={16} />
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            aria-label="Search users by name or email"
          />
        </SearchWrapper>
      </ControlRow>

      {loading ? (
        <UserList role="status" aria-live="polite" aria-label="Loading users">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonRow key={i} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </UserList>
      ) : filtered.length === 0 ? (
        <EmptyState>
          {search ? 'No users match your search.' : 'No users found.'}
        </EmptyState>
      ) : (
        <UserList>
          {filtered.map(user => (
            <UserRow key={user.userId} $isAdmin={user.isAdmin}>
              <UserInfo>
                <Avatar $src={user.photo}>
                  {!user.photo && (user.firstName?.[0] || '?')}
                </Avatar>
                <UserDetails>
                  <UserName>{user.firstName} {user.lastName}</UserName>
                  <UserMeta>
                    <RoleBadge $role={user.role}>{user.role}</RoleBadge>
                    <span>{user.email}</span>
                  </UserMeta>
                </UserDetails>
              </UserInfo>

              {user.isAdmin ? (
                <AdminBadge>Always On (Admin)</AdminBadge>
              ) : (
                <ToggleTrack
                  $on={user.enabled}
                  $disabled={togglingIds.has(user.userId)}
                  onClick={() => handleToggle(user.userId, user.enabled)}
                  disabled={togglingIds.has(user.userId)}
                  role="switch"
                  aria-checked={user.enabled}
                  aria-label={`${user.enabled ? 'Disable' : 'Enable'} ${selectedFeature} for ${user.firstName} ${user.lastName}`}
                >
                  <ToggleThumb $on={user.enabled} />
                </ToggleTrack>
              )}
            </UserRow>
          ))}
        </UserList>
      )}
    </Page>
  );
};

export default FeatureAccessPage;
