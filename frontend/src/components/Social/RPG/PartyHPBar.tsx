/**
 * ┌─── SUB-COMPONENT: PartyHPBar ──────────────────────────────┐
 * │ PARENT: SocialFeed sidebar / UserProfilePage                │
 * │ PURPOSE: Shared HP bar for party/linkshell groups           │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ ♥ Iron Wolves    72/100 HP       │                        │
 * │ │ ████████████████░░░░░            │                        │
 * │ │ 3/5 members  Code: A1B2C3D4     │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { party, myRole, onLeave, onCopyCode }               │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Copy Code] → clipboard copy invite code                    │
 * │ [Leave] → POST /api/social/parties/leave                    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Heart, Copy, LogOut, Users } from 'lucide-react';
import type { Party } from '../../../hooks/social/useParty';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface PartyHPBarProps {
  party: Party;
  myRole: string | null;
  onLeave: () => void;
  frameless?: boolean;
}

const PartyHPBar: React.FC<PartyHPBarProps> = memo(({ party, myRole, onLeave, frameless = false }) => {
  const [copied, setCopied] = useState(false);
  const hpPct = Math.round((party.currentHP / party.maxHP) * 100);
  const hpColor = hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#fbbf24' : '#ef4444';

  const copyCode = () => {
    navigator.clipboard.writeText(party.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PartyWrap $frameless={frameless}>
      <PartyHeader>
        <Heart size={14} color={hpColor} />
        <PartyName>{party.name}</PartyName>
        <HPText $color={hpColor}>{party.currentHP}/{party.maxHP} HP</HPText>
      </PartyHeader>

      <HPTrack>
        <HPFill $color={hpColor} $pct={hpPct} />
        {hpPct <= 20 && <HPPulse $color={hpColor} />}
      </HPTrack>

      <PartyFooter>
        <MetaRow>
          <Users size={12} />
          <span>{party.members?.length || 1}/{party.maxMembers}</span>
        </MetaRow>

        <ActionRow>
          <SmallBtn onClick={copyCode} title="Copy invite code">
            <Copy size={12} />
            {copied ? 'Copied!' : party.inviteCode}
          </SmallBtn>
          <SmallBtn onClick={onLeave} title={myRole === 'leader' ? 'Disband party' : 'Leave party'}>
            <LogOut size={12} />
          </SmallBtn>
        </ActionRow>
      </PartyFooter>
    </PartyWrap>
  );
});

PartyHPBar.displayName = 'PartyHPBar';
export default PartyHPBar;

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const PartyWrap = styled.div<{ $frameless?: boolean }>`
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  margin: 12px 0;

  ${({ $frameless }) => $frameless && css`
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    margin: 0;
  `}
`;

const PartyHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

const PartyName = styled.span`
  flex: 1;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const HPText = styled.span<{ $color: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: ${({ $color }) => $color};
`;

const HPTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: var(--bg-base, #030712);
  overflow: hidden;
`;

const HPFill = styled.div<{ $color: string; $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 4px;
  background: ${({ $color }) => $color};
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;

const HPPulse = styled.div<{ $color: string }>`
  position: absolute;
  inset: 0;
  background: ${({ $color }) => $color};
  animation: ${pulse} 1s ease-in-out infinite;
  border-radius: 4px;
`;

const PartyFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
`;

const ActionRow = styled.div`
  display: flex;
  gap: 4px;
`;

const SmallBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  min-height: 28px;
  border-radius: 6px;
  border: none;
  background: var(--bg-base, #030712);
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover { color: var(--accent-primary, #60C0F0); }
`;
