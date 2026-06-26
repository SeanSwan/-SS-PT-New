import styled, { css } from 'styled-components';
import type { GroupRole } from './MessagingTypes';

const roleTone = (role: GroupRole) => {
  if (role === 'owner') return 'var(--accent-gold, #C6A84B)';
  if (role === 'admin') return 'var(--accent-primary, #60C0F0)';
  return 'var(--accent-secondary, #8B5CF6)';
};

export const GroupMessageBubbleRow = styled.div<{ $isMine: boolean }>`
  display: flex;
  flex-direction: ${({ $isMine }) => ($isMine ? 'row-reverse' : 'row')};
  align-items: flex-end;
  justify-content: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
  gap: 0.65rem;
  width: 100%;
  padding: 0.25rem 0;
`;

export const GroupMessageAvatar = styled.div<{ $isMine: boolean }>`
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $isMine }) => (
    $isMine
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)'
  )};
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent), transparent 34%),
    color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, var(--bg-base, #0A0A0F));
  color: var(--text-heading, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  box-shadow: 0 10px 20px color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const GroupMessageContent = styled.div<{ $isMine: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
  max-width: min(74%, 560px);
  min-width: 0;

  @media (max-width: 640px) {
    max-width: calc(100% - 48px);
  }
`;

export const GroupSpeakerLine = styled.div<{ $isMine: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
  gap: 0.45rem;
  margin: 0 0 0.28rem;
  max-width: 100%;
`;

export const GroupSpeakerName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
`;

export const GroupRoleBadge = styled.span<{ $role: GroupRole }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 0.45rem;
  border-radius: 999px;
  border: 1px solid ${({ $role }) => `color-mix(in srgb, ${roleTone($role)} 42%, transparent)`};
  background: ${({ $role }) => `color-mix(in srgb, ${roleTone($role)} 14%, transparent)`};
  color: ${({ $role }) => roleTone($role)};
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const GroupBubbleCard = styled.div<{ $isMine: boolean }>`
  width: fit-content;
  max-width: 100%;
  padding: 0.72rem 0.9rem;
  border-radius: 16px;
  border: 1px solid ${({ $isMine }) => (
    $isMine
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
  )};
  background: ${({ $isMine }) => (
    $isMine
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 62%, var(--bg-primary, #002060)))'
      : 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, var(--accent-primary, #60C0F0)), var(--bg-surface, #1A1A24))'
  )};
  box-shadow: ${({ $isMine }) => (
    $isMine
      ? '0 14px 30px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)'
      : '0 12px 28px color-mix(in srgb, var(--bg-base, #0A0A0F) 45%, transparent)'
  )};

  ${({ $isMine }) => $isMine && css`
    border-bottom-right-radius: 6px;
  `}

  ${({ $isMine }) => !$isMine && css`
    border-bottom-left-radius: 6px;
  `}
`;

export const GroupMessageMeta = styled.span<{ $isMine: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
  gap: 0.25rem;
  margin-top: 0.45rem;
  color: ${({ $isMine }) => (
    $isMine
      ? 'var(--text-heading, #E0ECF4)'
      : 'var(--text-muted, rgba(224, 236, 244, 0.72))'
  )};
  font-family: 'Fira Code', monospace;
  font-size: 0.62rem;
`;
