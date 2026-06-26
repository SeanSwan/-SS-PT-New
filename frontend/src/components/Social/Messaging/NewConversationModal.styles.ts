import styled, { css } from 'styled-components';

export const ModeTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0.75rem 1.25rem 0;
`;

export const ModeTab = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;

  ${({ $active }) => $active && css`
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    color: var(--text-primary, #E0ECF4);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  `}

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const GroupNameInput = styled.input`
  width: calc(100% - 2.5rem);
  min-height: 44px;
  margin: 0.75rem 1.25rem 0;
  padding: 0 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.56));
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const QuickSection = styled.div`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

export const QuickLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--text-muted, #94a3b8);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

export const QuickRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb {
    background: var(--accent-primary, #60C0F0);
    border-radius: 2px;
  }
`;

export const QuickChip = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: ${({ $selected }) => ($selected
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, var(--bg-surface, #1A1A24))'
    : 'var(--bg-surface, #1A1A24)')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;

  &:hover {
    background: var(--accent-primary-10, rgba(96, 192, 240, 0.1));
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ChipAvatar = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent-primary-10, rgba(96, 192, 240, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.65rem;
  font-weight: 600;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const RoleBadge = styled.span<{ $role: string }>`
  border-radius: 4px;
  padding: 1px 5px;
  background: ${({ $role }) => ($role === 'trainer'
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)')};
  color: ${({ $role }) => ($role === 'trainer'
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.6rem;
`;

export const SelectableUserItem = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 56px;
  padding: 0.625rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: ${({ $selected }) => ($selected
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
    : 'transparent')};
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const UserText = styled.div`
  min-width: 0;
  flex: 1;
`;

export const SelectMark = styled.span<{ $selected?: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.24));
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $selected }) => ($selected ? 'var(--text-primary, #E0ECF4)' : 'transparent')};
  background: ${({ $selected }) => ($selected ? 'var(--accent-secondary, #8B5CF6)' : 'transparent')};
`;

export const FooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: var(--bg-surface, #1A1A24);
`;

export const SelectionSummary = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
`;

export const CreateButton = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  padding: 0 1rem;
  background: var(--bg-primary, #002060);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-weight: 700;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const AdminToggle = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
    : 'transparent')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 0.68rem;
  padding: 0 0.75rem;
`;




export const LoadingResults = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0.5rem;
`;