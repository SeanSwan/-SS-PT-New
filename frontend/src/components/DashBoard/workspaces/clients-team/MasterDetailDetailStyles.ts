import styled, { css } from 'styled-components';
import { surfaceRise } from './MasterDetailShellStyles';
import { ClientAvatar } from './MasterDetailCardStyles';

export const DetailContentWrapper = styled.div`
  animation: ${surfaceRise} 350ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  padding: 24px;
  min-width: 0;
  max-width: 100%;

  @media (max-width: 768px) {
    padding: 14px 12px 18px;
  }
`;

export const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  margin-bottom: 24px;

  @media (max-width: 640px) {
    margin-bottom: 16px;
  }
`;

export const DetailClientInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;

  > div {
    min-width: 0;
  }
`;

export const DetailAvatar = styled(ClientAvatar)`
  width: 56px;
  height: 56px;
  min-width: 56px;
  font-size: 20px;
`;

export const DetailName = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 24px;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  overflow-wrap: anywhere;

  @media (max-width: 640px) {
    font-size: 19px;
    line-height: 1.2;
  }
`;

export const DetailTabBar = styled.nav`
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
  margin-bottom: 24px;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, calc((100% - 6px) / 3)));
    gap: 3px;
    border-bottom: none;
    margin-bottom: 16px;
    overflow: visible;
  }
`;

export const DetailTabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #4070C0)')};
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 200ms ease;
  min-height: 44px;
  white-space: nowrap;

  ${({ $active }) => $active && css`
    box-shadow: 0 2px 8px var(--shadow-accent, rgba(96, 192, 240, 0.2));
  `}

  &:hover:not(:disabled) {
    color: var(--text-primary, #E0ECF4);
    border-bottom-color: ${({ $active }) => (
      $active
        ? 'var(--accent-primary, #60C0F0)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)'
    )};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  @media (max-width: 640px) {
    box-sizing: border-box; flex-direction: column;
    min-width: 0;
    gap: 2px; padding: 6px 3px;
    border: 1px solid ${({ $active }) => (
      $active
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 65%, transparent)'
        : 'var(--border-soft, rgba(224, 236, 244, 0.08))'
    )};
    border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(224, 236, 244, 0.08))')};
    border-radius: 8px;
    box-shadow: none;
    font-size: 9px; line-height: 1; letter-spacing: 0;
    overflow: hidden; white-space: nowrap;

    svg {
      flex: 0 0 auto;
      width: 12px; height: 12px;
    }
  }
`;

export const DetailTabLabel = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: center;
`;

export const DetailTabPanel = styled.div`
  opacity: 1;
  transition: opacity 200ms ease-in-out;
  min-width: 0;
  max-width: 100%;

  > * {
    min-width: 0;
  }
`;

export const PlaceholderShell = styled.div`
  padding: 48px 24px;
  text-align: center;
  background: var(--bg-surface, #141419);
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.05));
`;

export const PlaceholderTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px;
`;

export const PlaceholderText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-secondary, #4070C0);
  margin: 0;
`;


export const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 48px;
  text-align: center;
`;

export const EmptyStateTitle = styled.h2`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 32px;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 16px;
  opacity: 0.9;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

export const EmptyStateSubtext = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-secondary, #4070C0);
  max-width: 400px;
  line-height: 1.6;
`;


export const MobileBackButton = styled.button`
  display: none;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: none;
  border: none;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;

  @media (max-width: 1023px) {
    display: flex;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;


export const PillarContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
`;

export const PillarSubTab = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: ${({ $active }) => (
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'
      : 'transparent'
  )};
  border: none;
  border-left: 2px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #4070C0)')};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  transition: all 200ms ease;
  border-radius: 0 8px 8px 0;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  svg {
    flex-shrink: 0;
    opacity: 0.7;
  }
`;
