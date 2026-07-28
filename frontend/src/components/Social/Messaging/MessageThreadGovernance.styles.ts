/**
 * FILE: MessageThreadGovernance.styles.ts
 * PURPOSE: Styled controls for thread-level messaging governance actions.
 */
import styled from 'styled-components';

export const GovernanceBand = styled.div`
  display: grid;
  gap: 0.7rem;
  padding: 0.7rem 1.25rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-primary, #60C0F0) 5%);
`;

export const ToolRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const ToolButton = styled.button<{ $active?: boolean; $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $danger, $active }) => ($danger
    ? 'color-mix(in srgb, var(--error, #EF4444) 45%, transparent)'
    : $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 65%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent)')};
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, var(--bg-base, #0A0A0F))' : 'var(--bg-base, #0A0A0F)')};
  color: ${({ $danger }) => ($danger ? 'var(--error, #EF4444)' : 'var(--text-primary, #E0ECF4)')};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const SearchPanel = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.55rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const SearchLabel = styled.label`
  grid-column: 1 / -1;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-size: 0.75rem;
`;

export const SearchInput = styled.input`
  min-height: 44px;
  min-width: 0;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 0.8rem;
`;

export const RunSearchButton = styled(ToolButton)`
  padding: 0 0.9rem;
  min-width: 86px;
`;

export const SearchResults = styled.div`
  grid-column: 1 / -1;
  display: grid;
  gap: 0.4rem;
`;

export const SearchResult = styled.div`
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  padding: 0.6rem 0.7rem;
  color: var(--text-primary, #E0ECF4);
  overflow-wrap: anywhere;
`;

export const SearchEmpty = styled(SearchResult)`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
`;