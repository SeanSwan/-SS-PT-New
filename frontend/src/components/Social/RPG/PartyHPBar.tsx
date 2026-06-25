/**
 * SUB-COMPONENT: PartyHPBar
 * Parent: SocialFeed sidebar, UserProfilePage, and mounted Community Party section
 * Purpose: Shows shared squad HP, invite-code actions, party member count, and leave/disband controls.
 * Click outcomes:
 * - Copy invite code -> writes the invite code to the clipboard when browser support is available.
 * - Leave/disband -> calls the parent party hook action and reports only generic error copy.
 */

import React, { memo, useRef, useState } from 'react';
import { Heart, Copy, LogOut, Users } from 'lucide-react';
import type { Party } from '../../../hooks/social/useParty';
import {
  ActionError,
  ActionRow,
  CopyStatus,
  HPFill,
  HPPulse,
  HPText,
  HPTrack,
  HP_TONE_COLORS,
  MetaRow,
  PartyFooter,
  PartyHeader,
  PartyName,
  PartyWrap,
  SmallBtn,
  type HpTone,
} from './PartyHPBar.styles';

interface PartyHPBarProps {
  party: Party;
  myRole: string | null;
  onLeave: () => Promise<unknown> | void;
  frameless?: boolean;
}

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(Math.max(value, min), max)
);

const normalizePartyHp = (currentHP: number, maxHP: number) => {
  const safeMax = Number.isFinite(maxHP) && maxHP > 0 ? Math.round(maxHP) : 0;

  if (safeMax <= 0) {
    return { current: 0, max: 0, pct: 0 };
  }

  const safeCurrent = Number.isFinite(currentHP)
    ? clampNumber(Math.round(currentHP), 0, safeMax)
    : 0;

  return {
    current: safeCurrent,
    max: safeMax,
    pct: clampNumber(Math.round((safeCurrent / safeMax) * 100), 0, 100),
  };
};

const hpToneFor = (pct: number): HpTone => {
  if (pct > 60) return 'strong';
  if (pct > 30) return 'warning';
  return 'critical';
};

const PartyHPBar: React.FC<PartyHPBarProps> = memo(({
  party,
  myRole,
  onLeave,
  frameless = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);
  const [confirmDisband, setConfirmDisband] = useState(false);
  const leavingRef = useRef(false);

  const hp = normalizePartyHp(party.currentHP, party.maxHP);
  const hpTone = hpToneFor(hp.pct);
  const hpColor = HP_TONE_COLORS[hpTone];
  const isLeader = myRole === 'leader';
  const isConfirmingDisband = isLeader && confirmDisband;
  const leaveLabel = isLeader
    ? (isConfirmingDisband ? 'Confirm disband party' : 'Disband party')
    : 'Leave party';
  const maxMembers = Number.isFinite(party.maxMembers) && party.maxMembers > 0
    ? Math.round(party.maxMembers)
    : 1;
  const memberCount = clampNumber(party.members?.length || 1, 1, maxMembers);

  const copyCode = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopied(false);
      setCopyMessage('Copy unavailable. Select the invite code manually.');
      return;
    }

    try {
      await navigator.clipboard.writeText(party.inviteCode);
      setCopied(true);
      setCopyMessage('Invite code copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyMessage('Copy unavailable. Select the invite code manually.');
    }
  };

  const handleLeave = async () => {
    if (isLeader && !confirmDisband) {
      setLeaveError('');
      setConfirmDisband(true);
      return;
    }

    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaveError('');
    setIsLeaving(true);

    try {
      await onLeave();
    } catch {
      setLeaveError('Unable to update party. Please try again later.');
    } finally {
      leavingRef.current = false;
      setIsLeaving(false);
      setConfirmDisband(false);
    }
  };

  return (
    <PartyWrap $frameless={frameless}>
      <PartyHeader>
        <Heart size={14} color={hpColor} aria-hidden="true" />
        <PartyName>{party.name}</PartyName>
        <HPText $tone={hpTone}>{hp.current}/{hp.max} HP</HPText>
      </PartyHeader>

      <HPTrack
        role="progressbar"
        aria-label={`${party.name} squad HP`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hp.pct}
        aria-valuetext={`${hp.current} of ${hp.max} HP`}
      >
        <HPFill $tone={hpTone} $pct={hp.pct} />
        {hp.max > 0 && hp.pct <= 20 && <HPPulse $tone={hpTone} />}
      </HPTrack>

      <PartyFooter>
        <MetaRow aria-label={`${memberCount} of ${maxMembers} party members`}>
          <Users size={12} aria-hidden="true" />
          <span>{memberCount}/{maxMembers}</span>
        </MetaRow>

        <ActionRow>
          <SmallBtn
            type="button"
            onClick={copyCode}
            title="Copy invite code"
            aria-label={`Copy invite code ${party.inviteCode}`}
          >
            <Copy size={12} aria-hidden="true" />
            {copied ? 'Copied!' : party.inviteCode}
          </SmallBtn>
          <SmallBtn
            type="button"
            onClick={handleLeave}
            title={leaveLabel}
            aria-label={leaveLabel}
            aria-busy={isLeaving}
            disabled={isLeaving}
          >
            <LogOut size={12} aria-hidden="true" />
            {isConfirmingDisband && <span>Confirm</span>}
          </SmallBtn>
        </ActionRow>
      </PartyFooter>

      {leaveError && <ActionError role="alert">{leaveError}</ActionError>}
      <CopyStatus role="status" aria-live="polite">{copyMessage}</CopyStatus>
    </PartyWrap>
  );
});

PartyHPBar.displayName = 'PartyHPBar';
export default PartyHPBar;
