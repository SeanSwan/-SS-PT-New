/**
 * AccessGrantManager.tsx
 * ======================
 * Component for managing premium video/collection access grants.
 * Supports searching users, selecting target video/collection,
 * choosing grant type and expiry, granting access, and revoking
 * existing grants.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Search, UserPlus, Shield, Clock, X, Check,
  Video, FolderOpen, Loader, AlertCircle, Trash2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface AccessGrantManagerProps {
  videoId?: string;
  collectionId?: string;
}

interface UserResult {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface ActiveGrant {
  id: string;
  userId: string;
  userEmail: string;
  targetType: 'video' | 'collection';
  targetId: string;
  targetTitle: string;
  grantType: string;
  expiresAt: string | null;
  createdAt: string;
}

type GrantType = 'individual' | 'role_based' | 'purchase';
type ExpiryOption = 'never' | '30d' | '90d' | '1y' | 'custom';
type TargetType = 'video' | 'collection';

// ── API helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

function computeExpiry(option: ExpiryOption, customDate: string): string | null {
  if (option === 'never') return null;
  if (option === 'custom') return customDate || null;
  const days: Record<string, number> = { '30d': 30, '90d': 90, '1y': 365 };
  const d = new Date();
  d.setDate(d.getDate() + (days[option] || 30));
  return d.toISOString();
}

// ── Styled Components ──────────────────────────────────────────────────────
const Container = styled.div`
  width: 100%;
`;

const SectionTitle = styled.h3`
  font-size: 1.05rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1rem;
`;

const FormCard = styled.div`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const FieldGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const SearchWrap = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7rem 0.9rem 0.7rem 2.4rem;
  min-height: 44px;
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus { border-color: #00ffff; }
  &::placeholder { color: #475569; }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #475569;
  pointer-events: none;
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: rgba(10, 10, 26, 0.97);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  z-index: 20;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const DropdownItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.85rem;
  min-height: 44px;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  color: #e2e8f0;
  font-size: 0.88rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  &:hover { background: rgba(59, 130, 246, 0.12); }
  &:last-child { border-bottom: none; }
`;

const DropdownEmail = styled.span`
  color: #64748b;
  font-size: 0.8rem;
`;

const SelectedUser = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.9rem;
`;

const RadioRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const RadioBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.85rem;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${p => (p.$active ? 'rgba(0, 255, 255, 0.12)' : 'rgba(30, 58, 138, 0.2)')};
  border: 1px solid ${p => (p.$active ? '#00ffff' : 'rgba(59, 130, 246, 0.3)')};
  color: ${p => (p.$active ? '#00ffff' : '#94a3b8')};

  &:hover { border-color: rgba(0, 255, 255, 0.5); }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.7rem 0.9rem;
  min-height: 44px;
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  box-sizing: border-box;

  &:focus { border-color: #00ffff; }
  option { background: #0a0a1a; color: #e2e8f0; }
`;

const DateInput = styled.input`
  padding: 0.7rem 0.9rem;
  min-height: 44px;
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  margin-top: 0.4rem;

  &:focus { border-color: #00ffff; }
  &::-webkit-calendar-picker-indicator { filter: invert(0.6); }
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1.5rem;
  min-height: 44px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;

  ${p =>
    p.$variant === 'danger'
      ? `
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    &:hover { background: rgba(239, 68, 68, 0.25); }
  `
      : `
    background: linear-gradient(135deg, #3b82f6, #00c8ff);
    border: none;
    color: #fff;
    &:hover { opacity: 0.9; transform: translateY(-1px); }
    &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  `}
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.75rem 0.9rem;
  color: #fca5a5;
  font-size: 0.85rem;
  margin-bottom: 1rem;
`;

const SuccessBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  padding: 0.75rem 0.9rem;
  color: #4ade80;
  font-size: 0.85rem;
  margin-bottom: 1rem;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(59, 130, 246, 0.15);
  margin: 1.5rem 0;
`;

const GrantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const GrantItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
`;

const GrantInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const GrantEmail = styled.p`
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const GrantMeta = styled.p`
  margin: 0.15rem 0 0;
  font-size: 0.76rem;
  color: #64748b;
`;

const RevokeBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;

  &:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
`;

const EmptyGrants = styled.p`
  color: #475569;
  font-size: 0.88rem;
  text-align: center;
  padding: 1.5rem 0;
`;

// ── Component ──────────────────────────────────────────────────────────────
const AccessGrantManager: React.FC<AccessGrantManagerProps> = ({
  videoId,
  collectionId,
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Target state
  const [targetType, setTargetType] = useState<TargetType>(videoId ? 'video' : 'collection');
  const [targetId, setTargetId] = useState(videoId || collectionId || '');

  // Grant config
  const [grantType, setGrantType] = useState<GrantType>('individual');
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>('never');
  const [customDate, setCustomDate] = useState('');

  // Feedback
  const [granting, setGranting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active grants
  const [grants, setGrants] = useState<ActiveGrant[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);

  // Initialize targetId from props
  useEffect(() => {
    if (videoId) { setTargetType('video'); setTargetId(videoId); }
    else if (collectionId) { setTargetType('collection'); setTargetId(collectionId); }
  }, [videoId, collectionId]);

  // Load grants
  const loadGrants = useCallback(async () => {
    if (!targetId) return;
    setLoadingGrants(true);
    try {
      const param = targetType === 'video' ? `videoId=${targetId}` : `collectionId=${targetId}`;
      const resp = await fetch(`/api/v2/admin/access-grants?${param}`, {
        headers: authHeaders(),
      });
      if (resp.ok) {
        const data = await resp.json();
        setGrants(data.grants || []);
      }
    } catch {
      // silently fail on load
    } finally {
      setLoadingGrants(false);
    }
  }, [targetId, targetType]);

  useEffect(() => { loadGrants(); }, [loadGrants]);

  // Debounced user search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const resp = await fetch(
          `/api/v2/admin/users/search?q=${encodeURIComponent(searchQuery)}`,
          { headers: authHeaders() },
        );
        if (resp.ok) {
          const data = await resp.json();
          setSearchResults(data.users || []);
          setShowDropdown(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Grant access
  const handleGrant = useCallback(async () => {
    if (!selectedUser) {
      setError('Please select a user.');
      return;
    }
    if (!targetId) {
      setError('Please specify a target video or collection.');
      return;
    }

    setGranting(true);
    setError(null);
    setSuccess(null);

    try {
      const resp = await fetch('/api/v2/admin/access-grants', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: selectedUser.id,
          targetType,
          targetId,
          grantType,
          expiresAt: computeExpiry(expiryOption, customDate),
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Grant failed (${resp.status})`);
      }

      setSuccess(`Access granted to ${selectedUser.email}`);
      setSelectedUser(null);
      setSearchQuery('');
      loadGrants();
    } catch (e: any) {
      setError(e.message || 'Failed to grant access');
    } finally {
      setGranting(false);
    }
  }, [selectedUser, targetId, targetType, grantType, expiryOption, customDate, loadGrants]);

  // Revoke grant
  const handleRevoke = useCallback(async (grantId: string) => {
    try {
      const resp = await fetch(`/api/v2/admin/access-grants/${grantId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!resp.ok) throw new Error('Revoke failed');
      setGrants(prev => prev.filter(g => g.id !== grantId));
    } catch {
      setError('Failed to revoke grant');
    }
  }, []);

  return (
    <Container>
      <SectionTitle>Grant Access</SectionTitle>

      <FormCard>
        {/* User search */}
        <FieldGroup>
          <Label>Search User</Label>
          {selectedUser ? (
            <SelectedUser>
              <span>{selectedUser.username} ({selectedUser.email})</span>
              <RevokeBtn onClick={() => { setSelectedUser(null); setSearchQuery(''); }} aria-label="Clear user">
                <X size={14} />
              </RevokeBtn>
            </SelectedUser>
          ) : (
            <SearchWrap>
              <SearchIcon><Search size={16} /></SearchIcon>
              <Input
                placeholder="Search by email or username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                style={{ paddingLeft: '2.4rem' }}
              />
              {showDropdown && searchResults.length > 0 && (
                <Dropdown>
                  {searchResults.map(u => (
                    <DropdownItem
                      key={u.id}
                      onMouseDown={() => {
                        setSelectedUser(u);
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                    >
                      <span>{u.firstName || u.username}</span>
                      <DropdownEmail>{u.email}</DropdownEmail>
                    </DropdownItem>
                  ))}
                </Dropdown>
              )}
              {searching && (
                <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <Loader size={14} color="#64748b" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </SearchWrap>
          )}
        </FieldGroup>

        {/* Target type (only when no prop locks it) */}
        {!videoId && !collectionId && (
          <>
            <FieldGroup>
              <Label>Target Type</Label>
              <RadioRow>
                <RadioBtn $active={targetType === 'video'} onClick={() => setTargetType('video')} type="button">
                  <Video size={15} /> Video
                </RadioBtn>
                <RadioBtn $active={targetType === 'collection'} onClick={() => setTargetType('collection')} type="button">
                  <FolderOpen size={15} /> Collection
                </RadioBtn>
              </RadioRow>
            </FieldGroup>

            <FieldGroup>
              <Label>{targetType === 'video' ? 'Video ID' : 'Collection ID'}</Label>
              <Input
                placeholder={`Enter ${targetType} ID...`}
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                style={{ paddingLeft: '0.9rem' }}
              />
            </FieldGroup>
          </>
        )}

        {/* Grant type */}
        <FieldGroup>
          <Label>Grant Type</Label>
          <RadioRow>
            <RadioBtn $active={grantType === 'individual'} onClick={() => setGrantType('individual')} type="button">
              <UserPlus size={15} /> Individual
            </RadioBtn>
            <RadioBtn $active={grantType === 'role_based'} onClick={() => setGrantType('role_based')} type="button">
              <Shield size={15} /> Role-Based
            </RadioBtn>
            <RadioBtn $active={grantType === 'purchase'} onClick={() => setGrantType('purchase')} type="button">
              <Check size={15} /> Purchase
            </RadioBtn>
          </RadioRow>
        </FieldGroup>

        {/* Expiry */}
        <FieldGroup>
          <Label>Expiry</Label>
          <Select
            value={expiryOption}
            onChange={e => setExpiryOption(e.target.value as ExpiryOption)}
          >
            <option value="never">Never</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
            <option value="1y">1 Year</option>
            <option value="custom">Custom Date</option>
          </Select>
          {expiryOption === 'custom' && (
            <DateInput
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          )}
        </FieldGroup>

        {/* Feedback */}
        {error && (
          <ErrorBox>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </ErrorBox>
        )}
        {success && (
          <SuccessBox>
            <Check size={14} />
            <span>{success}</span>
          </SuccessBox>
        )}

        {/* Grant button */}
        <ActionBtn onClick={handleGrant} disabled={granting || !selectedUser}>
          {granting ? (
            <>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Granting...
            </>
          ) : (
            <>
              <UserPlus size={16} /> Grant Access
            </>
          )}
        </ActionBtn>
      </FormCard>

      {/* Active grants list */}
      <Divider />
      <SectionTitle>Active Grants</SectionTitle>

      {loadingGrants ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
          <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : grants.length === 0 ? (
        <EmptyGrants>No active grants for this {targetType}.</EmptyGrants>
      ) : (
        <GrantList>
          <AnimatePresence>
            {grants.map(grant => (
              <motion.div
                key={grant.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
              >
                <GrantItem>
                  <GrantInfo>
                    <GrantEmail>{grant.userEmail}</GrantEmail>
                    <GrantMeta>
                      {grant.grantType} &middot;{' '}
                      {grant.expiresAt
                        ? `Expires ${new Date(grant.expiresAt).toLocaleDateString()}`
                        : 'Never expires'}
                    </GrantMeta>
                  </GrantInfo>
                  <RevokeBtn
                    onClick={() => handleRevoke(grant.id)}
                    aria-label={`Revoke access for ${grant.userEmail}`}
                  >
                    <Trash2 size={16} />
                  </RevokeBtn>
                </GrantItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </GrantList>
      )}
    </Container>
  );
};

export default AccessGrantManager;
