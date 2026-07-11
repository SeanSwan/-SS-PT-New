import styled from 'styled-components';

export const DockShell = styled.aside`
  position: fixed;
  right: clamp(14px, 2vw, 26px);
  bottom: clamp(14px, 2vw, 26px);
  z-index: 60;
  width: min(340px, calc(100vw - 28px));
  padding: 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  box-shadow: 0 18px 54px color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent);

  @media (max-width: 720px) {
    left: 14px;
    right: 14px;
    bottom: 14px;
    width: auto;
  }
`;

export const DockMiniButton = styled.button`
  position: fixed;
  right: clamp(14px, 2vw, 26px);
  bottom: clamp(14px, 2vw, 26px);
  z-index: 60;
  min-height: 44px;
  border-radius: 999px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 94%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 12px 34px color-mix(in srgb, var(--bg-base, #0A0A0F) 45%, transparent);
`;

export const DockHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
`;

export const DockIdentity = styled.div`
  min-width: 0;
`;

export const DockHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

export const DockIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);
  color: var(--text-secondary, #A8B7C7);
  cursor: pointer;
`;

export const DockEyebrow = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 3px;
`;

export const DockTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 800;
`;

export const DockBadge = styled.span`
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 9px;
  color: var(--accent-warning, #C6A84B);
  background: color-mix(in srgb, var(--accent-warning, #C6A84B) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-warning, #C6A84B) 22%, transparent);
  font-size: 11px;
  font-weight: 800;
`;

export const DockBody = styled.p`
  margin: 0 0 12px;
  color: var(--text-secondary, #A8B7C7);
  font-size: 13px;
  line-height: 1.5;
`;

export const DockMeter = styled.div`
  height: 7px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  margin-bottom: 12px;
`;

export const DockMeterFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  transition: width 0.35s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const DockActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const DockButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid ${({ $primary }) => $primary
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent)'};
  background: ${({ $primary }) => $primary
    ? 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))'
    : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent)'};
  color: ${({ $primary }) => $primary ? 'var(--bg-base, #0A0A0F)' : 'var(--text-primary, #E0ECF4)'};
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  padding: 0 12px;
  transition: opacity 0.15s ease, transform 0.15s ease;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: translateY(1px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active { transform: none; }
  }
`;

export const DockState = styled.div`
  color: var(--text-secondary, #A8B7C7);
  font-size: 13px;
`;
