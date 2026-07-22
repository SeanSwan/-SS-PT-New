/**
 * FILE: ClientDashboardHome.layoutStyles.ts
 * PURPOSE: Shell, navigation, hero, and responsive layout styles.
 */
import styled from 'styled-components';

export const ClientDashboardShell = styled.div<{ $embedded?: boolean }>`
  --client-bg: var(--bg-base, #030712);
  --client-panel: var(--surface-primary, #06142a);
  --client-panel-strong: var(--surface-elevated, #0a1f3d);
  --client-panel-soft: var(--card-bg, #08162b);
  --client-text: var(--text-primary, #e0ecf4);
  --client-muted: var(--text-secondary, #9db4c8);
  --client-faint: var(--text-muted, #6f849a);
  --client-line: color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent);
  --client-line-strong: color-mix(in srgb, var(--accent-primary, #60c0f0) 42%, transparent);
  --client-teal: var(--accent-primary, #60c0f0);
  /* Ice Wing is the Crystalline accent — the prior fallback was an off-palette
     teal-green, and --accent-secondary is Wing Purple, not mint. Repointed to
     Ice Wing (--accent-primary) so hero fill, avatar glow, active nav edge,
     kicker labels, and the primary-button gradient read on-brand. */
  --client-mint: var(--accent-primary, #60c0f0);
  --client-blue: var(--accent-tertiary, #4070c0);
  --client-purple: var(--accent-purple, #8b5cf6);
  --client-gold: var(--accent-gold, #c6a84b);
  --client-success: var(--success-color, #19d27e);
  --client-black: var(--shadow-color, #000000);
  min-height: ${({ $embedded }) => ($embedded ? 'auto' : '100vh')};
  border: ${({ $embedded }) => ($embedded ? '1px solid color-mix(in srgb, var(--client-teal) 16%, transparent)' : '0')};
  border-radius: ${({ $embedded }) => ($embedded ? '18px' : '0')};
  background: ${({ $embedded }) => ($embedded
    ? 'transparent'
    : `
      radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--client-teal) 16%, transparent), transparent 28rem),
      radial-gradient(circle at 86% 6%, color-mix(in srgb, var(--client-blue) 18%, transparent), transparent 34rem),
      linear-gradient(180deg, var(--client-bg), color-mix(in srgb, var(--client-bg) 86%, var(--client-black)))`
  )};
  color: var(--client-text);
  font-family: 'Sora', 'Plus Jakarta Sans', system-ui, sans-serif;
  overflow-x: hidden;
`;

export const ClientTopNav = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 58px;
  padding: 0 22px;
  border-bottom: 1px solid color-mix(in srgb, var(--client-line) 78%, transparent);
  background: color-mix(in srgb, var(--client-bg) 88%, transparent);
  backdrop-filter: blur(18px);

  @media (max-width: 1120px) {
    grid-template-columns: auto 1fr auto;
  }

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    align-items: stretch;
    gap: 8px;
    padding: 10px 14px;
  }
`;

export const ClientBrand = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 11px;
  position: relative;
  z-index: 2;
  width: fit-content;
  max-width: 100%;
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--client-text);
  font: inherit;
  font-weight: 800;
  cursor: pointer;

  img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }

  span {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 1.05rem;
  }

  @media (max-width: 760px) {
    width: 100%;

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

export const TopNavLinks = styled.nav`
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-width: 0;
  gap: 20px;

  @media (max-width: 1180px) {
    gap: 12px;
  }

  @media (max-width: 920px) {
    display: none;
  }
`;

export const TopNavLink = styled.button<{ $active?: boolean }>`
  position: relative;
  min-width: 44px;
  min-height: 54px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: ${({ $active }) => ($active ? 'var(--client-text)' : 'var(--client-muted)')};
  font: inherit;
  font-size: 0.84rem;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  white-space: nowrap;
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    border-radius: 999px;
    background: ${({ $active }) => ($active ? 'var(--client-mint)' : 'transparent')};
    box-shadow: ${({ $active }) => ($active ? '0 0 14px var(--client-mint)' : 'none')};
  }
`;

export const TopActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  min-width: 0;

  @media (max-width: 760px) {
    justify-content: flex-start;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    gap: 6px;
    padding-bottom: 2px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;

    > * {
      flex: 0 0 auto;
    }

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const IconButton = styled.button`
  position: relative;
  display: inline-grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--client-muted);
  cursor: pointer;

  &:not(:disabled):hover,
  &:focus-visible {
    color: var(--client-text);
    border-color: var(--client-line-strong);
    background: color-mix(in srgb, var(--client-panel-strong) 78%, transparent);
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const ActionCount = styled.span`
  position: absolute;
  top: 6px;
  right: 5px;
  min-width: 16px;
  min-height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--client-mint);
  color: var(--client-bg);
  font-size: 0.62rem;
  font-weight: 900;
`;

export const UserMenuButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--client-text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--client-mint);
    box-shadow: 0 0 18px color-mix(in srgb, var(--client-mint) 46%, transparent);
  }

  @media (max-width: 760px) {
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    justify-content: center;
    gap: 0;

    img {
      width: 34px;
      height: 34px;
    }

    span,
    svg {
      display: none;
    }
  }

  @media (max-width: 520px) {
    span {
      display: none;
    }
  }
`;

export const DashboardFrame = styled.div<{ $embedded?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $embedded }) => ($embedded ? 'minmax(0, 1fr)' : '242px minmax(0, 1fr)')};
  min-height: ${({ $embedded }) => ($embedded ? 'auto' : 'calc(100vh - 58px)')};

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const MainCanvas = styled.main<{ $embedded?: boolean }>`
  min-width: 0;
  padding: ${({ $embedded }) => ($embedded ? '18px 18px 22px' : '18px 24px 26px')};

  @media (max-width: 760px) {
    padding: 14px 12px 22px;
  }
`;

export const BackgroundSettingsSlot = styled.div`
  margin-bottom: 14px;
`;

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 326px;
  gap: 20px;

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
  }
`;
