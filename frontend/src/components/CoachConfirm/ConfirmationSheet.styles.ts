/**
 * ConfirmationSheet styles — card 1.3.
 *
 * Palette law: every colour goes through a design token with a literal
 * fallback (Rule 6). Arctic Cyan is DATA ONLY and appears nowhere here. The chip's alarm colour is Gilded Fern, which
 * in this design system means "earned or consequential" — it is the one place
 * the sheet raises its voice, so nothing else may compete with it.
 *
 * Motion: the arming indicator is a width transition on a composited property,
 * and under `prefers-reduced-motion` it does not animate at all — the delay
 * still elapses and the state text still changes, because the pause is a safety
 * property, not an ornament.
 */
import styled, { css, keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--gilded-fern-rgb, 198, 168, 75), 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(var(--gilded-fern-rgb, 198, 168, 75), 0); }
`;

export const Sheet = styled.section<{ $destructive: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid ${({ $destructive }) => ($destructive
    ? 'rgba(var(--gilded-fern-rgb, 198, 168, 75), 0.45)'
    : 'var(--border-soft, rgba(96, 192, 240, 0.18))')};
  color: var(--text-primary, #e0ecf4);
  font-size: 16px;
  line-height: 1.5;
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const TierBadge = styled.span<{ $tier: string }>`
  font-family: var(--font-data, 'Fira Code', monospace);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 999px;
  ${({ $tier }) => ($tier === 'deliberate'
    ? css`
        background: rgba(var(--gilded-fern-rgb, 198, 168, 75), 0.16);
        color: var(--gilded-fern, #c6a84b);
      `
    : css`
        background: rgba(var(--ice-wing-rgb, 96, 192, 240), 0.12);
        color: var(--ice-wing-text, #8ad4f5);
      `)}
`;

/**
 * The client chip. Quiet by default; Gilded Fern the moment the operation would
 * act on someone other than the locked client — the first rendering of the guard
 * that was written after a wrong-client write reached production and then sat
 * unmounted for six weeks.
 */
export const ClientChip = styled.span<{ $alarm: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 999px;
  font-weight: 600;
  background: ${({ $alarm }) => ($alarm
    ? 'rgba(var(--gilded-fern-rgb, 198, 168, 75), 0.18)'
    : 'var(--midnight-sapphire, #002060)')};
  border: 1px solid ${({ $alarm }) => ($alarm
    ? 'var(--gilded-fern, #c6a84b)'
    : 'var(--ice-wing, #60c0f0)')};
  color: ${({ $alarm }) => ($alarm ? 'var(--gilded-fern, #c6a84b)' : 'var(--frost-white, #e0ecf4)')};

  ${({ $alarm }) => $alarm && css`
    @media (prefers-reduced-motion: no-preference) {
      animation: ${pulse} 2s ease-in-out infinite;
    }
  `}
`;

export const Title = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

export const Detail = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font-size: 14px;

  dt { color: var(--text-secondary, #a4b4c4); }
  dd { margin: 0; color: var(--text-primary, #e0ecf4); font-family: var(--font-data, 'Fira Code', monospace); }
`;

export const Warning = styled.p<{ $tone?: 'caution' | 'stop' }>`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $tone }) => ($tone === 'stop'
    ? 'var(--gilded-fern, #c6a84b)'
    : 'var(--text-secondary, #a4b4c4)')};
`;

export const ArmingTrack = styled.div`
  height: 3px;
  border-radius: 2px;
  background: var(--border-soft, rgba(96, 192, 240, 0.18));
  overflow: hidden;
`;

export const ArmingFill = styled.div<{ $ms: number }>`
  height: 100%;
  width: 0;
  background: var(--gilded-fern, #c6a84b);

  @media (prefers-reduced-motion: no-preference) {
    animation: arming-fill ${({ $ms }) => $ms}ms linear forwards;
  }
  @keyframes arming-fill { to { width: 100%; } }
`;

export const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

/**
 * 44px is the floor on every control here — this is the surface where a
 * mis-tap either executes something destructive or cancels work, and it is
 * operated on a phone, one-handed, mid-session.
 */
const controlBase = css`
  min-height: 44px;
  min-width: 44px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }
  &:disabled { cursor: not-allowed; opacity: 0.55; }
`;

export const ConfirmButton = styled.button`
  ${controlBase};
  background: var(--midnight-sapphire, #002060);
  color: var(--frost-white, #e0ecf4);
  border-color: var(--ice-wing, #60c0f0);
  /* Dual-Button Glow: blue background takes the PURPLE glow. */
  box-shadow: 0 0 12px rgba(var(--wing-purple-rgb, 139, 92, 246), 0.35);
`;

export const SecondaryButton = styled.button`
  ${controlBase};
  background: transparent;
  color: var(--text-primary, #e0ecf4);
  border-color: var(--border-soft, rgba(96, 192, 240, 0.28));
`;

export const StatusLine = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #a4b4c4);
`;
