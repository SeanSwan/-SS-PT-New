/**
 * Launch Control — styles. Token-consumer with Crystalline Swan fallbacks (Rule 6: var(--token, #fallback)),
 * so the page looks right whether or not the lens `--world-*` tokens resolve on the admin surface.
 */
import styled from 'styled-components';

export const Page = styled.div`
  padding: clamp(16px, 3vw, 32px);
  color: var(--world-text, #e0ecf4);
  background: var(--world-bg, #0a0a0f);
  min-height: 100%;
`;

export const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 20px;
  margin-bottom: 20px;
`;

export const TitleWrap = styled.div`
  flex: 1 1 260px;
`;

export const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-family: var(--world-title-font, 'Plus Jakarta Sans', sans-serif);
`;

export const Sub = styled.p`
  margin: 4px 0 0;
  color: var(--world-muted, #9fb0c8);
  font-size: 0.9rem;
`;

export const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const Btn = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid ${(p) => (p.$danger ? 'var(--world-danger, #c92a54)' : 'var(--world-line, rgba(96,192,240,0.25))')};
  background: ${(p) => (p.$danger ? 'color-mix(in srgb, var(--world-danger, #c92a54) 16%, transparent)' : 'var(--world-panel, #141419)')};
  color: ${(p) => (p.$danger ? 'var(--world-danger, #ff6b8a)' : 'var(--world-text, #e0ecf4)')};
  font-size: 0.9rem;
  cursor: pointer;
  &:disabled { opacity: 0.55; cursor: progress; }
`;

export const Group = styled.section`
  margin-bottom: 22px;
`;

export const GroupTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--world-muted, #9fb0c8);
`;

export const Row = styled.div<{ $child?: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-left: ${(p) => (p.$child ? '28px' : '0')};
  border-radius: 14px;
  border: 1px solid var(--world-line, rgba(96,192,240,0.18));
  background: var(--world-panel, #141419);
  margin-bottom: 8px;
`;

export const Dot = styled.span<{ $live: boolean }>`
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: ${(p) => (p.$live ? 'var(--world-accent, #60c0f0)' : 'var(--world-muted, #6a7688)')};
  box-shadow: ${(p) => (p.$live ? '0 0 8px var(--world-accent, #60c0f0)' : 'none')};
`;

export const RowMain = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

export const RowName = styled.div`
  font-weight: 600;
  font-size: 0.98rem;
`;

export const RowMeta = styled.div`
  color: var(--world-muted, #9fb0c8);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
`;

export const Chip = styled.span<{ $tone: 'ok' | 'warn' | 'muted' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.74rem;
  white-space: nowrap;
  color: ${(p) => (p.$tone === 'warn' ? 'var(--world-danger, #ff6b8a)' : p.$tone === 'ok' ? 'var(--world-accent, #60c0f0)' : 'var(--world-muted, #9fb0c8)')};
  background: color-mix(in srgb, currentColor 14%, transparent);
`;

export const StateTag = styled.span<{ $live: boolean }>`
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  color: ${(p) => (p.$live ? 'var(--world-accent, #60c0f0)' : 'var(--world-muted, #9fb0c8)')};
`;

/**
 * Accessible toggle switch (role=switch). The visual track stays 52×30, but the tappable button is 44px
 * tall to meet the 44px min touch target (Rule 2). Track = ::before (vertically centered), knob = ::after.
 */
export const Toggle = styled.button<{ $on: boolean }>`
  position: relative;
  flex: 0 0 auto;
  width: 52px;
  height: 44px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 52px;
    height: 30px;
    border-radius: 999px;
    border: 1px solid var(--world-line, rgba(96,192,240,0.3));
    background: ${(p) => (p.$on ? 'var(--world-accent, #60c0f0)' : 'var(--world-surface-2, #1a1a24)')};
    transition: background 160ms ease;
  }
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: ${(p) => (p.$on ? '25px' : '3px')};
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    transition: left 160ms ease;
  }
  &:disabled { opacity: 0.5; cursor: progress; }
`;

export const ResetBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0 10px;
  border: 0;
  background: none;
  color: var(--world-muted, #9fb0c8);
  font-size: 0.82rem;
  cursor: pointer;
  &:hover { color: var(--world-text, #e0ecf4); }
`;

export const Strip = styled.div`
  margin-top: 18px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--world-panel, #141419);
  border: 1px solid var(--world-line, rgba(96,192,240,0.18));
  color: var(--world-muted, #9fb0c8);
  font-size: 0.85rem;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

export const State = styled.p`
  margin: 12vh auto;
  text-align: center;
  color: var(--world-muted, #9fb0c8);
`;
