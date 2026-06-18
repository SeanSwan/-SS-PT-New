import { motion } from 'framer-motion';
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';
import type { ProtocolSelection } from './CompactProtocolSection';

export const SectionCard = styled.div`
  background: ${withAlpha(CS.cardDark, 0.85)};
  backdrop-filter: blur(16px);
  border: 1px solid ${withAlpha(CS.glow, 0.12)};
  border-radius: 16px;
  margin-bottom: 0.75rem;
  overflow: hidden;
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 8px 12px 8px 0;
  min-height: 52px;
`;

export const ToggleButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 8px 12px 8px 20px;
  border: none;
  background: transparent;
  color: ${CS.text};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;

  &:hover {
    background: ${withAlpha(CS.gaming, 0.05)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: -2px;
    border-radius: 8px;
  }

  svg:last-child {
    margin-left: auto;
    transition: transform 0.3s ease;
    transform: rotate(${(p) => (p.$open ? '180deg' : '0deg')});
  }
`;

export const TitleText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
`;

export const Badge = styled.span`
  min-width: 24px;
  padding: 2px 8px;
  border-radius: 10px;
  background: ${withAlpha(CS.secondary, 0.15)};
  color: ${CS.secondaryLight};
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
`;

/**
 * Collapsed-state nudge: surfaces phase-recommended quick-adds without
 * defaulting the section open. It stays visible on phones because this cue is
 * most useful when the logger is being used on the floor.
 */
export const RecommendedHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px dashed ${withAlpha(CS.glow, 0.3)};
  color: ${withAlpha(CS.text, 0.6)};
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;

  @media (max-width: 480px) {
    gap: 3px;
    padding: 2px 6px;
    font-size: 0.62rem;
  }
`;

export const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px;
  align-self: center;
  flex-shrink: 0;
  border: 1.5px solid ${withAlpha(CS.gaming, 0.35)};
  border-radius: 10px;
  background: ${withAlpha(CS.gaming, 0.12)};
  color: ${CS.gaming};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

  &:hover {
    background: ${withAlpha(CS.gaming, 0.22)};
    border-color: ${CS.gaming};
    box-shadow: 0 0 12px ${withAlpha(CS.gaming, 0.25)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.97);
  }
`;

export const AddButtonLabel = styled.span`
  @media (max-width: 430px) {
    display: none;
  }
`;

export const SectionBody = styled(motion.div)`
  padding: 0 20px 16px;
  overflow: hidden;
`;

export const EmptyHint = styled.p`
  margin: 0;
  padding: 12px 14px;
  color: ${withAlpha(CS.text, 0.55)};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  line-height: 1.5;
  background: ${withAlpha(CS.gaming, 0.04)};
  border-radius: 10px;
  border: 1px dashed ${withAlpha(CS.glow, 0.18)};

  strong {
    color: ${CS.gaming};
    font-weight: 600;
  }
`;

export const SubHeading = styled.div`
  margin-top: 12px;
  margin-bottom: 6px;
  color: ${withAlpha(CS.text, 0.5)};
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

export const ChipList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const SelectedChip = styled.li<{ $source: ProtocolSelection['source'] }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 4px 4px 12px;
  border-radius: 999px;
  border: 1px solid ${({ $source }) =>
    $source === 'rolodex'
      ? withAlpha(CS.gaming, 0.4)
      : withAlpha(CS.glow, 0.25)};
  background: ${({ $source }) =>
    $source === 'rolodex'
      ? withAlpha(CS.gaming, 0.08)
      : withAlpha(CS.glow, 0.06)};
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
`;

export const ChipLabel = styled.span`
  max-width: 28ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${withAlpha(CS.text, 0.55)};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;

  &:hover {
    background: ${withAlpha(CS.text, 0.08)};
    color: ${CS.text};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 1px;
  }
`;

export const RecommendedChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px dashed ${withAlpha(CS.glow, 0.3)};
  background: transparent;
  color: ${withAlpha(CS.text, 0.75)};
  font-family: 'Sora', sans-serif;
  font-size: 0.73rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${withAlpha(CS.glow, 0.06)};
    color: ${CS.text};
    border-color: ${withAlpha(CS.glow, 0.5)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 2px;
  }
`;
