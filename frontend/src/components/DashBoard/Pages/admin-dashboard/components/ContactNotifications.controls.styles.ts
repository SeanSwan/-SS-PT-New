/**
 * ContactNotifications.controls.styles — header + footer control chrome for the
 * Business Intelligence Alerts widget, split out in SWA-138 S4b when the claim
 * chip pushed the main styles module past the 300-line cap (Rule 4).
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ACCENT_PRIMARY,
  ACCENT_SECONDARY,
  ACCENT_TERTIARY,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './ContactNotifications.helpers';


export const ControlButton = styled(motion.button)`
  align-items: center;
  background: color-mix(in srgb, ${ACCENT_TERTIARY} 10%, transparent);
  border: 1px solid color-mix(in srgb, ${ACCENT_TERTIARY} 30%, transparent);
  border-radius: 8px;
  color: ${TEXT_SECONDARY};
  cursor: pointer;
  display: flex;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem;
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  &:hover {
    background: color-mix(in srgb, ${ACCENT_TERTIARY} 20%, transparent);
    border-color: color-mix(in srgb, ${ACCENT_TERTIARY} 50%, transparent);
    color: ${TEXT_PRIMARY};
  }
  &:focus-visible {
    outline: 2px solid ${ACCENT_PRIMARY};
    outline-offset: 2px;
  }
  &.active {
    background: color-mix(in srgb, ${ACCENT_SECONDARY} 20%, transparent);
    border-color: color-mix(in srgb, ${ACCENT_SECONDARY} 50%, transparent);
    color: ${ACCENT_PRIMARY};
  }
`;

export const LoadMoreControl = styled(ControlButton)`
  border-radius: 8px;
  min-height: 44px;
  padding: 0.5rem 1.5rem;
`;

export const LoadMoreLabel = styled.span`
  margin-left: 0.5rem;
`;

export const LoadMoreRow = styled.div`
  margin-top: 1rem;
  text-align: center;
`;

/** SWA-138 S4b — cross-admin claim chip ("someone is handling this"). */
export const ClaimChip = styled.button<{ $mine: boolean }>`
  align-items: center;
  background: ${({ $mine }) => ($mine
    ? 'color-mix(in srgb, var(--success, #22C55E) 14%, transparent)'
    : 'color-mix(in srgb, var(--warning, #EAB308) 14%, transparent)')};
  border: 1px solid ${({ $mine }) => ($mine
    ? 'color-mix(in srgb, var(--success, #22C55E) 38%, transparent)'
    : 'color-mix(in srgb, var(--warning, #EAB308) 38%, transparent)')};
  border-radius: 999px;
  color: ${({ $mine }) => ($mine ? 'var(--success, #22C55E)' : 'var(--warning, #EAB308)')};
  cursor: pointer;
  display: inline-flex;
  font-size: 0.68rem;
  font-weight: 700;
  gap: 5px;
  letter-spacing: 0.03em;
  min-height: 44px;
  padding: 0 12px;
  text-transform: uppercase;

  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;
