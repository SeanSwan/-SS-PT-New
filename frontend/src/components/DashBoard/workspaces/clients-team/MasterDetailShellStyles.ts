import styled, { css, keyframes } from 'styled-components';

export const surfaceRise = keyframes`
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const staggerFadeIn = keyframes`
  0% { opacity: 0; transform: translateX(-10px); }
  100% { opacity: 1; transform: translateX(0); }
`;


export const MasterDetailContainer = styled.div`
  display: flex;
  width: 100%;
  height: calc(100vh - 64px);
  background-color: var(--bg-base, #0A0A0F);
  overflow: hidden;
  position: relative;
`;

export const MasterPane = styled.aside<{ $isCollapsed: boolean }>`
  width: ${({ $isCollapsed }) => ($isCollapsed ? '64px' : '320px')};
  min-width: ${({ $isCollapsed }) => ($isCollapsed ? '64px' : '320px')};
  background-color: var(--bg-surface, #141419);
  border-right: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.05));
  transition: width 300ms cubic-bezier(0.2, 0.8, 0.2, 1),
              min-width 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  flex-direction: column;
  z-index: 10;
  overflow: hidden;

  @media (max-width: 1023px) {
    width: 100%;
    min-width: 100%;
    border-right: none;
  }
`;

export const DetailPane = styled.main<{ $isOpenOnMobile: boolean }>`
  flex: 1;
  background-color: var(--bg-base, #0A0A0F);
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;

  @media (max-width: 1023px) {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--bg-surface, #141419);
    z-index: 20;
    transform: ${({ $isOpenOnMobile }) =>
      $isOpenOnMobile ? 'translateX(0)' : 'translateX(100%)'};
    transition: transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
`;


export const MasterHeader = styled.header`
  position: sticky;
  top: 0;
  background: color-mix(in srgb, var(--bg-surface, #141419) 85%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 5;
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.05));

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-surface, #141419);
    box-shadow: 0 2px 8px var(--shadow-ambient, rgba(0, 0, 0, 0.3));
  }
`;

export const CollapseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary, #4070C0);
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  transition: all 200ms ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const MicroStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
`;

export const StatBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;

  span {
    font-family: 'Sora', sans-serif;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary, #E0ECF4);
    opacity: 0.6;
  }

  strong {
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent-primary, #50A0F0);
  }
`;

export const AttentionStat = styled(StatBlock)`
  strong {
    color: var(--accent-gold, #C6A84B);
  }
`;

export const SearchRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

export const SearchInput = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
  border-radius: 8px;
  padding: 0 12px;
  height: 44px;
  transition: border-color 200ms ease;

  &:focus-within {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  }

  svg {
    color: var(--text-secondary, #4070C0);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    outline: none;

    &::placeholder {
      color: var(--text-subtle, rgba(224, 236, 244, 0.4));
    }
  }
`;

export const FilterButton = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
  border-radius: 8px;
  color: var(--text-secondary, #4070C0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;


export const PillarNav = styled.nav`
  display: flex;
  background: var(--bg-base, #0A0A0F);
  border-radius: 12px;
  padding: 4px;
  height: 44px;
  margin-bottom: 12px;
`;

export const PillarButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: ${({ $active }) => ($active ? 'var(--bg-elevated, #1A1A24)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #4070C0)')};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  min-height: 44px;
  padding: 0 8px;
  transition: all 200ms ease;
  white-space: nowrap;
  overflow: hidden;

  ${({ $active }) => $active && css`
    box-shadow: 0 2px 8px var(--shadow-ambient, rgba(0, 0, 0, 0.4));
  `}

  &:hover:not(:disabled) {
    color: var(--text-primary, #E0ECF4);
    background: ${({ $active }) => ($active ? 'var(--bg-elevated, #1A1A24)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent)')};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  @media (max-width: 767px) {
    span { display: none; }
    gap: 0;
  }
`;
