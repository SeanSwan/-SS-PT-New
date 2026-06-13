/**
 * COMPONENT: FriendsListActions.styles
 * PURPOSE: Shared action controls for the canonical friends list panel.
 * FLOW: FriendsList.styles re-exports these buttons for the mounted friends tab.
 * UX: Keeps all friend-list controls at 44px with Swan blue/purple focus treatment.
 */
import styled from 'styled-components';
import { focusRing } from './FriendSurfaceShared.styles';

export const OutlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 22%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent);
  }

  &:focus-visible {
    ${focusRing}
  }
`;

export const TextBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  }

  &:focus-visible {
    ${focusRing}
  }
`;

export const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, var(--bg-base, #0A0A0F));
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, var(--bg-base, #0A0A0F));
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  }

  &:focus-visible {
    ${focusRing}
  }
`;
