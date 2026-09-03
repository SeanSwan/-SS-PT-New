/**
 * The Lane — a persistent 56px dock, not an overlay (card 1.4).
 *
 * The definition of done is a voice-originated set log landing in ≤2 seconds,
 * screen-off, one-handed. An overlay you must summon is a MODE SWITCH, and a
 * mode switch fights that goal; a docked bar is already open, so keyboard and
 * voice reach the same object with no transition. On a phone the trainer's
 * thumb is already resting on it.
 */
import styled, { css, keyframes } from 'styled-components';

const chipPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--gilded-fern-rgb, 198, 168, 75), 0.4); }
  50%      { box-shadow: 0 0 0 5px rgba(var(--gilded-fern-rgb, 198, 168, 75), 0); }
`;

export const LaneWrap = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated, #1A1A24);
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  padding-bottom: env(safe-area-inset-bottom, 0px);
`;

export const LaneBar = styled.div`
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
`;

/**
 * The client chip. Gilded Fern the moment the bar would act on a client the
 * operator has not locked — including the case where a name was spoken with
 * nothing selected, which used to render as the quiet "nothing selected" tone.
 */
export const ClientChip = styled.button<{ $tone: 'locked' | 'unlocked' | 'cross-client' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  ${({ $tone }) => ($tone === 'cross-client'
    ? css`
        background: rgba(var(--gilded-fern-rgb, 198, 168, 75), 0.18);
        border: 1px solid var(--gilded-fern, #c6a84b);
        color: var(--gilded-fern, #c6a84b);
        @media (prefers-reduced-motion: no-preference) {
          animation: ${chipPulse} 2s ease-in-out infinite;
        }
      `
    : css`
        background: var(--midnight-sapphire, #002060);
        border: 1px solid var(--ice-wing, #60c0f0);
        color: var(--frost-white, #e0ecf4);
      `)}

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }
`;

export const LaneInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  /* 16px: anything smaller triggers iOS Safari's zoom-on-focus, which yanks the
     viewport mid-session. */
  font-size: 16px;
  color: var(--text-primary, #e0ecf4);
  background: var(--bg-base, #030712);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));

  &::placeholder { color: var(--text-secondary, #a4b4c4); }
  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8b5cf6);
    outline-offset: 1px;
  }
`;

export const LaneButton = styled.button<{ $mic?: boolean }>`
  min-height: 44px;
  min-width: 44px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: var(--frost-white, #e0ecf4);
  background: ${({ $mic }) => ($mic ? 'transparent' : 'var(--midnight-sapphire, #002060)')};
  border: 1px solid ${({ $mic }) => ($mic
    ? 'var(--border-soft, rgba(96, 192, 240, 0.18))'
    : 'var(--ice-wing, #60c0f0)')};
  /* Dual-Button Glow: blue background takes the PURPLE glow. */
  box-shadow: ${({ $mic }) => ($mic ? 'none' : '0 0 12px rgba(var(--wing-purple-rgb, 139, 92, 246), 0.3)')};

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

/** The one live token the collapsed bar carries: unsynced work from the C2 log. */
export const LaneStatus = styled.p`
  margin: 0;
  padding: 0 12px 6px;
  font-size: 12px;
  font-family: var(--font-data, 'Fira Code', monospace);
  color: var(--text-secondary, #a4b4c4);
`;

export const Results = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 6px 6px;
  max-height: 45vh;
  overflow-y: auto;
`;

export const ResultRow = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  border-left: 3px solid ${({ $active }) => ($active ? 'var(--ice-wing, #60c0f0)' : 'transparent')};
  background: ${({ $active }) => ($active ? 'rgba(var(--ice-wing-rgb, 96, 192, 240), 0.10)' : 'transparent')};

  strong { font-size: 14px; font-weight: 600; color: var(--text-primary, #e0ecf4); }
  small { font-size: 12px; color: var(--text-secondary, #a4b4c4); }
`;

export const RowText = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;

  small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

export const GroupLabel = styled.li`
  list-style: none;
  padding: 8px 10px 2px;
  font-family: var(--font-data, 'Fira Code', monospace);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary, #a4b4c4);
`;
