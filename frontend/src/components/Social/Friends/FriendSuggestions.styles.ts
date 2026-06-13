/**
 * COMPONENT: FriendSuggestions.styles
 * PURPOSE: Swan token styled-components for friend discovery and search.
 * FLOW: FriendSuggestions renders data owned by FriendsList's shared friends API.
 * UX: Mobile-first rows, clear status badges, and 44px discovery controls.
 */
import styled, { keyframes } from 'styled-components';
import { SwanTabBar, SwanTabButton } from '../../common/SwanTabs.styles';
import { focusRing } from './FriendSurfaceShared.styles';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export {
  CloseButton,
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
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.25rem;
  font-weight: 700;
`;

export const Content = styled.div`
  padding: 0 24px 24px;
`;

export const TabBar = styled(SwanTabBar)`
  overflow-x: visible;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
`;

export const TabButton = styled(SwanTabButton)`
  min-width: 0;
  padding: 12px 24px;
  margin-bottom: -1px;
  background: none;
  color: ${({ $active }) => (
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent)'
  )};
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  white-space: normal;

  &:hover {
    color: ${({ $active }) => (
      $active
        ? 'var(--accent-primary, #60C0F0)'
        : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 88%, transparent)'
    )};
    background: transparent;
  }

  &:focus-visible {
    ${focusRing}
  }
`;

export const SubText = styled.p`
  margin: 16px 0 8px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  font-size: 0.875rem;
`;

export const SuggestionList = styled.div`
  display: flex;
  flex-direction: column;
`;

export const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);

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

export const UserInfo = styled.div`
  flex: 1;
  min-width: 160px;
`;

export const UserName = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 700;
`;

export const Username = styled.span`
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
  font-size: 0.8125rem;
`;

export const SentBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  color: var(--status-success, #66BB6A);
  font-size: 0.875rem;
  font-weight: 800;
`;

export const OutlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 44%, transparent);
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &:focus-visible {
    ${focusRing}
  }
`;

export const SearchWrapper = styled.div`
  position: relative;
  margin: 16px 0;
`;

export const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 96px 10px 40px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 28%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;

  &::placeholder {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 46%, transparent);
  }

  &:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 62%, transparent);
  }
`;

export const SearchIconEl = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 48%, transparent);
  pointer-events: none;
`;

export const SearchBtn = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  min-height: 44px;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &:focus-visible {
    ${focusRing}
  }
`;

export const Spinner = styled.div`
  width: 20px;
  height: 20px;
  margin: 0 auto;
  border: 2px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  border-top-color: var(--accent-primary, #60C0F0);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export const CenterBox = styled.div`
  display: flex;
  justify-content: center;
  padding: 32px 0;
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

export const EmptyTitle = styled.p`
  margin: 0 0 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
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
