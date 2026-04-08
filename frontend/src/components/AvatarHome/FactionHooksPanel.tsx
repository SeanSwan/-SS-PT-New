/**
 * ┌─── COMPONENT: FactionHooksPanel ────────────────────────────┐
 * │ PURPOSE: Corporate Faction system architecture hooks.       │
 * │ Join/leave factions, view faction ID. UI ready for future   │
 * │ faction leaderboards + team challenges.                     │
 * │ PHASE 3: Architecture only — full business logic later.     │
 * │ CEO RULING: Hooks only, no full faction warfare yet.        │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Shield, Users, LogIn, LogOut, Loader } from 'lucide-react';

const Panel = styled.div`
  padding: 20px;
  border-radius: 16px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.12);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
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
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.2);
  color: #C6A84B;
  text-transform: uppercase;
`;

const Description = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0 0 16px;
  line-height: 1.5;
`;

const FactionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const FactionBadge = styled.div`
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.06);
  border: 1px solid rgba(96, 192, 240, 0.15);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--accent-primary, #60C0F0);
  flex: 1;
`;

const Input = styled.input`
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  flex: 1;
  outline: none;
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
`;

const ActionBtn = styled.button<{ $variant?: string }>`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: ${({ $variant }) => $variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, #002060, #8B5CF6)'};
  color: ${({ $variant }) => $variant === 'danger' ? '#EF4444' : '#E0ECF4'};
  ${({ $variant }) => $variant === 'danger' ? 'border: 1px solid rgba(239, 68, 68, 0.2);' : ''}
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
`;

const FeatureItem = styled.li`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  padding: 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.05);
`;

const FactionHooksPanel: React.FC = () => {
  const [factionId, setFactionId] = useState<string | null>(null);
  const [inputFaction, setInputFaction] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchFaction = useCallback(async () => {
    try {
      const res = await fetch('/api/avatar-home/faction', { headers });
      const d = await res.json();
      if (d.success) setFactionId(d.data.factionId);
    } catch { /* best-effort */ }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchFaction(); }, [fetchFaction]);

  const handleJoin = async () => {
    if (!inputFaction.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/avatar-home/faction', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ factionId: inputFaction.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setFactionId(d.data.factionId);
        setInputFaction('');
      }
    } catch { /* best-effort */ }
    setUpdating(false);
  };

  const handleLeave = async () => {
    setUpdating(true);
    try {
      const res = await fetch('/api/avatar-home/faction', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ factionId: null }),
      });
      const d = await res.json();
      if (d.success) setFactionId(null);
    } catch { /* best-effort */ }
    setUpdating(false);
  };

  if (loading) {
    return (
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(224,236,244,0.7)' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <Header>
        <Shield size={18} color="var(--accent-primary, #60C0F0)" />
        <Title>Corporate Factions</Title>
        <ComingSoonTag>Architecture Hook</ComingSoonTag>
      </Header>

      <Description>
        Represent your gym, team, or company. Faction leaderboards and team challenges coming soon.
      </Description>

      {factionId ? (
        <>
          <FactionRow>
            <Users size={16} color="var(--accent-primary, #60C0F0)" />
            <FactionBadge>{factionId}</FactionBadge>
            <ActionBtn $variant="danger" onClick={handleLeave} disabled={updating}>
              <LogOut size={14} /> {updating ? 'Leaving...' : 'Leave'}
            </ActionBtn>
          </FactionRow>
        </>
      ) : (
        <FactionRow>
          <Input
            value={inputFaction}
            onChange={e => setInputFaction(e.target.value)}
            placeholder="Enter faction name..."
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <ActionBtn onClick={handleJoin} disabled={!inputFaction.trim() || updating}>
            <LogIn size={14} /> {updating ? 'Joining...' : 'Join'}
          </ActionBtn>
        </FactionRow>
      )}

      <FeatureList>
        <FeatureItem><Shield size={12} /> Faction-wide XP leaderboards (coming soon)</FeatureItem>
        <FeatureItem><Users size={12} /> Team challenges and group goals (coming soon)</FeatureItem>
        <FeatureItem><Shield size={12} /> Faction vs. Faction competitions (coming soon)</FeatureItem>
      </FeatureList>
    </Panel>
  );
};

export default FactionHooksPanel;
