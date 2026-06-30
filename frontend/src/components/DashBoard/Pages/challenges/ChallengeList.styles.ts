/**
 * Challenge list styled-components.
 *
 * Shared campaign-list card primitives used by live challenge management and
 * result snapshots inside the Challenge Command Workspace.
 */

import styled from 'styled-components';
export const ChallengeList = styled.div`
  display: grid;
  gap: 12px;
`;

export const ChallengeInlineAlert = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--error, #FF6B6B) 38%, transparent);
  background: color-mix(in srgb, var(--error, #FF6B6B) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  font-weight: 800;
`;

export const ChallengeInlineNotice = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 38%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  font-weight: 800;
`;
export const ChallengeItem = styled.article`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 86%, var(--surface-primary, #002060) 14%);
`;

export const ChallengeItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  @media (max-width: 430px) { flex-direction: column; }
`;

export const ChallengeTitleGroup = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
`;

type ChallengeStatusTone = 'default' | 'live' | 'scheduled';

const effectiveStatusTone = ($status: string, $tone?: ChallengeStatusTone): ChallengeStatusTone => (
  $tone ?? ($status === 'active' ? 'live' : 'default')
);

const statusBadgeBorder = (tone: ChallengeStatusTone) => {
  if (tone === 'live') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent)';
  if (tone === 'scheduled') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 56%, transparent)';
  return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 36%, transparent)';
};

const statusBadgeBackground = (tone: ChallengeStatusTone) => {
  if (tone === 'live') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)';
  if (tone === 'scheduled') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, var(--surface-secondary, #003080) 18%)';
  return 'color-mix(in srgb, var(--surface-secondary, #003080) 62%, transparent)';
};

export const ChallengeStatusBadge = styled.span<{ $status: string; $tone?: ChallengeStatusTone }>`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid ${({ $status, $tone }) => statusBadgeBorder(effectiveStatusTone($status, $tone))};
  color: var(--text-primary, #E0ECF4);
  background: ${({ $status, $tone }) => statusBadgeBackground(effectiveStatusTone($status, $tone))};
  font-size: 0.75rem;
  font-weight: 900;
`;

export const ChallengeFactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr));
  gap: 8px;
`;

export const ChallengeFact = styled.span`
  display: grid;
  gap: 2px;
  span { color: var(--text-muted, #9FB2C8); font-size: 0.72rem; font-weight: 900; text-transform: uppercase; }
  strong { color: var(--text-primary, #E0ECF4); font-size: 0.92rem; }
`;

export const ChallengeModerationPanel = styled.div`
  display: grid;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
`;

export const ChallengeNotesField = styled.label`
  display: grid;
  gap: 6px;
  span { color: var(--text-muted, #9FB2C8); font-size: 0.76rem; font-weight: 900; text-transform: uppercase; }
  textarea {
    min-height: 76px;
    width: 100%;
    resize: vertical;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--surface-primary, #002060) 18%);
    color: var(--text-primary, #E0ECF4);
    font: inherit;
    line-height: 1.45;
  }
  textarea:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const ChallengeActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;