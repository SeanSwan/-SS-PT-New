import styled, { css } from 'styled-components';

export const GroupPanel = styled.section`
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-primary, #60C0F0) 4%);
  padding: 0.85rem 1.25rem;
`;

export const GroupPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

export const GroupTitleStack = styled.div`
  min-width: 0;
`;

export const GroupKicker = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
`;

export const GroupTitle = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.96rem;
  font-weight: 800;
`;

export const ToggleButton = styled.button`
  min-height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  border-radius: 8px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  padding: 0 0.85rem;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const GroupBody = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => ($open ? 'grid' : 'none')};
  gap: 0.75rem;
  margin-top: 0.85rem;
`;

export const RoleStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const RoleChip = styled.span<{ $tone?: 'owner' | 'admin' | 'member' }>`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  padding: 0 0.7rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  background: ${({ $tone }) => {
    if ($tone === 'owner') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)';
    if ($tone === 'admin') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)';
    return 'var(--bg-base, #0A0A0F)';
  }};
`;

export const InlineForm = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const TextInput = styled.input`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  padding: 0 0.85rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const ActionButton = styled.button<{ $danger?: boolean; $primary?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: ${({ $danger, $primary }) => {
    if ($danger) return 'color-mix(in srgb, var(--danger, #EF4444) 16%, var(--bg-base, #0A0A0F))';
    if ($primary) return 'var(--bg-primary, #002060)';
    return 'var(--bg-base, #0A0A0F)';
  }};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.8rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const MemberGrid = styled.div`
  display: grid;
  gap: 0.5rem;
`;

export const MemberRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
  min-height: 52px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 84%, var(--accent-primary, #60C0F0) 4%);
  padding: 0.5rem;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const MemberIdentity = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.65rem;
`;

export const MemberName = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
`;

export const MemberMeta = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.66));
  font-size: 0.68rem;
  text-transform: capitalize;
`;

export const MemberActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;

  @media (max-width: 620px) {
    justify-content: flex-start;
  }
`;

export const UserResultList = styled.div`
  display: grid;
  gap: 0.4rem;
  max-height: 180px;
  overflow-y: auto;
`;

export const UserResultButton = styled.div<{ $selected?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: ${({ $selected }) => ($selected
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
    : 'var(--bg-base, #0A0A0F)')};
  color: var(--text-primary, #E0ECF4);
  padding: 0.5rem 0.65rem;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const MiniToggle = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)'
    : 'transparent')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 0.66rem;
  padding: 0 0.75rem;
`;

export const EmptyLine = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.66));
  font-size: 0.74rem;
`;
