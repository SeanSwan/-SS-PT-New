/**
 * Styles for the compact selected-client training toolbar.
 * The full client detail cards stay available behind disclosure so the
 * workout logger and planner get the working space first.
 */

import styled from 'styled-components';
import { swanClientActionButton, swanDataCardShell, swanPill } from './clientCardSystem';
import type { ClientSessionSignalTone } from './clientSessionSignal';

export const CompactTrainingHeaderShell = styled.section`
  --swan-card-padding: 10px 12px;
  --swan-card-radius: 12px;
  ${swanDataCardShell}

  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;

  @media (max-width: 940px) {
    grid-template-columns: 1fr;
  }
`;

export const CompactTrainingCopy = styled.div`
  min-width: 0;
`;

export const CompactEyebrow = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const CompactTitle = styled.h2`
  margin: 2px 0 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  line-height: 1.2;
  overflow-wrap: anywhere;
`;

export const CompactMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
`;

export const CompactPill = styled.span<{ $tone?: ClientSessionSignalTone }>`
  ${swanPill}
  min-height: 28px;
  padding: 4px 9px;
  color: ${({ $tone = 'default' }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'warning') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--text-primary, #E0ECF4)';
  }};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

export const CompactActions = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(44px, auto));
  gap: 7px;
  justify-content: end;

  @media (max-width: 940px) {
    justify-content: stretch;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

export const CompactActionButton = styled.button<{ $variant?: 'primary' }>`
  ${swanClientActionButton}
  --swan-action-border: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)'};
  --swan-action-bg: ${({ $variant }) =>
    $variant === 'primary'
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-tertiary, #4070C0))'
      : 'color-mix(in srgb, var(--bg-elevated, #1A1A24) 86%, transparent)'};
  --swan-action-fg: var(--text-primary, #E0ECF4);

  min-width: 44px;
  min-height: 44px;
  gap: 6px;
  padding: 8px 10px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;

  span {
    overflow-wrap: anywhere;
  }

  @media (max-width: 700px) {
    span {
      display: none;
    }
  }
`;

export const DetailsToggleButton = styled(CompactActionButton)<{ $open: boolean }>`
  svg:last-child {
    transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
    transition: transform 160ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    svg:last-child {
      transition: none;
    }
  }
`;

export const ExpandedTrainingDetails = styled.div`
  display: grid;
  gap: 10px;

  &[hidden] {
    display: none;
  }
`;
