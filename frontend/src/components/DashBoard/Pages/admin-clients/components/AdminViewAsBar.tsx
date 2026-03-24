/**
 * ┌─── SUB-COMPONENT: AdminViewAsBar ──────────────────────────┐
 * │ PARENT: AdminViewAsWrapper / Admin Dashboard Header         │
 * │ PURPOSE: Dropdown to select a user to impersonate + banner  │
 * │          showing "Viewing as [Name]" with exit button       │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ 👁 View As: [Select user ▼] [Exit]       │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: { users[], selectedUserId, onSelect, onExit }        │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Select user] → loads target user's dashboard data          │
 * │ [Exit] → returns to normal admin view                       │
 * │ SECURITY: Admin-only, audit logged, data-fetch only         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Eye, X, Search, User, Shield } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
`;

const Label = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
`;

const SelectWrapper = styled.div`
  position: relative;
  flex: 1;
  max-width: 300px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 32px;
  min-height: 44px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: var(--bg-surface, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;

  &::placeholder { color: rgba(255, 255, 255, 0.4); }
  &:focus { outline: none; border-color: rgba(96, 192, 240, 0.5); }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  margin-top: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

const DropdownItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8125rem;
  cursor: pointer;
  text-align: left;

  &:hover { background: rgba(96, 192, 240, 0.08); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: -2px; }
`;

const RoleBadge = styled.span<{ $role: string }>`
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  background: ${p => p.$role === 'trainer' ? 'rgba(139,92,246,0.15)' : 'rgba(96,192,240,0.15)'};
  color: ${p => p.$role === 'trainer' ? '#8B5CF6' : '#60C0F0'};
`;

const ViewingBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  margin-bottom: 16px;
`;

const ViewingText = styled.span`
  flex: 1;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;

  strong { color: var(--accent-primary, #60C0F0); }
`;

const ExitBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(201, 42, 84, 0.4);
  background: rgba(201, 42, 84, 0.1);
  color: #E0ECF4;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: rgba(201, 42, 84, 0.2); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface UserOption {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Props {
  viewingUser: UserOption | null;
  onSelectUser: (user: UserOption) => void;
  onExit: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const AdminViewAsBar: React.FC<Props> = ({ viewingUser, onSelectUser, onExit }) => {
  const { authAxios } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch users for dropdown
  const fetchUsers = useCallback(async () => {
    if (!authAxios) return;
    try {
      const resp = await authAxios.get('/api/admin/clients', {
        params: { limit: 100, page: 1 }
      });
      const raw = resp.data?.clients || resp.data?.data?.clients || [];
      setUsers(raw.map((u: any) => ({
        id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        role: u.role || 'client',
      })));
    } catch {
      // Silently fail — admin can still use the search
    }
  }, [authAxios]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
           u.email.toLowerCase().includes(q);
  });

  // If actively viewing a user, show the banner
  if (viewingUser) {
    return (
      <ViewingBanner>
        <Shield size={18} color="#60C0F0" />
        <ViewingText>
          Viewing as <strong>{viewingUser.firstName} {viewingUser.lastName}</strong> ({viewingUser.role})
        </ViewingText>
        <ExitBtn onClick={onExit} aria-label="Exit impersonation view">
          <X size={14} /> Exit View
        </ExitBtn>
      </ViewingBanner>
    );
  }

  return (
    <Bar>
      <Label><Eye size={16} /> View As:</Label>
      <SelectWrapper ref={wrapperRef}>
        <SearchIcon><Search size={14} /></SearchIcon>
        <SearchInput
          placeholder="Search client or trainer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          aria-label="Search users to view as"
          role="combobox"
          aria-expanded={showDropdown && filteredUsers.length > 0}
          aria-haspopup="listbox"
        />
        {showDropdown && filteredUsers.length > 0 && (
          <Dropdown role="listbox" aria-label="User list">
            {filteredUsers.slice(0, 20).map(u => (
              <DropdownItem
                role="option"
                key={u.id}
                onClick={() => { onSelectUser(u); setShowDropdown(false); setSearch(''); }}
              >
                <User size={14} />
                {u.firstName} {u.lastName}
                <RoleBadge $role={u.role}>{u.role}</RoleBadge>
              </DropdownItem>
            ))}
          </Dropdown>
        )}
      </SelectWrapper>
    </Bar>
  );
};

export default AdminViewAsBar;
