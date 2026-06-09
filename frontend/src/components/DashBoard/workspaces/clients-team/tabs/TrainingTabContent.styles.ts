import styled from 'styled-components';

/**
 * Phase 13.2 scroll-ownership fix:
 * The embedded route owns scroll at the page level. The shell stays visible and
 * does not clip expanded workout sessions, notes, or edit controls.
 */
export const LayoutWrapper = styled.div`
  display: flex;
  min-height: 400px;
  min-width: 0;
  max-width: 100%;
  gap: 0;
  border-radius: 12px;
  overflow: visible;
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));

  @media (max-width: 767px) {
    flex-direction: column;
    min-height: 360px;
  }
`;

export const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  width: 240px;
  min-width: 0;
  flex-shrink: 0;
  background: var(--bg-elevated, #1A1A24);
  border-right: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));

  @media (min-width: 768px) and (max-width: 1023px) {
    width: 72px;
    align-items: center;
    padding: 8px 4px;
  }

  @media (max-width: 767px) {
    flex-direction: row;
    width: 100%;
    max-width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
    padding: 6px;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

export const SidebarItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 180ms ease;
  position: relative;
  white-space: nowrap;
  flex-shrink: 0;

  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #94a3b8)'};
  background: ${({ $active }) =>
    $active ? 'var(--bg-active-sidebar, #003080)' : 'transparent'};
  text-shadow: ${({ $active }) =>
    $active
      ? '0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent)'
      : 'none'};

  ${({ $active }) =>
    $active &&
    `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      bottom: 4px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: var(--accent-secondary, #8B5CF6);
    }
  `}

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'var(--bg-active-sidebar, #003080)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    justify-content: center;
    padding: 10px;
    width: 56px;
    min-height: 48px;

    & > span {
      display: none;
    }

    &::before {
      top: 6px;
      bottom: 6px;
    }
  }

  @media (max-width: 767px) {
    flex: 0 0 auto;
    min-height: 44px;
    padding: 8px 14px;
    border-radius: 20px;
    gap: 6px;
    font-size: 12px;

    &::before {
      display: none;
    }

    ${({ $active }) =>
      $active &&
      `
      border: 1.5px solid var(--accent-secondary, #8B5CF6);
    `}

    & > span.full-label {
      display: none;
    }

    & > span.short-label {
      display: inline;
    }
  }

  @media (min-width: 768px) {
    & > span.short-label {
      display: none;
    }

    & > span.full-label {
      display: inline;
    }
  }
`;

export const ContentArea = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  padding: 16px;
  overflow: visible;

  @media (max-width: 767px) {
    padding: 10px 8px 12px;
  }
`;

export const ShimmerLoader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;

  & > div {
    height: 20px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--accent-primary, #50A0F0) 10%, var(--bg-surface, #141419));
    animation: shimmer 1.5s ease-in-out infinite alternate;
  }

  & > div:nth-child(1) {
    width: 70%;
  }

  & > div:nth-child(2) {
    width: 90%;
  }

  & > div:nth-child(3) {
    width: 55%;
  }

  @keyframes shimmer {
    0% {
      opacity: 0.4;
    }

    100% {
      opacity: 0.8;
    }
  }
`;

export const PlaceholderCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  border-radius: 12px;
  background: var(--bg-elevated, #1A1A24);
  border: 1px dashed var(--border-soft, rgba(224, 236, 244, 0.1));

  h4 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16px;
    color: var(--text-primary, #E0ECF4);
    margin: 12px 0 6px;
  }

  p {
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    color: var(--text-muted, #64748b);
    margin: 0;
  }
`;
