/**
 * COMPONENT: FriendsList.styles
 * PURPOSE: Styled-components for the canonical social friends list.
 * FLOW: FriendsList imports these primitives for loading, empty, search, and row states.
 * UX: Touch targets remain at least 44px for mobile social use.
 */
import styled from 'styled-components';
import { focusRing } from './FriendSurfaceShared.styles';

export {
  SkeletonBlock,
  SkeletonRow as SkeletonFriendRow,
  SkeletonTextStack,
} from './FriendSurfaceShared.styles';
export { OutlineBtn, PrimaryBtn, TextBtn } from './FriendsListActions.styles';

export const FriendsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

export const CardPanel = styled.div`
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-elevated, #003080) 84%, transparent);
  box-shadow: 0 18px 48px color-mix(in srgb, var(--bg-base, #0A0A0F) 48%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  overflow: hidden;

  @supports (backdrop-filter: blur(12px)) {
    background: color-mix(in srgb, var(--bg-elevated, #003080) 64%, transparent);
    backdrop-filter: blur(12px);
  }
`;

export const CardBody = styled.div`
  padding: 24px;

  @media (max-width: 640px) {
    padding: 18px;
  }
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
`;

export const HeaderTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const SearchBarWrapper = styled.div`
  margin-bottom: 16px;
  position: relative;
`;

export const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 16px 10px 40px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 28%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 46%, transparent);
  }

  &:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 62%, transparent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  }
`;

export const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 48%, transparent);
  pointer-events: none;
`;

export const CountRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const CountText = styled.span`
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
`;

export const ActionBadge = styled.span`
  min-width: 24px;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.2;
`;

export const FriendsListBody = styled.div`
  display: flex;
  flex-direction: column;
`;

export const FriendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent);

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-wrap: wrap;
  }
`;

export const FriendAvatar = styled.div<{ $backgroundImage?: string | null }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $backgroundImage }) =>
    $backgroundImage
      ? `url(${$backgroundImage}) center/cover`
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, var(--bg-base, #0A0A0F))'};
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 800;
  flex-shrink: 0;
`;

export const FriendInfo = styled.div`
  flex: 1;
  min-width: 160px;
`;

export const FriendName = styled.span`
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  display: block;
`;

export const FriendUsername = styled.span`
  font-size: 0.8125rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
`;

export const FriendActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  @media (max-width: 560px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

export const RemoveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--status-danger, #EF5350);
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--status-danger, #EF5350) 14%, transparent);
  }

  &:focus-visible {
    ${focusRing}
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  svg {
    opacity: 0.55;
    margin-bottom: 16px;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  }
`;

export const EmptyTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px;
`;

export const EmptyText = styled.p`
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  margin: 0 0 16px;
`;
