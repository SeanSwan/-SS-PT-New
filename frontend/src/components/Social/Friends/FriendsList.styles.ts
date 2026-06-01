/**
 * COMPONENT: FriendsList.styles
 * PURPOSE: Styled-components for the canonical social friends list.
 * FLOW: FriendsList imports these primitives for loading, empty, search, and row states.
 * UX: Touch targets remain at least 44px for mobile social use.
 */
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

export const FriendsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

export const CardPanel = styled.div`
  border-radius: 12px;
  background: var(--bg-elevated, rgba(0, 32, 96, 0.85));
  box-shadow: 0 4px 20px var(--shadow-strong, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--border-subtle, rgba(139, 92, 246, 0.08));
  overflow: hidden;

  @supports (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, rgba(0, 32, 96, 0.6));
    backdrop-filter: blur(12px);
  }
`;

export const CardBody = styled.div`
  padding: 24px;
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted, rgba(255, 255, 255, 0.7));
`;

export const HeaderTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const OutlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 6px;
  border: 1px solid var(--border-focus, rgba(139, 92, 246, 0.4));
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: var(--hover-soft, rgba(139, 92, 246, 0.1)); }
`;

export const SearchBarWrapper = styled.div`
  margin-bottom: 16px;
  position: relative;
`;

export const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  background: var(--input-bg, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;

  &::placeholder { color: var(--text-muted, rgba(255, 255, 255, 0.4)); }
  &:focus { outline: none; border-color: var(--border-focus, rgba(139, 92, 246, 0.5)); }
`;

export const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, rgba(255, 255, 255, 0.4));
  pointer-events: none;
`;

export const CountRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

export const CountText = styled.span`
  font-size: 0.875rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
`;

export const TextBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: var(--hover-faint, rgba(139, 92, 246, 0.05)); }
`;

export const FriendItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-faint, rgba(255, 255, 255, 0.06));
  transition: background-color 0.2s ease;
`;

export const FriendAvatar = styled.div<{ $backgroundImage?: string | null }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $backgroundImage }) =>
    $backgroundImage ? `url(${$backgroundImage}) center/cover` : 'var(--avatar-empty-bg, rgba(139, 92, 246, 0.2))'};
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-right: 12px;
`;

export const FriendInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const FriendName = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  display: block;
`;

export const FriendUsername = styled.span`
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
`;

export const FriendActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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

  &:hover { background: var(--danger-hover-bg, rgba(244, 67, 54, 0.1)); }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  svg { opacity: 0.5; margin-bottom: 16px; color: var(--text-muted, rgba(255, 255, 255, 0.5)); }
`;

export const EmptyTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px;
`;

export const EmptyText = styled.p`
  font-size: 0.875rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  margin: 0 0 16px;
`;

export const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: var(--button-soft-bg, rgba(139, 92, 246, 0.15));
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: var(--button-soft-hover-bg, rgba(139, 92, 246, 0.25)); }
`;

export const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $borderRadius?: string }>`
  background: linear-gradient(90deg,
    var(--skeleton-stop-1, rgba(255, 255, 255, 0.05)) 0%,
    var(--skeleton-stop-2, rgba(255, 255, 255, 0.1)) 50%,
    var(--skeleton-stop-1, rgba(255, 255, 255, 0.05)) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: ${props => props.$borderRadius || '4px'};
`;
