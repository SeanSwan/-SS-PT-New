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

/** SWA-138 S14 — per-row dismiss (archive, never destroy). */
export const DismissButton = styled.button`
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: ${TEXT_MUTED};
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;

  &:hover {
    background: color-mix(in srgb, var(--error, #EF4444) 12%, transparent);
    border-color: color-mix(in srgb, var(--error, #EF4444) 32%, transparent);
    color: var(--error, #EF4444);
  }
  &:focus-visible { outline: 2px solid ${ACCENT_SECONDARY}; outline-offset: 2px; }
`;

/** Active | Archived view switch. */
export const ViewTab = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)'
    : 'transparent')};
  border: 1px solid ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 38%, transparent)'
    : 'var(--border-soft, rgba(255,255,255,0.12))')};
  border-radius: 999px;
  color: ${({ $active }) => ($active ? ACCENT_PRIMARY : TEXT_MUTED)};
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  min-height: 44px;
  padding: 0 16px;
  text-transform: uppercase;

  &:focus-visible { outline: 2px solid ${ACCENT_SECONDARY}; outline-offset: 2px; }
`;

export const ArchiveRow = styled.div`
  border-bottom: 1px solid color-mix(in srgb, ${ACCENT_TERTIARY} 12%, transparent);
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  &:last-child { border-bottom: none; }
`;

export const ArchiveBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ArchiveTitle = styled.div`
  color: ${TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 600;
`;

export const ArchiveMeta = styled.div`
  color: ${TEXT_MUTED};
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RestoreButton = styled.button`
  background: color-mix(in srgb, ${ACCENT_PRIMARY} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${ACCENT_PRIMARY} 34%, transparent);
  border-radius: 10px;
  color: ${ACCENT_PRIMARY};
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 600;
  min-height: 44px;
  padding: 0 14px;

  &:focus-visible { outline: 2px solid ${ACCENT_SECONDARY}; outline-offset: 2px; }
`;
