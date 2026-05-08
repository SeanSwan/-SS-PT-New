/**
 * Styled shell primitives for the canonical admin gamification surface.
 */

import styled from 'styled-components';

export const HeaderDescription = styled.div`
  margin-bottom: 2rem;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
`;

export const TabLoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

export const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--border-subtle, rgba(96, 192, 240, 0.14));
  margin-bottom: 1.5rem;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: var(--surface-subtle, rgba(255, 255, 255, 0.05));
  }

  &::-webkit-scrollbar-thumb {
    background: var(--accent-primary-soft, rgba(96, 192, 240, 0.26));
    border-radius: 2px;
  }
`;

export const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  background: ${({ $active }) => ($active ? 'var(--accent-primary-soft, rgba(96, 192, 240, 0.1))' : 'transparent')};
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'transparent')};
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.72))'};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-bottom: -2px;

  &:hover {
    background: var(--accent-primary-hover-soft, rgba(96, 192, 240, 0.08));
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: -2px;
  }

  svg {
    flex-shrink: 0;
  }
`;

export const TabPanelContainer = styled.div`
  &[hidden] {
    display: none;
  }
`;

export const TabContent = styled.div`
  padding: 1.5rem 0;
`;
