import styled, { css } from 'styled-components';

export const HeaderCopy = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
`;

export const HeaderKicker = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
`;

export const InboxTools = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

export const MetricRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
`;

export const MetricPill = styled.div<{ $urgent?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--accent-primary, #60C0F0) 8%);
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-size: 0.72rem;

  strong {
    color: ${({ $urgent }) => ($urgent ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)')};
    font-family: 'Sora', sans-serif;
    font-size: 0.95rem;
  }
`;

export const SearchBox = styled.label`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: var(--bg-base, #0A0A0F);
  color: var(--accent-primary, #60C0F0);
  padding: 0 0.75rem;
`;

export const InboxSearch = styled.input`
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }
`;

export const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.35rem;
`;

export const FilterButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  text-transform: capitalize;

  ${({ $active }) => $active && css`
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    color: var(--text-primary, #E0ECF4);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  `}

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const RoleLine = styled.div<{ $group?: boolean }>`
  color: ${({ $group }) => ($group ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.65rem;
  margin-top: 2px;
  text-transform: capitalize;
`;

export const SkeletonConversationRow = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  align-items: center;
`;

export const SkeletonAvatar = styled.div`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
`;

export const SkeletonStack = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;