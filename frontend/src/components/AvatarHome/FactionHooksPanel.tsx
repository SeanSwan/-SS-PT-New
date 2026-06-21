/**
 * COMPONENT: FactionHooksPanel
 * PURPOSE: Corporate faction architecture hooks for Avatar Home.
 * DATA: /api/avatar-home/faction
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader, LogIn, LogOut, Shield, Users } from 'lucide-react';
import apiService from '../../services/api.service';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Panel = styled.div`
  padding: 20px;
  border-radius: 16px;
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const ComingSoonTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--accent-warning, #C6A84B) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-warning, #C6A84B) 22%, transparent);
  color: var(--accent-warning, #C6A84B);
  text-transform: uppercase;
`;

const Description = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, #B8C7D1);
  margin: 0 0 16px;
  line-height: 1.5;
`;

const FactionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const FactionBadge = styled.div`
  padding: 8px 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--accent-primary, #60C0F0);
  flex: 1;
  overflow-wrap: anywhere;
`;

const Input = styled.input`
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  flex: 1;
  outline: none;

  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
`;

const ActionBtn = styled.button<{ $variant?: 'danger' }>`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid ${({ $variant }) => (
    $variant === 'danger'
      ? 'color-mix(in srgb, var(--status-danger, #EF4444) 22%, transparent)'
      : 'transparent'
  )};
  background: ${({ $variant }) => (
    $variant === 'danger'
      ? 'color-mix(in srgb, var(--status-danger, #EF4444) 10%, transparent)'
      : 'linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6))'
  )};
  color: ${({ $variant }) => $variant === 'danger' ? 'var(--status-danger, #EF4444)' : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity 0.15s ease, border-color 0.15s ease;

  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
`;

const FeatureItem = styled.li`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, #B8C7D1);
  padding: 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary, #B8C7D1);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

const LoadingSpinner = styled(Loader)`
  animation: ${spin} 1s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const MAX_FACTION_ID_LENGTH = 50;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

const normalizeFactionId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_FACTION_ID_LENGTH) return null;
  if (CONTROL_CHARS.test(trimmed)) return null;
  return trimmed;
};

const readFactionId = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') return null;
  return normalizeFactionId((value as { factionId?: unknown }).factionId);
};

const FactionHooksPanel: React.FC = () => {
  const [factionId, setFactionId] = useState<string | null>(null);
  const [inputFaction, setInputFaction] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const updatingRef = useRef(false);

  const fetchFaction = useCallback(async () => {
    try {
      const res = await apiService.get<{ success: boolean; data?: unknown }>('/api/avatar-home/faction');
      const d = res.data;
      if (d.success) setFactionId(readFactionId(d.data));
    } catch {
      // Faction hooks are optional; Avatar Home stays usable if this side panel fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchFaction(); }, [fetchFaction]);

  const updateFaction = async (nextFactionId: string | null) => {
    if (updatingRef.current) return;
    const safeSubmittedFactionId = normalizeFactionId(nextFactionId);
    updatingRef.current = true;
    setUpdating(true);
    try {
      const res = await apiService.patch<{ success: boolean; data?: unknown }>(
        '/api/avatar-home/faction',
        { factionId: safeSubmittedFactionId }
      );
      const d = res.data;
      if (d.success) {
        setFactionId(readFactionId(d.data) ?? safeSubmittedFactionId);
        if (safeSubmittedFactionId) setInputFaction('');
      }
    } catch {
      // Best-effort optional panel; no raw service errors are surfaced here.
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  };

  const handleJoin = () => {
    const trimmedFaction = normalizeFactionId(inputFaction);
    if (trimmedFaction) void updateFaction(trimmedFaction);
  };

  const handleLeave = () => {
    void updateFaction(null);
  };

  const canJoinFaction = normalizeFactionId(inputFaction) !== null;

  if (loading) {
    return (
      <Panel>
        <LoadingRow role="status" aria-live="polite">
          <LoadingSpinner size={16} aria-hidden="true" /> Loading...
        </LoadingRow>
      </Panel>
    );
  }

  return (
    <Panel>
      <Header>
        <Shield size={18} color="var(--accent-primary, #60C0F0)" aria-hidden="true" />
        <Title>Corporate Factions</Title>
        <ComingSoonTag>Architecture Hook</ComingSoonTag>
      </Header>

      <Description>
        Represent your gym, team, or company. Faction leaderboards and team challenges coming soon.
      </Description>

      {factionId ? (
        <FactionRow>
          <Users size={16} color="var(--accent-primary, #60C0F0)" aria-hidden="true" />
          <FactionBadge>{factionId}</FactionBadge>
          <ActionBtn type="button" $variant="danger" onClick={handleLeave} disabled={updating} aria-busy={updating}>
            <LogOut size={14} aria-hidden="true" /> {updating ? 'Leaving...' : 'Leave'}
          </ActionBtn>
        </FactionRow>
      ) : (
        <FactionRow>
          <Input
            value={inputFaction}
            onChange={e => setInputFaction(e.target.value)}
            placeholder="Enter faction name..."
            aria-label="Faction name"
            disabled={updating}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleJoin();
              }
            }}
          />
          <ActionBtn type="button" onClick={handleJoin} disabled={!canJoinFaction || updating} aria-busy={updating}>
            <LogIn size={14} aria-hidden="true" /> {updating ? 'Joining...' : 'Join'}
          </ActionBtn>
        </FactionRow>
      )}

      <FeatureList>
        <FeatureItem><Shield size={12} aria-hidden="true" /> Faction-wide XP leaderboards (coming soon)</FeatureItem>
        <FeatureItem><Users size={12} aria-hidden="true" /> Team challenges and group goals (coming soon)</FeatureItem>
        <FeatureItem><Shield size={12} aria-hidden="true" /> Faction vs. Faction competitions (coming soon)</FeatureItem>
      </FeatureList>
    </Panel>
  );
};

export default FactionHooksPanel;
