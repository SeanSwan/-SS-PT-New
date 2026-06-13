/**
 * COMPONENT: FriendRequests.styles
 * PURPOSE: Swan token styled-components for the friend request modal.
 * FLOW: FriendRequests consumes these primitives while FriendsList owns data state.
 * UX: Compact glass-panel rows with mobile wrapping and 44px action targets.
 */
import styled from 'styled-components';
import { focusRing } from './FriendSurfaceShared.styles';

export {
  SkeletonBlock,
  SkeletonRow,
  SkeletonTextStack,
} from './FriendSurfaceShared.styles';

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);

  svg {
    color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 84%, transparent);
  }
`;

export const HeaderTitle = styled.h2`
  flex: 1;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.25rem;
  font-weight: 700;
`;

export const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    ${focusRing}
  }
`;

export const Content = styled.div`
  padding: 16px 24px 24px;
`;

export const RequestList = styled.div`
  display: flex;
  flex-direction: column;
`;

export const RequestItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-radius: 8px;

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-wrap: wrap;
  }
`;

export const Avatar = styled.div<{ $backgroundImage?: string | null }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $backgroundImage }) =>
    $backgroundImage
      ? `url(${$backgroundImage}) center/cover`
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, var(--bg-base, #0A0A0F))'};
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  font-weight: 800;
`;

export const RequestInfo = styled.div`
  flex: 1;
  min-width: 160px;
`;

export const RequestName = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 700;
`;

export const RequestDate = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
  font-size: 0.75rem;

  svg {
    opacity: 0.75;
  }
`;

export const ActionButtons = styled.div`
  display: flex;
  flex-shrink: 0;
  gap: 8px;

  @media (max-width: 560px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const actionButtonBase = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-visible {
    ${focusRing}
  }
`;

export const AcceptBtn = styled.button`
  ${actionButtonBase}
  border: none;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, var(--bg-base, #0A0A0F));
  color: var(--accent-primary, #60C0F0);

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, var(--bg-base, #0A0A0F));
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }
`;

export const DeclineBtn = styled.button`
  ${actionButtonBase}
  border: 1px solid color-mix(in srgb, var(--status-danger, #EF5350) 46%, transparent);
  background: transparent;
  color: var(--status-danger, #EF5350);

  &:hover {
    background: color-mix(in srgb, var(--status-danger, #EF5350) 14%, transparent);
  }
`;

export const Divider = styled.hr`
  margin: 0;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  svg {
    margin-bottom: 16px;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 56%, transparent);
    opacity: 0.55;
  }
`;

export const EmptyTitle = styled.h6`
  margin: 0 0 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.25rem;
  font-weight: 700;
`;

export const EmptyText = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
  font-size: 0.875rem;
`;

export const FooterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`;

export const CloseButton = styled.button`
  min-height: 44px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  }

  &:focus-visible {
    ${focusRing}
  }
`;
