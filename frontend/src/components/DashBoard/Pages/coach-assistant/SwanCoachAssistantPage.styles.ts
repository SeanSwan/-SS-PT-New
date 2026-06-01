import styled from 'styled-components';

export const PageShell = styled.div`
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;
`;

export const MainPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
`;

export const SidebarToggle = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s ease;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 16px;
  margin: 0 12px 8px;
  border-radius: 8px;
  background: var(--danger-bg-soft, rgba(201, 42, 84, 0.1));
  border: 1px solid var(--danger-border-soft, rgba(201, 42, 84, 0.3));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  min-height: 44px;

  > span {
    flex: 1 1 220px;
    min-width: 0;
  }
`;

export const ErrorBannerActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
`;

export const ErrorBannerAction = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid
    ${({ $primary }) =>
      $primary
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent)'
        : 'var(--danger-border, rgba(201, 42, 84, 0.4))'};
  background:
    ${({ $primary }) =>
      $primary
        ? 'linear-gradient(135deg, var(--primary, #002060), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, var(--bg-surface, #1A1A24)))'
        : 'var(--danger-action-bg, rgba(201, 42, 84, 0.08))'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-primary, #60C0F0);
    background:
      ${({ $primary }) =>
        $primary
          ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--primary, #002060))'
          : 'var(--danger-action-bg-hover, rgba(201, 42, 84, 0.15))'};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const TranscriptProcessingCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  margin: 0 12px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, rgba(0, 32, 96, 0.4));
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-left: 3px solid var(--accent-primary, #60C0F0);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  min-height: 56px;

  @keyframes swan-processing-pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  }
`;

export const ProcessingDots = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

export const ProcessingDot = styled.span<{ $delay: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-primary, #60C0F0);
  animation: swan-processing-pulse 1.4s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.9;
  }
`;

export const ProcessingBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`;

export const ProcessingStage = styled.span`
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;

export const ProcessingFileName = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const NeuralLinkPill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  margin: 0 16px 8px;
  align-self: flex-start;
  border-radius: 20px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--ice-wing, #60C0F0)' : 'rgba(96,192,240,0.3)'};
  background: ${({ $active }) =>
    $active ? 'var(--ice-wing, #60C0F0)' : 'rgba(0,32,96,0.4)'};
  color: ${({ $active }) => $active ? 'var(--bg-base, #030712)' : 'var(--ice-wing, #60C0F0)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;

  &:hover {
    background: ${({ $active }) =>
      $active ? 'var(--ice-wing, #60C0F0)' : 'rgba(96,192,240,0.15)'};
    box-shadow: 0 0 12px rgba(96,192,240,0.3);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const TeachModeToggle = styled.button<{ $active?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
    : 'transparent'};
  color: ${({ $active }) => $active
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--text-muted, rgba(224, 236, 244, 0.4))'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: auto;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: var(--accent-secondary, #8B5CF6);
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
