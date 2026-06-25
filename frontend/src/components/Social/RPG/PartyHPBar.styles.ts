import styled, { css, keyframes } from 'styled-components';

export type HpTone = 'strong' | 'warning' | 'critical';

export const HP_TONE_COLORS: Record<HpTone, string> = {
  strong: 'var(--status-success, #34D399)',
  warning: 'var(--status-warning, #FBBF24)',
  critical: 'var(--status-danger, #C92A54)',
};

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
`;

export const PartyWrap = styled.div<{ $frameless?: boolean }>`
  padding: 12px 14px;
  border-radius: 8px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--swan-midnight, #002060) 22%, transparent),
      var(--bg-elevated, #141419)
    );
  border: 1px solid var(
    --border-soft,
    color-mix(in srgb, var(--swan-ice-wing, #60C0F0) 10%, transparent)
  );
  margin: 12px 0;

  ${({ $frameless }) => $frameless && css`
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    margin: 0;
  `}
`;

export const PartyHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

export const PartyName = styled.span`
  flex: 1;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const HPText = styled.span<{ $tone: HpTone }>`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: ${({ $tone }) => HP_TONE_COLORS[$tone]};
`;

export const HPTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: var(--bg-base, #030712);
  overflow: hidden;
`;

export const HPFill = styled.div<{ $tone: HpTone; $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 4px;
  background: ${({ $tone }) => HP_TONE_COLORS[$tone]};
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;

export const HPPulse = styled.div<{ $tone: HpTone }>`
  position: absolute;
  inset: 0;
  background: ${({ $tone }) => HP_TONE_COLORS[$tone]};
  animation: ${pulse} 1s ease-in-out infinite;
  border-radius: 4px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.35;
  }
`;

export const PartyFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

export const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, color-mix(in srgb, var(--swan-frost-white, #E0ECF4) 46%, transparent));
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

export const SmallBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 6px;
  border: none;
  background: var(--bg-base, #030712);
  color: var(--text-muted, color-mix(in srgb, var(--swan-frost-white, #E0ECF4) 52%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover { color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: progress; }
`;

export const ActionError = styled.span`
  display: block;
  margin-top: 8px;
  color: var(--status-danger, #EF4444);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
`;

export const CopyStatus = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
