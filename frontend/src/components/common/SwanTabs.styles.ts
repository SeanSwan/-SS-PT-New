/**
 * COMPONENT: SwanTabs.styles
 * PURPOSE: Shared Crystalline Swan tab primitives for compact dashboard panels.
 * FLOW: Imported by feature style modules that need scroll-safe 44px tab bars.
 * UX: Keeps repeated tab affordances consistent without coupling feature state.
 */
import styled from 'styled-components';

export const SwanTabBar = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
    border-radius: 2px;
  }
`;

export const SwanTabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'transparent')};
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #A9B7C8)')};
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;

  &:hover {
    color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;
