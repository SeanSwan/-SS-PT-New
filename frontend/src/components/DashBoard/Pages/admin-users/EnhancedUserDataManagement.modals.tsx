/**
 * EnhancedUserDataManagement.modals.tsx
 * Extracted admin user action dialogs for the mounted User Data Management surface.
 */

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ArrowRightLeft, Calendar, Mail, Phone, Shield, User as UserIcon, X } from 'lucide-react';

type ManagedUserRole = 'user' | 'client' | 'trainer' | 'admin';

interface ManagedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: ManagedUserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  phone?: string;
}

interface UserDetailsModalProps {
  open: boolean;
  user: ManagedUser | null;
  onClose: () => void;
  onConvertRole: () => void;
}

interface RoleConversionModalProps {
  open: boolean;
  user: ManagedUser | null;
  onClose: () => void;
  onConvert: (userId: number, role: ManagedUserRole) => void;
}

const ROLE_OPTIONS: ManagedUserRole[] = ['user', 'client', 'trainer', 'admin'];

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--obsidian-black, #0A0A0F) 82%, transparent);
`;

const Panel = styled.div`
  width: min(100%, 540px);
  max-height: min(82vh, 720px);
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 12px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--graphite, #1A1A24) 96%, transparent),
    color-mix(in srgb, var(--royal-depth, #003080) 28%, var(--obsidian-black, #0A0A0F))
  );
  box-shadow: 0 24px 70px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 72%, transparent);
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);

  h3 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.3;
  }
`;

const IconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
`;

const Body = styled.div`
  display: grid;
  gap: 0.9rem;
  padding: 1.25rem;
`;

const DetailRow = styled.div`
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 0.75rem;
  align-items: start;
  color: var(--text-secondary, #B7C7D8);

  strong {
    display: block;
    color: var(--text-primary, #E0ECF4);
    margin-bottom: 0.2rem;
  }
`;

const Select = styled.select`
  min-height: 44px;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 42%, var(--obsidian-black, #0A0A0F));
  color: var(--text-primary, #E0ECF4);
  padding: 0 0.85rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0 1.25rem 1.25rem;

  @media (max-width: 520px) {
    flex-direction: column-reverse;
  }
`;

const Button = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid color-mix(
    in srgb,
    ${({ $danger }) => ($danger ? 'var(--danger, #ef4444)' : 'var(--accent-primary, #60C0F0)')} 36%,
    transparent
  );
  border-radius: 8px;
  background: color-mix(
    in srgb,
    ${({ $danger }) => ($danger ? 'var(--danger, #ef4444)' : 'var(--accent-primary, #60C0F0)')} 14%,
    transparent
  );
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-weight: 700;
  padding: 0 1rem;
`;

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : 'Not recorded');

export const UserDetailsModal = ({ open, user, onClose, onConvertRole }: UserDetailsModalProps) => {
  if (!user) return null;

  return (
    <Overlay $open={open} onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Panel role="dialog" aria-modal="true" aria-labelledby="admin-user-details-title">
        <Header>
          <h3 id="admin-user-details-title">{user.firstName} {user.lastName}</h3>
          <IconButton type="button" onClick={onClose} aria-label="Close user details">
            <X size={18} />
          </IconButton>
        </Header>
        <Body>
          <DetailRow><UserIcon size={18} /><div><strong>Username</strong>@{user.username}</div></DetailRow>
          <DetailRow><Mail size={18} /><div><strong>Email</strong>{user.email}</div></DetailRow>
          <DetailRow><Phone size={18} /><div><strong>Phone</strong>{user.phone || 'Not recorded'}</div></DetailRow>
          <DetailRow><Shield size={18} /><div><strong>Role and status</strong>{user.role} - {user.isActive ? 'Active' : 'Inactive'}</div></DetailRow>
          <DetailRow><Calendar size={18} /><div><strong>Joined</strong>{formatDate(user.createdAt)}</div></DetailRow>
          <DetailRow><Calendar size={18} /><div><strong>Last login</strong>{formatDate(user.lastLogin)}</div></DetailRow>
        </Body>
        <Actions>
          <Button type="button" onClick={onClose}>Close</Button>
          <Button type="button" onClick={onConvertRole}>
            <ArrowRightLeft size={16} /> Convert role
          </Button>
        </Actions>
      </Panel>
    </Overlay>
  );
};

export const RoleConversionModal = ({ open, user, onClose, onConvert }: RoleConversionModalProps) => {
  const [role, setRole] = useState<ManagedUserRole>('user');

  useEffect(() => {
    if (user) setRole(user.role);
  }, [user]);

  if (!user) return null;

  return (
    <Overlay $open={open} onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Panel role="dialog" aria-modal="true" aria-labelledby="admin-user-role-title">
        <Header>
          <h3 id="admin-user-role-title">Convert role</h3>
          <IconButton type="button" onClick={onClose} aria-label="Close role conversion">
            <X size={18} />
          </IconButton>
        </Header>
        <Body>
          <DetailRow>
            <Shield size={18} />
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              Current role: {user.role}
            </div>
          </DetailRow>
          <label>
            <strong>New role</strong>
            <Select value={role} onChange={(event) => setRole(event.target.value as ManagedUserRole)}>
              {ROLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </label>
        </Body>
        <Actions>
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" $danger={role === 'admin'} onClick={() => onConvert(user.id, role)}>
            Confirm role
          </Button>
        </Actions>
      </Panel>
    </Overlay>
  );
};
